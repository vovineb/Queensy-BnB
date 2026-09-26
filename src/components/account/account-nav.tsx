"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, CalendarDays, Heart, LayoutDashboard, Lock, MessageCircle, User } from "lucide-react";
import { cn } from "@/lib/cn";

const ITEMS = [
  { href: "/account", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/account/bookings", label: "Trips", icon: CalendarDays },
  { href: "/account/messages", label: "Messages", icon: MessageCircle },
  { href: "/account/saved", label: "Saved", icon: Heart },
  { href: "/account/notifications", label: "Notifications", icon: Bell },
  { href: "/account/profile", label: "Profile & security", icon: User },
  { href: "/account/privacy", label: "Privacy & communications", icon: Lock },
];

export function AccountNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Account" className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:overflow-visible lg:px-0">
      <ul className="scrollbar-none flex gap-2 lg:sticky lg:top-24 lg:flex-col lg:gap-1">
        {ITEMS.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <li key={href} className="shrink-0">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition lg:rounded-lg lg:px-3 lg:py-2.5",
                  active ? "bg-ink-900 text-white lg:bg-ink-100 lg:text-ink-950" : "text-ink-700 ring-1 ring-ink-200 hover:bg-ink-50 lg:ring-0",
                )}
              >
                <Icon className="size-4" aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
