"use client";

import Link from "next/link";
import { useActionState } from "react";
import { MailCheck } from "lucide-react";
import { forgotPasswordAction } from "@/server/actions/auth";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { FormStatus, initialActionState } from "@/components/forms/form-status";

export function ForgotPasswordForm() {
  const [state, action] = useActionState(forgotPasswordAction, initialActionState);
  if (state.ok) {
    return (
      <div className="mt-8 rounded-xl bg-lagoon-50 p-6" role="status">
        <MailCheck className="size-6 text-lagoon-700" aria-hidden />
        <p className="mt-3 font-medium text-ink-900">Check your inbox</p>
        <p className="mt-1 text-sm text-ink-700">{state.message}</p>
        <Link href="/login" className="mt-4 inline-block text-sm font-semibold text-lagoon-700 hover:underline">Back to sign in</Link>
      </div>
    );
  }
  return (
    <form action={action} className="mt-8 space-y-5" noValidate>
      <FormStatus state={state} successToast={false} />
      <Field label="Email" error={state.ok ? undefined : state.fieldErrors?.email}>
        {(p) => <Input name="email" type="email" autoComplete="email" required autoFocus {...p} />}
      </Field>
      <SubmitButton variant="dark" size="lg" className="w-full">Send reset link</SubmitButton>
      <p className="text-center text-sm"><Link href="/login" className="font-semibold text-lagoon-700 hover:underline">Back to sign in</Link></p>
    </form>
  );
}
