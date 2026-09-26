"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { addProspectNoteAction, updateProspectAction } from "@/server/actions/admin/people";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Panel } from "./ui";

export function ProspectControls({ prospectId, status, nextFollowUpAt }: { prospectId: string; status: string; nextFollowUpAt: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [s, setS] = useState(status);
  const [follow, setFollow] = useState(nextFollowUpAt);
  const [note, setNote] = useState("");
  const run = (fn: () => Promise<{ ok: boolean; message?: string; error?: string }>) =>
    start(async () => {
      const r = await fn();
      if (r.ok) toast.success(r.message ?? "Saved");
      else toast.error(r.error ?? "Failed");
      router.refresh();
    });
  return (
    <Panel title="Follow-up">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Status">
          {(p) => (
            <Select value={s} onChange={(e) => setS(e.target.value)} {...p}>
              <option value="NEW">New</option><option value="CONTACTED">Contacted</option><option value="QUALIFIED">Qualified</option><option value="CONVERTED">Converted</option><option value="LOST">Lost</option>
            </Select>
          )}
        </Field>
        <Field label="Next follow-up" optional>{(p) => <Input type="date" value={follow} onChange={(e) => setFollow(e.target.value)} {...p} />}</Field>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="brand" size="sm" loading={pending} onClick={() => run(() => updateProspectAction(prospectId, { status: s as never, nextFollowUpAt: follow || null }))}>Save</Button>
        <Button variant="secondary" size="sm" disabled={pending} onClick={() => run(() => updateProspectAction(prospectId, { markContacted: true, status: s === "NEW" ? "CONTACTED" : (s as never) }))}>Mark contacted now</Button>
      </div>
      <div className="mt-6 border-t border-ink-100 pt-4">
        <Field label="Add a note">{(p) => <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="e.g. Called — interested in 2 weeks in December" {...p} />}</Field>
        <Button className="mt-2" variant="dark" size="sm" disabled={!note.trim() || pending} onClick={() => run(async () => { const r = await addProspectNoteAction(prospectId, note); if (r.ok) setNote(""); return r; })}>Add note</Button>
      </div>
    </Panel>
  );
}
