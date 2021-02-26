import { User } from "@generated/typegraphql-prisma";
import { ApolloError, UserInputError } from "apollo-server-errors";
import {
  Arg, Args, Mutation, Resolver
} from "type-graphql";
import { Service } from "typedi";

import AuthService from "./AuthService";
import { AlreadyAuthenticatedError } from "./errors";
import { LoginArgs, LoginResult, RegisterInput } from "./types";

@Service()
@Resolver()
export default class AuthResolver {
  constructor (private readonly auth: AuthService) {}

  @Mutation(_type => LoginResult)
  async login (@Args() { identifier, password }: LoginArgs): Promise<typeof LoginResult> {
    try {
      const token = await this.auth.login(identifier, password);

      if (!token) return { error: "Invalid username or password" };

      return { token };
    } catch (e) {
      if (e instanceof AlreadyAuthenticatedError) return { error: "Already authenticated" };

      console.error("Login error occurred", e);
      throw new ApolloError("Error occurred");
    }
  }

  @Mutation(_type => User)
  async register (@Arg("data") data: RegisterInput): Promise<User> {
    try {
      return await this.auth.register(data);
    } catch (e) {
      if (e instanceof AlreadyAuthenticatedError) throw new UserInputError("Already authenticated");

      console.error("Register error occurred", e);
      throw new ApolloError("Error occurred");
    }
  }
}
