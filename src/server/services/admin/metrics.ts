import "server-only";
import { db } from "@/server/db";
import { addDays, toIsoDate } from "@/lib/dates";
import { today } from "../availability";

// Only metrics the system can compute reliably. Revenue is split into what was
// actually *recorded as paid* vs the value of confirmed bookings, clearly labelled.

export async function dashboardMetrics(days = 30) {
  const since = new Date(Date.now() - days * 86_400_000);
  const t = today();
  const [
    bookingsCreated,
    pendingRequests,
    confirmedValue,
    paymentsRecorded,
    activeListings,
    customers,
    newCustomers,
    openInquiries,
    upcomingArrivals,
    currencies,
  ] = await Promise.all([
    db.booking.count({ where: { createdAt: { gte: since }, legacyId: null } }),
    db.booking.count({ where: { status: { in: ["PENDING", "AWAITING_PAYMENT"] } } }),
    db.booking.groupBy({ by: ["currency"], where: { createdAt: { gte: since }, status: { in: ["CONFIRMED", "PAID", "COMPLETED"] } }, _sum: { total: true } }),
    db.payment.groupBy({ by: ["currency"], where: { createdAt: { gte: since }, status: "SUCCEEDED" }, _sum: { amount: true } }),
    db.property.count({ where: { status: "PUBLISHED" } }),
    db.user.count({ where: { role: "CUSTOMER" } }),
    db.user.count({ where: { role: "CUSTOMER", createdAt: { gte: since } } }),
    db.inquiry.count({ where: { status: { in: ["NEW", "IN_PROGRESS"] } } }),
    db.booking.count({ where: { status: { in: ["CONFIRMED", "PAID"] }, checkIn: { gte: t, lt: addDays(t, 7) } } }),
    db.property.groupBy({ by: ["currency"] }),
  ]);
  return {
    days,
    bookingsCreated,
    pendingRequests,
    confirmedValue: confirmedValue.map((r) => ({ currency: r.currency, amount: r._sum.total ?? 0 })),
    paymentsRecorded: paymentsRecorded.map((r) => ({ currency: r.currency, amount: r._sum.amount ?? 0 })),
    activeListings,
    customers,
    newCustomers,
    openInquiries,
    upcomingArrivals,
    defaultCurrency: currencies[0]?.currency ?? process.env.DEFAULT_CURRENCY ?? "KES",
  };
}

/** Booking requests per day (zero-filled), for the trend chart. */
export async function bookingTrend(days = 30) {
  const start = addDays(today(), -(days - 1));
  const rows = await db.$queryRaw<{ day: Date; n: bigint }[]>`
    SELECT (created_at AT TIME ZONE 'Africa/Nairobi')::date AS day, count(*)::bigint AS n
    FROM bookings WHERE created_at >= ${start} AND legacy_id IS NULL
    GROUP BY 1 ORDER BY 1`;
  const byDay = new Map(rows.map((r) => [toIsoDate(r.day), Number(r.n)]));
  return Array.from({ length: days }, (_, i) => {
    const d = toIsoDate(addDays(start, i));
    return { day: d, bookings: byDay.get(d) ?? 0 };
  });
}

/** Per-property engagement: views, booking starts and requests in the window. */
export async function propertyPerformance(days = 30) {
  const since = new Date(Date.now() - days * 86_400_000);
  const [properties, events, bookings] = await Promise.all([
    db.property.findMany({ where: { status: { not: "ARCHIVED" } }, select: { id: true, name: true, slug: true, status: true } }),
    db.analyticsEvent.groupBy({ by: ["propertyId", "name"], where: { createdAt: { gte: since }, propertyId: { not: null }, name: { in: ["property_view", "booking_started", "favorite_added"] } }, _count: true }),
    db.booking.groupBy({ by: ["propertyId"], where: { createdAt: { gte: since }, legacyId: null }, _count: true }),
  ]);
  return properties
    .map((p) => {
      const count = (name: string) => events.find((e) => e.propertyId === p.id && e.name === name)?._count ?? 0;
      return {
        ...p,
        views: count("property_view"),
        starts: count("booking_started"),
        saves: count("favorite_added"),
        requests: bookings.find((b) => b.propertyId === p.id)?._count ?? 0,
      };
    })
    .sort((a, b) => b.views - a.views || b.requests - a.requests);
}

/** Things that need an admin's attention now. */
export async function attentionItems() {
  const soon = new Date(Date.now() + 6 * 3_600_000);
  const [expiring, unansweredConversations, newInquiries] = await Promise.all([
    db.booking.findMany({
      where: { status: { in: ["PENDING", "AWAITING_PAYMENT"] }, expiresAt: { lte: soon } },
      orderBy: { expiresAt: "asc" },
      take: 8,
      select: { id: true, reference: true, guestName: true, expiresAt: true, status: true, property: { select: { name: true } } },
    }),
    db.$queryRaw<{ n: bigint }[]>`
      SELECT count(DISTINCT c.id)::bigint AS n FROM conversations c
      JOIN LATERAL (SELECT from_staff FROM messages m WHERE m.conversation_id = c.id ORDER BY created_at DESC LIMIT 1) last ON true
      WHERE c.status = 'OPEN' AND last.from_staff = false`,
    db.inquiry.count({ where: { status: "NEW" } }),
  ]);
  return { expiring, awaitingReply: Number(unansweredConversations[0]?.n ?? 0), newInquiries };
}

export async function recentActivity(take = 12) {
  return db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take, include: { actor: { select: { name: true } } } });
}

/** Engagement analytics for the analytics page. */
export async function engagement(days = 30) {
  const since = new Date(Date.now() - days * 86_400_000);
  const [byName, visitors, returning, topSearches, signups] = await Promise.all([
    db.analyticsEvent.groupBy({ by: ["name"], where: { createdAt: { gte: since } }, _count: true }),
    db.$queryRaw<{ n: bigint }[]>`SELECT count(DISTINCT visitor_id)::bigint AS n FROM analytics_events WHERE created_at >= ${since}`,
    db.$queryRaw<{ n: bigint }[]>`
      SELECT count(*)::bigint AS n FROM (
        SELECT visitor_id FROM analytics_events WHERE created_at >= ${since}
        GROUP BY visitor_id HAVING count(DISTINCT (created_at AT TIME ZONE 'Africa/Nairobi')::date) > 1) r`,
    db.$queryRaw<{ destination: string | null; n: bigint }[]>`
      SELECT props->>'destination' AS destination, count(*)::bigint AS n FROM analytics_events
      WHERE name = 'search' AND created_at >= ${since} GROUP BY 1 ORDER BY 2 DESC LIMIT 8`,
    db.user.count({ where: { createdAt: { gte: since }, role: "CUSTOMER" } }),
  ]);
  const count = (n: string) => byName.find((b) => b.name === n)?._count ?? 0;
  const requests = await db.booking.count({ where: { createdAt: { gte: since }, legacyId: null } });
  return {
    days,
    uniqueVisitors: Number(visitors[0]?.n ?? 0),
    returningVisitors: Number(returning[0]?.n ?? 0),
    pageViews: count("page_view"),
    propertyViews: count("property_view"),
    searches: count("search"),
    filtersUsed: count("filter_used"),
    favorites: count("favorite_added"),
    bookingStarts: count("booking_started"),
    bookingRequests: requests,
    cancellations: count("booking_cancelled"),
    messages: count("message_sent"),
    contactStarts: count("contact_started"),
    signups,
    topSearches: topSearches.map((r) => ({ destination: r.destination ?? "Any / free text", count: Number(r.n) })),
  };
}

/**
 * Customers who started a booking but did not submit one within 24h. Returned
 * for follow-up review only; being listed here does NOT imply marketing consent.
 */
export async function abandonedBookingFlows(days = 30) {
  const since = new Date(Date.now() - days * 86_400_000);
  return db.$queryRaw<{ user_id: string; name: string; email: string; property_name: string | null; started_at: Date; marketing: boolean }[]>`
    SELECT DISTINCT ON (e.user_id) e.user_id, u.name, u.email, p.name AS property_name, e.created_at AS started_at,
      COALESCE(mp.email OR mp.sms OR mp.whatsapp, false) AS marketing
    FROM analytics_events e
    JOIN users u ON u.id = e.user_id
    LEFT JOIN properties p ON p.id = e.property_id
    LEFT JOIN marketing_preferences mp ON mp.user_id = u.id
    WHERE e.name = 'booking_started' AND e.user_id IS NOT NULL AND e.created_at >= ${since}
      AND e.created_at < now() - interval '24 hours'
      AND NOT EXISTS (SELECT 1 FROM bookings b WHERE b.user_id = e.user_id AND b.created_at >= e.created_at)
    ORDER BY e.user_id, e.created_at DESC
    LIMIT 100`;
}
