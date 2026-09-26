"use client";

import { useActionState } from "react";
import { saveDestinationAction } from "@/server/actions/admin/marketing";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { FormStatus, initialActionState } from "@/components/forms/form-status";
import { ImageField } from "./image-field";
import { Panel } from "./ui";

type Values = { name: string; slug: string; region: string; country: string; summary: string; description: string; imageUrl: string; featured: boolean; published: boolean; sortOrder: number };

export function DestinationForm({ id, values }: { id: string | null; values: Values }) {
  const [state, action] = useActionState(saveDestinationAction.bind(null, id), initialActionState);
  const fe = state.ok ? undefined : state.fieldErrors;
  return (
    <form action={action} className="max-w-3xl space-y-6" noValidate>
      <FormStatus state={state} />
      <Panel title="Destination">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Name" error={fe?.name}>{(p) => <Input name="name" defaultValue={values.name} required {...p} />}</Field>
          <Field label="Web address" optional hint="e.g. nairobi" error={fe?.slug}>{(p) => <Input name="slug" defaultValue={values.slug} {...p} />}</Field>
          <Field label="Region / county" optional error={fe?.region}>{(p) => <Input name="region" defaultValue={values.region} {...p} />}</Field>
          <Field label="Country code" hint="2 letters" error={fe?.country}>{(p) => <Input name="country" defaultValue={values.country} maxLength={2} className="uppercase" {...p} />}</Field>
          <Field label="Summary" optional hint="One or two sentences for cards and search results" error={fe?.summary} className="sm:col-span-2">{(p) => <Textarea name="summary" defaultValue={values.summary} rows={2} maxLength={300} {...p} />}</Field>
          <Field label="Guide" optional hint="Helpful, original content about the area: getting there, when to go, what to do. Blank lines separate paragraphs." error={fe?.description} className="sm:col-span-2">{(p) => <Textarea name="description" defaultValue={values.description} rows={10} {...p} />}</Field>
          <div className="sm:col-span-2"><ImageField name="imageUrl" label="Hero image" defaultValue={values.imageUrl} hint="If empty, a photo from one of its stays is used." /></div>
          <Field label="Sort order" hint="Lower numbers appear first" error={fe?.sortOrder}>{(p) => <Input name="sortOrder" type="number" min={0} defaultValue={values.sortOrder} {...p} />}</Field>
          <div className="space-y-3 sm:col-span-2">
            <Checkbox name="featured" defaultChecked={values.featured} label="Feature on the homepage" />
            <Checkbox name="published" defaultChecked={values.published} label="Published" description="Hidden destinations have no public page." />
          </div>
        </div>
      </Panel>
      <div className="flex justify-end"><SubmitButton variant="brand">Save destination</SubmitButton></div>
    </form>
  );
}
