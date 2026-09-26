import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = { title: "Reset your password", robots: { index: false } };

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="text-h1 font-bold">Reset your password</h1>
      <p className="mt-2 text-ink-600">Enter the email you use for Queensy BnB and we&apos;ll send you a reset link.</p>
      <ForgotPasswordForm />
    </>
  );
}
