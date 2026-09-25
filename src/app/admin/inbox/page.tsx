import { listInbox } from "@/server/services/messaging";
import { PageHeader } from "@/components/admin/ui";
import { InboxList } from "@/components/admin/inbox-list";

export const metadata = { title: "Inbox" };

export default async function InboxPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const sp = await searchParams;
  const status = sp.status === "CLOSED" ? "CLOSED" : sp.status === "all" ? undefined : "OPEN";
  const conversations = await listInbox({ status, q: sp.q });
  return (
    <>
      <PageHeader title="Inbox" description="Conversations with guests. New messages arrive in real time." />
      <div className="h-[calc(100dvh-12rem)] min-h-[520px]">
        <InboxList conversations={conversations.map((c) => ({ id: c.id, subject: c.subject, customer: c.customer.name, email: c.customer.email, property: c.property?.name ?? null, last: c.messages[0]?.body ?? "", lastFromStaff: c.messages[0]?.fromStaff ?? false, at: c.lastMessageAt.toISOString(), unread: c.unread, status: c.status }))} status={sp.status ?? "OPEN"} q={sp.q ?? ""} />
      </div>
    </>
  );
}
