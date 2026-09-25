import { db } from "@/server/db";
import { getCurrentUser } from "@/server/auth/session";
import { publish } from "@/server/realtime";
import { isSameOrigin } from "@/server/request";

const lastSent = new Map<string, number>();

/** Ephemeral typing indicator (not stored). Throttled to one event / 2s per user+conversation. */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return new Response("Forbidden", { status: 403 });
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const body = (await request.json().catch(() => null)) as { conversationId?: unknown } | null;
  const conversationId = typeof body?.conversationId === "string" ? body.conversationId : "";
  const convo = conversationId ? await db.conversation.findUnique({ where: { id: conversationId }, select: { customerId: true } }) : null;
  if (!convo || (convo.customerId !== user.id && user.role !== "ADMIN")) return new Response("Not found", { status: 404 });

  const key = `${user.id}:${conversationId}`;
  if (Date.now() - (lastSent.get(key) ?? 0) > 2000) {
    lastSent.set(key, Date.now());
    await publish(`conversation:${conversationId}`, "typing", { by: user.role === "ADMIN" ? "staff" : "customer", name: user.name.split(" ")[0] });
  }
  return new Response(null, { status: 204 });
}
