import "server-only";
import { headers } from "next/headers";

/** Best-effort client IP (first X-Forwarded-For hop set by the hosting proxy). Never stored raw. */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

/** Rejects cross-site state-changing requests to API routes (CSRF defence in depth). */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return request.headers.get("sec-fetch-site") !== "cross-site";
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export function prefersNoTracking(h: Headers): boolean {
  return h.get("sec-gpc") === "1" || h.get("dnt") === "1";
}
