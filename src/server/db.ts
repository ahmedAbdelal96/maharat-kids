import "server-only";

import { getPrismaClient, type PrismaClientPort } from "@/database/prisma";

/** Single database access point for repositories. */
export function getDb(): PrismaClientPort {
  return getPrismaClient();
}
