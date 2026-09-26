import Link from "next/link";
import { CalendarDays, Heart, MessageCircle, Search } from "lucide-react";
import { requireUserPage } from "@/server/auth/guards";
import { listBookingsForUser } from "@/server/services/bookings";
import { unreadCountForCustomer } from "@/server/services/messaging";
import { today } from "@/server/services/availability";
import { db } from "@/server/db";
import { BookingRow } from "@/components/account/booking-row";
import { VerifyEmailBanner } from "@/components/account/verify-email-banner";
import { ButtonLink } from "@/components/ui/button";
import { Alert, EmptyState } from "@/components/ui/feedback";

export const metadata = { title: "Your account" };

export default async function AccountOverview({ searchParams }: { searchParams: Promise<{ reset?: string }> }) {
  const user = await requireUserPage("/account");
  const { reset } = await searchParams;
  const [bookings, unread, saved] = await Promise.all([
    listBookingsForUser(user.id),
    unreadCountForCustomer(user.id),
    db.favorite.count({ where: { userId: user.id } }),
  ]);
  const t = today();
  const upcoming = bookings
    .filter((b) => b.checkOut >= t && ["PENDING", "AWAITING_PAYMENT", "PAID", "CONFIRMED"].includes(b.status))
    .sort((a, b) => a.checkIn.getTime() - b.checkIn.getTime());

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-h1 font-bold">Hi, {user.name.split(" ")[0]}</h1>
        <p className="mt-1 text-ink-600">Here&apos;s what&apos;s happening with your stays.</p>
      </div>
      {reset && <Alert tone="success">Your password has been updated.</Alert>}
      {!user.emailVerifiedAt && <VerifyEmailBanner email={user.email} />}

      <div className="grid gap-3 sm:grid-cols-3">
        <QuickLink href="/account/bookings" icon={<CalendarDays />} label="Trips" value={`${upcoming.length} upcoming`} />
        <QuickLink href="/account/messages" icon={<MessageCircle />} label="Messages" value={unread ? `${unread} unread` : "All caught up"} highlight={unread > 0} />
        <QuickLink href="/account/saved" icon={<Heart />} label="Saved" value={`${saved} stay${saved === 1 ? "" : "s"}`} />
      </div>

      <section aria-labelledby="upcoming-heading">
        <div className="flex items-center justify-between">
          <h2 id="upcoming-heading" className="text-h3 font-semibold">Upcoming trips</h2>
          {bookings.length > 0 && <Link href="/account/bookings" className="text-sm font-semibold underline underline-offset-4">All trips</Link>}
        </div>
        <div className="mt-4 space-y-3">
          {upcoming.length ? (
            upcoming.slice(0, 3).map((b) => <BookingRow key={b.id} booking={b} />)
          ) : (
            <EmptyState icon={<Search />} title="No upcoming trips" description="When you book a stay, it'll appear here with its status and details." action={<ButtonLink href="/properties" variant="primary">Find a stay</ButtonLink>} />
          )}
        </div>
      </section>
    </div>
  );
}

function QuickLink({ href, icon, label, value, highlight }: { href: string; icon: React.ReactNode; label: string; value: string; highlight?: boolean }) {
  return (
    <Link href={href} className="flex items-center gap-4 rounded-xl bg-surface p-4 ring-1 ring-ink-200/70 transition hover:shadow-card">
      <span className="grid size-10 place-items-center rounded-lg bg-lagoon-50 text-lagoon-700 [&_svg]:size-5">{icon}</span>
      <span>
        <span className="block text-sm text-ink-600">{label}</span>
        <span className={highlight ? "block font-semibold text-sunset-700" : "block font-semibold"}>{value}</span>
      </span>
    </Link>
  );
}
