import { Context } from "@types";
import { toApolloError, UserInputError } from "apollo-server-express";
import { MiddlewareFn } from "type-graphql";

const ErrorMiddleware: MiddlewareFn<Context> = async (_, next) => {
  try {
    return await next();
  } catch (e) {
    let newErr: ReturnType<typeof toApolloError> = e;

    // I would rather not mess with this, but what comes from TypeGraphQL is.. weird
    // (always "Argument Validation Failed", even when it is not a user error)
    if (e.validationErrors?.message?.toLowerCase().includes("database")) {
      newErr = toApolloError(e, "INTERNAL_SERVER_ERROR");
      newErr.message = "Internal server error";

      console.error(newErr);
    } else if (e.message === "Argument Validation Error") {
      newErr = toApolloError(newErr, "BAD_USER_INPUT");
    } else if (!(e instanceof UserInputError)) console.error(newErr);

    throw newErr;
  }
};

export default ErrorMiddleware;
