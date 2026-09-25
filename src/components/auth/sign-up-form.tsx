"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signUpAction } from "@/server/actions/auth";
import { Checkbox, Field, Input } from "@/components/ui/field";
import { PhoneInput } from "@/components/forms/phone-input";
import { SubmitButton } from "@/components/forms/submit-button";
import { FormStatus, initialActionState } from "@/components/forms/form-status";
import { PASSWORD_MIN } from "@/lib/validation";
import { PasswordInput } from "./sign-in-form";

export function SignUpForm({ next }: { next?: string }) {
  const [state, action] = useActionState(signUpAction, initialActionState);
  const fe = state.ok ? undefined : state.fieldErrors;
  return (
    <form action={action} className="mt-8 space-y-5" noValidate>
      <input type="hidden" name="next" value={next ?? ""} />
      <FormStatus state={state} />
      <Field label="Full name" error={fe?.name}>
        {(p) => <Input name="name" autoComplete="name" required {...p} />}
      </Field>
      <Field label="Email" error={fe?.email}>
        {(p) => <Input name="email" type="email" autoComplete="email" required {...p} />}
      </Field>
      <Field label="Mobile number" hint="Choose your country code. Used for booking updates." error={fe?.phone}>
        {(p) => <PhoneInput name="phone" {...p} />}
      </Field>
      <Field label="Password" hint={`At least ${PASSWORD_MIN} characters. A short phrase is easy to remember.`} error={fe?.password}>
        {(p) => <PasswordInput name="password" autoComplete="new-password" minLength={PASSWORD_MIN} required {...p} />}
      </Field>

      <fieldset className="space-y-3 rounded-xl bg-ink-50 p-4">
        <legend className="sr-only">Communication preferences</legend>
        <p className="text-sm font-medium text-ink-900">Would you like to hear about offers and new stays? <span className="font-normal text-ink-500">(optional — you can change this any time)</span></p>
        <Checkbox name="marketingEmail" label="Offers by email" />
        <Checkbox name="marketingSms" label="Offers by SMS" />
        <Checkbox name="marketingWhatsapp" label="Offers by WhatsApp" />
        <p className="text-xs text-ink-500">Booking confirmations and replies from our team are always sent, whatever you choose here.</p>
      </fieldset>

      <div>
        <Checkbox
          name="acceptTerms"
          required
          label={
            <>
              I agree to the <Link href="/terms" target="_blank" className="underline">terms</Link> and have read the{" "}
              <Link href="/privacy" target="_blank" className="underline">privacy notice</Link>
            </>
          }
        />
        {fe?.acceptTerms && <p className="mt-1.5 text-sm text-danger-700" role="alert">{fe.acceptTerms[0]}</p>}
      </div>

      <SubmitButton variant="dark" size="lg" className="w-full">Create account</SubmitButton>
      <p className="text-center text-sm text-ink-600">
        Already have an account? <Link href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-lagoon-700 hover:underline">Sign in</Link>
      </p>
    </form>
  );
}
