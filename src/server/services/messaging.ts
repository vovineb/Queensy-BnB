import "server-only";
import { db } from "@/server/db";
import { AppError } from "@/server/errors";
import { publish } from "@/server/realtime";
import type { SessionUser } from "@/server/auth/session";
import { notifyAdmins, notifyUser } from "./notifications";

// Customer <-> Queensy team messaging. Admins share one team inbox.
// Read state is tracked per side (customerLastReadAt / staffLastReadAt), which
// gives unread counts and "Seen" receipts without per-message rows.

const isStaff = (u: SessionUser) => u.role === "ADMIN";

async function loadConversationFor(user: SessionUser, conversationId: string) {
  const conversation = await db.conversation.findUnique({ where: { id: conversationId } });
  if (!conversation || (!isStaff(user) && conversation.customerId !== user.id)) {
    throw new AppError("NOT_FOUND", "Conversation not found.");
  }
  return conversation;
}

export async function startConversation(
  user: SessionUser,
  input: { subject: string; body: string; propertyId?: string; bookingId?: string },
) {
  if (isStaff(user)) throw new AppError("FORBIDDEN", "Staff reply from the admin inbox.");
  if (input.bookingId) {
    const booking = await db.booking.findUnique({ where: { id: input.bookingId }, select: { userId: true, propertyId: true } });
    if (!booking || booking.userId !== user.id) throw new AppError("NOT_FOUND", "Booking not found.");
    input.propertyId = booking.propertyId;
    // Reuse the open thread for this booking instead of creating duplicates.
    const existing = await db.conversation.findFirst({ where: { bookingId: input.bookingId, customerId: user.id, status: "OPEN" } });
    if (existing) {
      await sendMessage(user, existing.id, input.body);
      return existing;
    }
  }
  if (input.propertyId) {
    const property = await db.property.findUnique({ where: { id: input.propertyId }, select: { status: true } });
    if (!property || property.status !== "PUBLISHED") input.propertyId = undefined;
  }
  const now = new Date();
  const conversation = await db.conversation.create({
    data: {
      customerId: user.id,
      subject: input.subject,
      propertyId: input.propertyId ?? null,
      bookingId: input.bookingId ?? null,
      lastMessageAt: now,
      customerLastReadAt: now,
      messages: { create: { senderId: user.id, fromStaff: false, body: input.body, createdAt: now } },
    },
  });
  await publish("admin", "message", { conversationId: conversation.id });
  await notifyAdmins({ type: "message.new", title: `New message: ${input.subject}`, body: `${user.name}: ${input.body.slice(0, 160)}`, link: `/admin/inbox/${conversation.id}` });
  return conversation;
}

export async function sendMessage(user: SessionUser, conversationId: string, body: string) {
  const conversation = await loadConversationFor(user, conversationId);
  const staff = isStaff(user);
  const now = new Date();
  const [message] = await db.$transaction([
    db.message.create({ data: { conversationId, senderId: user.id, fromStaff: staff, body, createdAt: now } }),
    db.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: now, status: "OPEN", ...(staff ? { staffLastReadAt: now } : { customerLastReadAt: now }) },
    }),
  ]);
  const payload = { conversationId, messageId: message.id };
  await publish(`conversation:${conversationId}`, "message", payload);
  if (staff) {
    await publish(`user:${conversation.customerId}`, "message", payload);
    await publish("admin", "message", payload);
    // Email only if the customer hasn't read the thread in the last few minutes.
    await notifyUser(
      conversation.customerId,
      { type: "message.new", title: `New reply: ${conversation.subject}`, body: body.slice(0, 280), link: `/account/messages/${conversationId}` },
      { channels: !conversation.customerLastReadAt || now.getTime() - conversation.customerLastReadAt.getTime() > 5 * 60_000 },
    );
  } else {
    await publish("admin", "message", payload);
  }
  return message;
}

export async function markConversationRead(user: SessionUser, conversationId: string) {
  await loadConversationFor(user, conversationId);
  const now = new Date();
  await db.conversation.update({
    where: { id: conversationId },
    data: isStaff(user) ? { staffLastReadAt: now } : { customerLastReadAt: now },
  });
  await publish(`conversation:${conversationId}`, "read", { by: isStaff(user) ? "staff" : "customer", at: now.toISOString() });
  if (isStaff(user)) await publish("admin", "read", { conversationId });
}

export async function setConversationStatus(user: SessionUser, conversationId: string, status: "OPEN" | "CLOSED") {
  if (!isStaff(user)) throw new AppError("FORBIDDEN", "Only staff can close conversations.");
  await db.conversation.update({ where: { id: conversationId }, data: { status } });
  await publish(`conversation:${conversationId}`, "status", { status });
}

export async function getConversation(user: SessionUser, conversationId: string) {
  await loadConversationFor(user, conversationId);
  return db.conversation.findUniqueOrThrow({
    where: { id: conversationId },
    include: {
      customer: { select: { id: true, name: true, email: true, phone: true } },
      property: { select: { name: true, slug: true } },
      booking: { select: { id: true, reference: true, checkIn: true, checkOut: true, status: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        take: 500,
        select: { id: true, body: true, fromStaff: true, createdAt: true, sender: { select: { name: true } } },
      },
    },
  });
}

export async function listCustomerConversations(userId: string) {
  const rows = await db.conversation.findMany({
    where: { customerId: userId },
    orderBy: { lastMessageAt: "desc" },
    include: {
      property: { select: { name: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1, select: { body: true, fromStaff: true, createdAt: true } },
    },
  });
  return rows.map((c) => ({
    ...c,
    unread: Boolean(c.messages[0]?.fromStaff && (!c.customerLastReadAt || c.messages[0].createdAt > c.customerLastReadAt)),
  }));
}

export async function listInbox(filter: { status?: "OPEN" | "CLOSED"; q?: string } = {}) {
  const rows = await db.conversation.findMany({
    where: {
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.q
        ? {
            OR: [
              { subject: { contains: filter.q, mode: "insensitive" } },
              { customer: { name: { contains: filter.q, mode: "insensitive" } } },
              { customer: { email: { contains: filter.q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    orderBy: { lastMessageAt: "desc" },
    take: 200,
    include: {
      customer: { select: { name: true, email: true } },
      property: { select: { name: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1, select: { body: true, fromStaff: true, createdAt: true } },
    },
  });
  return rows.map((c) => ({
    ...c,
    unread: Boolean(c.messages[0] && !c.messages[0].fromStaff && (!c.staffLastReadAt || c.messages[0].createdAt > c.staffLastReadAt)),
  }));
}

export async function unreadCountForCustomer(userId: string): Promise<number> {
  const rows = await db.$queryRaw<{ n: bigint }[]>`
    SELECT count(*)::bigint AS n FROM messages m JOIN conversations c ON c.id = m.conversation_id
    WHERE c.customer_id = ${userId} AND m.from_staff = true
      AND m.created_at > COALESCE(c.customer_last_read_at, 'epoch'::timestamp)`;
  return Number(rows[0]?.n ?? 0);
}

export async function unreadCountForStaff(): Promise<number> {
  const rows = await db.$queryRaw<{ n: bigint }[]>`
    SELECT count(DISTINCT c.id)::bigint AS n FROM messages m JOIN conversations c ON c.id = m.conversation_id
    WHERE m.from_staff = false AND m.created_at > COALESCE(c.staff_last_read_at, 'epoch'::timestamp)`;
  return Number(rows[0]?.n ?? 0);
}
