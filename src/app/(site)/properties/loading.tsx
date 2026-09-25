import { PropertyCardSkeleton } from "@/components/property/property-card";

export default function Loading() {
  return (
    <div className="container-page pb-8 pt-6 sm:pt-8" aria-busy="true" aria-label="Loading stays">
      <div className="skeleton h-[72px] rounded-2xl md:rounded-full" />
      <div className="mt-8 space-y-2">
        <div className="skeleton h-9 w-56 rounded" />
        <div className="skeleton h-4 w-40 rounded" />
      </div>
      <div className="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <PropertyCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
