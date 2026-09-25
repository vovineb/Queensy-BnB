"use server";

import { revalidatePath } from "next/cache";
import { toActionError, type ActionResult } from "@/server/errors";
import { requireAdmin } from "@/server/auth/guards";
import { extendHold, recordManualPayment, transitionBooking } from "@/server/services/bookings";
import { paymentSchema } from "@/lib/admin-validation";
import { toMinorUnits } from "@/lib/format";
import { db } from "@/server/db";
import type { BookingStatus } from "@/generated/prisma/client";
import { parseForm } from "../helpers";

const LABELS: Partial<Record<BookingStatus, string>> = {
  AWAITING_PAYMENT: "Approved — waiting for payment",
  CONFIRMED: "Booking confirmed",
  PAID: "Marked as paid",
  CANCELLED: "Booking cancelled",
  REFUNDED: "Marked as refunded",
  COMPLETED: "Marked as completed",
};

export async function transitionBookingAction(bookingId: string, to: BookingStatus, reason?: string): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    await transitionBooking(admin, bookingId, to, { reason: reason?.trim().slice(0, 500) || undefined });
    revalidatePath(`/admin/bookings/${bookingId}`);
    revalidatePath("/admin/bookings");
    return { ok: true, message: LABELS[to] ?? "Updated" };
  } catch (error) {
    return toActionError(error);
  }
}

export async function extendHoldAction(bookingId: string, hours: number): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    await extendHold(admin, bookingId, Math.min(168, Math.max(1, Math.round(hours))));
    revalidatePath(`/admin/bookings/${bookingId}`);
    return { ok: true, message: `Hold extended by ${hours} hours` };
  } catch (error) {
    return toActionError(error);
  }
}

export async function recordPaymentAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    const input = parseForm(paymentSchema, formData);
    const booking = await db.booking.findUniqueOrThrow({ where: { id: input.bookingId }, select: { currency: true } });
    await recordManualPayment(admin, input.bookingId, {
      amount: toMinorUnits(input.amount, booking.currency),
      method: input.method,
      reference: input.reference ?? undefined,
      markConfirmed: input.markConfirmed,
    });
    revalidatePath(`/admin/bookings/${input.bookingId}`);
    return { ok: true, message: "Payment recorded" };
  } catch (error) {
    return toActionError(error);
  }
}
