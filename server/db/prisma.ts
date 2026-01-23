import prismaPkg from "@prisma/client";

const { PrismaClient } = prismaPkg;

/**
 * Singleton Prisma client.
 *
 * Why singleton?
 * - Avoids opening too many SQLite connections.
 * - Makes local dev + hot reload stable.
 */
let prisma: PrismaClient | undefined;

export function getPrisma() {
  if (!prisma) {
    prisma = new PrismaClient({
      log: ["error"],
    });
  }

  return prisma;
}

export type DbClient = ReturnType<typeof getPrisma>;
