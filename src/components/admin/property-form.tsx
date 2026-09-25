"use client";

import { useActionState, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { savePropertyAction } from "@/server/actions/admin/properties";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/forms/submit-button";
import { FormStatus, initialActionState } from "@/components/forms/form-status";
import { PROPERTY_TYPE_LABELS, CANCELLATION_POLICY_COPY } from "@/lib/constants";
import { CANCELLATION_POLICIES, PROPERTY_TYPES } from "@/lib/admin-validation";
import { Panel } from "./ui";

export type PropertyFormValues = {
  name: string; slug: string; type: string; featured: boolean; summary: string; description: string; destinationId: string;
  neighborhood: string; addressLine: string; latitude: string; longitude: string; maxGuests: number; bedrooms: number; beds: number;
  bathrooms: number; currency: string; basePrice: number; cleaningFee: number; minNights: number; maxNights: string;
  checkInTime: string; checkOutTime: string; houseRules: string; cancellationPolicy: string; cancellationNotes: string;
  amenities: string[]; rooms: { name: string; beds: string }[];
};

type Props = {
  propertyId: string | null;
  values: PropertyFormValues;
  destinations: { id: string; name: string }[];
  amenities: { slug: string; name: string; category: string }[];
};

export function PropertyForm({ propertyId, values, destinations, amenities }: Props) {
  const [state, action] = useActionState(savePropertyAction.bind(null, propertyId), initialActionState);
  const fe = state.ok ? undefined : state.fieldErrors;
  const [selected, setSelected] = useState<string[]>(values.amenities);
  const [rooms, setRooms] = useState(values.rooms);
  const grouped = Object.entries(amenities.reduce<Record<string, typeof amenities>>((acc, a) => ((acc[a.category] ??= []).push(a), acc), {}));

  return (
    <form action={action} className="space-y-6" noValidate>
      <input type="hidden" name="amenities" value={selected.join(",")} />
      <input type="hidden" name="rooms" value={JSON.stringify(rooms.filter((r) => r.name.trim() || r.beds.trim()))} />
      <FormStatus state={state} />

      <Panel title="Basics">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Property name" error={fe?.name} className="sm:col-span-2">{(p) => <Input name="name" defaultValue={values.name} required {...p} />}</Field>
          <Field label="Type" error={fe?.type}>
            {(p) => <Select name="type" defaultValue={values.type} {...p}>{PROPERTY_TYPES.map((t) => <option key={t} value={t}>{PROPERTY_TYPE_LABELS[t]}</option>)}</Select>}
          </Field>
          <Field label="Web address" hint="Leave blank to generate from the name" error={fe?.slug}>
            {(p) => <div className="flex items-center gap-1 text-sm"><span className="text-ink-500">/properties/</span><Input name="slug" defaultValue={values.slug} {...p} /></div>}
          </Field>
          <Field label="Short summary" hint="One line shown on listing cards and search results (max 200 characters)" error={fe?.summary} className="sm:col-span-2">
            {(p) => <Input name="summary" defaultValue={values.summary} maxLength={200} required {...p} />}
          </Field>
          <Field label="Full description" hint="Leave a blank line between paragraphs" error={fe?.description} className="sm:col-span-2">
            {(p) => <Textarea name="description" defaultValue={values.description} rows={8} required {...p} />}
          </Field>
          <Checkbox name="featured" defaultChecked={values.featured} label="Feature on the homepage" description="Featured stays are shown first." className="sm:col-span-2" />
        </div>
      </Panel>

      <Panel title="Location">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Destination" error={fe?.destinationId}>
            {(p) => <Select name="destinationId" defaultValue={values.destinationId} {...p}><option value="">— None —</option>{destinations.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</Select>}
          </Field>
          <Field label="Neighbourhood / area" optional error={fe?.neighborhood}>{(p) => <Input name="neighborhood" defaultValue={values.neighborhood} {...p} />}</Field>
          <Field label="Street address" optional hint="Private — only shown to guests with a confirmed booking" error={fe?.addressLine} className="sm:col-span-2">{(p) => <Input name="addressLine" defaultValue={values.addressLine} {...p} />}</Field>
          <Field label="Latitude" optional hint="For the map, e.g. -4.2797" error={fe?.latitude}>{(p) => <Input name="latitude" inputMode="decimal" defaultValue={values.latitude} {...p} />}</Field>
          <Field label="Longitude" optional hint="e.g. 39.5946" error={fe?.longitude}>{(p) => <Input name="longitude" inputMode="decimal" defaultValue={values.longitude} {...p} />}</Field>
        </div>
      </Panel>

      <Panel title="Capacity & rooms">
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
          <Field label="Max guests" error={fe?.maxGuests}>{(p) => <Input name="maxGuests" type="number" min={1} defaultValue={values.maxGuests} {...p} />}</Field>
          <Field label="Bedrooms" error={fe?.bedrooms}>{(p) => <Input name="bedrooms" type="number" min={0} defaultValue={values.bedrooms} {...p} />}</Field>
          <Field label="Beds" error={fe?.beds}>{(p) => <Input name="beds" type="number" min={0} defaultValue={values.beds} {...p} />}</Field>
          <Field label="Bathrooms" error={fe?.bathrooms}>{(p) => <Input name="bathrooms" type="number" min={0} step={0.5} defaultValue={values.bathrooms} {...p} />}</Field>
        </div>
        <div className="mt-6">
          <p className="text-sm font-medium text-ink-800">Sleeping arrangements</p>
          <ul className="mt-2 space-y-2">
            {rooms.map((r, i) => (
              <li key={i} className="flex gap-2">
                <Input aria-label={`Room ${i + 1} name`} placeholder="e.g. Main bedroom" value={r.name} onChange={(e) => setRooms(rooms.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
                <Input aria-label={`Room ${i + 1} beds`} placeholder="e.g. 1 king bed" value={r.beds} onChange={(e) => setRooms(rooms.map((x, j) => (j === i ? { ...x, beds: e.target.value } : x)))} />
                <Button variant="ghost" size="icon" aria-label={`Remove room ${i + 1}`} onClick={() => setRooms(rooms.filter((_, j) => j !== i))}><Trash2 className="size-4" /></Button>
              </li>
            ))}
          </ul>
          {fe?.rooms && <p className="mt-1 text-sm text-danger-700">{fe.rooms[0]}</p>}
          <Button variant="secondary" size="sm" className="mt-2" icon={<Plus className="size-4" />} onClick={() => setRooms([...rooms, { name: `Bedroom ${rooms.length + 1}`, beds: "" }])}>Add room</Button>
        </div>
      </Panel>

      <Panel title="Pricing & stay rules">
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Currency" hint="3-letter code" error={fe?.currency}>{(p) => <Input name="currency" defaultValue={values.currency} maxLength={3} className="uppercase" {...p} />}</Field>
          <Field label="Price per night" error={fe?.basePrice}>{(p) => <Input name="basePrice" type="number" min={0} step="0.01" defaultValue={values.basePrice} required {...p} />}</Field>
          <Field label="Cleaning fee (per stay)" error={fe?.cleaningFee}>{(p) => <Input name="cleaningFee" type="number" min={0} step="0.01" defaultValue={values.cleaningFee} {...p} />}</Field>
          <Field label="Minimum nights" error={fe?.minNights}>{(p) => <Input name="minNights" type="number" min={1} defaultValue={values.minNights} {...p} />}</Field>
          <Field label="Maximum nights" optional error={fe?.maxNights}>{(p) => <Input name="maxNights" type="number" min={1} defaultValue={values.maxNights} {...p} />}</Field>
          <div />
          <Field label="Check-in from" error={fe?.checkInTime}>{(p) => <Input name="checkInTime" type="time" defaultValue={values.checkInTime} {...p} />}</Field>
          <Field label="Check-out by" error={fe?.checkOutTime}>{(p) => <Input name="checkOutTime" type="time" defaultValue={values.checkOutTime} {...p} />}</Field>
        </div>
        <p className="mt-4 text-sm text-ink-500">Price changes apply to new bookings only; existing bookings keep the price the guest agreed to. Use Offers for temporary discounts.</p>
      </Panel>

      <Panel title="Policies">
        <div className="grid gap-5">
          <Field label="Cancellation policy" error={fe?.cancellationPolicy}>
            {(p) => <Select name="cancellationPolicy" defaultValue={values.cancellationPolicy} {...p}>{CANCELLATION_POLICIES.map((c) => <option key={c} value={c}>{CANCELLATION_POLICY_COPY[c].label} — {CANCELLATION_POLICY_COPY[c].summary}</option>)}</Select>}
          </Field>
          <Field label="Extra cancellation notes" optional error={fe?.cancellationNotes}>{(p) => <Textarea name="cancellationNotes" defaultValue={values.cancellationNotes} rows={2} {...p} />}</Field>
          <Field label="House rules" optional hint="e.g. No smoking indoors. Quiet hours 22:00–07:00." error={fe?.houseRules}>{(p) => <Textarea name="houseRules" defaultValue={values.houseRules} rows={4} {...p} />}</Field>
        </div>
      </Panel>

      <Panel title="Amenities">
        <div className="space-y-5">
          {grouped.map(([category, items]) => (
            <fieldset key={category}>
              <legend className="mb-2 text-sm font-medium text-ink-800">{category}</legend>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((a) => (
                  <label key={a.slug} className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm hover:bg-ink-50">
                    <input type="checkbox" className="size-4 accent-lagoon-700" checked={selected.includes(a.slug)} onChange={(e) => setSelected(e.target.checked ? [...selected, a.slug] : selected.filter((s) => s !== a.slug))} />
                    {a.name}
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </div>
      </Panel>

      <div className="sticky bottom-0 -mx-4 flex justify-end gap-2 border-t border-ink-200 bg-ink-50/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
        <SubmitButton variant="brand">{propertyId ? "Save changes" : "Create property"}</SubmitButton>
      </div>
    </form>
  );
}
