"use client";

import { useActionState, useState } from "react";
import { Star } from "lucide-react";
import { submitReviewAction } from "@/server/actions/booking";
import { Field, Textarea } from "@/components/ui/field";
import { Card } from "@/components/ui/feedback";
import { SubmitButton } from "@/components/forms/submit-button";
import { FormStatus, initialActionState } from "@/components/forms/form-status";
import { cn } from "@/lib/cn";

const DIMENSIONS = [
  { name: "hostRating", label: "Host & communication" },
  { name: "cleanlinessRating", label: "Cleanliness" },
  { name: "amenitiesRating", label: "Amenities" },
  { name: "neighborhoodRating", label: "Neighbourhood" },
];

function StarInput({ name, label }: { name: string; label: string }) {
  const [value, setValue] = useState(0);
  const [hover, setHover] = useState(0);
  return (
    <fieldset className="flex items-center justify-between gap-4">
      <legend className="float-left text-sm font-medium text-ink-800">{label}</legend>
      <input type="hidden" name={name} value={value || ""} />
      <div className="flex" role="radiogroup" aria-label={label} onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} star${n > 1 ? "s" : ""}`} onClick={() => setValue(n)} onMouseEnter={() => setHover(n)} className="p-1">
            <Star className={cn("size-6 transition", (hover || value) >= n ? "fill-gold-400 text-gold-400" : "text-ink-300")} />
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function ReviewForm({ bookingId, propertyName }: { bookingId: string; propertyName: string }) {
  const [state, action] = useActionState(submitReviewAction, initialActionState);
  if (state.ok) return <Card><p className="font-semibold">Thank you for your review!</p><p className="text-sm text-ink-600">It helps other guests choose with confidence.</p></Card>;
  return (
    <Card as="section">
      <h2 className="text-h3 font-semibold">How was {propertyName}?</h2>
      <form action={action} className="mt-5 space-y-4">
        <input type="hidden" name="bookingId" value={bookingId} />
        <FormStatus state={state} />
        <div className="space-y-3">
          {DIMENSIONS.map((d) => <StarInput key={d.name} {...d} />)}
        </div>
        <Field label="Tell future guests about your stay" optional>
          {(p) => <Textarea name="comment" rows={4} maxLength={2000} {...p} />}
        </Field>
        <SubmitButton variant="dark">Submit review</SubmitButton>
      </form>
    </Card>
  );
}
