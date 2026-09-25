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

/** Extracts the SQLSTATE code from a Prisma / driver adapter error, if any. */
export function pgErrorCode(error: unknown): string | undefined {
  const seen = new Set<unknown>();
  const visit = (e: unknown): string | undefined => {
    if (!e || typeof e !== "object" || seen.has(e)) return undefined;
    seen.add(e);
    const obj = e as Record<string, unknown>;
    if (typeof obj.code === "string" && /^[0-9A-Z]{5}$/.test(obj.code)) return obj.code;
    const meta = obj.meta as Record<string, unknown> | undefined;
    if (meta) {
      const driver = meta.driverAdapterError as Record<string, unknown> | undefined;
      const cause = driver?.cause as Record<string, unknown> | undefined;
      if (typeof cause?.originalCode === "string") return cause.originalCode;
      if (typeof meta.code === "string") return meta.code;
    }
    return visit(obj.cause) ?? visit(meta?.driverAdapterError);
  };
  const code = visit(error);
  if (code) return code;
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("bookings_no_overlap") || message.includes("exclusion constraint")) return EXCLUSION_VIOLATION;
  return undefined;
}
