import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/session";
import { SignUpForm } from "@/components/auth/sign-up-form";

export const metadata: Metadata = { title: "Create your account", robots: { index: false } };

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (await getCurrentUser()) redirect("/account");
  return (
    <>
      <h1 className="text-h1 font-bold">Create your account</h1>
      <p className="mt-2 text-ink-600">Book stays, message our team and keep track of your trips.</p>
      <SignUpForm next={next} />
    </>
  );
}
