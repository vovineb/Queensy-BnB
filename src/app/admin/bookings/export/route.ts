import { db } from "@/server/db";
import { getCurrentUser } from "@/server/auth/session";
import { bookingWhere } from "@/server/services/admin/bookings";
import { audit } from "@/server/services/audit";
import { fromMinorUnits } from "@/lib/format";
import { toIsoDate } from "@/lib/dates";

// Neutralise spreadsheet formula injection and quote every cell.
function cell(value: unknown): string {
  let s = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return new Response("Forbidden", { status: 403 });
  const filters = Object.fromEntries(new URL(request.url).searchParams);
  const rows = await db.booking.findMany({ where: bookingWhere(filters), orderBy: { createdAt: "desc" }, take: 10_000, include: { property: { select: { name: true } }, payments: { where: { status: "SUCCEEDED" }, select: { amount: true } } } });
  const header = ["Reference", "Status", "Property", "Guest", "Email", "Phone", "Check-in", "Check-out", "Nights", "Adults", "Children", "Infants", "Currency", "Subtotal", "Discount", "Cleaning fee", "Total", "Paid", "Requested at"];
  const lines = rows.map((b) =>
    [
      b.reference, b.status, b.property.name, b.guestName, b.guestEmail, b.guestPhone, toIsoDate(b.checkIn), toIsoDate(b.checkOut), b.nights, b.adults, b.children, b.infants, b.currency,
      fromMinorUnits(b.subtotal, b.currency), fromMinorUnits(b.discountAmount, b.currency), fromMinorUnits(b.cleaningFee, b.currency), fromMinorUnits(b.total, b.currency),
      fromMinorUnits(b.payments.reduce((s, p) => s + p.amount, 0), b.currency), b.createdAt.toISOString(),
    ].map(cell).join(","),
  );
  await audit({ actorId: user.id, action: "booking.export", entityType: "booking", metadata: { rows: rows.length } });
  return new Response("﻿" + [header.map(cell).join(","), ...lines].join("\r\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="queensy-bookings-${toIsoDate(new Date())}.csv"`, "Cache-Control": "no-store" },
  });
}
