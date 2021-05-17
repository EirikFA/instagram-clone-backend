import { Context } from "@types";
import { ForbiddenError } from "apollo-server-errors";
import { createMethodDecorator } from "type-graphql";

const NotAuthenticated = () => createMethodDecorator<Context>(({ context }, next) => {
  if (context.user) {
    throw new ForbiddenError("Only non-authenticated users are allowed for this action");
  }

  return next();
});

export default NotAuthenticated;
