"use client";

import { useActionState } from "react";
import { saveSettingsAction } from "@/server/actions/admin/people";
import { Field, Input, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { FormStatus, initialActionState } from "@/components/forms/form-status";
import type { SiteSettings } from "@/server/services/settings";
import { ImageField } from "./image-field";
import { Panel } from "./ui";

export function SettingsForm({ values }: { values: SiteSettings }) {
  const [state, action] = useActionState(saveSettingsAction, initialActionState);
  const fe = state.ok ? undefined : state.fieldErrors;
  const text = (name: keyof SiteSettings, label: string, hint?: string, optional = true) => (
    <Field label={label} hint={hint} optional={optional} error={fe?.[name]}>{(p) => <Input name={name} defaultValue={String(values[name] ?? "")} {...p} />}</Field>
  );
  return (
    <form action={action} className="max-w-3xl space-y-6" noValidate>
      <FormStatus state={state} />
      <Panel title="Business & contact">
        <div className="grid gap-5 sm:grid-cols-2">
          {text("siteName", "Business name", undefined, false)}
          {text("tagline", "Tagline")}
          {text("contactEmail", "Contact email")}
          {text("contactPhone", "Phone", "International format, e.g. +254 712 345 678")}
          {text("whatsappNumber", "WhatsApp number", "International format")}
          {text("supportHours", "Support hours")}
        </div>
      </Panel>
      <Panel title="Homepage">
        <div className="grid gap-5">
          {text("heroTitle", "Headline", undefined, false)}
          <Field label="Supporting text" optional error={fe?.heroSubtitle}>{(p) => <Textarea name="heroSubtitle" defaultValue={values.heroSubtitle} rows={2} maxLength={240} {...p} />}</Field>
          <ImageField name="heroImageUrl" label="Hero image" defaultValue={values.heroImageUrl} hint="A wide, bright photo works best. If empty, the cover photo of a featured stay is used." />
        </div>
      </Panel>
      <Panel title="Social links">
        <div className="grid gap-5 sm:grid-cols-2">
          {text("instagramUrl", "Instagram URL")}
          {text("facebookUrl", "Facebook URL")}
          {text("xUrl", "X (Twitter) URL")}
          {text("tiktokUrl", "TikTok URL")}
        </div>
      </Panel>
      <Panel title="Booking rules">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Hold time for new requests (hours)" hint="How long dates are held while you confirm. Unconfirmed requests expire after this." error={fe?.bookingHoldHours}>{(p) => <Input name="bookingHoldHours" type="number" min={1} max={168} defaultValue={values.bookingHoldHours} {...p} />}</Field>
          <Field label="How far ahead guests can book (days)" error={fe?.bookingHorizonDays}>{(p) => <Input name="bookingHorizonDays" type="number" min={30} max={1095} defaultValue={values.bookingHorizonDays} {...p} />}</Field>
        </div>
      </Panel>
      <div className="flex justify-end"><SubmitButton variant="brand">Save settings</SubmitButton></div>
    </form>
  );
}
