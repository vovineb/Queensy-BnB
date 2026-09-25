import Link from "next/link";
import { getDestinations } from "@/server/services/catalog";
import { ResponsiveImage } from "@/components/ui/image";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Destinations in Kenya",
  description: "Explore where to stay in Kenya with Queensy BnB — coastal escapes, city apartments and more, with live availability.",
  path: "/destinations",
});

export default async function DestinationsPage() {
  const destinations = await getDestinations();
  return (
    <div className="container-page pb-8 pt-8 sm:pt-12">
      <h1 className="text-h1 font-bold">Destinations</h1>
      <p className="mt-2 max-w-2xl text-lg text-ink-600">Where would you like to stay? Each guide covers the area, how to get there and our available homes.</p>
      <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {destinations.map((d) => (
          <li key={d.id}>
            <Link href={`/destinations/${d.slug}`} className="group block">
              <div className="overflow-hidden rounded-xl bg-lagoon-900">
                <ResponsiveImage image={d.imageUrl ? { url: d.imageUrl } : d.fallbackImage} alt="" sizes="(min-width:1024px) 33vw, 50vw" className="aspect-[4/3] w-full transition duration-700 group-hover:scale-105" fallbackLabel={d.name} />
              </div>
              <h2 className="mt-3 font-sans text-lg font-semibold group-hover:underline">{d.name}</h2>
              <p className="text-sm text-ink-600">
                {d.propertyCount > 0 ? `${d.propertyCount} stay${d.propertyCount === 1 ? "" : "s"}` : "No stays listed yet"}
                {d.region ? ` · ${d.region}` : ""}
              </p>
              {d.summary && <p className="mt-1 line-clamp-2 text-sm text-ink-600">{d.summary}</p>}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
