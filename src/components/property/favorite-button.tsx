"use client";

import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { Heart } from "lucide-react";
import { m } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { toggleFavoriteAction } from "@/server/actions/booking";

export function FavoriteButton({ propertyId, initial, signedIn, className, variant = "overlay" }: { propertyId: string; initial: boolean; signedIn: boolean; className?: string; variant?: "overlay" | "inline" }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [favorited, setFavorited] = useOptimistic(initial);

  const toggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!signedIn) {
      toast("Sign in to save stays", { description: "Keep a shortlist and get notified about offers.", action: { label: "Sign in", onClick: () => router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`) } });
      return;
    }
    startTransition(async () => {
      setFavorited(!favorited);
      const result = await toggleFavoriteAction(propertyId);
      if (!result.ok) toast.error(result.error);
      else toast.success(result.data?.favorited ? "Saved to your list" : "Removed from saved");
      router.refresh();
    });
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={favorited}
      aria-label={favorited ? "Remove from saved" : "Save this stay"}
      disabled={pending}
      className={cn(
        variant === "overlay"
          ? "grid size-9 place-items-center rounded-full bg-white/90 shadow-sm backdrop-blur transition hover:scale-105 hover:bg-white"
          : "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold underline-offset-4 hover:bg-ink-100",
        className,
      )}
    >
      <m.span key={String(favorited)} initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 18 }} className="grid place-items-center">
        <Heart className={cn("size-[18px]", favorited ? "fill-sunset-600 text-sunset-600" : "text-ink-900")} aria-hidden />
      </m.span>
      {variant === "inline" && <span>{favorited ? "Saved" : "Save"}</span>}
    </button>
  );
}
