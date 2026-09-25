import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { SearchX } from "lucide-react";
import { getCurrentUser } from "@/server/auth/session";
import { getSearchFacets, searchProperties } from "@/server/services/catalog";
import { favoriteIds } from "@/server/services/favorites";
import { maybeRunMaintenance, today } from "@/server/services/availability";
import { searchParamsSchema } from "@/lib/validation";
import { toIsoDate } from "@/lib/dates";
import { formatDateRange } from "@/lib/format";
import { pageMetadata } from "@/lib/seo";
import { PropertyCard } from "@/components/property/property-card";
import { SearchBar } from "@/components/search/search-bar";
import { ActiveFilterChips, FiltersButton, SortSelect } from "@/components/search/filters";
import { EmptyState } from "@/components/ui/feedback";
import { ButtonLink } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

function flat(sp: Record<string, string | string[] | undefined>) {
  return Object.fromEntries(Object.entries(sp).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const sp = flat(await searchParams);
  const hasFilters = Object.keys(sp).some((k) => k !== "page");
  return pageMetadata({
    title: "Stays in Kenya — apartments, suites & holiday homes",
    description: "Browse handpicked apartments, suites and holiday homes in Kenya. Filter by price, amenities and dates, and see live availability.",
    path: "/properties",
    // Filtered combinations are not indexed; the canonical page is.
    noindex: hasFilters,
  });
}

export default async function PropertiesPage({ searchParams }: Props) {
  const raw = flat(await searchParams);
  const filters = searchParamsSchema.parse(raw);
  await maybeRunMaintenance();
  const [user, facets, result] = await Promise.all([getCurrentUser(), getSearchFacets(), searchProperties(filters)]);
  const favs = await favoriteIds(user?.id);

  const stayQuery = new URLSearchParams();
  if (filters.checkIn && filters.checkOut) {
    stayQuery.set("checkIn", filters.checkIn);
    stayQuery.set("checkOut", filters.checkOut);
  }
  if (filters.guests) stayQuery.set("guests", String(filters.guests));
  const destinationName = facets.destinations.find((d) => d.slug === filters.destination)?.name;

  const heading = destinationName ? `Stays in ${destinationName}` : filters.q ? `Results for “${filters.q}”` : "All stays";
  const summary = [
    `${result.total} ${result.total === 1 ? "stay" : "stays"}`,
    filters.checkIn && filters.checkOut ? `available ${formatDateRange(filters.checkIn, filters.checkOut)}` : null,
    filters.guests ? `for ${filters.guests} guest${filters.guests === 1 ? "" : "s"}` : null,
  ]
    .filter(Boolean)
    .join(" ");

  const hrefForPage = (page: number) => {
    const q = new URLSearchParams(Object.entries(raw).filter(([, v]) => v !== undefined) as [string, string][]);
    if (page === 1) q.delete("page");
    else q.set("page", String(page));
    return `/properties?${q.toString()}`;
  };

  return (
    <div className="container-page pb-8 pt-6 sm:pt-8">
      <SearchBar
        variant="compact"
        destinations={facets.destinations}
        today={toIsoDate(today())}
        defaults={{ destination: destinationName ?? filters.q, checkIn: filters.checkIn, checkOut: filters.checkOut, guests: filters.guests }}
      />

      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-h1 font-bold">{heading}</h1>
          <p className="mt-1 text-ink-600" aria-live="polite">{summary}</p>
        </div>
        <div className="flex items-center gap-2">
          <Suspense>
            <FiltersButton facets={facets} />
            <SortSelect value={filters.sort} />
          </Suspense>
        </div>
      </div>
      <div className="mt-4">
        <Suspense>
          <ActiveFilterChips facets={facets} />
        </Suspense>
      </div>

      {result.results.length > 0 ? (
        <>
          <ul className="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {result.results.map((p, i) => (
              <li key={p.id}>
                <PropertyCard property={p} favorited={favs.has(p.id)} signedIn={Boolean(user)} query={stayQuery.toString()} priority={i < 3} />
              </li>
            ))}
          </ul>
          <div className="mt-12">
            <Pagination page={result.page} pageCount={result.pageCount} hrefFor={hrefForPage} />
          </div>
        </>
      ) : (
        <EmptyState
          className="mt-10"
          icon={<SearchX />}
          title="No stays match your search"
          description={
            filters.checkIn
              ? "Nothing is free for those dates with these filters. Try different dates, fewer filters, or ask us — we may be able to help."
              : "Try removing some filters or searching a different destination."
          }
          action={
            <div className="flex flex-wrap justify-center gap-3">
              <ButtonLink href="/properties" variant="secondary">Clear search</ButtonLink>
              <ButtonLink href="/contact" variant="brand">Ask our team</ButtonLink>
            </div>
          }
        />
      )}

      {facets.destinations.length > 0 && !filters.destination && (
        <nav className="mt-16 border-t border-ink-200 pt-8" aria-label="Browse by destination">
          <h2 className="font-sans text-base font-semibold">Browse by destination</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {facets.destinations.map((d) => (
              <li key={d.slug}>
                <Link href={`/destinations/${d.slug}`} className="inline-block rounded-full bg-surface px-4 py-2 text-sm font-medium ring-1 ring-ink-200 hover:ring-ink-400">
                  Stays in {d.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
