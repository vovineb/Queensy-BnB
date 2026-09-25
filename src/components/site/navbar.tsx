import Link from "next/link";
import { getCurrentUser } from "@/server/auth/session";
import { unreadNotificationCount } from "@/server/services/notifications";
import { unreadCountForCustomer } from "@/server/services/messaging";
import { Logo } from "./logo";
import { NavLinks, MobileMenu, UserMenu } from "./navbar-client";

export const NAV_LINKS = [
  { href: "/properties", label: "Stays" },
  { href: "/destinations", label: "Destinations" },
  { href: "/offers", label: "Offers" },
  { href: "/contact", label: "Contact" },
];

export async function Navbar() {
  const user = await getCurrentUser();
  const [notifications, messages] = user ? await Promise.all([unreadNotificationCount(user.id), unreadCountForCustomer(user.id)]) : [0, 0];
  const sessionUser = user ? { name: user.name, email: user.email, role: user.role } : null;

  return (
    <header className="sticky top-0 z-40 border-b border-ink-200/70 bg-canvas/85 backdrop-blur-md supports-[backdrop-filter]:bg-canvas/75">
      <nav className="container-page flex h-16 items-center justify-between gap-4" aria-label="Main">
        <div className="flex items-center gap-8">
          <Logo />
          <NavLinks links={NAV_LINKS} />
        </div>
        <div className="flex items-center gap-2">
          {sessionUser ? (
            <UserMenu user={sessionUser} unreadNotifications={notifications} unreadMessages={messages} />
          ) : (
            <div className="hidden items-center gap-1 sm:flex">
              <Link href="/login" className="rounded-full px-4 py-2 text-sm font-semibold text-ink-800 hover:bg-ink-100">
                Sign in
              </Link>
              <Link href="/signup" className="rounded-full bg-ink-900 px-4 py-2 text-sm font-semibold text-white hover:bg-ink-800">
                Create account
              </Link>
            </div>
          )}
          <MobileMenu links={NAV_LINKS} user={sessionUser} unreadMessages={messages} />
        </div>
      </nav>
    </header>
  );
}
