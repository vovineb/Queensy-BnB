import { db } from "@/server/db";
import { getCurrentUser } from "@/server/auth/session";
import { realtimeHub, type RealtimeEvent } from "@/server/realtime";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// Serverless hosts cap how long a response can stay open. We end the stream a
// little before the cap; EventSource reconnects and clients refetch.
export const maxDuration = 300;
const SERVERLESS_STREAM_MS = 280_000;

const MAX_CHANNELS = 12;

/**
 * Server-Sent Events stream. Clients ask for channels; the server grants only
 * those the caller is authorised for:
 *   me                  -> user:<id>        (signed-in)
 *   admin               -> admin            (admins)
 *   conversation:<id>   -> participant or admin
 *   availability:<id>   -> public
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const requested = (url.searchParams.get("channels") ?? "").split(",").filter(Boolean).slice(0, MAX_CHANNELS);
  const user = await getCurrentUser();
  const granted: string[] = [];

  for (const ch of requested) {
    if (ch === "me" && user) granted.push(`user:${user.id}`);
    else if (ch === "admin" && user?.role === "ADMIN") granted.push("admin");
    else if (ch.startsWith("availability:") && /^availability:[a-z0-9]{10,40}$/.test(ch)) granted.push(ch);
    else if (ch.startsWith("conversation:") && user) {
      const id = ch.slice("conversation:".length);
      const convo = await db.conversation.findUnique({ where: { id }, select: { customerId: true } });
      if (convo && (convo.customerId === user.id || user.role === "ADMIN")) granted.push(ch);
    }
  }
  if (granted.length === 0) return new Response("No authorised channels", { status: 403 });

  const encoder = new TextEncoder();
  let cleanup: (() => void) | undefined;
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (chunk: string) => {
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          cleanup?.();
        }
      };
      const unsubscribe = await realtimeHub.subscribe(granted, (event: RealtimeEvent) => {
        send(`event: ${event.type}\ndata: ${JSON.stringify({ channel: event.channel, ...event.data })}\n\n`);
      });
      const heartbeat = setInterval(() => send(`: ping\n\n`), 25_000);
      cleanup = () => {
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };
      request.signal.addEventListener("abort", () => cleanup?.());
      if (process.env.VERCEL) setTimeout(() => cleanup?.(), SERVERLESS_STREAM_MS);
      send(`retry: 3000\nevent: ready\ndata: ${JSON.stringify({ channels: granted.length })}\n\n`);
    },
    cancel() {
      cleanup?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
