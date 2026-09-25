"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteOfferAction, saveOfferAction } from "@/server/actions/admin/marketing";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/forms/submit-button";
import { FormStatus, initialActionState } from "@/components/forms/form-status";
import { ImageField } from "./image-field";
import { Panel } from "./ui";

type Values = { title: string; description: string; promoCopy: string; imageUrl: string; discountType: "PERCENT" | "FIXED"; discountValue: number; minNights: number; startsAt: string; endsAt: string; active: boolean; showBanner: boolean; appliesToAll: boolean; propertyIds: string[] };

export function OfferForm({ offerId, values, properties, currency }: { offerId: string | null; values: Values; properties: { id: string; name: string }[]; currency: string }) {
  const router = useRouter();
  const [state, action] = useActionState(saveOfferAction.bind(null, offerId), initialActionState);
  const [type, setType] = useState(values.discountType);
  const [all, setAll] = useState(values.appliesToAll);
  const [selected, setSelected] = useState(values.propertyIds);
  const [pending, start] = useTransition();
  const fe = state.ok ? undefined : state.fieldErrors;

  return (
    <form action={action} className="max-w-3xl space-y-6" noValidate>
      <input type="hidden" name="propertyIds" value={selected.join(",")} />
      <FormStatus state={state} />
      <Panel title="Offer">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Title" error={fe?.title} className="sm:col-span-2">{(p) => <Input name="title" defaultValue={values.title} placeholder="e.g. Long-stay discount" required {...p} />}</Field>
          <Field label="Description" optional error={fe?.description} className="sm:col-span-2">{(p) => <Textarea name="description" defaultValue={values.description} rows={3} {...p} />}</Field>
          <Field label="Discount type" error={fe?.discountType}>
            {(p) => <Select name="discountType" value={type} onChange={(e) => setType(e.target.value as Values["discountType"])} {...p}><option value="PERCENT">Percentage off the nightly total</option><option value="FIXED">Fixed amount off per booking</option></Select>}
          </Field>
          <Field label={type === "PERCENT" ? "Percent off" : `Amount off (${currency})`} error={fe?.discountValue}>{(p) => <Input name="discountValue" type="number" min={1} step={type === "PERCENT" ? 1 : 0.01} max={type === "PERCENT" ? 100 : undefined} defaultValue={values.discountValue} required {...p} />}</Field>
          <Field label="Check-in from" error={fe?.startsAt}>{(p) => <Input name="startsAt" type="date" defaultValue={values.startsAt} required {...p} />}</Field>
          <Field label="Check-in until" hint="Last day a stay can start and still get the offer (exclusive)" error={fe?.endsAt}>{(p) => <Input name="endsAt" type="date" defaultValue={values.endsAt} required {...p} />}</Field>
          <Field label="Minimum nights" error={fe?.minNights}>{(p) => <Input name="minNights" type="number" min={1} defaultValue={values.minNights} {...p} />}</Field>
        </div>
      </Panel>
      <Panel title="Where it applies">
        <Checkbox name="appliesToAll" checked={all} onChange={(e) => setAll(e.target.checked)} label="All stays" />
        {!all && (
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {properties.map((p) => (
              <label key={p.id} className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm hover:bg-ink-50">
                <input type="checkbox" className="size-4 accent-lagoon-700" checked={selected.includes(p.id)} onChange={(e) => setSelected(e.target.checked ? [...selected, p.id] : selected.filter((s) => s !== p.id))} /> {p.name}
              </label>
            ))}
          </div>
        )}
        {fe?.propertyIds && <p className="mt-2 text-sm text-danger-700">{fe.propertyIds[0]}</p>}
      </Panel>
      <Panel title="Promotion">
        <div className="space-y-5">
          <Field label="Banner text" optional hint="Short line for the site-wide banner (max 160 characters)" error={fe?.promoCopy}>{(p) => <Input name="promoCopy" defaultValue={values.promoCopy} maxLength={160} {...p} />}</Field>
          <ImageField name="imageUrl" label="Offer image" defaultValue={values.imageUrl} />
          <Checkbox name="showBanner" defaultChecked={values.showBanner} label="Show in the banner at the top of every page" />
          <Checkbox name="active" defaultChecked={values.active} label="Active" description="Inactive offers are never applied." />
          <Checkbox name="notifySubscribers" label="Email customers who opted in to marketing when I save" description="Only customers with email marketing consent receive it." />
        </div>
      </Panel>
      <div className="flex flex-wrap justify-between gap-2">
        {offerId ? (
          <Button variant="ghost" className="text-danger-700" loading={pending} onClick={() => start(async () => { const r = await deleteOfferAction(offerId); if (r.ok) { toast.success(r.message ?? "Deleted"); router.push("/admin/offers"); } else toast.error(r.error); })}>Delete offer</Button>
        ) : <span />}
        <SubmitButton variant="brand">Save offer</SubmitButton>
      </div>
    </form>
  );
}
