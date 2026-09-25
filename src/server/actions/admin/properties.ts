"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, pgErrorCode } from "@/server/db";
import { AppError, toActionError, type ActionResult } from "@/server/errors";
import { requireAdmin } from "@/server/auth/guards";
import { audit } from "@/server/services/audit";
import { publish } from "@/server/realtime";
import { deleteStoredImage, processAndStoreImage } from "@/server/services/images";
import { blockSchema, propertySchema, slugify } from "@/lib/admin-validation";
import { parseIsoDate } from "@/lib/dates";
import { toMinorUnits } from "@/lib/format";
import { parseForm } from "../helpers";

function revalidateProperty(slug?: string) {
  revalidatePath("/", "layout");
  if (slug) revalidatePath(`/properties/${slug}`);
}

async function uniqueSlug(base: string, excludeId?: string) {
  let slug = base || "stay";
  for (let i = 2; await db.property.findFirst({ where: { slug, ...(excludeId ? { id: { not: excludeId } } : {}) }, select: { id: true } }); i++) {
    slug = `${base}-${i}`;
  }
  return slug;
}

export async function savePropertyAction(propertyId: string | null, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  let id: string;
  try {
    const admin = await requireAdmin();
    const input = parseForm(propertySchema, formData);
    const slug = await uniqueSlug(input.slug || slugify(input.name), propertyId ?? undefined);
    const amenityRows = await db.amenity.findMany({ where: { slug: { in: input.amenities } }, select: { id: true } });
    const data = {
      name: input.name,
      slug,
      type: input.type,
      featured: input.featured,
      summary: input.summary,
      description: input.description,
      destinationId: input.destinationId,
      neighborhood: input.neighborhood,
      addressLine: input.addressLine,
      latitude: input.latitude,
      longitude: input.longitude,
      maxGuests: input.maxGuests,
      bedrooms: input.bedrooms,
      beds: input.beds,
      bathrooms: input.bathrooms,
      currency: input.currency,
      basePrice: toMinorUnits(input.basePrice, input.currency),
      cleaningFee: toMinorUnits(input.cleaningFee, input.currency),
      minNights: input.minNights,
      maxNights: input.maxNights,
      checkInTime: input.checkInTime,
      checkOutTime: input.checkOutTime,
      houseRules: input.houseRules,
      cancellationPolicy: input.cancellationPolicy,
      cancellationNotes: input.cancellationNotes,
    };
    const previous = propertyId ? await db.property.findUnique({ where: { id: propertyId }, select: { basePrice: true, slug: true } }) : null;
    const saved = await db.$transaction(async (tx) => {
      const p = propertyId ? await tx.property.update({ where: { id: propertyId }, data }) : await tx.property.create({ data: { ...data, status: "DRAFT" } });
      await tx.propertyAmenity.deleteMany({ where: { propertyId: p.id } });
      await tx.propertyAmenity.createMany({ data: amenityRows.map((a) => ({ propertyId: p.id, amenityId: a.id })) });
      await tx.room.deleteMany({ where: { propertyId: p.id } });
      await tx.room.createMany({ data: input.rooms.map((r, i) => ({ ...r, propertyId: p.id, sortOrder: i })) });
      return p;
    });
    id = saved.id;
    await audit({
      actorId: admin.id,
      action: propertyId ? "property.update" : "property.create",
      entityType: "property",
      entityId: saved.id,
      metadata: previous && previous.basePrice !== saved.basePrice ? { basePrice: { from: previous.basePrice, to: saved.basePrice } } : undefined,
    });
    revalidateProperty(saved.slug);
    if (previous && previous.slug !== saved.slug) revalidateProperty(previous.slug);
    if (propertyId) return { ok: true, message: "Changes saved" };
  } catch (error) {
    return toActionError(error);
  }
  redirect(`/admin/properties/${id}?tab=photos&created=1`);
}

export async function setPropertyStatusAction(propertyId: string, status: "DRAFT" | "PUBLISHED" | "ARCHIVED"): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    const property = await db.property.findUniqueOrThrow({ where: { id: propertyId }, include: { _count: { select: { images: true } } } });
    if (status === "PUBLISHED" && property.basePrice <= 0) throw new AppError("VALIDATION", "Set a nightly price before publishing.");
    await db.property.update({ where: { id: propertyId }, data: { status, publishedAt: status === "PUBLISHED" ? (property.publishedAt ?? new Date()) : property.publishedAt } });
    await audit({ actorId: admin.id, action: `property.${status.toLowerCase()}`, entityType: "property", entityId: propertyId });
    revalidateProperty(property.slug);
    const note = status === "PUBLISHED" && property._count.images === 0 ? " Tip: add photos — listings with photos get far more bookings." : "";
    return { ok: true, message: `${status === "PUBLISHED" ? "Published" : status === "ARCHIVED" ? "Archived" : "Moved to draft"}.${note}` };
  } catch (error) {
    return toActionError(error);
  }
}

// --- Photos ---------------------------------------------------------------------

export async function uploadImagesAction(propertyId: string, formData: FormData): Promise<ActionResult<{ uploaded: number; failed: string[] }>> {
  try {
    const admin = await requireAdmin();
    const property = await db.property.findUniqueOrThrow({ where: { id: propertyId }, select: { slug: true, name: true } });
    const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0).slice(0, 20);
    if (!files.length) throw new AppError("VALIDATION", "Choose at least one image.");
    const existing = await db.propertyImage.count({ where: { propertyId } });
    const hasCover = await db.propertyImage.count({ where: { propertyId, isCover: true } });
    let uploaded = 0;
    const failed: string[] = [];
    for (const file of files) {
      try {
        const stored = await processAndStoreImage(file, `properties/${propertyId}`);
        await db.propertyImage.create({
          data: { propertyId, ...stored, alt: `${property.name} — photo ${existing + uploaded + 1}`, sortOrder: existing + uploaded, isCover: !hasCover && existing + uploaded === 0 },
        });
        uploaded++;
      } catch (e) {
        failed.push(`${file.name}: ${e instanceof AppError ? e.message : "could not be processed"}`);
      }
    }
    await audit({ actorId: admin.id, action: "property.images_upload", entityType: "property", entityId: propertyId, metadata: { uploaded, failed: failed.length } });
    revalidateProperty(property.slug);
    return { ok: true, data: { uploaded, failed }, message: `${uploaded} photo${uploaded === 1 ? "" : "s"} uploaded` };
  } catch (error) {
    return toActionError(error);
  }
}

export async function reorderImagesAction(propertyId: string, orderedIds: string[]): Promise<ActionResult> {
  try {
    await requireAdmin();
    const images = await db.propertyImage.findMany({ where: { propertyId }, select: { id: true } });
    const valid = new Set(images.map((i) => i.id));
    await db.$transaction(orderedIds.filter((id) => valid.has(id)).map((id, i) => db.propertyImage.update({ where: { id }, data: { sortOrder: i } })));
    const p = await db.property.findUnique({ where: { id: propertyId }, select: { slug: true } });
    revalidateProperty(p?.slug);
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function setCoverImageAction(propertyId: string, imageId: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    await db.$transaction([
      db.propertyImage.updateMany({ where: { propertyId, isCover: true }, data: { isCover: false } }),
      db.propertyImage.update({ where: { id: imageId, propertyId }, data: { isCover: true } }),
    ]);
    const p = await db.property.findUnique({ where: { id: propertyId }, select: { slug: true } });
    revalidateProperty(p?.slug);
    return { ok: true, message: "Cover photo updated" };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateImageTextAction(imageId: string, alt: string, caption: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    const image = await db.propertyImage.update({ where: { id: imageId }, data: { alt: alt.trim().slice(0, 200), caption: caption.trim().slice(0, 300) || null }, include: { property: { select: { slug: true } } } });
    revalidateProperty(image.property.slug);
    return { ok: true, message: "Saved" };
  } catch (error) {
    return toActionError(error);
  }
}

export async function deleteImageAction(imageId: string): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    const image = await db.propertyImage.delete({ where: { id: imageId }, include: { property: { select: { slug: true } } } });
    await deleteStoredImage(image.storageKey).catch((e) => console.error("[images] delete failed", e));
    if (image.isCover) {
      const next = await db.propertyImage.findFirst({ where: { propertyId: image.propertyId }, orderBy: { sortOrder: "asc" } });
      if (next) await db.propertyImage.update({ where: { id: next.id }, data: { isCover: true } });
    }
    await audit({ actorId: admin.id, action: "property.image_delete", entityType: "property", entityId: image.propertyId });
    revalidateProperty(image.property.slug);
    return { ok: true, message: "Photo deleted" };
  } catch (error) {
    return toActionError(error);
  }
}

// --- Availability blocks ---------------------------------------------------------

export async function addBlockAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    const input = parseForm(blockSchema, formData);
    const start = parseIsoDate(input.startDate);
    const end = parseIsoDate(input.endDate);
    const clash = await db.booking.findFirst({
      where: { propertyId: input.propertyId, status: { in: ["PENDING", "AWAITING_PAYMENT", "PAID", "CONFIRMED"] }, checkIn: { lt: end }, checkOut: { gt: start } },
      select: { reference: true },
    });
    if (clash) throw new AppError("CONFLICT", `Those dates overlap booking ${clash.reference}. Cancel or move it first.`);
    await db.availabilityBlock.create({ data: { propertyId: input.propertyId, startDate: start, endDate: end, reason: input.reason, createdById: admin.id } });
    await audit({ actorId: admin.id, action: "availability.block", entityType: "property", entityId: input.propertyId, metadata: { from: input.startDate, to: input.endDate } });
    await publish(`availability:${input.propertyId}`, "changed");
    revalidatePath("/admin/calendar");
    revalidatePath(`/admin/properties/${input.propertyId}`);
    return { ok: true, message: "Dates blocked" };
  } catch (error) {
    return toActionError(error);
  }
}

export async function removeBlockAction(blockId: string): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    const block = await db.availabilityBlock.delete({ where: { id: blockId } });
    await audit({ actorId: admin.id, action: "availability.unblock", entityType: "property", entityId: block.propertyId });
    await publish(`availability:${block.propertyId}`, "changed");
    revalidatePath("/admin/calendar");
    revalidatePath(`/admin/properties/${block.propertyId}`);
    return { ok: true, message: "Dates reopened" };
  } catch (error) {
    return toActionError(error);
  }
}

export async function deletePropertyAction(propertyId: string): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    const bookings = await db.booking.count({ where: { propertyId } });
    if (bookings > 0) throw new AppError("CONFLICT", "This property has bookings, so it can't be deleted. Archive it instead to hide it from guests.");
    const images = await db.propertyImage.findMany({ where: { propertyId }, select: { storageKey: true } });
    await db.property.delete({ where: { id: propertyId } });
    await Promise.all(images.map((i) => deleteStoredImage(i.storageKey).catch(() => undefined)));
    await audit({ actorId: admin.id, action: "property.delete", entityType: "property", entityId: propertyId });
    revalidatePath("/", "layout");
  } catch (error) {
    if (pgErrorCode(error) === "23503") return { ok: false, error: "This property is referenced by other records. Archive it instead." };
    return toActionError(error);
  }
  redirect("/admin/properties");
}
