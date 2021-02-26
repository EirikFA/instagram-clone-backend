import { AuthRole, Context } from "@types";
import { AuthChecker } from "type-graphql";

const authChecker: AuthChecker<Context, AuthRole> = ({ context }) => !!context.user;

export default authChecker;
