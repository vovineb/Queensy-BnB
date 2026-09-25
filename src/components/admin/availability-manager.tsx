"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { addBlockAction, removeBlockAction } from "@/server/actions/admin/properties";
import { formatDateRange } from "@/lib/format";
import { Field, Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { BookingStatusBadge } from "@/components/ui/status-badge";
import { SubmitButton } from "@/components/forms/submit-button";
import { FormStatus, initialActionState } from "@/components/forms/form-status";
import { Panel } from "./ui";

type Block = { id: string; start: string; end: string; reason: string | null };
type Booking = { id: string; reference: string; checkIn: string; checkOut: string; status: string; guestName: string };

export function AvailabilityManager({ propertyId, today, blocks, bookings }: { propertyId: string; today: string; blocks: Block[]; bookings: Booking[] }) {
  const router = useRouter();
  const [state, action] = useActionState(addBlockAction, initialActionState);
  const [pending, start] = useTransition();
  const form = useRef<HTMLFormElement>(null);
  const fe = state.ok ? undefined : state.fieldErrors;
  useEffect(() => {
    if (state.ok) {
      form.current?.reset();
      router.refresh();
    }
  }, [state, router]);

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Panel title="Close dates">
        <p className="mb-4 text-sm text-ink-600">Block dates for maintenance, owner stays or bookings taken elsewhere. Guests can&apos;t book blocked nights. The end date is the first night that&apos;s open again.</p>
        <form ref={form} action={action} className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="propertyId" value={propertyId} />
          <div className="sm:col-span-2"><FormStatus state={state} /></div>
          <Field label="From (first blocked night)" error={fe?.startDate}>{(p) => <Input type="date" name="startDate" min={today} required {...p} />}</Field>
          <Field label="Until (first open night)" error={fe?.endDate}>{(p) => <Input type="date" name="endDate" min={today} required {...p} />}</Field>
          <Field label="Reason" optional className="sm:col-span-2">{(p) => <Input name="reason" maxLength={200} placeholder="e.g. Repainting" {...p} />}</Field>
          <div className="sm:col-span-2"><SubmitButton variant="brand">Block dates</SubmitButton></div>
        </form>
        <h3 className="mt-8 text-sm font-semibold">Upcoming blocked dates</h3>
        {blocks.length ? (
          <ul className="mt-2 divide-y divide-ink-100">
            {blocks.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-4 py-2.5 text-sm">
                <span>{formatDateRange(b.start, b.end)}{b.reason && <span className="block text-xs text-ink-500">{b.reason}</span>}</span>
                <Button variant="ghost" size="sm" icon={<Trash2 className="size-4" />} disabled={pending} onClick={() => start(async () => { const r = await removeBlockAction(b.id); if (r.ok) toast.success(r.message ?? "Reopened"); else toast.error(r.error); router.refresh(); })}>Reopen</Button>
              </li>
            ))}
          </ul>
        ) : <p className="mt-2 text-sm text-ink-500">No blocked dates.</p>}
      </Panel>
      <Panel title="Upcoming bookings" actions={<Link href="/admin/calendar" className="text-sm font-medium text-lagoon-700 hover:underline">Calendar</Link>}>
        {bookings.length ? (
          <ul className="divide-y divide-ink-100">
            {bookings.map((b) => (
              <li key={b.id}>
                <Link href={`/admin/bookings/${b.id}`} className="flex items-center justify-between gap-4 py-2.5 text-sm hover:bg-ink-50">
                  <span><span className="font-medium">{formatDateRange(b.checkIn, b.checkOut)}</span><span className="block text-xs text-ink-500">{b.reference} · {b.guestName}</span></span>
                  <BookingStatusBadge status={b.status} />
                </Link>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-ink-500">No upcoming bookings.</p>}
      </Panel>
    </div>
  );
}
