import AuthService from "@module/Auth/AuthService";
import { PrismaClient, User } from "@prisma/client";
import { Context } from "@types";
import { ApolloServerExpressConfig } from "apollo-server-express";
import { Container } from "typedi";

const setContext = (
  prisma: PrismaClient
): ApolloServerExpressConfig["context"] => async ({ req }): Promise<Context> => {
  // Generate request ID for scoped containers
  const requestId = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString();
  const container = Container.of(requestId);

  const { token } = req.cookies;

  let user: User | undefined;
  if (token && token.trim()) {
    try {
      const uuid = await AuthService.authenticate(token);

      user = await prisma.user.findUnique({ where: { authUuid: uuid } }) ?? undefined;
    } catch (e) {
      // Silently ignore authentication fail, we will just leave `context.user` `undefined`
    }
  }

  container.set("user", user);

  const context: Context = {
    prisma,
    requestId,
    container,
    user
  };

  return context;
};

export default setContext;
