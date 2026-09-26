import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/session";
import { safeNextPath } from "@/server/auth/guards";
import { SignInForm } from "@/components/auth/sign-in-form";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect(safeNextPath(next, user.role === "ADMIN" ? "/admin" : "/account"));
  return (
    <>
      <h1 className="text-h1 font-bold">Welcome back</h1>
      <p className="mt-2 text-ink-600">Sign in to manage your trips and messages.</p>
      <SignInForm next={next} />
    </>
  );
}
