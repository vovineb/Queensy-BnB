import { Heart } from "lucide-react";
import { requireUserPage } from "@/server/auth/guards";
import { listFavorites } from "@/server/services/favorites";
import { PropertyCard } from "@/components/property/property-card";
import { EmptyState } from "@/components/ui/feedback";
import { ButtonLink } from "@/components/ui/button";

export const metadata = { title: "Saved stays" };

export default async function SavedPage() {
  const user = await requireUserPage("/account/saved");
  const favorites = await listFavorites(user.id);
  return (
    <div className="space-y-6">
      <h1 className="text-h1 font-bold">Saved</h1>
      {favorites.length === 0 ? (
        <EmptyState icon={<Heart />} title="Nothing saved yet" description="Tap the heart on any stay to keep a shortlist here." action={<ButtonLink href="/properties" variant="primary">Explore stays</ButtonLink>} />
      ) : (
        <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">
          {favorites.map((p) => (
            <PropertyCard key={p.id} property={p} favorited signedIn />
          ))}
        </div>
      )}
    </div>
  );
}
