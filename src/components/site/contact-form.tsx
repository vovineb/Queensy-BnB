"use client";

import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";
import { submitInquiryAction } from "@/server/actions/public";
import { INQUIRY_TOPICS } from "@/lib/validation";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { PhoneInput } from "@/components/forms/phone-input";
import { SubmitButton } from "@/components/forms/submit-button";
import { FormStatus, initialActionState } from "@/components/forms/form-status";
import { trackEvent } from "@/lib/analytics-client";

export function ContactForm({ properties, defaultPropertyId, defaultName, defaultEmail, signedIn }: { properties: { id: string; name: string }[]; defaultPropertyId?: string; defaultName?: string; defaultEmail?: string; signedIn: boolean }) {
  const [state, action] = useActionState(submitInquiryAction, initialActionState);
  const fe = state.ok ? undefined : state.fieldErrors;
  if (state.ok) {
    return (
      <div className="mt-8 rounded-2xl bg-success-50 p-6 ring-1 ring-success-600/20" role="status">
        <CheckCircle2 className="size-7 text-success-600" aria-hidden />
        <p className="mt-3 font-semibold">Message sent</p>
        <p className="mt-1 text-ink-700">{state.message}</p>
      </div>
    );
  }
  return (
    <form action={action} onFocus={() => trackEvent("contact_started")} className="mt-8 space-y-5" noValidate>
      <FormStatus state={state} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Your name" error={fe?.name}>{(p) => <Input name="name" autoComplete="name" defaultValue={defaultName} required {...p} />}</Field>
        <Field label="Email" error={fe?.email}>{(p) => <Input name="email" type="email" autoComplete="email" defaultValue={defaultEmail} required {...p} />}</Field>
      </div>
      <Field label="Phone" optional error={fe?.phone}>{(p) => <PhoneInput name="phone" {...p} />}</Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Topic" error={fe?.topic}>
          {(p) => (
            <Select name="topic" defaultValue={INQUIRY_TOPICS[0]} {...p}>
              {INQUIRY_TOPICS.map((t) => <option key={t}>{t}</option>)}
            </Select>
          )}
        </Field>
        <Field label="Stay" optional>
          {(p) => (
            <Select name="propertyId" defaultValue={defaultPropertyId ?? ""} {...p}>
              <option value="">Not sure yet</option>
              {properties.map((pr) => <option key={pr.id} value={pr.id}>{pr.name}</option>)}
            </Select>
          )}
        </Field>
      </div>
      <Field label="Message" error={fe?.message} hint="Dates, number of guests and anything else that helps us help you.">
        {(p) => <Textarea name="message" rows={6} maxLength={4000} required {...p} />}
      </Field>
      {!signedIn && <Checkbox name="marketingEmail" label="Also send me occasional offers by email" description="Optional. You can unsubscribe any time." />}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <p className="text-xs text-ink-500">We use your details to reply to this message. See our <a href="/privacy" className="underline">privacy notice</a>.</p>
      <SubmitButton variant="primary" size="lg">Send message</SubmitButton>
    </form>
  );
}
