"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, CircleDollarSign, Clock, CreditCard, RotateCcw, XCircle } from "lucide-react";
import { extendHoldAction, recordPaymentAction, transitionBookingAction } from "@/server/actions/admin/bookings";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Modal } from "@/components/ui/dialog";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { FormStatus, initialActionState } from "@/components/forms/form-status";
import type { BookingStatus } from "@/generated/prisma/browser";

type Props = { bookingId: string; status: BookingStatus; allowed: BookingStatus[]; currency: string; outstanding: number; canExtend: boolean };

export function BookingActions({ bookingId, status, allowed, currency, outstanding, canExtend }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState<BookingStatus | null>(null);
  const [reason, setReason] = useState("");
  const [paymentOpen, setPaymentOpen] = useState(false);

  const run = (to: BookingStatus) =>
    start(async () => {
      const r = await transitionBookingAction(bookingId, to, reason);
      if (r.ok) toast.success(r.message ?? "Updated");
      else toast.error(r.error);
      setConfirm(null);
      setReason("");
      router.refresh();
    });

  const can = (s: BookingStatus) => allowed.includes(s);
  const noActions = allowed.length === 0 && !canExtend;

  return (
    <div className="flex flex-wrap gap-2">
      {can("CONFIRMED") && <Button variant="brand" icon={<CheckCircle2 className="size-4" />} onClick={() => setConfirm("CONFIRMED")} disabled={pending}>Confirm booking</Button>}
      {can("AWAITING_PAYMENT") && <Button variant="secondary" icon={<CreditCard className="size-4" />} onClick={() => setConfirm("AWAITING_PAYMENT")} disabled={pending}>Approve & request payment</Button>}
      {status !== "CANCELLED" && status !== "EXPIRED" && status !== "REFUNDED" && status !== "COMPLETED" && (
        <Button variant="secondary" icon={<CircleDollarSign className="size-4" />} onClick={() => setPaymentOpen(true)}>Record payment</Button>
      )}
      {canExtend && (
        <Button variant="secondary" icon={<Clock className="size-4" />} disabled={pending} onClick={() => start(async () => { const r = await extendHoldAction(bookingId, 24); if (r.ok) toast.success(r.message ?? "Extended"); else toast.error(r.error); router.refresh(); })}>
          Extend hold 24h
        </Button>
      )}
      {can("COMPLETED") && status !== "PAID" && <Button variant="secondary" onClick={() => setConfirm("COMPLETED")} disabled={pending}>Mark completed</Button>}
      {can("REFUNDED") && <Button variant="secondary" icon={<RotateCcw className="size-4" />} onClick={() => setConfirm("REFUNDED")} disabled={pending}>Mark refunded</Button>}
      {can("CANCELLED") && <Button variant="ghost" className="text-danger-700 hover:bg-danger-50" icon={<XCircle className="size-4" />} onClick={() => setConfirm("CANCELLED")} disabled={pending}>Cancel booking</Button>}
      {noActions && <p className="text-sm text-ink-500">No further actions for a {status.toLowerCase().replace("_", " ")} booking.</p>}

      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={confirm === "CANCELLED" ? "Cancel this booking?" : confirm === "CONFIRMED" ? "Confirm this booking?" : confirm === "AWAITING_PAYMENT" ? "Approve and request payment?" : confirm === "REFUNDED" ? "Mark as refunded?" : "Mark as completed?"}
        description={
          confirm === "CANCELLED" ? "The dates are released immediately and the guest is notified."
            : confirm === "CONFIRMED" ? "The reservation is guaranteed and the guest is notified. Use this when payment is settled or you accept pay-on-arrival."
              : confirm === "AWAITING_PAYMENT" ? "The guest is notified that their booking is approved and awaiting payment. The hold is renewed."
                : "The guest is notified."
        }
        tone={confirm === "CANCELLED" ? "danger" : "brand"}
        confirmLabel={confirm === "CANCELLED" ? "Cancel booking" : "Yes, continue"}
        pending={pending}
        onConfirm={() => confirm && run(confirm)}
      >
        {confirm === "CANCELLED" && (
          <Field label="Reason (shared with the guest)" optional>
            {(p) => <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={500} {...p} />}
          </Field>
        )}
      </ConfirmDialog>

      <PaymentModal open={paymentOpen} onOpenChange={setPaymentOpen} bookingId={bookingId} currency={currency} outstanding={outstanding} />
    </div>
  );
}

function PaymentModal({ open, onOpenChange, bookingId, currency, outstanding }: { open: boolean; onOpenChange: (o: boolean) => void; bookingId: string; currency: string; outstanding: number }) {
  const router = useRouter();
  const [state, action] = useActionState(recordPaymentAction, initialActionState);
  const fe = state.ok ? undefined : state.fieldErrors;
  useEffect(() => {
    if (state.ok) {
      onOpenChange(false);
      router.refresh();
    }
  }, [state, onOpenChange, router]);
  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Record a payment" description="Record money you've received (e.g. M-Pesa or bank transfer). Paying the full amount marks the booking as Paid.">
      <form action={action} className="space-y-4">
        <input type="hidden" name="bookingId" value={bookingId} />
        <FormStatus state={state} />
        <Field label={`Amount received (${currency})`} error={fe?.amount}>{(p) => <Input name="amount" type="number" step="0.01" min="0" defaultValue={outstanding || ""} required {...p} />}</Field>
        <Field label="Method" error={fe?.method}>
          {(p) => (
            <Select name="method" defaultValue="mpesa" {...p}>
              <option value="mpesa">M-Pesa</option>
              <option value="bank_transfer">Bank transfer</option>
              <option value="card">Card (in person)</option>
              <option value="cash">Cash</option>
              <option value="other">Other</option>
            </Select>
          )}
        </Field>
        <Field label="Receipt / transaction code" optional hint="e.g. the M-Pesa confirmation code" error={fe?.reference}>{(p) => <Input name="reference" maxLength={80} {...p} />}</Field>
        <Checkbox name="markConfirmed" defaultChecked label="Confirm the booking if this is a partial payment (deposit)" />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
          <SubmitButton variant="brand">Record payment</SubmitButton>
        </div>
      </form>
    </Modal>
  );
}
