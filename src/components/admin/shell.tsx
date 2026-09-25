"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  BarChart3, BookOpen, Building2, CalendarRange, ClipboardList, ExternalLink, Inbox, LayoutDashboard, LogOut, MapPinned, Megaphone, Menu, MessageSquareQuote, Settings, Star, Tag, Users, UserSearch,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { Drawer } from "@/components/ui/dialog";
import { useRealtime } from "@/hooks/use-realtime";
import { signOutAction } from "@/server/actions/auth";

type Badges = { inbox: number; bookings: number; inquiries: number };

const SECTIONS = [
  {
    label: "Operate",
    items: [
      { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
      { href: "/admin/bookings", label: "Bookings", icon: BookOpen, badge: "bookings" as const },
      { href: "/admin/calendar", label: "Calendar", icon: CalendarRange },
      { href: "/admin/inbox", label: "Inbox", icon: Inbox, badge: "inbox" as const },
      { href: "/admin/inquiries", label: "Inquiries", icon: MessageSquareQuote, badge: "inquiries" as const },
    ],
  },
  {
    label: "Catalogue",
    items: [
      { href: "/admin/properties", label: "Properties", icon: Building2 },
      { href: "/admin/destinations", label: "Destinations", icon: MapPinned },
      { href: "/admin/offers", label: "Offers", icon: Tag },
      { href: "/admin/announcements", label: "Announcements", icon: Megaphone },
      { href: "/admin/reviews", label: "Reviews", icon: Star },
    ],
  },
  {
    label: "Customers",
    items: [
      { href: "/admin/users", label: "Users", icon: Users },
      { href: "/admin/prospects", label: "Prospects", icon: UserSearch },
      { href: "/admin/analytics", label: "Engagement", icon: BarChart3 },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/admin/settings", label: "Settings", icon: Settings },
      { href: "/admin/audit-log", label: "Audit log", icon: ClipboardList },
    ],
  },
];

function Nav({ badges, onNavigate }: { badges: Badges; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin" className="space-y-6">
      {SECTIONS.map((section) => (
        <div key={section.label}>
          <p className="px-3 pb-1.5 text-[0.6875rem] font-semibold uppercase tracking-wider text-ink-400">{section.label}</p>
          <ul className="space-y-0.5">
            {section.items.map(({ href, label, icon: Icon, exact, badge }) => {
              const active = exact ? pathname === href : pathname.startsWith(href);
              const count = badge ? badges[badge] : 0;
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition", active ? "bg-white/10 text-white" : "text-ink-300 hover:bg-white/5 hover:text-white")}
                  >
                    <Icon className="size-4" aria-hidden />
                    <span className="flex-1">{label}</span>
                    {count > 0 && <span className="rounded-full bg-sunset-500 px-1.5 text-[0.6875rem] font-bold leading-5 text-white">{count}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function AdminShell({ user, badges, children }: { user: { name: string; email: string }; badges: Badges; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  // Live admin feed: refresh counts/lists when bookings, messages or inquiries arrive.
  useRealtime(["admin"], (type, data) => {
    if (type === "booking" || type === "message" || type === "inquiry" || type === "read") router.refresh();
    if (type === "message" && data.conversationId && !window.location.pathname.includes(String(data.conversationId))) toast("New guest message", { action: { label: "Open", onClick: () => router.push(`/admin/inbox/${data.conversationId}`) } });
    if (type === "inquiry") toast("New inquiry received", { action: { label: "View", onClick: () => router.push("/admin/inquiries") } });
  });

  const footer = (
    <div className="space-y-1 border-t border-white/10 pt-4">
      <Link href="/" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-ink-300 hover:bg-white/5 hover:text-white" target="_blank">
        <ExternalLink className="size-4" /> View site
      </Link>
      <form action={signOutAction}>
        <button type="submit" className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-ink-300 hover:bg-white/5 hover:text-white">
          <LogOut className="size-4" /> Sign out
        </button>
      </form>
      <p className="truncate px-3 pt-2 text-xs text-ink-400">{user.email}</p>
    </div>
  );

  return (
    <div className="min-h-dvh bg-ink-50 lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh flex-col justify-between overflow-y-auto bg-ink-950 p-4 lg:flex">
        <div>
          <Link href="/admin" className="mb-6 flex items-center gap-2 px-3 py-2 font-display text-base font-bold text-white">
            <span className="grid size-7 place-items-center rounded-lg bg-lagoon-700 text-xs">Q</span> Queensy Admin
          </Link>
          <Nav badges={badges} />
        </div>
        {footer}
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-ink-200 bg-surface px-4 lg:hidden">
        <button type="button" onClick={() => setOpen(true)} className="grid size-10 place-items-center rounded-lg hover:bg-ink-100" aria-label="Open admin menu">
          <Menu className="size-5" />
        </button>
        <Link href="/admin" className="font-display font-bold">Queensy Admin</Link>
        <span className="w-10" />
      </header>
      <Drawer open={open} onOpenChange={setOpen} title="Admin" side="left" className="!bg-ink-950 text-white [&_h2]:text-white">
        <div className="space-y-6">
          <Nav badges={badges} onNavigate={() => setOpen(false)} />
          {footer}
        </div>
      </Drawer>

      <main id="main" className="min-w-0 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
        {children}
      </main>
    </div>
  );
}
