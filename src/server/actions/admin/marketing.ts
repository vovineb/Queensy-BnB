"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { toActionError, type ActionResult } from "@/server/errors";
import { requireAdmin } from "@/server/auth/guards";
import { audit } from "@/server/services/audit";
import { sendMarketingEmail } from "@/server/services/notifications";
import { processAndStoreImage } from "@/server/services/images";
import { announcementSchema, destinationSchema, offerSchema, slugify } from "@/lib/admin-validation";
import { parseIsoDate } from "@/lib/dates";
import { formatMoney, toMinorUnits } from "@/lib/format";
import { parseForm } from "../helpers";

const currency = () => process.env.DEFAULT_CURRENCY || "KES";

// --- Offers ------------------------------------------------------------------------

export async function saveOfferAction(offerId: string | null, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  let result: ActionResult;
  try {
    const admin = await requireAdmin();
    const input = parseForm(offerSchema, formData);
    const data = {
      title: input.title,
      description: input.description,
      promoCopy: input.promoCopy,
      imageUrl: input.imageUrl,
      discountType: input.discountType,
      discountValue: input.discountType === "FIXED" ? toMinorUnits(input.discountValue, currency()) : Math.round(input.discountValue),
      minNights: input.minNights,
      startsAt: parseIsoDate(input.startsAt),
      endsAt: parseIsoDate(input.endsAt),
      active: input.active,
      showBanner: input.showBanner,
      appliesToAll: input.appliesToAll,
    };
    const offer = await db.$transaction(async (tx) => {
      const o = offerId ? await tx.offer.update({ where: { id: offerId }, data }) : await tx.offer.create({ data });
      await tx.offerProperty.deleteMany({ where: { offerId: o.id } });
      if (!input.appliesToAll) await tx.offerProperty.createMany({ data: input.propertyIds.map((propertyId) => ({ offerId: o.id, propertyId })) });
      return o;
    });
    await audit({ actorId: admin.id, action: offerId ? "offer.update" : "offer.create", entityType: "offer", entityId: offer.id });
    let message = "Offer saved";
    if (input.notifySubscribers && offer.active) {
      const discount = offer.discountType === "PERCENT" ? `${offer.discountValue}% off` : `${formatMoney(offer.discountValue, currency())} off`;
      const r = await sendMarketingEmail({ type: "offer", title: offer.title, body: `${discount}. ${offer.description ?? ""}`.trim(), link: "/offers" });
      message += ` · emailed ${r.sent} of ${r.recipients} opted-in customers`;
    }
    revalidatePath("/", "layout");
    result = { ok: true, message: message };
  } catch (error) {
    return toActionError(error);
  }
  if (!offerId) redirect("/admin/offers");
  return result;
}

export async function deleteOfferAction(offerId: string): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    const used = await db.booking.count({ where: { offerId } });
    if (used > 0) {
      await db.offer.update({ where: { id: offerId }, data: { active: false } });
      await audit({ actorId: admin.id, action: "offer.deactivate", entityType: "offer", entityId: offerId });
      revalidatePath("/", "layout");
      return { ok: true, message: "This offer was used by bookings, so it was deactivated instead of deleted." };
    }
    await db.offer.delete({ where: { id: offerId } });
    await audit({ actorId: admin.id, action: "offer.delete", entityType: "offer", entityId: offerId });
    revalidatePath("/", "layout");
    return { ok: true, message: "Offer deleted" };
  } catch (error) {
    return toActionError(error);
  }
}

// --- Announcements ---------------------------------------------------------------

export async function saveAnnouncementAction(id: string | null, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  let result: ActionResult;
  try {
    const admin = await requireAdmin();
    const input = parseForm(announcementSchema, formData);
    let slug = input.slug || slugify(input.title) || "update";
    for (let i = 2; await db.announcement.findFirst({ where: { slug, ...(id ? { id: { not: id } } : {}) }, select: { id: true } }); i++) slug = `${slugify(input.title)}-${i}`;
    const data = {
      title: input.title,
      slug,
      body: input.body,
      kind: input.kind,
      imageUrl: input.imageUrl,
      ctaLabel: input.ctaLabel,
      ctaUrl: input.ctaUrl,
      status: input.status,
      publishAt: parseIsoDate(input.publishAt),
      expiresAt: input.expiresAt ? parseIsoDate(input.expiresAt) : null,
    };
    const a = id ? await db.announcement.update({ where: { id }, data }) : await db.announcement.create({ data });
    await audit({ actorId: admin.id, action: id ? "announcement.update" : "announcement.create", entityType: "announcement", entityId: a.id, metadata: { status: a.status } });
    let message = "Announcement saved";
    if (input.notifySubscribers && a.status === "PUBLISHED") {
      const r = await sendMarketingEmail({ type: "announcement", title: a.title, body: a.body.slice(0, 400), link: `/announcements/${a.slug}` });
      message += ` · emailed ${r.sent} of ${r.recipients} opted-in customers`;
    }
    revalidatePath("/", "layout");
    result = { ok: true, message: message };
  } catch (error) {
    return toActionError(error);
  }
  if (!id) redirect("/admin/announcements");
  return result;
}

export async function deleteAnnouncementAction(id: string): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    await db.announcement.delete({ where: { id } });
    await audit({ actorId: admin.id, action: "announcement.delete", entityType: "announcement", entityId: id });
    revalidatePath("/", "layout");
    return { ok: true, message: "Announcement deleted" };
  } catch (error) {
    return toActionError(error);
  }
}

// --- Destinations ------------------------------------------------------------------

export async function saveDestinationAction(id: string | null, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  let result: ActionResult;
  try {
    const admin = await requireAdmin();
    const input = parseForm(destinationSchema, formData);
    const slug = input.slug || slugify(input.name);
    const data = { ...input, slug };
    const d = id ? await db.destination.update({ where: { id }, data }) : await db.destination.create({ data });
    await audit({ actorId: admin.id, action: id ? "destination.update" : "destination.create", entityType: "destination", entityId: d.id });
    revalidatePath("/", "layout");
    result = { ok: true, message: "Destination saved" };
  } catch (error) {
    return toActionError(error);
  }
  if (!id) redirect("/admin/destinations");
  return result;
}

// --- Generic marketing image upload (offers, announcements, destinations, hero) ------

export async function uploadMarketingImageAction(formData: FormData): Promise<ActionResult<{ url: string }>> {
  try {
    await requireAdmin();
    const file = formData.get("file");
    if (!(file instanceof File)) return { ok: false, error: "Choose an image" };
    const stored = await processAndStoreImage(file, "marketing");
    return { ok: true, data: { url: stored.url } };
  } catch (error) {
    return toActionError(error);
  }
}
