import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig, Pool } from "@neondatabase/serverless";
import ws from "ws";
import { env } from "~/env";
import { Prisma, PrismaClient } from "../../generated/prisma";

// Neon HTTP mode cannot start transactions. Auth.js sign-in (and other Prisma
// writes) need them, which produced AccessDenied on /api/auth/callback/google.
// The WebSocket adapter supports transactions and still works behind corporate TLS.
neonConfig.webSocketConstructor = ws;
neonConfig.pipelineConnect = false;

function resolveDatabaseUrl(): string {
  const url =
    process.env.DATABASE_URL ??
    env.DATABASE_URL ??
    (process.env.VERCEL === "1"
      ? "postgresql://build:build@localhost:5432/build"
      : undefined);
  if (!url) {
    throw new Error("DATABASE_URL environment variable is required");
  }
  return url;
}

function usesNeonServerless(url: string): boolean {
  return url.includes("neon.tech");
}

const createPrismaClient = (): PrismaClient => {
  const url = resolveDatabaseUrl();
  const log: Prisma.LogLevel[] =
    env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"];

  if (usesNeonServerless(url)) {
    const adapter = new PrismaNeon(new Pool({ connectionString: url }));
    return new PrismaClient({ adapter, log });
  }

  return new PrismaClient({
    datasourceUrl: url,
    log,
  });
};

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") globalForPrisma.prisma = db;
