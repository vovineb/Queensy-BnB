import { cookies } from "next/headers";
import { z } from "zod";
import { getCurrentUser } from "@/server/auth/session";
import { CLIENT_EVENTS, track, type TrackableEvent } from "@/server/services/analytics";
import { isSameOrigin, prefersNoTracking } from "@/server/request";
import { VISITOR_COOKIE } from "@/lib/constants";

const schema = z.object({
  name: z.string().refine((n): n is TrackableEvent => (CLIENT_EVENTS as readonly string[]).includes(n)),
  path: z.string().max(300).optional(),
  propertyId: z.string().max(40).optional(),
  props: z.record(z.string().max(40), z.union([z.string().max(200), z.number(), z.boolean(), z.null()])).optional(),
});

// Simple per-instance flood control; analytics are best-effort by design.
const hits = new Map<string, { n: number; t: number }>();
function allow(visitor: string) {
  const now = Date.now();
  const h = hits.get(visitor);
  if (!h || now - h.t > 60_000) {
    hits.set(visitor, { n: 1, t: now });
    if (hits.size > 50_000) hits.clear();
    return true;
  }
  return ++h.n <= 120;
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return new Response(null, { status: 403 });
  if (prefersNoTracking(request.headers)) return new Response(null, { status: 204 });
  const visitorId = (await cookies()).get(VISITOR_COOKIE)?.value;
  if (!visitorId || !allow(visitorId)) return new Response(null, { status: 204 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return new Response(null, { status: 400 });
  const user = await getCurrentUser();
  await track({ ...parsed.data, visitorId, userId: user?.id, props: parsed.data.props });
  return new Response(null, { status: 204 });
}
