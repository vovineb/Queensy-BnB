import { Compass } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";

export default function SiteNotFound() {
  return (
    <div className="container-page grid min-h-[60dvh] place-items-center py-16">
      <div className="max-w-md text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-lagoon-50 text-lagoon-700"><Compass className="size-7" /></span>
        <h1 className="mt-6 text-h1 font-bold">We couldn&apos;t find that page</h1>
        <p className="mt-3 text-ink-600">The stay may no longer be listed, or the link may be out of date.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/properties" variant="primary">Browse stays</ButtonLink>
          <ButtonLink href="/" variant="secondary">Go home</ButtonLink>
        </div>
      </div>
    </div>
  );
}
