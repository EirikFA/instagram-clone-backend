import { IsUniqueUser } from "@validation";
import { Matches } from "class-validator";
import { GraphQLEmailAddress } from "graphql-scalars";
import {
  ArgsType, Field, InputType, ObjectType
} from "type-graphql";

@InputType()
export class RegisterInput {
  @Field(_type => GraphQLEmailAddress)
  @IsUniqueUser("email", false)
  email!: string;

  @Field()
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)[\d\w\W]{8,}$/, {
    message: "Password must be at least 8 characters long, contain one letter and one number"
  })
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
