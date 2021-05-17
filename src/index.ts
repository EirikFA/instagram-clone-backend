import "reflect-metadata";

import { UserRelationsResolver } from "@generated/typegraphql-prisma";
import { ErrorMiddleware } from "@middleware";
import { resolvers } from "@module";
import { PrismaClient } from "@prisma/client";
import createServer from "@server";
import { Context } from "@types";
import { parsePath } from "@util";
import { useContainer } from "class-validator";
import cookieParser from "cookie-parser";
import express from "express";
import { readFileSync } from "fs";
import { createServer as createHTTPSServer, Server } from "https";
import { buildSchema, ContainerGetter } from "type-graphql";
import Container, { Service } from "typedi";

import authChecker from "./authChecker";

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
  // for (const resolver of generatedResolvers) {
  //   Service()(resolver);
  // }

  Service()(UserRelationsResolver);

  const app = express();
  app.use(cookieParser());

  const container: ContainerGetter<Context> = ({ context }) => context.container;
  const schema = await buildSchema({
    resolvers: [UserRelationsResolver, ...resolvers],
    container,
    authChecker,
    globalMiddlewares: [ErrorMiddleware]
  });

  const server = createServer(schema, prisma);
  server.applyMiddleware({
    app,
    path: "/",
    cors: {
      origin: process.env.NODE_ENV === "development"
        ? true : "https://instagram-clone.app",
      credentials: true
    }
  });

  const {
    HTTPS, SSL_CRT_FILE, SSL_KEY_FILE, PORT
  } = process.env;

  let httpsServer: Server | undefined;

  if (HTTPS === "true") {
    if (!SSL_CRT_FILE || !SSL_KEY_FILE) {
      throw new Error("Certificate and key file required when using HTTPS");
    }

    httpsServer = createHTTPSServer({
      cert: readFileSync(parsePath(SSL_CRT_FILE)),
      key: readFileSync(parsePath(SSL_KEY_FILE))
    }, app);
  }

  const listenFn = httpsServer ? httpsServer.listen.bind(httpsServer) : app.listen.bind(app);

  const port = PORT ? parseInt(PORT, 10) : 4000;

  const listener = listenFn(port, "0.0.0.0", () => {
    const address = listener.address();
    let host: string = "unknown";
    if (address && typeof address !== "string") {
      host = address.address;
    }

    console.log(
      `Server is running, GraphQL Playground available at ${host}:${port}${server.graphqlPath}`
    );
  });
};

bootstrap().catch(console.error).finally(() => prisma.$disconnect);
