import { CalendarDays } from "lucide-react";
import { requireUserPage } from "@/server/auth/guards";
import { listBookingsForUser } from "@/server/services/bookings";
import { today } from "@/server/services/availability";
import { BookingRow } from "@/components/account/booking-row";
import { EmptyState } from "@/components/ui/feedback";
import { ButtonLink } from "@/components/ui/button";

export const metadata = { title: "Your trips" };

export default async function BookingsPage() {
  const user = await requireUserPage("/account/bookings");
  const bookings = await listBookingsForUser(user.id);
  const t = today();
  const active = ["PENDING", "AWAITING_PAYMENT", "PAID", "CONFIRMED"];
  const upcoming = bookings.filter((b) => b.checkOut >= t && active.includes(b.status)).sort((a, b) => a.checkIn.getTime() - b.checkIn.getTime());
  const past = bookings.filter((b) => !upcoming.includes(b));

  return (
    <div className="space-y-10">
      <h1 className="text-h1 font-bold">Trips</h1>
      {bookings.length === 0 ? (
        <EmptyState icon={<CalendarDays />} title="No trips yet" description="Time to dust off your bags and start planning your next stay." action={<ButtonLink href="/properties" variant="primary">Start searching</ButtonLink>} />
      ) : (
        <>
          <section aria-labelledby="upcoming">
            <h2 id="upcoming" className="text-h3 font-semibold">Upcoming</h2>
            <div className="mt-4 space-y-3">
              {upcoming.length ? upcoming.map((b) => <BookingRow key={b.id} booking={b} />) : <p className="text-ink-600">No upcoming trips.</p>}
            </div>
          </section>
          {past.length > 0 && (
            <section aria-labelledby="past">
              <h2 id="past" className="text-h3 font-semibold">Past and cancelled</h2>
              <div className="mt-4 space-y-3">
                {past.map((b) => <BookingRow key={b.id} booking={b} />)}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
