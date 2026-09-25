import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/server/auth/guards";
import { getConversation, listInbox } from "@/server/services/messaging";
import { isAppError } from "@/server/errors";
import { formatDateRange } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { ChatThread } from "@/components/messaging/chat-thread";
import { InboxList } from "@/components/admin/inbox-list";
import { ConversationStatusButton } from "@/components/admin/conversation-status";
import { BookingStatusBadge } from "@/components/ui/status-badge";

export const metadata = { title: "Conversation" };

export default async function AdminConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = await requireAdminPage(`/admin/inbox/${id}`);
  const convo = await getConversation(admin, id).catch((e) => (isAppError(e) ? null : Promise.reject(e)));
  if (!convo) notFound();
  const list = await listInbox({ status: "OPEN" });

  return (
    <div className="grid h-[calc(100dvh-5rem)] min-h-[560px] gap-4 lg:h-[calc(100dvh-4rem)] lg:grid-cols-[320px_minmax(0,1fr)]">
      <div className="hidden min-h-0 lg:block">
        <InboxList activeId={id} status="OPEN" q="" conversations={list.map((c) => ({ id: c.id, subject: c.subject, customer: c.customer.name, email: c.customer.email, property: c.property?.name ?? null, last: c.messages[0]?.body ?? "", lastFromStaff: c.messages[0]?.fromStaff ?? false, at: c.lastMessageAt.toISOString(), unread: c.unread, status: c.status }))} />
      </div>
      <div className="flex min-h-0 flex-col overflow-hidden rounded-xl bg-ink-50 ring-1 ring-ink-200">
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-ink-200 bg-surface px-4 py-3">
          <div className="min-w-0">
            <Link href="/admin/inbox" className="text-xs font-medium text-ink-500 hover:underline lg:hidden">← Inbox</Link>
            <h1 className="truncate font-sans text-base font-semibold">{convo.subject}</h1>
            <p className="text-xs text-ink-600">
              <Link href={`/admin/users/${convo.customer.id}`} className="font-medium hover:underline">{convo.customer.name}</Link> · {convo.customer.email}
              {convo.customer.phone ? ` · ${formatPhone(convo.customer.phone)}` : ""}
              {convo.property ? ` · ${convo.property.name}` : ""}
            </p>
            {convo.booking && (
              <Link href={`/admin/bookings/${convo.booking.id}`} className="mt-1 inline-flex items-center gap-2 text-xs hover:underline">
                Booking {convo.booking.reference} · {formatDateRange(convo.booking.checkIn, convo.booking.checkOut)} <BookingStatusBadge status={convo.booking.status} />
              </Link>
            )}
          </div>
          <ConversationStatusButton conversationId={convo.id} status={convo.status} />
        </header>
        <ChatThread
          key={convo.id}
          conversationId={convo.id}
          viewer="staff"
          counterpartName={convo.customer.name.split(" ")[0]}
          closed={convo.status === "CLOSED"}
          initialOtherReadAt={convo.customerLastReadAt?.toISOString() ?? null}
          initialMessages={convo.messages.map((m) => ({ id: m.id, body: m.body, fromStaff: m.fromStaff, createdAt: m.createdAt.toISOString(), senderName: m.fromStaff ? (m.sender?.name ?? "Staff") : convo.customer.name.split(" ")[0] }))}
        />
      </div>
    </div>
  );
}
