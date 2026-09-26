"use client";

import { useActionState } from "react";
import { startConversationAction } from "@/server/actions/messaging";
import { Field, Input, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { FormStatus, initialActionState } from "@/components/forms/form-status";

export function NewConversationForm({ propertyId, bookingId, defaultSubject }: { propertyId?: string; bookingId?: string; defaultSubject?: string }) {
  const [state, action] = useActionState(startConversationAction, initialActionState);
  const fe = state.ok ? undefined : state.fieldErrors;
  return (
    <form action={action} className="space-y-5 rounded-2xl bg-surface p-5 ring-1 ring-ink-200/70 sm:p-6">
      <input type="hidden" name="propertyId" value={propertyId ?? ""} />
      <input type="hidden" name="bookingId" value={bookingId ?? ""} />
      <FormStatus state={state} />
      <Field label="Subject" error={fe?.subject}>
        {(p) => <Input name="subject" defaultValue={defaultSubject} maxLength={140} required {...p} />}
      </Field>
      <Field label="Message" error={fe?.body}>
        {(p) => <Textarea name="body" rows={6} maxLength={4000} required placeholder="How can we help?" {...p} />}
      </Field>
      <SubmitButton variant="brand">Send message</SubmitButton>
    </form>
  );
}
