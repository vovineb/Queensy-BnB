import Link from "next/link";
import { Mail, MessageCircle, Phone } from "lucide-react";
import { getSettings } from "@/server/services/settings";
import { getDestinations } from "@/server/services/catalog";
import { formatPhone } from "@/lib/phone";
import { Logo } from "./logo";
import { NewsletterForm } from "./newsletter-form";

export async function Footer() {
  const [settings, destinations] = await Promise.all([getSettings(), getDestinations()]);
  const socials = [
    { href: settings.instagramUrl, label: "Instagram" },
    { href: settings.facebookUrl, label: "Facebook" },
    { href: settings.xUrl, label: "X" },
    { href: settings.tiktokUrl, label: "TikTok" },
  ].filter((s) => s.href);
  const whatsappDigits = settings.whatsappNumber.replace(/\D/g, "");

  return (
    <footer className="mt-24 border-t border-ink-200 bg-surface">
      <div className="container-page grid grid-cols-[minmax(0,1fr)] gap-12 py-14 lg:grid-cols-[1.3fr_2fr]">
        <div className="max-w-sm space-y-5">
          <Logo />
          <p className="text-ink-600">{settings.tagline}. Real-time availability, transparent prices, and a local team in Kenya that answers.</p>
          <NewsletterForm />
        </div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          <FooterColumn title="Explore">
            <FooterLink href="/properties">All stays</FooterLink>
            {destinations.slice(0, 5).map((d) => (
              <FooterLink key={d.slug} href={`/destinations/${d.slug}`}>
                Stays in {d.name}
              </FooterLink>
            ))}
            <FooterLink href="/offers">Offers</FooterLink>
            <FooterLink href="/announcements">News & updates</FooterLink>
          </FooterColumn>
          <FooterColumn title="Help">
            <FooterLink href="/faq">FAQ</FooterLink>
            <FooterLink href="/contact">Contact us</FooterLink>
            <FooterLink href="/account/bookings">Manage a booking</FooterLink>
            <FooterLink href="/about">About Queensy</FooterLink>
          </FooterColumn>
          <FooterColumn title="Get in touch">
            {settings.contactPhone && (
              <li>
                <a href={`tel:${settings.contactPhone.replace(/\s/g, "")}`} className="inline-flex items-center gap-2 text-sm text-ink-600 hover:text-ink-950">
                  <Phone className="size-4" /> {formatPhone(settings.contactPhone) || settings.contactPhone}
                </a>
              </li>
            )}
            {whatsappDigits && (
              <li>
                <a href={`https://wa.me/${whatsappDigits}`} rel="noopener noreferrer" target="_blank" className="inline-flex items-center gap-2 text-sm text-ink-600 hover:text-ink-950">
                  <MessageCircle className="size-4" /> WhatsApp
                </a>
              </li>
            )}
            {settings.contactEmail && (
              <li>
                <a href={`mailto:${settings.contactEmail}`} className="inline-flex items-center gap-2 break-all text-sm text-ink-600 hover:text-ink-950">
                  <Mail className="size-4 shrink-0" /> {settings.contactEmail}
                </a>
              </li>
            )}
            <li className="text-sm text-ink-500">{settings.supportHours}</li>
            {socials.map((s) => (
              <FooterLink key={s.label} href={s.href} external>
                {s.label}
              </FooterLink>
            ))}
          </FooterColumn>
        </div>
      </div>
      <div className="border-t border-ink-100">
        <div className="container-page flex flex-col gap-3 py-6 text-sm text-ink-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {settings.siteName}. Based in Kenya, welcoming guests from everywhere.</p>
          <div className="flex gap-5">
            <Link href="/privacy" className="hover:text-ink-900">Privacy</Link>
            <Link href="/terms" className="hover:text-ink-900">Terms</Link>
            <Link href="/sitemap.xml" className="hover:text-ink-900">Sitemap</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-4 font-sans text-sm font-semibold text-ink-950">{title}</h2>
      <ul className="space-y-3">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children, external }: { href: string; children: React.ReactNode; external?: boolean }) {
  return (
    <li>
      {external ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className="text-sm text-ink-600 hover:text-ink-950">
          {children}
        </a>
      ) : (
        <Link href={href} className="text-sm text-ink-600 hover:text-ink-950">
          {children}
        </Link>
      )}
    </li>
  );
}
