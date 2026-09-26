import { getSettings } from "@/server/services/settings";
import { POLICY_VERSION } from "@/server/services/accounts";
import { pageMetadata } from "@/lib/seo";
import { Prose } from "@/components/site/prose";

export const metadata = pageMetadata({ title: "Terms of use & booking terms", description: "The terms that apply when you use Queensy BnB and book a stay.", path: "/terms" });

export default async function TermsPage() {
  const s = await getSettings();
  return (
    <div className="container-page max-w-3xl pb-8 pt-8 sm:pt-12">
      <h1 className="text-h1 font-bold">Terms of use & booking terms</h1>
      <p className="mt-2 text-sm text-ink-500">Version {POLICY_VERSION}</p>
      <Prose>
        <h2>Booking requests</h2>
        <p>When you request to book, we hold the dates for you for {s.bookingHoldHours} hours while our team reviews the request. A booking is confirmed when its status shows <em>Confirmed</em> or <em>Paid</em> in your account. If a request isn&apos;t confirmed or paid in time, the hold expires and the dates are released.</p>
        <h2>Prices and payment</h2>
        <p>The price shown at checkout — nightly rate, fees and any discount — is the price of your booking. Payment instructions are provided after confirmation. Offers apply automatically when your stay meets their conditions.</p>
        <h2>Cancellations</h2>
        <p>Each property has a cancellation policy shown on its page and in your booking. You can cancel online before check-in. Refunds, where due, are processed by our team according to that policy.</p>
        <h2>During your stay</h2>
        <p>Please respect the house rules, the maximum number of guests and check-in/check-out times shown for the property. Tell us straight away about any problem so we can fix it.</p>
        <h2>Your account</h2>
        <p>Keep your password safe and your contact details accurate. We may suspend accounts used fraudulently or abusively.</p>
        <h2>Contact</h2>
        <p>Questions about these terms? Contact {s.siteName}{s.contactEmail ? ` at ${s.contactEmail}` : " through our Contact page"}.</p>
      </Prose>
    </div>
  );
}
