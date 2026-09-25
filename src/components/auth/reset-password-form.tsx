"use client";

import { useActionState } from "react";
import { resetPasswordAction } from "@/server/actions/auth";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { FormStatus, initialActionState } from "@/components/forms/form-status";
import { PASSWORD_MIN } from "@/lib/validation";
import { PasswordInput } from "./sign-in-form";

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action] = useActionState(resetPasswordAction, initialActionState);
  const fe = state.ok ? undefined : state.fieldErrors;
  return (
    <form action={action} className="mt-8 space-y-5" noValidate>
      <input type="hidden" name="token" value={token} />
      <FormStatus state={state} />
      <Field label="New password" hint={`At least ${PASSWORD_MIN} characters.`} error={fe?.password}>
        {(p) => <PasswordInput name="password" autoComplete="new-password" required autoFocus {...p} />}
      </Field>
      <Field label="Confirm new password" error={fe?.confirmPassword}>
        {(p) => <PasswordInput name="confirmPassword" autoComplete="new-password" required {...p} />}
      </Field>
      <SubmitButton variant="dark" size="lg" className="w-full">Save password and sign in</SubmitButton>
    </form>
  );
}
