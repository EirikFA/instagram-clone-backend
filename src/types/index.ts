import { PrismaClient, User } from "@prisma/client";
import { ContainerInstance } from "typedi";

export interface Context {
  prisma: PrismaClient;
  requestId: string;
  container: ContainerInstance;
  user?: User;
}

export type Role = "MODERATOR" | "ADMINISTRATOR";
export type AuthRole = Role | "SELF";
