import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";
import { verifyEmail } from "@/server/services/accounts";
import { Alert } from "@/components/ui/feedback";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = { title: "Confirm your email", robots: { index: false } };

export default async function VerifyEmailPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const ok = await verifyEmail(token);
  return ok ? (
    <div>
      <CheckCircle2 className="size-10 text-success-600" aria-hidden />
      <h1 className="mt-4 text-h1 font-bold">Email confirmed</h1>
      <p className="mt-2 text-ink-600">Thanks! Any earlier bookings made with this email are now linked to your account.</p>
      <ButtonLink href="/account" variant="dark" className="mt-6">Go to your account</ButtonLink>
    </div>
  ) : (
    <div className="space-y-4">
      <h1 className="text-h1 font-bold">Link expired</h1>
      <Alert tone="warning">This confirmation link is invalid or was already used. You can request a new one from your account.</Alert>
      <ButtonLink href="/account" variant="secondary">Go to your account</ButtonLink>
    </div>
  );
}
