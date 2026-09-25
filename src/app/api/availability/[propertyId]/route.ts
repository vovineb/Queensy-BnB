import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { getCalendar, maybeRunMaintenance } from "@/server/services/availability";
import { getSettings } from "@/server/services/settings";

/** Public availability calendar for a published property. */
export async function GET(_request: Request, ctx: { params: Promise<{ propertyId: string }> }) {
  const { propertyId } = await ctx.params;
  const property = await db.property.findUnique({ where: { id: propertyId }, select: { status: true, minNights: true, maxNights: true } });
  if (!property || property.status !== "PUBLISHED") return NextResponse.json({ error: "Not found" }, { status: 404 });
  await maybeRunMaintenance();
  const settings = await getSettings();
  const calendar = await getCalendar(propertyId, settings.bookingHorizonDays);
  return NextResponse.json({ ...calendar, minNights: property.minNights, maxNights: property.maxNights }, { headers: { "Cache-Control": "no-store" } });
}
