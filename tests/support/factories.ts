import { db } from "@/server/db";
import { addDays, toIsoDate } from "@/lib/dates";
import { today } from "@/server/services/availability";
import type { SessionUser } from "@/server/auth/session";

let seq = 0;
const uid = () => `${Date.now().toString(36)}${(seq++).toString(36)}`;

export async function resetDb() {
  const tables = await db.$queryRaw<{ tablename: string }[]>`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  await db.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(", ")} RESTART IDENTITY CASCADE`);
}

export async function makeUser(overrides: Partial<{ role: "CUSTOMER" | "ADMIN"; email: string; name: string; phone: string }> = {}): Promise<SessionUser> {
  const u = await db.user.create({
    data: { email: overrides.email ?? `user-${uid()}@example.com`, name: overrides.name ?? "Test Guest", phone: overrides.phone ?? "+254712345678", role: overrides.role ?? "CUSTOMER" },
  });
  return { id: u.id, email: u.email, name: u.name, phone: u.phone, role: u.role, emailVerifiedAt: u.emailVerifiedAt };
}

export async function makeProperty(overrides: Partial<{ basePrice: number; cleaningFee: number; maxGuests: number; minNights: number; status: "PUBLISHED" | "DRAFT" }> = {}) {
  return db.property.create({
    data: {
      slug: `stay-${uid()}`,
      name: "Test Stay",
      summary: "A test stay",
      description: "Test description",
      status: overrides.status ?? "PUBLISHED",
      maxGuests: overrides.maxGuests ?? 4,
      bedrooms: 2,
      beds: 2,
      basePrice: overrides.basePrice ?? 550000,
      cleaningFee: overrides.cleaningFee ?? 0,
      minNights: overrides.minNights ?? 1,
      currency: "KES",
    },
  });
}

/** ISO date `n` days from today (Nairobi). */
export const inDays = (n: number) => toIsoDate(addDays(today(), n));

export function stay(propertyId: string, from: number, to: number, extra: Partial<{ adults: number; children: number; expectedTotal: number }> = {}) {
  return { propertyId, checkIn: inDays(from), checkOut: inDays(to), adults: extra.adults ?? 2, children: extra.children ?? 0, infants: 0, guestPhone: "+254712345678", expectedTotal: extra.expectedTotal };
}
