import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL, max: Number(process.env.DATABASE_POOL_SIZE ?? 10) });
  return new PrismaClient({ adapter, log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"] });
}

export const db = globalForPrisma.prisma ?? createClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

export type Tx = Parameters<Parameters<typeof db.$transaction>[0]>[0];

/** Postgres error code for a violated EXCLUDE constraint. */
export const EXCLUSION_VIOLATION = "23P01";

/** Extracts the Postgres SQLSTATE code from a Prisma / driver-adapter / pg error, if any. */
export function pgErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  const e = error as { code?: unknown; meta?: { driverAdapterError?: { cause?: { originalCode?: unknown; code?: unknown } } }; cause?: unknown; message?: unknown };
  const cause = e.meta?.driverAdapterError?.cause;
  if (typeof cause?.originalCode === "string") return cause.originalCode;
  if (typeof cause?.code === "string") return cause.code;
  if (e.code === "P2002") return "23505"; // Prisma unique-constraint error
  if (e.code === "P2003") return "23503"; // Prisma foreign-key error
  if (typeof e.code === "string" && /^[0-9]{2}[0-9A-Z]{3}$/.test(e.code)) return e.code; // raw pg error
  if (e.cause) return pgErrorCode(e.cause);
  return undefined;
}
