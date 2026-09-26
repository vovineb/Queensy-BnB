import "server-only";
import { db } from "@/server/db";
import type { Prisma } from "@/generated/prisma/client";

// First-party, privacy-conscious product analytics. Events carry a random
// visitor id (cookie), optionally the user id, and small non-sensitive props.
// A provider (GA4, PostHog, Plausible...) can be added by forwarding from track().

export const TRACKABLE_EVENTS = [
  "page_view",
  "property_view",
  "search",
  "filter_used",
  "favorite_added",
  "favorite_removed",
  "booking_started",
  "booking_completed",
  "booking_cancelled",
  "contact_started",
  "message_sent",
  "signup",
  "login",
  "gallery_opened",
] as const;
export type TrackableEvent = (typeof TRACKABLE_EVENTS)[number];

/** Events the browser may send directly. Server-confirmed events are recorded server-side only. */
export const CLIENT_EVENTS: readonly TrackableEvent[] = ["page_view", "property_view", "search", "filter_used", "booking_started", "contact_started", "gallery_opened"];

export type TrackInput = {
  name: TrackableEvent;
  visitorId: string;
  userId?: string | null;
  propertyId?: string | null;
  path?: string | null;
  props?: Prisma.InputJsonValue;
};

export async function track(input: TrackInput): Promise<void> {
  try {
    await db.analyticsEvent.create({
      data: {
        name: input.name,
        visitorId: input.visitorId.slice(0, 64),
        userId: input.userId ?? null,
        propertyId: input.propertyId ?? null,
        path: input.path?.slice(0, 300) ?? null,
        props: input.props,
      },
    });
  } catch (error) {
    console.error("[analytics] failed to record event", error);
  }
}

/** Removes raw events older than the retention window (default 13 months). */
export async function purgeOldEvents(retentionDays = 395) {
  await db.$executeRaw`DELETE FROM analytics_events WHERE created_at < now() - make_interval(days => ${retentionDays})`;
}
