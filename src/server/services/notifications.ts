import "server-only";
import { db } from "@/server/db";
import { publish } from "@/server/realtime";
import { renderEmail, sendEmail } from "./mailer";

// Notification architecture: every notification is stored in-app, then fanned
// out to delivery channels. Email is implemented; SMS / push / WhatsApp slot in
// as additional ChannelAdapters once providers (and consent rules) are chosen.

export type NotificationType =
  | "booking.created"
  | "booking.updated"
  | "booking.cancelled"
  | "message.new"
  | "offer"
  | "announcement"
  | "account";

export type NotificationInput = { type: NotificationType; title: string; body: string; link?: string };

type Recipient = { id: string; email: string; name: string };

interface ChannelAdapter {
  channel: "email" | "sms" | "push" | "whatsapp";
  /** Whether this channel should carry this notification type for this user. */
  wants(type: NotificationType): boolean;
  send(to: Recipient, n: NotificationInput): Promise<{ status: "sent" | "skipped" | "failed"; error?: string }>;
}

const siteUrl = () => process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const emailAdapter: ChannelAdapter = {
  channel: "email",
  // Transactional types only. Marketing email goes through sendMarketingEmail() which checks consent.
  wants: (type) => ["booking.created", "booking.updated", "booking.cancelled", "message.new", "account"].includes(type),
  async send(to, n) {
    const { text, html } = renderEmail({
      heading: n.title,
      paragraphs: [`Hi ${to.name.split(" ")[0]},`, n.body],
      cta: n.link ? { label: "Open Queensy BnB", url: new URL(n.link, siteUrl()).toString() } : undefined,
    });
    return sendEmail({ to: to.email, subject: n.title, text, html });
  },
};

const adapters: ChannelAdapter[] = [emailAdapter];

export async function notifyUser(userId: string, n: NotificationInput, opts: { channels?: boolean } = { channels: true }) {
  const user = await db.user.findUnique({ where: { id: userId }, select: { id: true, email: true, name: true, status: true } });
  if (!user || user.status !== "ACTIVE") return;
  const notification = await db.notification.create({ data: { userId, type: n.type, title: n.title, body: n.body, link: n.link } });
  await publish(`user:${userId}`, "notification", { id: notification.id });
  if (!opts.channels) return;
  for (const adapter of adapters) {
    if (!adapter.wants(n.type)) continue;
    const result = await adapter.send(user, n);
    await db.notificationDelivery.create({
      data: {
        notificationId: notification.id,
        channel: adapter.channel,
        status: result.status,
        error: result.error,
        sentAt: result.status === "sent" ? new Date() : null,
      },
    });
  }
}

/** Notifies every active admin (in-app + email). */
export async function notifyAdmins(n: NotificationInput) {
  const admins = await db.user.findMany({ where: { role: "ADMIN", status: "ACTIVE" }, select: { id: true } });
  await Promise.all(admins.map((a) => notifyUser(a.id, n)));
  await publish("admin", "notification", { type: n.type });
}

/**
 * Marketing email to customers who explicitly opted in. Never sent to anyone
 * without a current MarketingPreference.email = true.
 */
export async function sendMarketingEmail(n: NotificationInput): Promise<{ recipients: number; sent: number }> {
  const recipients = await db.user.findMany({
    where: { status: "ACTIVE", marketingPreference: { email: true } },
    select: { id: true, email: true, name: true },
  });
  let sent = 0;
  for (const r of recipients) {
    const notification = await db.notification.create({ data: { userId: r.id, type: n.type, title: n.title, body: n.body, link: n.link } });
    const { text, html } = renderEmail({
      heading: n.title,
      paragraphs: [
        `Hi ${r.name.split(" ")[0]},`,
        n.body,
        "You're receiving this because you opted in to offers from Queensy BnB. You can change this any time in Account → Privacy & communications.",
      ],
      cta: n.link ? { label: "View details", url: new URL(n.link, siteUrl()).toString() } : undefined,
    });
    const result = await sendEmail({ to: r.email, subject: n.title, text, html });
    if (result.status === "sent") sent++;
    await db.notificationDelivery.create({
      data: { notificationId: notification.id, channel: "email", status: result.status, error: result.error, sentAt: result.status === "sent" ? new Date() : null },
    });
  }
  return { recipients: recipients.length, sent };
}

export async function unreadNotificationCount(userId: string) {
  return db.notification.count({ where: { userId, readAt: null } });
}

export async function listNotifications(userId: string, take = 30) {
  return db.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take });
}

export async function markNotificationsRead(userId: string, ids?: string[]) {
  await db.notification.updateMany({
    where: { userId, readAt: null, ...(ids ? { id: { in: ids } } : {}) },
    data: { readAt: new Date() },
  });
}
