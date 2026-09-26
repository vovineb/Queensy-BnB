import Link from "next/link";
import { Clock, Mail, MessageCircle, Phone } from "lucide-react";
import { getSettings } from "@/server/services/settings";
import { getCurrentUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { formatPhone } from "@/lib/phone";
import { pageMetadata } from "@/lib/seo";
import { ContactForm } from "@/components/site/contact-form";
import { Card } from "@/components/ui/feedback";

export const metadata = pageMetadata({ title: "Contact us", description: "Questions about a stay, long-term or corporate bookings? Contact the Queensy BnB team in Kenya.", path: "/contact" });

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ property?: string }> }) {
  const { property: slug } = await searchParams;
  const [settings, user, properties] = await Promise.all([
    getSettings(),
    getCurrentUser(),
    db.property.findMany({ where: { status: "PUBLISHED" }, select: { id: true, name: true, slug: true }, orderBy: { name: "asc" } }),
  ]);
  const selected = properties.find((p) => p.slug === slug);
  const wa = settings.whatsappNumber.replace(/\D/g, "");
  return (
    <div className="container-page grid gap-10 pb-8 pt-8 sm:pt-12 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="max-w-2xl">
        <h1 className="text-h1 font-bold">Talk to our team</h1>
        <p className="mt-2 text-lg text-ink-600">Ask about a stay, a longer visit, group or corporate bookings — we&apos;re happy to help.</p>
        <ContactForm properties={properties.map(({ id, name }) => ({ id, name }))} defaultPropertyId={selected?.id} defaultName={user?.name} defaultEmail={user?.email} signedIn={Boolean(user)} />
      </div>
      <aside className="space-y-4">
        <Card>
          <h2 className="font-sans text-base font-semibold">Other ways to reach us</h2>
          <ul className="mt-4 space-y-3 text-sm">
            {settings.contactPhone && <li className="flex items-center gap-3"><Phone className="size-4 text-lagoon-700" /> <a href={`tel:${settings.contactPhone.replace(/\s/g, "")}`} className="hover:underline">{formatPhone(settings.contactPhone) || settings.contactPhone}</a></li>}
            {wa && <li className="flex items-center gap-3"><MessageCircle className="size-4 text-lagoon-700" /> <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" className="hover:underline">WhatsApp</a></li>}
            {settings.contactEmail && <li className="flex items-center gap-3"><Mail className="size-4 text-lagoon-700" /> <a href={`mailto:${settings.contactEmail}`} className="break-all hover:underline">{settings.contactEmail}</a></li>}
            <li className="flex items-center gap-3"><Clock className="size-4 text-lagoon-700" /> {settings.supportHours}</li>
          </ul>
        </Card>
        {user && (
          <Card className="bg-lagoon-50 ring-lagoon-100">
            <p className="text-sm text-ink-700">You&apos;re signed in — for anything about an existing booking, <Link href="/account/messages/new" className="font-semibold underline">message us from your account</Link> to chat in real time.</p>
          </Card>
        )}
      </aside>
    </div>
  );
}
