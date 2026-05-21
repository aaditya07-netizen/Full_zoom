import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";
config({ path: new URL("../.env", import.meta.url), quiet: true });
export const prisma = new PrismaClient();