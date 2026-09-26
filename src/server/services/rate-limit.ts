import "server-only";
import { db } from "@/server/db";
import { hmac } from "@/server/crypto";
import { AppError } from "@/server/errors";

/**
 * Fixed-window rate limiter backed by Postgres so limits hold across instances.
 * Keys are HMAC'd so raw IPs/emails are never persisted.
 */
export async function rateLimit(scope: string, identifier: string, limit: number, windowSeconds: number): Promise<void> {
  const key = `${scope}:${hmac(identifier)}`;
  const rows = await db.$queryRaw<{ count: number }[]>`
    INSERT INTO rate_limits (key, count, window_start) VALUES (${key}, 1, now())
    ON CONFLICT (key) DO UPDATE SET
      count = CASE WHEN rate_limits.window_start < now() - make_interval(secs => ${windowSeconds}) THEN 1 ELSE rate_limits.count + 1 END,
      window_start = CASE WHEN rate_limits.window_start < now() - make_interval(secs => ${windowSeconds}) THEN now() ELSE rate_limits.window_start END
    RETURNING count`;
  if ((rows[0]?.count ?? 0) > limit) {
    throw new AppError("RATE_LIMITED", "Too many attempts. Please wait a few minutes and try again.");
  }
}

export async function purgeRateLimits() {
  await db.$executeRaw`DELETE FROM rate_limits WHERE window_start < now() - interval '1 day'`;
}
