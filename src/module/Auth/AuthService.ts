import { HASH_ROUNDS } from "@constant";
import { PrismaClient, User } from "@prisma/client";
import { hash as bcryptHash, compare } from "bcrypt";
import { sign, verify } from "jsonwebtoken";
import { Inject, Service } from "typedi";
import { promisify } from "util";

import { AlreadyAuthenticatedError } from "./errors";
import { RegisterInput } from "./types";

@Service()
export default class AuthService {
  constructor (
    private readonly prisma: PrismaClient,
    @Inject("user") private readonly user: User
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

  public async login (identifier: string, password: string): Promise<string | undefined> {
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

    return signAsync({ uuid }, JWT_SECRET, { expiresIn: "7d" });
  }
}
