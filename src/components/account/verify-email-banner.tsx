"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { MailWarning } from "lucide-react";
import { resendVerificationAction } from "@/server/actions/account";

export function VerifyEmailBanner({ email }: { email: string }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-warning-50 p-4 text-sm text-warning-700 ring-1 ring-warning-600/20 sm:flex-row sm:items-center sm:justify-between">
      <p className="flex gap-2">
        <MailWarning className="size-4 shrink-0" aria-hidden />
        <span>Please confirm <strong>{email}</strong> so we can send booking confirmations reliably.</span>
      </p>
      <button
        type="button"
        disabled={pending}
        onClick={() => start(async () => {
          const r = await resendVerificationAction();
          if (r.ok) toast.success(r.message ?? "Sent");
          else toast.error(r.error);
        })}
        className="shrink-0 font-semibold underline underline-offset-4 disabled:opacity-60"
      >
        {pending ? "Sending…" : "Resend link"}
      </button>
    </div>
  );
}
