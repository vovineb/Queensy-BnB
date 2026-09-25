import "server-only";
import { db } from "@/server/db";
import { isIsoDate, parseIsoDate } from "@/lib/dates";
import type { BookingStatus, Prisma } from "@/generated/prisma/client";

export const BOOKING_STATUSES: BookingStatus[] = ["PENDING", "AWAITING_PAYMENT", "PAID", "CONFIRMED", "COMPLETED", "CANCELLED", "EXPIRED", "REFUNDED"];

export type BookingFilters = { q?: string; status?: string; propertyId?: string; from?: string; to?: string; page?: string };

export function bookingWhere(f: BookingFilters): Prisma.BookingWhereInput {
  const and: Prisma.BookingWhereInput[] = [];
  if (f.status && (BOOKING_STATUSES as string[]).includes(f.status)) and.push({ status: f.status as BookingStatus });
  if (f.propertyId) and.push({ propertyId: f.propertyId });
  if (f.from && isIsoDate(f.from)) and.push({ checkOut: { gt: parseIsoDate(f.from) } });
  if (f.to && isIsoDate(f.to)) and.push({ checkIn: { lt: parseIsoDate(f.to) } });
  if (f.q?.trim()) {
    const q = f.q.trim();
    and.push({ OR: [{ reference: { contains: q, mode: "insensitive" } }, { guestName: { contains: q, mode: "insensitive" } }, { guestEmail: { contains: q, mode: "insensitive" } }, { guestPhone: { contains: q } }] });
  }
  return { AND: and };
}

export async function listAdminBookings(f: BookingFilters, pageSize = 25) {
  const page = Math.max(1, Number.parseInt(f.page ?? "1", 10) || 1);
  const where = bookingWhere(f);
  const [total, rows] = await Promise.all([
    db.booking.count({ where }),
    db.booking.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true, reference: true, status: true, checkIn: true, checkOut: true, nights: true, total: true, currency: true,
        guestName: true, guestEmail: true, createdAt: true, expiresAt: true, legacyId: true, property: { select: { name: true } },
      },
    }),
  ]);
  return { total, page, pageCount: Math.max(1, Math.ceil(total / pageSize)), rows };
}

export async function getAdminBooking(id: string) {
  return db.booking.findUnique({
    where: { id },
    include: {
      property: { select: { id: true, name: true, slug: true, currency: true } },
      user: { select: { id: true, name: true, email: true, phone: true, createdAt: true } },
      offer: { select: { title: true } },
      events: { orderBy: { createdAt: "asc" }, include: { actor: { select: { name: true } } } },
      payments: { orderBy: { createdAt: "asc" }, include: { recordedBy: { select: { name: true } } } },
      conversations: { select: { id: true, subject: true } },
    },
  });
}
