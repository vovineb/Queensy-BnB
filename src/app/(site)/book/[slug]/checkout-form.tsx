"use client";

import { useActionState } from "react";
import { createBookingAction } from "@/server/actions/booking";
import { Field, Textarea } from "@/components/ui/field";
import { PhoneInput } from "@/components/forms/phone-input";
import { SubmitButton } from "@/components/forms/submit-button";
import { FormStatus, initialActionState } from "@/components/forms/form-status";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type Props = {
  propertyId: string;
  stay: { checkIn: string; checkOut: string; adults: number; children: number; infants: number };
  expectedTotal: number;
  user: { name: string; email: string; phone: string | null };
  holdHours: number;
};

export function CheckoutForm({ propertyId, stay, expectedTotal, user, holdHours }: Props) {
  const router = useRouter();
  const [state, action] = useActionState(createBookingAction, initialActionState);
  const fe = state.ok ? undefined : state.fieldErrors;
  const unavailable = !state.ok && (state.code === "DATES_UNAVAILABLE" || state.code === "PRICE_CHANGED");

  return (
    <form action={action} className="space-y-6" noValidate>
      <input type="hidden" name="propertyId" value={propertyId} />
      <input type="hidden" name="checkIn" value={stay.checkIn} />
      <input type="hidden" name="checkOut" value={stay.checkOut} />
      <input type="hidden" name="adults" value={stay.adults} />
      <input type="hidden" name="children" value={stay.children} />
      <input type="hidden" name="infants" value={stay.infants} />
      <input type="hidden" name="expectedTotal" value={expectedTotal} />

      <section>
        <h2 className="text-h3 font-semibold">Guest details</h2>
        <p className="mt-1 text-sm text-ink-600">
          Booking as <strong className="text-ink-900">{user.name}</strong> ({user.email}). We&apos;ll send your confirmation here.
        </p>
        <div className="mt-4 space-y-4">
          <Field label="Mobile number" hint="Include the country code. We'll only use it about this booking." error={fe?.guestPhone}>
            {(p) => <PhoneInput name="guestPhone" defaultValue={user.phone} {...p} />}
          </Field>
          <Field label="Anything we should know?" optional error={fe?.specialRequests} hint="Arrival time, special occasions, accessibility needs…">
            {(p) => <Textarea name="specialRequests" maxLength={1000} rows={3} {...p} />}
          </Field>
        </div>
      </section>

      <FormStatus state={state} />
      {unavailable && <Button variant="secondary" onClick={() => router.refresh()}>Refresh availability and price</Button>}

      <div>
        <SubmitButton variant="primary" size="lg" className="w-full sm:w-auto" pendingLabel="Reserving your dates…">
          Request to book
        </SubmitButton>
        <p className="mt-3 text-sm text-ink-500">
          Your dates are held for {holdHours} hours while we confirm. By continuing you agree to the <a href="/terms" className="underline">booking terms</a>.
        </p>
      </div>
    </form>
  );
}
