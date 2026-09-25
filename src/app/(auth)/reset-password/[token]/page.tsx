import type { Metadata } from "next";
import Link from "next/link";
import { isResetTokenValid } from "@/server/services/accounts";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { Alert } from "@/components/ui/feedback";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };

export default async function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const valid = await isResetTokenValid(token);
  return (
    <>
      <h1 className="text-h1 font-bold">Choose a new password</h1>
      {valid ? (
        <ResetPasswordForm token={token} />
      ) : (
        <div className="mt-6 space-y-4">
          <Alert tone="warning" title="This link has expired or was already used">Reset links work once and expire after an hour.</Alert>
          <Link href="/forgot-password" className="font-semibold text-lagoon-700 hover:underline">Request a new link</Link>
        </div>
      )}
    </>
  );
}
