import { Context } from "@types";
import { ApolloServerPlugin } from "apollo-server-plugin-base";
import { Container } from "typedi";

const disposeContainer: ApolloServerPlugin<Context> = {
  requestDidStart: () => ({
    willSendResponse: requestContext => {
      Container.reset(requestContext.context.requestId.toString());
    }
  })
};

export default disposeContainer;
