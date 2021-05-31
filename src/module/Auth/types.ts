import { IsUniqueUser } from "@validation";
import { Matches } from "class-validator";
import { GraphQLEmailAddress } from "graphql-scalars";
import {
  ArgsType, Field, InputType, ObjectType
} from "type-graphql";

export const IsPassword = (
  pattern: RegExp = /^(?=.*[A-Za-z])(?=.*\d)[\d\w\W]{8,}$/,
  message: string = "Password must be at least 8 characters long, contain one letter and one number"
) => Matches(pattern, { message });

@InputType()
export class RegisterInput {
  @Field(_type => GraphQLEmailAddress)
  @IsUniqueUser("email", false)
  email!: string;

  @Field()
  @IsPassword()
  password!: string;

  @Field()
  @IsUniqueUser("username", false)
  username!: string;
}

@ArgsType()
export class LoginArgs {
  @Field()
  identifier!: string;

  @Field()
  password!: string;
}

@ObjectType()
export class LoginResult {
  @Field()
  token!: string;
}

@ArgsType()
export class RequestPasswordResetArgs {
  @Field(_type => GraphQLEmailAddress)
  email!: string;
}

@ArgsType()
export class ResetPasswordArgs {
  @Field()
  @IsPassword()
  password!: string;

  @Field()
  token!: string;
}
