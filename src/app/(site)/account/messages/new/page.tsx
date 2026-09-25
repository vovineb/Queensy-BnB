import { requireUserPage } from "@/server/auth/guards";
import { db } from "@/server/db";
import { NewConversationForm } from "@/components/messaging/new-conversation-form";

export const metadata = { title: "New message" };

export default async function NewMessagePage({ searchParams }: { searchParams: Promise<{ propertyId?: string; bookingId?: string }> }) {
  const user = await requireUserPage("/account/messages/new");
  const sp = await searchParams;
  const [property, booking] = await Promise.all([
    sp.propertyId ? db.property.findFirst({ where: { id: sp.propertyId, status: "PUBLISHED" }, select: { id: true, name: true } }) : null,
    sp.bookingId ? db.booking.findFirst({ where: { id: sp.bookingId, userId: user.id }, select: { id: true, reference: true, property: { select: { name: true } } } }) : null,
  ]);
  const subject = booking ? `Booking ${booking.reference} — ${booking.property.name}` : property ? `Question about ${property.name}` : "";
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-h1 font-bold">Message the Queensy team</h1>
        <p className="mt-1 text-ink-600">We&apos;ll reply here and notify you by email.</p>
      </div>
      <NewConversationForm propertyId={property?.id} bookingId={booking?.id} defaultSubject={subject} />
    </div>
  );
}
