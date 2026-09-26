import "server-only";
import { db } from "@/server/db";
import { publish } from "@/server/realtime";
import type { SessionUser } from "@/server/auth/session";
import type { ProspectSource, ProspectStatus } from "@/generated/prisma/client";
import { POLICY_VERSION } from "./accounts";
import { notifyAdmins } from "./notifications";
import { rateLimit } from "./rate-limit";
import { audit } from "./audit";

/**
 * Upserts a prospect by email. Marketing consent is only ever *granted* by an
 * explicit opt-in; later interactions without opt-in never flip it on.
 */
async function upsertProspect(input: { name?: string; email: string; phone?: string; source: ProspectSource; marketingConsent: boolean }) {
  const user = await db.user.findUnique({ where: { email: input.email }, select: { id: true } });
  return db.prospect.upsert({
    where: { email: input.email },
    create: {
      name: input.name,
      email: input.email,
      phone: input.phone,
      source: input.source,
      marketingConsent: input.marketingConsent,
      userId: user?.id,
    },
    update: {
      name: input.name ?? undefined,
      phone: input.phone ?? undefined,
      ...(input.marketingConsent ? { marketingConsent: true } : {}),
      userId: user?.id ?? undefined,
    },
  });
}

export async function submitInquiry(
  input: { name: string; email: string; phone?: string; topic: string; message: string; propertyId?: string; marketingEmail: boolean },
  ctx: { ip: string },
) {
  await rateLimit("inquiry", ctx.ip, 8, 3600);
  const prospect = await upsertProspect({ name: input.name, email: input.email, phone: input.phone, source: "INQUIRY", marketingConsent: input.marketingEmail });
  if (input.marketingEmail) {
    await db.consentRecord.create({ data: { email: input.email, type: "MARKETING_EMAIL", granted: true, source: "contact_form", policyVersion: POLICY_VERSION } });
  }
  const property = input.propertyId ? await db.property.findUnique({ where: { id: input.propertyId }, select: { id: true, name: true } }) : null;
  const inquiry = await db.inquiry.create({
    data: {
      name: input.name,
      email: input.email,
      phone: input.phone,
      topic: input.topic,
      message: input.message,
      propertyId: property?.id ?? null,
      prospectId: prospect.id,
    },
  });
  await publish("admin", "inquiry", { id: inquiry.id });
  await notifyAdmins({
    type: "message.new",
    title: `New inquiry: ${input.topic}${property ? ` — ${property.name}` : ""}`,
    body: `${input.name} (${input.email}): ${input.message.slice(0, 200)}`,
    link: `/admin/inquiries`,
  });
  return inquiry;
}

export async function subscribeNewsletter(email: string, ctx: { ip: string }) {
  await rateLimit("newsletter", ctx.ip, 10, 3600);
  await upsertProspect({ email, source: "NEWSLETTER", marketingConsent: true });
  await db.consentRecord.create({ data: { email, type: "MARKETING_EMAIL", granted: true, source: "newsletter_form", policyVersion: POLICY_VERSION } });
  const user = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (user) {
    await db.marketingPreference.upsert({ where: { userId: user.id }, create: { userId: user.id, email: true }, update: { email: true } });
  }
}

export async function updateProspect(
  admin: SessionUser,
  id: string,
  data: { status?: ProspectStatus; nextFollowUpAt?: Date | null; assignedToId?: string | null; markContacted?: boolean },
) {
  await db.prospect.update({
    where: { id },
    data: {
      status: data.status,
      nextFollowUpAt: data.nextFollowUpAt,
      assignedToId: data.assignedToId,
      ...(data.markContacted ? { lastContactedAt: new Date(), status: data.status ?? "CONTACTED" } : {}),
    },
  });
  await audit({ actorId: admin.id, action: "prospect.update", entityType: "prospect", entityId: id, metadata: { status: data.status ?? null } });
}

export async function addProspectNote(admin: SessionUser, prospectId: string, body: string) {
  await db.prospectNote.create({ data: { prospectId, authorId: admin.id, body } });
}

/** Admin-initiated: add a customer who abandoned a booking flow as a prospect (consent is copied, never assumed). */
export async function prospectFromUser(admin: SessionUser, userId: string) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId }, include: { marketingPreference: true } });
  const consent = Boolean(user.marketingPreference?.email || user.marketingPreference?.sms || user.marketingPreference?.whatsapp);
  const prospect = await db.prospect.upsert({
    where: { email: user.email },
    create: { name: user.name, email: user.email, phone: user.phone, source: "ABANDONED_BOOKING", marketingConsent: consent, userId: user.id },
    update: { userId: user.id },
  });
  await audit({ actorId: admin.id, action: "prospect.create", entityType: "prospect", entityId: prospect.id });
  return prospect;
}
