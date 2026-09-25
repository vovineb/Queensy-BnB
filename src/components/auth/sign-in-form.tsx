"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { signInAction } from "@/server/actions/auth";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { FormStatus, initialActionState } from "@/components/forms/form-status";

export function PasswordInput(props: React.ComponentProps<typeof Input>) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input {...props} type={show ? "text" : "password"} className="pr-12" />
      <button type="button" onClick={() => setShow(!show)} className="absolute inset-y-0 right-0 grid w-12 place-items-center text-ink-500 hover:text-ink-900" aria-label={show ? "Hide password" : "Show password"}>
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

export function SignInForm({ next }: { next?: string }) {
  const [state, action] = useActionState(signInAction, initialActionState);
  const fe = state.ok ? undefined : state.fieldErrors;
  return (
    <form action={action} className="mt-8 space-y-5" noValidate>
      <input type="hidden" name="next" value={next ?? ""} />
      <FormStatus state={state} />
      <Field label="Email" error={fe?.email}>
        {(p) => <Input name="email" type="email" autoComplete="email" required autoFocus {...p} />}
      </Field>
      <Field label="Password" error={fe?.password}>
        {(p) => <PasswordInput name="password" autoComplete="current-password" required {...p} />}
      </Field>
      <div className="flex justify-end">
        <Link href="/forgot-password" className="text-sm font-semibold text-lagoon-700 hover:underline">Forgot password?</Link>
      </div>
      <SubmitButton variant="dark" size="lg" className="w-full">Sign in</SubmitButton>
      <p className="text-center text-sm text-ink-600">
        New to Queensy? <Link href={`/signup${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-lagoon-700 hover:underline">Create an account</Link>
      </p>
    </form>
  );
}
