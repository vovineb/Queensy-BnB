"use client";

import { useRouter } from "next/navigation";
import { useActionState, useTransition } from "react";
import { toast } from "sonner";
import { deleteAnnouncementAction, saveAnnouncementAction } from "@/server/actions/admin/marketing";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/forms/submit-button";
import { FormStatus, initialActionState } from "@/components/forms/form-status";
import { ImageField } from "./image-field";
import { Panel } from "./ui";

type Values = { title: string; slug: string; body: string; kind: string; imageUrl: string; ctaLabel: string; ctaUrl: string; status: string; publishAt: string; expiresAt: string };

const KINDS = [["PRICE_UPDATE", "Price update"], ["NEW_PROPERTY", "New property"], ["SPECIAL_OFFER", "Special offer"], ["SEASONAL", "Seasonal campaign"], ["SERVICE", "Service update"]];

export function AnnouncementForm({ id, values }: { id: string | null; values: Values }) {
  const router = useRouter();
  const [state, action] = useActionState(saveAnnouncementAction.bind(null, id), initialActionState);
  const [pending, start] = useTransition();
  const fe = state.ok ? undefined : state.fieldErrors;
  return (
    <form action={action} className="max-w-3xl space-y-6" noValidate>
      <FormStatus state={state} />
      <Panel title="Content">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Title" error={fe?.title} className="sm:col-span-2">{(p) => <Input name="title" defaultValue={values.title} required {...p} />}</Field>
          <Field label="Type" error={fe?.kind}>{(p) => <Select name="kind" defaultValue={values.kind} {...p}>{KINDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>}</Field>
          <Field label="Web address" optional hint="Generated from the title if empty" error={fe?.slug}>{(p) => <Input name="slug" defaultValue={values.slug} {...p} />}</Field>
          <Field label="Description" error={fe?.body} className="sm:col-span-2">{(p) => <Textarea name="body" defaultValue={values.body} rows={8} required {...p} />}</Field>
          <div className="sm:col-span-2"><ImageField name="imageUrl" label="Image" defaultValue={values.imageUrl} /></div>
          <Field label="Button label" optional error={fe?.ctaLabel}>{(p) => <Input name="ctaLabel" defaultValue={values.ctaLabel} placeholder="e.g. See the new stay" {...p} />}</Field>
          <Field label="Button link" optional hint="A page on this site (/properties/…) or an https:// link" error={fe?.ctaUrl}>{(p) => <Input name="ctaUrl" defaultValue={values.ctaUrl} {...p} />}</Field>
        </div>
      </Panel>
      <Panel title="Publishing">
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Status" error={fe?.status}>{(p) => <Select name="status" defaultValue={values.status} {...p}><option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option><option value="ARCHIVED">Archived</option></Select>}</Field>
          <Field label="Publish on" error={fe?.publishAt}>{(p) => <Input name="publishAt" type="date" defaultValue={values.publishAt} required {...p} />}</Field>
          <Field label="Expires on" optional error={fe?.expiresAt}>{(p) => <Input name="expiresAt" type="date" defaultValue={values.expiresAt} {...p} />}</Field>
        </div>
        <Checkbox className="mt-5" name="notifySubscribers" label="Email customers who opted in to marketing when I save" description="Only sent if the status is Published." />
      </Panel>
      <div className="flex justify-between gap-2">
        {id ? <Button variant="ghost" className="text-danger-700" loading={pending} onClick={() => start(async () => { const r = await deleteAnnouncementAction(id); if (r.ok) { toast.success("Deleted"); router.push("/admin/announcements"); } else toast.error(r.error); })}>Delete</Button> : <span />}
        <SubmitButton variant="brand">Save announcement</SubmitButton>
      </div>
    </form>
  );
}
