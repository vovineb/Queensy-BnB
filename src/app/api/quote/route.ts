import { NextResponse } from "next/server";
import { z } from "zod";
import { isAppError } from "@/server/errors";
import { quoteStay } from "@/server/services/bookings";
import { isoDateSchema } from "@/lib/validation";

const schema = z.object({
  propertyId: z.string().min(1).max(40),
  checkIn: isoDateSchema,
  checkOut: isoDateSchema,
  adults: z.coerce.number().int().min(1).max(50).default(1),
  children: z.coerce.number().int().min(0).max(50).default(0),
  infants: z.coerce.number().int().min(0).max(20).default(0),
});

/** Server-authoritative price + availability for a stay. */
export async function GET(request: Request) {
  const parsed = schema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  try {
    const result = await quoteStay(parsed.data.propertyId, parsed.data);
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (isAppError(error)) return NextResponse.json({ error: error.message, fieldErrors: error.fieldErrors }, { status: error.status });
    console.error(error);
    return NextResponse.json({ error: "Couldn't calculate a price right now." }, { status: 500 });
  }
}
