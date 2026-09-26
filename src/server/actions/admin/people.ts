"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { AppError, toActionError, type ActionResult } from "@/server/errors";
import { requireAdmin } from "@/server/auth/guards";
import { canManageAdmins, isOwner, ownerEmail } from "@/server/auth/owner";
import { audit } from "@/server/services/audit";
import { setReviewStatus } from "@/server/services/reviews";
import { setConversationStatus } from "@/server/services/messaging";
import { addProspectNote, prospectFromUser, updateProspect } from "@/server/services/leads";
import { saveSettings, settingsSchema } from "@/server/services/settings";
import { settingsFormSchema } from "@/lib/admin-validation";
import type { InquiryStatus, ProspectStatus, Role } from "@/generated/prisma/client";
import { parseForm } from "../helpers";

export async function setUserRoleAction(userId: string, role: Role): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    if (userId === admin.id) throw new AppError("FORBIDDEN", "You can't change your own role.");
    if (!canManageAdmins(admin)) throw new AppError("FORBIDDEN", `Only the site owner (${ownerEmail()}) can grant or remove admin access.`);
    if (role === "CUSTOMER") {
      const admins = await db.user.count({ where: { role: "ADMIN", status: "ACTIVE" } });
      if (admins <= 1) throw new AppError("FORBIDDEN", "There must be at least one active admin.");
    }
    await db.user.update({ where: { id: userId }, data: { role } });
    await db.session.deleteMany({ where: { userId } }); // force re-login with new privileges
    await audit({ actorId: admin.id, action: "user.role_change", entityType: "user", entityId: userId, metadata: { role } });
    revalidatePath(`/admin/users/${userId}`);
    return { ok: true, message: role === "ADMIN" ? "User is now an admin" : "Admin access removed" };
  } catch (error) {
    return toActionError(error);
  }
}

export async function setUserStatusAction(userId: string, status: "ACTIVE" | "DEACTIVATED"): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    if (userId === admin.id) throw new AppError("FORBIDDEN", "You can't deactivate your own account.");
    const target = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true } });
    if (isOwner(target)) throw new AppError("FORBIDDEN", "The site owner's account can't be deactivated.");
    await db.user.update({ where: { id: userId }, data: { status } });
    if (status === "DEACTIVATED") await db.session.deleteMany({ where: { userId } });
    await audit({ actorId: admin.id, action: `user.${status.toLowerCase()}`, entityType: "user", entityId: userId });
    revalidatePath(`/admin/users/${userId}`);
    return { ok: true, message: status === "ACTIVE" ? "Account reactivated" : "Account deactivated and signed out" };
  } catch (error) {
    return toActionError(error);
  }
}

export async function setReviewStatusAction(reviewId: string, status: "PUBLISHED" | "HIDDEN"): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    const review = await setReviewStatus(admin, reviewId, status);
    revalidatePath("/admin/reviews");
    const p = await db.property.findUnique({ where: { id: review.propertyId }, select: { slug: true } });
    if (p) revalidatePath(`/properties/${p.slug}`);
    return { ok: true, message: status === "PUBLISHED" ? "Review published" : "Review hidden" };
  } catch (error) {
    return toActionError(error);
  }
}

export async function setConversationStatusAction(conversationId: string, status: "OPEN" | "CLOSED"): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    await setConversationStatus(admin, conversationId, status);
    revalidatePath("/admin/inbox", "layout");
    return { ok: true, message: status === "CLOSED" ? "Marked as resolved" : "Reopened" };
  } catch (error) {
    return toActionError(error);
  }
}

export async function setInquiryStatusAction(inquiryId: string, status: InquiryStatus): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    await db.inquiry.update({ where: { id: inquiryId }, data: { status } });
    await audit({ actorId: admin.id, action: "inquiry.status", entityType: "inquiry", entityId: inquiryId, metadata: { status } });
    revalidatePath("/admin/inquiries");
    return { ok: true, message: "Inquiry updated" };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateProspectAction(prospectId: string, data: { status?: ProspectStatus; nextFollowUpAt?: string | null; markContacted?: boolean }): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    await updateProspect(admin, prospectId, {
      status: data.status,
      markContacted: data.markContacted,
      nextFollowUpAt: data.nextFollowUpAt === undefined ? undefined : data.nextFollowUpAt ? new Date(`${data.nextFollowUpAt}T09:00:00+03:00`) : null,
    });
    revalidatePath(`/admin/prospects/${prospectId}`);
    revalidatePath("/admin/prospects");
    return { ok: true, message: data.markContacted ? "Marked as contacted" : "Prospect updated" };
  } catch (error) {
    return toActionError(error);
  }
}

export async function addProspectNoteAction(prospectId: string, body: string): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    const text = body.trim();
    if (!text) throw new AppError("VALIDATION", "Write a note first.");
    await addProspectNote(admin, prospectId, text.slice(0, 4000));
    revalidatePath(`/admin/prospects/${prospectId}`);
    return { ok: true, message: "Note added" };
  } catch (error) {
    return toActionError(error);
  }
}

export async function prospectFromUserAction(userId: string): Promise<ActionResult<{ id: string }>> {
  try {
    const admin = await requireAdmin();
    const p = await prospectFromUser(admin, userId);
    revalidatePath("/admin/prospects");
    return { ok: true, data: { id: p.id }, message: "Added to prospects" };
  } catch (error) {
    return toActionError(error);
  }
}

export async function saveSettingsAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    const input = parseForm(settingsFormSchema, formData);
    await saveSettings(settingsSchema.parse(input));
    await audit({ actorId: admin.id, action: "settings.update", entityType: "settings", entityId: "site" });
    revalidatePath("/", "layout");
    return { ok: true, message: "Settings saved" };
  } catch (error) {
    return toActionError(error);
  }
}
