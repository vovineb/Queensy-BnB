import type { Metadata } from "next";
import { requireUserPage } from "@/server/auth/guards";
import { AccountNav } from "@/components/account/account-nav";

export const metadata: Metadata = { robots: { index: false } };

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  await requireUserPage("/account");
  return (
    <div className="container-page grid gap-8 pb-10 pt-6 sm:pt-10 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-12">
      <AccountNav />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
