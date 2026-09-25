import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requireUserPage } from "@/server/auth/guards";
import { getConversation } from "@/server/services/messaging";
import { isAppError } from "@/server/errors";
import { ChatThread } from "@/components/messaging/chat-thread";

export const metadata = { title: "Conversation" };

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUserPage(`/account/messages/${id}`);
  const convo = await getConversation(user, id).catch((e) => {
    if (isAppError(e)) return null;
    throw e;
  });
  if (!convo) notFound();
  return (
    <div className="flex h-[calc(100dvh-9rem)] min-h-[480px] flex-col overflow-hidden rounded-2xl bg-ink-50 ring-1 ring-ink-200/70 lg:h-[calc(100dvh-10rem)]">
      <header className="flex items-center gap-3 border-b border-ink-200 bg-surface px-4 py-3">
        <Link href="/account/messages" className="grid size-9 place-items-center rounded-full hover:bg-ink-100" aria-label="Back to messages">
          <ChevronLeft className="size-5" />
        </Link>
        <div className="min-w-0">
          <h1 className="truncate font-sans text-base font-semibold">{convo.subject}</h1>
          <p className="truncate text-xs text-ink-500">
            Queensy team
            {convo.property ? ` · ${convo.property.name}` : ""}
            {convo.booking ? ` · Booking ${convo.booking.reference}` : ""}
          </p>
        </div>
      </header>
      <ChatThread
        conversationId={convo.id}
        viewer="customer"
        counterpartName="Queensy team"
        closed={convo.status === "CLOSED"}
        initialOtherReadAt={convo.staffLastReadAt?.toISOString() ?? null}
        initialMessages={convo.messages.map((m) => ({ id: m.id, body: m.body, fromStaff: m.fromStaff, createdAt: m.createdAt.toISOString(), senderName: m.fromStaff ? (m.sender?.name?.split(" ")[0] ?? "Queensy team") : null }))}
      />
    </div>
  );
}
