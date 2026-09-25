import "server-only";
import { db, pgErrorCode } from "@/server/db";
import { AppError } from "@/server/errors";
import type { SessionUser } from "@/server/auth/session";
import { stayIsReviewable } from "./bookings";
import { audit } from "./audit";

export async function recomputePropertyRating(propertyId: string) {
  const agg = await db.review.aggregate({ where: { propertyId, status: "PUBLISHED" }, _avg: { rating: true }, _count: true });
  await db.property.update({
    where: { id: propertyId },
    data: { ratingAverage: agg._count ? agg._avg.rating : null, reviewCount: agg._count },
  });
}

/** Guests can review a stay they actually completed, once. */
export async function submitReview(
  user: SessionUser,
  input: { bookingId: string; hostRating: number; amenitiesRating: number; cleanlinessRating: number; neighborhoodRating: number; comment?: string },
) {
  const booking = await db.booking.findUnique({ where: { id: input.bookingId }, select: { id: true, userId: true, propertyId: true, status: true, checkOut: true } });
  if (!booking || booking.userId !== user.id) throw new AppError("NOT_FOUND", "Booking not found.");
  if (!stayIsReviewable(booking)) throw new AppError("FORBIDDEN", "You can leave a review after your stay.");
  const rating = (input.hostRating + input.amenitiesRating + input.cleanlinessRating + input.neighborhoodRating) / 4;
  try {
    await db.review.create({
      data: {
        propertyId: booking.propertyId,
        bookingId: booking.id,
        userId: user.id,
        authorName: user.name.split(" ")[0] ?? user.name,
        rating: Math.round(rating * 10) / 10,
        hostRating: input.hostRating,
        amenitiesRating: input.amenitiesRating,
        cleanlinessRating: input.cleanlinessRating,
        neighborhoodRating: input.neighborhoodRating,
        comment: input.comment || null,
      },
    });
  } catch (error) {
    if (pgErrorCode(error) === "23505") throw new AppError("CONFLICT", "You've already reviewed this stay.");
    throw error;
  }
  await recomputePropertyRating(booking.propertyId);
}

export async function setReviewStatus(admin: SessionUser, reviewId: string, status: "PUBLISHED" | "HIDDEN") {
  const review = await db.review.update({ where: { id: reviewId }, data: { status } });
  await recomputePropertyRating(review.propertyId);
  await audit({ actorId: admin.id, action: `review.${status.toLowerCase()}`, entityType: "review", entityId: reviewId });
  return review;
}
