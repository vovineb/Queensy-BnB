"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import * as Dropdown from "@radix-ui/react-dropdown-menu";
import { Bell, CalendarDays, Heart, LayoutDashboard, LogOut, Menu, MessageCircle, Settings, ShieldCheck, User } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { Avatar } from "@/components/ui/avatar";
import { Drawer } from "@/components/ui/dialog";
import { useRealtime } from "@/hooks/use-realtime";
import { signOutAction } from "@/server/actions/auth";

type NavLink = { href: string; label: string };
type MenuUser = { name: string; email: string; role: string };

export function NavLinks({ links }: { links: NavLink[] }) {
  const pathname = usePathname();
  return (
    <ul className="hidden items-center gap-1 md:flex">
      {links.map((l) => {
        const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
        return (
          <li key={l.href}>
            <Link
              href={l.href}
              aria-current={active ? "page" : undefined}
              className={cn("rounded-full px-3.5 py-2 text-sm font-medium transition-colors", active ? "bg-ink-100 text-ink-950" : "text-ink-600 hover:bg-ink-100/70 hover:text-ink-950")}
            >
              {l.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function CountDot({ count, className }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return (
    <span className={cn("grid min-w-5 place-items-center rounded-full bg-sunset-600 px-1.5 text-[0.6875rem] font-bold leading-5 text-white", className)}>
      {count > 99 ? "99+" : count}
    </span>
  );
}

const itemCls =
  "flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-sm text-ink-800 outline-none data-[highlighted]:bg-ink-100 data-[highlighted]:text-ink-950";

export function UserMenu({ user, unreadNotifications, unreadMessages }: { user: MenuUser; unreadNotifications: number; unreadMessages: number }) {
  const router = useRouter();
  // Live badges: refresh server-rendered counts when a new notification/message arrives.
  useRealtime(["me"], (type, data) => {
    if (type === "notification" || type === "message" || type === "booking") router.refresh();
    if (type === "message" && !window.location.pathname.includes(String(data.conversationId ?? "#"))) {
      toast("New message from the Queensy team", { action: { label: "Open", onClick: () => router.push(`/account/messages/${data.conversationId}`) } });
    }
  });
  const total = unreadNotifications + unreadMessages;

  return (
    <div className="flex items-center gap-1">
      <Link href="/account/notifications" className="relative hidden size-10 place-items-center rounded-full text-ink-700 hover:bg-ink-100 sm:grid" aria-label={`Notifications${unreadNotifications ? ` (${unreadNotifications} unread)` : ""}`}>
        <Bell className="size-5" />
        <CountDot count={unreadNotifications} className="absolute -right-0.5 -top-0.5" />
      </Link>
      <Dropdown.Root>
        <Dropdown.Trigger className="relative hidden items-center gap-2 rounded-full py-1 pl-1 pr-3 ring-1 ring-ink-200 hover:shadow-card data-[state=open]:shadow-card sm:flex" aria-label="Account menu">
          <Avatar name={user.name} className="size-8" />
          <span className="max-w-28 truncate text-sm font-medium">{user.name.split(" ")[0]}</span>
          {total > 0 && <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-sunset-600 ring-2 ring-canvas" aria-hidden />}
        </Dropdown.Trigger>
        <Dropdown.Portal>
          <Dropdown.Content align="end" sideOffset={8} className="z-50 w-64 rounded-xl bg-surface p-1.5 shadow-float ring-1 ring-ink-200/70">
            <div className="px-3 py-2.5">
              <p className="truncate text-sm font-semibold">{user.name}</p>
              <p className="truncate text-xs text-ink-500">{user.email}</p>
            </div>
            <Dropdown.Separator className="my-1 h-px bg-ink-100" />
            {user.role === "ADMIN" && (
              <Dropdown.Item asChild className={itemCls}>
                <Link href="/admin">
                  <ShieldCheck className="size-4 text-lagoon-700" /> Admin dashboard
                </Link>
              </Dropdown.Item>
            )}
            <Dropdown.Item asChild className={itemCls}>
              <Link href="/account">
                <LayoutDashboard className="size-4" /> Overview
              </Link>
            </Dropdown.Item>
            <Dropdown.Item asChild className={itemCls}>
              <Link href="/account/bookings">
                <CalendarDays className="size-4" /> Trips
              </Link>
            </Dropdown.Item>
            <Dropdown.Item asChild className={itemCls}>
              <Link href="/account/messages">
                <MessageCircle className="size-4" /> Messages <CountDot count={unreadMessages} className="ml-auto" />
              </Link>
            </Dropdown.Item>
            <Dropdown.Item asChild className={itemCls}>
              <Link href="/account/saved">
                <Heart className="size-4" /> Saved
              </Link>
            </Dropdown.Item>
            <Dropdown.Item asChild className={itemCls}>
              <Link href="/account/notifications">
                <Bell className="size-4" /> Notifications <CountDot count={unreadNotifications} className="ml-auto" />
              </Link>
            </Dropdown.Item>
            <Dropdown.Item asChild className={itemCls}>
              <Link href="/account/profile">
                <Settings className="size-4" /> Account settings
              </Link>
            </Dropdown.Item>
            <Dropdown.Separator className="my-1 h-px bg-ink-100" />
            <form action={signOutAction}>
              <Dropdown.Item asChild className={itemCls}>
                <button type="submit" className="w-full">
                  <LogOut className="size-4" /> Sign out
                </button>
              </Dropdown.Item>
            </form>
          </Dropdown.Content>
        </Dropdown.Portal>
      </Dropdown.Root>
    </div>
  );
}

export function MobileMenu({ links, user, unreadMessages }: { links: NavLink[]; user: MenuUser | null; unreadMessages: number }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const close = () => setOpen(false);
  const linkCls = (href: string) =>
    cn("flex items-center gap-3 rounded-lg px-3 py-3 text-base font-medium", pathname === href ? "bg-ink-100 text-ink-950" : "text-ink-800 hover:bg-ink-50");

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="grid size-10 place-items-center rounded-full ring-1 ring-ink-200 md:hidden" aria-label="Open menu" aria-expanded={open}>
        <Menu className="size-5" />
      </button>
      <Drawer open={open} onOpenChange={setOpen} title="Menu" side="left">
        <nav aria-label="Mobile" className="flex flex-col gap-6">
          <ul className="space-y-1">
            {links.map((l) => (
              <li key={l.href}>
                <Link href={l.href} onClick={close} className={linkCls(l.href)}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          {user ? (
            <div className="space-y-1 border-t border-ink-100 pt-4">
              <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-ink-500">Your account</p>
              {user.role === "ADMIN" && (
                <Link href="/admin" onClick={close} className={linkCls("/admin")}>
                  <ShieldCheck className="size-5 text-lagoon-700" /> Admin dashboard
                </Link>
              )}
              <Link href="/account/bookings" onClick={close} className={linkCls("/account/bookings")}>
                <CalendarDays className="size-5" /> Trips
              </Link>
              <Link href="/account/messages" onClick={close} className={linkCls("/account/messages")}>
                <MessageCircle className="size-5" /> Messages <CountDot count={unreadMessages} className="ml-auto" />
              </Link>
              <Link href="/account/saved" onClick={close} className={linkCls("/account/saved")}>
                <Heart className="size-5" /> Saved
              </Link>
              <Link href="/account/notifications" onClick={close} className={linkCls("/account/notifications")}>
                <Bell className="size-5" /> Notifications
              </Link>
              <Link href="/account/profile" onClick={close} className={linkCls("/account/profile")}>
                <User className="size-5" /> Account settings
              </Link>
              <form action={signOutAction}>
                <button type="submit" className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-base font-medium text-ink-800 hover:bg-ink-50">
                  <LogOut className="size-5" /> Sign out
                </button>
              </form>
            </div>
          ) : (
            <div className="grid gap-2 border-t border-ink-100 pt-4">
              <Link href="/signup" onClick={close} className="grid h-12 place-items-center rounded-md bg-ink-900 font-semibold text-white">
                Create account
              </Link>
              <Link href="/login" onClick={close} className="grid h-12 place-items-center rounded-md font-semibold ring-1 ring-inset ring-ink-200">
                Sign in
              </Link>
            </div>
          )}
        </nav>
      </Drawer>
    </>
  );
}
