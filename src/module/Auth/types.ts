import { IsUniqueUser } from "@validation";
import { Matches } from "class-validator";
import { GraphQLEmailAddress } from "graphql-scalars";
import {
  ArgsType, createUnionType, Field, InputType, ObjectType
} from "type-graphql";

@InputType()
export class RegisterInput {
  @Field(_type => GraphQLEmailAddress)
  @IsUniqueUser("email")
  email!: string;

  @Field()
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)[\d\w\W]{8,}$/, {
    message: "Password must be at least 8 characters long, contain one letter and one number"
  })
  password!: string;

  @Field()
  @IsUniqueUser("username")
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
export class SuccessLogin {
  @Field()
  token!: string;
}

@ObjectType()
export class FailedLogin {
  @Field()
  error!: string;
}

export const LoginResult = createUnionType({
  name: "LoginResult",
  types: () => [SuccessLogin, FailedLogin] as const,
  resolveType: value => {
    if ("error" in value) return FailedLogin;
    if ("token" in value) return SuccessLogin;

    return undefined;
  }
});
