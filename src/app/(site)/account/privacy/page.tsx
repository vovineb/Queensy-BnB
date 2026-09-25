import Link from "next/link";
import { Download } from "lucide-react";
import { requireUserPage } from "@/server/auth/guards";
import { db } from "@/server/db";
import { formatDateTime } from "@/lib/format";
import { Card } from "@/components/ui/feedback";
import { MarketingForm } from "@/components/account/marketing-form";

export const metadata = { title: "Privacy & communications" };

const TYPE_LABEL: Record<string, string> = {
  PRIVACY_NOTICE: "Privacy notice acknowledged",
  TERMS: "Terms accepted",
  MARKETING_EMAIL: "Marketing emails",
  MARKETING_SMS: "Marketing SMS",
  MARKETING_WHATSAPP: "Marketing WhatsApp",
};

export default async function PrivacyPage() {
  const user = await requireUserPage("/account/privacy");
  const [prefs, history] = await Promise.all([
    db.marketingPreference.findUnique({ where: { userId: user.id } }),
    db.consentRecord.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 20 }),
  ]);
  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-h1 font-bold">Privacy & communications</h1>
        <p className="mt-1 text-ink-600">You decide how we contact you about offers. Messages about your bookings are always sent.</p>
      </div>
      <Card as="section">
        <h2 className="text-h3 font-semibold">Marketing preferences</h2>
        <MarketingForm email={prefs?.email ?? false} sms={prefs?.sms ?? false} whatsapp={prefs?.whatsapp ?? false} />
      </Card>
      <Card as="section">
        <h2 className="text-h3 font-semibold">Your data</h2>
        <p className="mt-2 text-sm text-ink-600">
          Download a copy of the personal data we hold about you (profile, bookings, messages, reviews and consent history). To correct or delete your data,{" "}
          <Link href="/account/messages/new" className="underline">message our team</Link>. Some booking records must be kept for legal and accounting reasons. Read our{" "}
          <Link href="/privacy" className="underline">privacy notice</Link>.
        </p>
        <a href="/account/export" className="mt-4 inline-flex h-11 items-center gap-2 rounded-md px-5 text-sm font-semibold ring-1 ring-inset ring-ink-200 hover:bg-ink-50">
          <Download className="size-4" /> Download my data (JSON)
        </a>
      </Card>
      {history.length > 0 && (
        <Card as="section">
          <h2 className="text-h3 font-semibold">Consent history</h2>
          <ul className="mt-4 divide-y divide-ink-100 text-sm">
            {history.map((h) => (
              <li key={h.id} className="flex justify-between gap-4 py-2.5">
                <span>{TYPE_LABEL[h.type]}: <strong>{h.granted ? "Yes" : "No"}</strong></span>
                <span className="text-ink-500">{formatDateTime(h.createdAt)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
