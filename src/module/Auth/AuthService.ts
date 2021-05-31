import {
  EMAIL_DATA, HASH_ROUNDS, SendgridTemplate, SendgridUnsubscribeGroup
} from "@constant";
import { PrismaClient, User } from "@prisma/client";
import { EmailButtonContent } from "@types";
import { sendgrid } from "@util";
import { hash as bcryptHash, compare } from "bcrypt";
import { createHash, randomBytes } from "crypto";
import { sign, verify } from "jsonwebtoken";
import { Inject, Service } from "typedi";
import { promisify } from "util";

import { AlreadyAuthenticatedError, InvalidTokenError } from "./errors";
import { RegisterInput } from "./types";

@Service()
export default class AuthService {
  constructor (
    private readonly prisma: PrismaClient,
    @Inject("user") private readonly user?: User
  ) {}

  public static async authenticate (token: string): Promise<string | undefined> {
    const { JWT_SECRET } = process.env;
    if (!JWT_SECRET) throw new Error("Missing secret");

    // `promisify` not very on point with the typings
    const verifyAsync = promisify(verify) as (...params: Parameters<typeof verify>) => any;

    // Poor typings by jsonwebtoken (https://github.com/auth0/node-jsonwebtoken/issues/483)
    const decoded = await verifyAsync(token, JWT_SECRET);
    return decoded?.uuid;
  }

  public async logIn (identifier: string, password: string): Promise<string | undefined> {
    if (this.user) throw new AlreadyAuthenticatedError();

    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { username: identifier }
        ]
      }
    });

    if (user) {
      const valid = await compare(password, user.hash);

      if (valid) return this.createJwt(user.authUuid);
    }

    return undefined;
  }

  public async register ({ email, password, username }: RegisterInput): Promise<User> {
    if (this.user) throw new AlreadyAuthenticatedError();

    const hash = await bcryptHash(password, HASH_ROUNDS);

    return this.prisma.user.create({
      data: {
        email: email.toLowerCase(),
        hash,
        username: username.toLowerCase(),
        profile: {
          create: {}
        }
      }
    });
  }

  public async requestPasswordReset (user: User): Promise<void> {
    const existing = await this.prisma.passwordResetToken.findUnique({
      where:
      {
        userId: user.id
      }
    });

    // Allow new request if not requested before, requested less than three times
    // (within 15 minutes), or more than 15 minutes passed since last request
    const requestCount = existing?.requestCount ?? 0;
    const now = new Date();
    const expired = existing
      ? now.getTime() - existing.requestedAt.getTime() > 15 * 60 * 1000
      : true;

    if (requestCount < 3 || expired) {
      const token = await this.randomBytesAsync(32);
      const hash = createHash("blake2b512").update(token).digest();

      const safeToken = encodeURIComponent(token.toString("base64"));
      const url = `${process.env.FRONTEND_URL}/reset-password?t=${safeToken}`;

      const sent = await this.sendEmail({
        subject: "Password reset",
        title: "Password reset requested",
        // eslint-disable-next-line max-len
        text: `A password reset request was issued for the account <code>${user.username}</code> with this email (<code>${user.email}</code>). If this was you, click the button below or copy and paste this URL into your browser:<br><a href="${url}">${url}</a><br>If this was not you, you can safely ignore this email.`,
        buttonText: "Reset password",
        buttonUrl: url
      }, user);

      if (!sent) {
        throw new Error("Could not send password reset email");
      }

      // TODO: Log password reset request

      await this.prisma.passwordResetToken.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          hash
        },
        update: {
          hash,
          // Reset count (set to one) if previous expired, increase if allowed because less than
          // three requested, see if statement
          requestCount: expired ? 1 : {
            increment: 1
          },
          requestedAt: now
        }
      });
    }
  }

  public async resetPassword (token: string, password: string): Promise<void> {
    const tokenHash = createHash("blake2b512").update(token, "base64").digest();
    const tokenRow = await this.prisma.passwordResetToken.findUnique({
      where: {
        hash: tokenHash
      },
      select: {
        userId: true
      }
    });

    if (!tokenRow) throw new InvalidTokenError();

    const passwordHash = await bcryptHash(password, HASH_ROUNDS);

    // No way to set `authUuid` to default with Prisma CRUD methods
    // TODO: Create issue in the Prisma repository
    await this.prisma.$executeRaw(
      `UPDATE "User"
      SET hash = '${passwordHash}',
      "authUuid" = DEFAULT
      WHERE id = ${tokenRow.userId}`
    );

    await this.prisma.passwordResetToken.delete({ where: { userId: tokenRow.userId } });

    // TODO: Send email notifying of password change
  }

  private async createJwt (uuid: string): Promise<string> {
    const { JWT_SECRET } = process.env;
    if (!JWT_SECRET) throw new Error("Missing secret");

    // Don't even..
    type SignParamsRequired = Parameters<typeof sign>;
    type SignParams = [
      payload: SignParamsRequired[0],
      secretOrPrivateKey: SignParamsRequired[1],
      options?: SignParamsRequired[2],
      callback?: SignParamsRequired[3]
    ];
    const signAsync = promisify(sign) as (...params: SignParams) => any;

    // TODO: Add claims like issuer, audience etc.
    return signAsync({ uuid }, JWT_SECRET, { expiresIn: "7d" });
  }

  private async randomBytesAsync (size: number): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      randomBytes(size, (e, buffer) => {
        if (e) reject(e);
        resolve(buffer);
      });
    });
  }

  private async sendEmail (
    content: EmailButtonContent,
    user?: User
  ): Promise<boolean> {
    const target = user ?? this.user;
    if (!target) throw new TypeError("No user");

    if (sendgrid) {
      // TODO: Log email event
      await sendgrid.send({
        to: target.email,
        from: {
          email: EMAIL_DATA.FROM,
          name: "ArWeb Instagram clone"
        },
        subject: content.subject,
        templateId: SendgridTemplate.Button,
        dynamicTemplateData: content,
        asm: {
          groupId: SendgridUnsubscribeGroup.Account
        },
        hideWarnings: true
      });

      return true;
    }

    return false;
  }
}
