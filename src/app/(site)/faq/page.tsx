import { getSettings } from "@/server/services/settings";
import { JsonLd, pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({ title: "Frequently asked questions", description: "How booking, payment, cancellations and messaging work at Queensy BnB.", path: "/faq" });

export default async function FaqPage() {
  const settings = await getSettings();
  const faqs = [
    { q: "How do I book a stay?", a: `Pick your dates on a property page and choose "Reserve". Review the price breakdown and request to book. Your dates are held for ${settings.bookingHoldHours} hours while our team confirms and sends payment details.` },
    { q: "Do I need an account?", a: "You can browse, search and check prices and availability without an account. To request a booking, message our team or save stays, create a free account — it takes under a minute." },
    { q: "How do I pay?", a: "After we confirm your request, we'll send payment instructions (for example M-Pesa, bank transfer or card). Your booking status updates in your account as soon as payment is recorded. No payment is taken when you request to book." },
    { q: "Are the prices final?", a: "Yes. The price breakdown shows the nightly rate, any cleaning fee and any discount before you book, and that price is locked in with your request." },
    { q: "Can I cancel?", a: "Yes. Each stay shows its cancellation policy on the property page and in your booking. You can cancel online from Trips before check-in; if you've paid, our team will process any refund due under that policy." },
    { q: "How do I contact the team?", a: "Signed-in guests can message us from their account and chat in real time. You can also use the contact form, phone or WhatsApp listed on the contact page." },
    { q: "Do you accept international guests?", a: "Absolutely. Sign up with any email and phone number from any country. Prices are shown in the property's currency." },
    { q: "Will you send me marketing messages?", a: "Only if you opt in. You choose email, SMS or WhatsApp separately and can change your mind any time in Account → Privacy & communications. Booking updates are always sent." },
  ];
  return (
    <div className="container-page max-w-3xl pb-8 pt-8 sm:pt-12">
      <JsonLd data={{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }} />
      <h1 className="text-h1 font-bold">Frequently asked questions</h1>
      <div className="mt-8 divide-y divide-ink-200 border-y border-ink-200">
        {faqs.map((f) => (
          <details key={f.q} className="group py-5 [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-ink-950">
              {f.q}
              <span className="grid size-7 shrink-0 place-items-center rounded-full ring-1 ring-ink-200 transition group-open:rotate-45" aria-hidden>+</span>
            </summary>
            <p className="mt-3 leading-relaxed text-ink-700">{f.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
