"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { toActionError, type ActionResult } from "@/server/errors";
import { requireUser } from "@/server/auth/guards";
import { createBooking, transitionBooking } from "@/server/services/bookings";
import { submitReview } from "@/server/services/reviews";
import { toggleFavorite } from "@/server/services/favorites";
import { track } from "@/server/services/analytics";
import { bookingRequestSchema, cancelBookingSchema, reviewSchema } from "@/lib/validation";
import { parseForm, visitorId } from "./helpers";

export async function createBookingAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  let reference: string;
  try {
    const user = await requireUser();
    const input = parseForm(bookingRequestSchema, formData);
    const booking = await createBooking(user, input);
    reference = booking.reference;
    const vid = await visitorId();
    if (vid) await track({ name: "booking_completed", visitorId: vid, userId: user.id, propertyId: booking.propertyId, props: { nights: booking.nights } });
  } catch (error) {
    return toActionError(error);
  }
  redirect(`/account/bookings/${reference}?new=1`);
}

export async function cancelBookingAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const { bookingId, reason } = parseForm(cancelBookingSchema, formData);
    const booking = await transitionBooking(user, bookingId, "CANCELLED", { reason });
    const vid = await visitorId();
    if (vid) await track({ name: "booking_cancelled", visitorId: vid, userId: user.id, propertyId: booking.propertyId });
    revalidatePath(`/account/bookings/${booking.reference}`);
    revalidatePath("/account/bookings");
    return { ok: true, message: "Your booking has been cancelled." };
  } catch (error) {
    return toActionError(error);
  }
}

export async function submitReviewAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const input = parseForm(reviewSchema, formData);
    await submitReview(user, input);
    revalidatePath("/account/bookings", "layout");
    return { ok: true, message: "Thanks for your review!" };
  } catch (error) {
    return toActionError(error);
  }
}

export async function toggleFavoriteAction(propertyId: string): Promise<ActionResult<{ favorited: boolean }>> {
  try {
    const user = await requireUser();
    const favorited = await toggleFavorite(user.id, propertyId);
    const vid = await visitorId();
    if (vid) await track({ name: favorited ? "favorite_added" : "favorite_removed", visitorId: vid, userId: user.id, propertyId });
    revalidatePath("/account/saved");
    return { ok: true, data: { favorited } };
  } catch (error) {
    return toActionError(error);
  }
}
