import Link from "next/link";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatRelativeTime } from "@/lib/format";
import { filterInput } from "./ui";

export type InboxItem = { id: string; subject: string; customer: string; email: string; property: string | null; last: string; lastFromStaff: boolean; at: string; unread: boolean; status: string };

export function InboxList({ conversations, status, q, activeId }: { conversations: InboxItem[]; status: string; q: string; activeId?: string }) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl bg-surface ring-1 ring-ink-200">
      <form className="flex gap-2 border-b border-ink-100 p-3" action="/admin/inbox">
        <input name="q" defaultValue={q} placeholder="Search name, email, subject" className={cn(filterInput, "min-w-0 flex-1")} aria-label="Search conversations" />
        <select name="status" defaultValue={status} className={filterInput} aria-label="Status">
          <option value="OPEN">Open</option>
          <option value="CLOSED">Resolved</option>
          <option value="all">All</option>
        </select>
        <button type="submit" className="h-10 rounded-md bg-ink-900 px-3 text-sm font-semibold text-white">Go</button>
      </form>
      {conversations.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center text-ink-500"><Inbox className="size-8" /> No conversations here.</div>
      ) : (
        <ul className="flex-1 divide-y divide-ink-100 overflow-y-auto">
          {conversations.map((c) => (
            <li key={c.id}>
              <Link href={`/admin/inbox/${c.id}`} aria-current={c.id === activeId ? "page" : undefined} className={cn("block px-4 py-3 transition hover:bg-ink-50", c.id === activeId && "bg-lagoon-50")}>
                <div className="flex items-baseline justify-between gap-2">
                  <p className={cn("truncate text-sm", c.unread ? "font-semibold text-ink-950" : "font-medium")}>{c.customer}</p>
                  <span className="shrink-0 text-xs text-ink-500">{formatRelativeTime(c.at)}</span>
                </div>
                <p className="truncate text-xs text-ink-600">{c.subject}{c.property ? ` · ${c.property}` : ""}</p>
                <p className={cn("mt-0.5 flex items-center gap-2 truncate text-sm", c.unread ? "text-ink-900" : "text-ink-500")}>
                  {c.unread && <span className="size-2 shrink-0 rounded-full bg-sunset-600" aria-label="Unread" />}
                  <span className="truncate">{c.lastFromStaff ? "You: " : ""}{c.last}</span>
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
