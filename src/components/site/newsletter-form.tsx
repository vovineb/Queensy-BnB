"use client";

import { useActionState } from "react";
import Link from "next/link";
import { subscribeNewsletterAction } from "@/server/actions/public";
import type { ActionResult } from "@/server/errors";
import { Button } from "@/components/ui/button";

export function NewsletterForm() {
  const [state, action, pending] = useActionState<ActionResult, FormData>(subscribeNewsletterAction, { ok: false, error: "" });
  if (state.ok) return <p className="rounded-md bg-lagoon-50 p-3 text-sm text-lagoon-800" role="status">{state.message}</p>;
  return (
    <form action={action} className="space-y-2" noValidate>
      <label htmlFor="newsletter-email" className="text-sm font-medium text-ink-800">
        Offers and new stays, occasionally
      </label>
      <div className="flex gap-2">
        <input id="newsletter-email" name="email" type="email" required autoComplete="email" placeholder="you@example.com" className="h-11 min-w-0 flex-1 rounded-md bg-surface px-3.5 text-sm ring-1 ring-inset ring-ink-200 focus:outline-none focus:ring-2 focus:ring-lagoon-500" />
        <Button type="submit" variant="dark" loading={pending}>Subscribe</Button>
      </div>
      <label className="flex items-start gap-2 text-xs text-ink-500">
        <input type="checkbox" name="consent" required className="mt-0.5 accent-lagoon-700" />
        <span>
          I agree to receive marketing emails from Queensy BnB. See our <Link href="/privacy" className="underline">privacy notice</Link>.
        </span>
      </label>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      {!state.ok && state.error && <p className="text-sm text-danger-700" role="alert">{state.error}</p>}
    </form>
  );
}
