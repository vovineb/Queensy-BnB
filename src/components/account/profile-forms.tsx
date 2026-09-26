"use client";

import { useActionState, useEffect, useRef } from "react";
import { changePasswordAction, updateProfileAction } from "@/server/actions/account";
import { Field, Input } from "@/components/ui/field";
import { PhoneInput } from "@/components/forms/phone-input";
import { SubmitButton } from "@/components/forms/submit-button";
import { FormStatus, initialActionState } from "@/components/forms/form-status";
import { PasswordInput } from "@/components/auth/sign-in-form";

export function ProfileForm({ name, email, phone }: { name: string; email: string; phone: string | null }) {
  const [state, action] = useActionState(updateProfileAction, initialActionState);
  const fe = state.ok ? undefined : state.fieldErrors;
  return (
    <form action={action} className="mt-5 space-y-5">
      <FormStatus state={state} />
      <Field label="Full name" error={fe?.name}>{(p) => <Input name="name" defaultValue={name} autoComplete="name" required {...p} />}</Field>
      <Field label="Email" hint="Contact us to change the email on your account.">{(p) => <Input value={email} disabled readOnly {...p} />}</Field>
      <Field label="Mobile number" error={fe?.phone}>{(p) => <PhoneInput name="phone" defaultValue={phone} {...p} />}</Field>
      <SubmitButton variant="dark">Save changes</SubmitButton>
    </form>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState(changePasswordAction, initialActionState);
  const form = useRef<HTMLFormElement>(null);
  const fe = state.ok ? undefined : state.fieldErrors;
  useEffect(() => {
    if (state.ok) form.current?.reset();
  }, [state]);
  return (
    <form ref={form} action={action} className="mt-5 space-y-5">
      <FormStatus state={state} />
      <Field label="Current password" error={fe?.currentPassword}>{(p) => <PasswordInput name="currentPassword" autoComplete="current-password" required {...p} />}</Field>
      <Field label="New password" hint="At least 10 characters." error={fe?.password}>{(p) => <PasswordInput name="password" autoComplete="new-password" required {...p} />}</Field>
      <Field label="Confirm new password" error={fe?.confirmPassword}>{(p) => <PasswordInput name="confirmPassword" autoComplete="new-password" required {...p} />}</Field>
      <SubmitButton variant="dark">Update password</SubmitButton>
    </form>
  );
}
