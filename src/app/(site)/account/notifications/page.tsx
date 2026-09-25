import Link from "next/link";
import { Bell } from "lucide-react";
import { requireUserPage } from "@/server/auth/guards";
import { listNotifications } from "@/server/services/notifications";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/cn";
import { EmptyState } from "@/components/ui/feedback";
import { MarkAllRead } from "@/components/account/mark-all-read";
import { LiveRefresh } from "@/components/account/live-refresh";

export const metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const user = await requireUserPage("/account/notifications");
  const items = await listNotifications(user.id, 50);
  const unread = items.filter((n) => !n.readAt).length;
  return (
    <div className="space-y-6">
      <LiveRefresh channels={["me"]} events={["notification"]} />
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-h1 font-bold">Notifications</h1>
        {unread > 0 && <MarkAllRead />}
      </div>
      {items.length === 0 ? (
        <EmptyState icon={<Bell />} title="You're all caught up" description="Booking updates, replies from our team and account alerts will show up here." />
      ) : (
        <ul className="divide-y divide-ink-100 overflow-hidden rounded-xl bg-surface ring-1 ring-ink-200/70">
          {items.map((n) => {
            const content = (
              <div className="flex gap-4 p-4">
                <span className={cn("mt-2 size-2 shrink-0 rounded-full", n.readAt ? "bg-transparent" : "bg-sunset-600")} aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className={cn(n.readAt ? "font-medium" : "font-semibold")}>{n.title}</p>
                  <p className="mt-0.5 text-sm text-ink-600">{n.body}</p>
                  <p className="mt-1 text-xs text-ink-500">{formatRelativeTime(n.createdAt)}</p>
                </div>
              </div>
            );
            return <li key={n.id}>{n.link ? <Link href={n.link} className="block hover:bg-ink-50">{content}</Link> : content}</li>;
          })}
        </ul>
      )}
    </div>
  );
}
