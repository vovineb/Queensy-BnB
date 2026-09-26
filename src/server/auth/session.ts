import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { db } from "@/server/db";
import { randomToken, sha256 } from "@/server/crypto";
import type { Role } from "@/generated/prisma/client";

export const SESSION_COOKIE = "qb_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const RENEW_THRESHOLD_MS = 15 * 24 * 60 * 60 * 1000; // extend when < 15 days remain

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: Role;
  emailVerifiedAt: Date | null;
};

async function setSessionCookie(token: string, expiresAt: Date) {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

/** Creates a session for the user and sets the cookie. The DB only stores sha256(token). */
export async function createSession(userId: string): Promise<void> {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const userAgent = (await headers()).get("user-agent")?.slice(0, 255) ?? null;
  await db.session.create({ data: { id: sha256(token), userId, expiresAt, userAgent } });
  await setSessionCookie(token, expiresAt);
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { id: sha256(token) } });
  jar.delete(SESSION_COOKIE);
}

export async function destroyAllSessions(userId: string, exceptCurrent = false): Promise<void> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  await db.session.deleteMany({
    where: { userId, ...(exceptCurrent && token ? { id: { not: sha256(token) } } : {}) },
  });
}

/** Resolves the signed-in user for this request (memoised per request). */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || token.length > 100) return null;
  const session = await db.session.findUnique({
    where: { id: sha256(token) },
    include: {
      user: { select: { id: true, email: true, name: true, phone: true, role: true, status: true, emailVerifiedAt: true } },
    },
  });
  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now() || session.user.status !== "ACTIVE") {
    await db.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }
  if (session.expiresAt.getTime() - Date.now() < RENEW_THRESHOLD_MS) {
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    await db.session.update({ where: { id: session.id }, data: { expiresAt } });
    // Cookies can only be written from actions/route handlers; ignore during render.
    await setSessionCookie(token, expiresAt).catch(() => undefined);
  }
  const { status: _status, ...user } = session.user;
  return user;
});
