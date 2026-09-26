import "server-only";
import { redirect } from "next/navigation";
import { AppError } from "@/server/errors";
import { getCurrentUser, type SessionUser } from "./session";

/** For pages: redirect to sign-in when there is no session. */
export async function requireUserPage(next: string): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

/** For admin pages: non-admins get a 404 so the admin area is not discoverable. */
export async function requireAdminPage(next = "/admin"): Promise<SessionUser> {
  const user = await requireUserPage(next);
  if (user.role !== "ADMIN") redirect("/");
  return user;
}

/** For actions and API routes. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new AppError("UNAUTHENTICATED", "Please sign in to continue.");
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new AppError("FORBIDDEN", "You do not have permission to do that.");
  return user;
}

export function assertAdmin(user: Pick<SessionUser, "role">) {
  if (user.role !== "ADMIN") throw new AppError("FORBIDDEN", "You do not have permission to do that.");
}

/** Only allow same-site relative redirects after login (prevents open redirects). */
export function safeNextPath(next: unknown, fallback = "/account"): string {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next.slice(0, 500);
}
