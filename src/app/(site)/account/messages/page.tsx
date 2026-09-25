import Link from "next/link";
import { MessageCircle, Plus } from "lucide-react";
import { requireUserPage } from "@/server/auth/guards";
import { listCustomerConversations } from "@/server/services/messaging";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/cn";
import { EmptyState } from "@/components/ui/feedback";
import { ButtonLink } from "@/components/ui/button";
import { LiveRefresh } from "@/components/account/live-refresh";

export const metadata = { title: "Messages" };

export default async function MessagesPage() {
  const user = await requireUserPage("/account/messages");
  const conversations = await listCustomerConversations(user.id);
  return (
    <div className="space-y-6">
      <LiveRefresh channels={["me"]} events={["message"]} />
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-h1 font-bold">Messages</h1>
        <ButtonLink href="/account/messages/new" variant="dark" icon={<Plus className="size-4" />}>New message</ButtonLink>
      </div>
      {conversations.length === 0 ? (
        <EmptyState icon={<MessageCircle />} title="No conversations yet" description="Questions about a stay, a booking or something else? Our team usually replies within minutes during support hours." action={<ButtonLink href="/account/messages/new" variant="brand">Message the team</ButtonLink>} />
      ) : (
        <ul className="divide-y divide-ink-100 overflow-hidden rounded-xl bg-surface ring-1 ring-ink-200/70">
          {conversations.map((c) => (
            <li key={c.id}>
              <Link href={`/account/messages/${c.id}`} className="flex items-start gap-4 p-4 transition hover:bg-ink-50">
                <span className={cn("mt-2 size-2.5 shrink-0 rounded-full", c.unread ? "bg-sunset-600" : "bg-transparent")} aria-hidden />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className={cn("truncate", c.unread ? "font-semibold" : "font-medium")}>{c.subject}</p>
                    <span className="shrink-0 text-xs text-ink-500">{formatRelativeTime(c.lastMessageAt)}</span>
                  </div>
                  {c.property && <p className="text-xs text-ink-500">{c.property.name}</p>}
                  <p className={cn("mt-1 line-clamp-1 text-sm", c.unread ? "text-ink-900" : "text-ink-600")}>
                    {c.messages[0]?.fromStaff ? "Queensy: " : "You: "}
                    {c.messages[0]?.body}
                  </p>
                </div>
                {c.unread && <span className="sr-only">Unread</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
