import { getSettings } from "@/server/services/settings";
import { POLICY_VERSION } from "@/server/services/accounts";
import { pageMetadata } from "@/lib/seo";
import { Prose } from "@/components/site/prose";

export const metadata = pageMetadata({ title: "Privacy notice", description: "How Queensy BnB collects, uses and protects your personal data, and your rights under Kenya's Data Protection Act.", path: "/privacy" });

export default async function PrivacyNoticePage() {
  const s = await getSettings();
  const contact = s.contactEmail || "the contact details on our Contact page";
  return (
    <div className="container-page max-w-3xl pb-8 pt-8 sm:pt-12">
      <h1 className="text-h1 font-bold">Privacy notice</h1>
      <p className="mt-2 text-sm text-ink-500">Version {POLICY_VERSION}</p>
      <Prose>
        <p className="mt-6">{s.siteName} (&ldquo;we&rdquo;) is the data controller for personal data collected through this website. We process personal data in line with the Kenya Data Protection Act, 2019 and, where it applies to our guests, other data protection laws such as the EU/UK GDPR.</p>
        <h2>What we collect</h2>
        <ul>
          <li><strong>Account details:</strong> your name, email address, mobile number (in international format) and a securely hashed password.</li>
          <li><strong>Booking details:</strong> the stay, dates, number of guests, price, any notes you add, booking status and payments recorded against it.</li>
          <li><strong>Messages:</strong> conversations with our team and enquiries sent through the contact form.</li>
          <li><strong>Preferences and consent:</strong> your marketing choices and a record of when you gave or withdrew consent.</li>
          <li><strong>Usage data:</strong> first-party, pseudonymous product analytics (for example pages and properties viewed, searches) linked to a random identifier stored in a cookie. We do not store your IP address with analytics, and we don&apos;t record analytics if your browser sends a Do-Not-Track or Global Privacy Control signal.</li>
        </ul>
        <h2>Why we use it</h2>
        <ul>
          <li>To create and secure your account and to take, manage and support your bookings (performance of a contract).</li>
          <li>To reply to your enquiries and messages (legitimate interests / steps before a contract).</li>
          <li>To send booking confirmations, updates and replies — these are service messages and are always sent.</li>
          <li>To send offers and news <strong>only if you opt in</strong>, separately for email, SMS and WhatsApp (consent). You can withdraw consent at any time in your account or via the unsubscribe note in each email.</li>
          <li>To understand how the site is used so we can improve it (legitimate interests), and to meet legal, tax and accounting obligations.</li>
        </ul>
        <h2>Who we share it with</h2>
        <p>We don&apos;t sell personal data. We share it only with service providers who help us run the platform (for example hosting, database, email delivery and file storage), under contracts that require them to protect it, or where the law requires. Some providers may process data outside Kenya; where they do, we rely on appropriate safeguards as required by the Act.</p>
        <h2>How long we keep it</h2>
        <p>Account data is kept while your account is active. Booking and payment records are kept for as long as needed for legal and accounting purposes. Raw analytics events are deleted after about 13 months. Consent records are kept as proof of your choices.</p>
        <h2>Your rights</h2>
        <p>You have the right to be informed, to access your data, to object to processing, to have inaccurate data corrected, to have data deleted where there is no legal reason to keep it, and to data portability. You can download a copy of your data from Account → Privacy &amp; communications. For other requests contact us at {contact}. You may also lodge a complaint with the Office of the Data Protection Commissioner (ODPC) in Kenya.</p>
        <h2>Security</h2>
        <p>Passwords are hashed with Argon2id, sessions use secure HTTP-only cookies, and access to customer data is restricted to authorised staff and logged.</p>
        <h2>Cookies</h2>
        <p>We use a strictly necessary session cookie to keep you signed in, and a first-party analytics identifier as described above. We don&apos;t use third-party advertising cookies.</p>
      </Prose>
    </div>
  );
}
