import { User as GraphQLUser } from "@generated/typegraphql-prisma";
import { User } from "@prisma/client";
import { ApolloError } from "apollo-server-errors";
import { AuthenticationError } from "apollo-server-express";
import { NotAuthenticated } from "decorators";
import { Response } from "express";
import {
  Arg, Args, Mutation, Query, Resolver
} from "type-graphql";
import { Inject, Service } from "typedi";

import AuthService from "./AuthService";
import { LoginArgs, LoginResult, RegisterInput } from "./types";

@Service()
@Resolver()
export default class AuthResolver {
  constructor (
    private readonly auth: AuthService,
    @Inject("user") private readonly user: User,
    @Inject("response") private readonly response: Response
  ) {}

  @Mutation(_type => LoginResult)
  @NotAuthenticated()
  async login (@Args() { identifier, password }: LoginArgs): Promise<LoginResult> {
    let token: string | undefined;

    try {
      token = await this.auth.login(identifier, password);
    } catch (e) {
      console.error("Login error occurred", e);
      throw new ApolloError("Error occurred");
    }

    if (!token) throw new AuthenticationError("Invalid username or password");

    const { COOKIE_DOMAIN } = process.env;
    if (COOKIE_DOMAIN) {
      const expires = new Date();
      expires.setDate(expires.getDate() + 7);

      this.response.cookie("token", token, {
        domain: COOKIE_DOMAIN,
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        // HTTPS env variable mostly used in development,
        // production has reverse proxy handling HTTPS
        secure: process.env.HTTPS === "true" || process.env.NODE_ENV !== "development",
        sameSite: "strict"
      });
    }

    return { token };
  }

  @Query(_type => GraphQLUser, { nullable: true })
  me (): GraphQLUser | null {
    return this.user;
  }

  @Mutation(_type => GraphQLUser)
  @NotAuthenticated()
  async register (@Arg("data") data: RegisterInput): Promise<GraphQLUser> {
    try {
      return await this.auth.register(data);
    } catch (e) {
      console.error("Register error occurred", e);
      throw new ApolloError("Error occurred");
    }
  }
}
