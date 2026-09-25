"use client";

import { useActionState, useState } from "react";
import type { ActionResult } from "@/server/errors";
import { toast } from "sonner";
import { cancelBookingAction } from "@/server/actions/booking";
import { Modal } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/field";
import { FormStatus, initialActionState } from "@/components/forms/form-status";
import { SubmitButton } from "@/components/forms/submit-button";

export function CancelBookingButton({ bookingId, policy }: { bookingId: string; policy: string }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(async (prev: ActionResult, formData: FormData) => {
    const result = await cancelBookingAction(prev, formData);
    if (result.ok) {
      setOpen(false);
      toast.success(result.message ?? "Booking cancelled");
    }
    return result;
  }, initialActionState);
  return (
    <>
      <Button variant="ghost" className="text-danger-700 hover:bg-danger-50" onClick={() => setOpen(true)}>
        Cancel booking
      </Button>
      <Modal open={open} onOpenChange={setOpen} title="Cancel this booking?" description={policy}>
        <form action={action} className="space-y-4">
          <input type="hidden" name="bookingId" value={bookingId} />
          <FormStatus state={state} successToast={false} />
          <Field label="Reason" optional hint="Helps us improve — and lets us suggest alternatives.">
            {(p) => <Textarea name="reason" rows={3} maxLength={500} {...p} />}
          </Field>
          <p className="text-sm text-ink-600">If you&apos;ve already paid, our team will contact you about any refund due under the cancellation policy.</p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => setOpen(false)}>Keep booking</Button>
            <SubmitButton variant="danger">Cancel booking</SubmitButton>
          </div>
        </form>
      </Modal>
    </>
  );
}
