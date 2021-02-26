import "reflect-metadata";

import { resolvers as generatedResolvers } from "@generated/typegraphql-prisma";
import { ErrorMiddleware } from "@middleware";
import { resolvers } from "@module";
import { PrismaClient } from "@prisma/client";
import createServer from "@server";
import { Context } from "@types";
import { useContainer } from "class-validator";
import cookieParser from "cookie-parser";
import express from "express";
import { buildSchema, ContainerGetter } from "type-graphql";
import Container, { Service } from "typedi";

const prisma = new PrismaClient();

const bootstrap = async () => {
  Container.set({
    id: PrismaClient,
    global: true,
    value: prisma
  });

  // https://github.com/typestack/class-validator/issues/928
  useContainer(Container, {
    fallback: true,
    fallbackOnErrors: true
  });

  // https://github.com/MichalLytek/typegraphql-prisma/issues/63
  for (const resolver of generatedResolvers) {
    Service()(resolver);
  }

  const app = express();
  app.use(cookieParser());

  const container: ContainerGetter<Context> = ({ context }) => context.container;
  const schema = await buildSchema({
    resolvers: [...generatedResolvers, ...resolvers],
    container,
    globalMiddlewares: [ErrorMiddleware]
  });

  const server = createServer(schema, prisma);
  server.applyMiddleware({ app });

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;

  const listener = app.listen(port, "localhost", () => {
    const address = listener.address();
    let host: string = "unknown";
    if (address && typeof address !== "string") {
      host = address.address;
    }

    console.log(`Server is running, GraphQL Playground available at ${host}:${port}${server.graphqlPath}`);
  });
};

bootstrap().catch(console.error).finally(() => prisma.$disconnect);
