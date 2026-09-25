import { getSettings } from "@/server/services/settings";
import { getDestinations } from "@/server/services/catalog";
import { pageMetadata } from "@/lib/seo";
import { ButtonLink } from "@/components/ui/button";

export const metadata = pageMetadata({ title: "About Queensy BnB", description: "Queensy BnB is a Kenyan accommodation platform offering handpicked apartments and holiday homes with real-time booking.", path: "/about" });

export default async function AboutPage() {
  const [settings, destinations] = await Promise.all([getSettings(), getDestinations()]);
  const live = destinations.filter((d) => d.propertyCount > 0).map((d) => d.name);
  return (
    <div className="container-page max-w-3xl pb-8 pt-8 sm:pt-12">
      <h1 className="text-h1 font-bold">About {settings.siteName}</h1>
      <div className="mt-6 space-y-5 text-lg leading-relaxed text-ink-800">
        <p>{settings.siteName} is a Kenyan accommodation company. We look after a small collection of apartments, suites and holiday homes{live.length ? ` in ${live.join(", ")}` : ""}, and we host guests from Kenya, East Africa and around the world.</p>
        <p>We built this site so booking with us is simple and transparent: live availability, a full price breakdown before you commit, and a local team you can message directly from your account.</p>
        <p>Whether you&apos;re here for a beach break, a family holiday, a work trip or a long stay, tell us what you need and we&apos;ll help you find the right place.</p>
      </div>
      <div className="mt-8 flex flex-wrap gap-3">
        <ButtonLink href="/properties" variant="primary">Browse stays</ButtonLink>
        <ButtonLink href="/contact" variant="secondary">Contact us</ButtonLink>
      </div>
    </div>
  );
}
