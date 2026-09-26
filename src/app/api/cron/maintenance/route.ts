import { safeEqual } from "@/server/crypto";
import { runBookingMaintenance } from "@/server/services/availability";
import { purgeRateLimits } from "@/server/services/rate-limit";
import { purgeOldEvents } from "@/server/services/analytics";
import { db } from "@/server/db";

/**
 * Scheduled maintenance: expire lapsed booking holds, complete finished stays,
 * purge expired sessions/tokens/rate-limit rows and old analytics events.
 * Call every 5–15 minutes with `Authorization: Bearer $CRON_SECRET`. On Vercel,
 * vercel.json schedules it (Vercel Cron sends the same header automatically when
 * CRON_SECRET is set); holds also expire on demand whenever calendars are read.
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization") ?? "";
  if (!secret || !safeEqual(auth, `Bearer ${secret}`)) return new Response("Unauthorized", { status: 401 });
  const bookings = await runBookingMaintenance();
  await purgeRateLimits();
  await purgeOldEvents();
  await db.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  await db.authToken.deleteMany({ where: { expiresAt: { lt: new Date(Date.now() - 7 * 86_400_000) } } });
  return Response.json({ ok: true, ...bookings });
}

export const GET = POST;
