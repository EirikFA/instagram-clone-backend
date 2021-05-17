import { PrismaClient } from "@prisma/client";
import disposeContainer from "@server/disposeContainer";
import setContext from "@server/setContext";
import { ApolloServer } from "apollo-server-express";
import { GraphQLSchema } from "graphql";

const createServer = (schema: GraphQLSchema, prisma: PrismaClient) => new ApolloServer({
  schema,
  context: setContext(prisma),
  plugins: [disposeContainer],
  formatError: e => {
    const newError = e;

    if (newError.extensions?.code === "INTERNAL_SERVER_ERROR"
    && process.env.NODE_ENV !== "development") {
      delete newError.extensions.exception;
    }

    if (e.message.includes("Access denied") && newError.extensions) {
      newError.extensions.code = "UNAUTHENTICATED";
    }

    return newError;
  },
  playground: true
});

export default createServer;
