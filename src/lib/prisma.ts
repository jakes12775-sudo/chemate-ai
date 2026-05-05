import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

function resolveConnectionString() {
  if (
    process.env.DATABASE_URL &&
    process.env.DATABASE_URL.startsWith("postgres")
  ) {
    return process.env.DATABASE_URL;
  }

  if (process.env.DIRECT_DATABASE_URL) {
    return process.env.DIRECT_DATABASE_URL;
  }

  throw new Error(
    "DATABASE_URL is not configured. Run `npm run db:start` before starting the app.",
  );
}

const adapter = new PrismaPg({
  connectionString: resolveConnectionString(),
});

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
