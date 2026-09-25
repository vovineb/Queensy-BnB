"use client";

import { Share } from "lucide-react";
import { toast } from "sonner";

export function ShareButton({ title }: { title: string }) {
  const share = async () => {
    const url = window.location.href.split("?")[0];
    try {
      if (navigator.share) await navigator.share({ title, url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied");
      }
    } catch {
      /* user cancelled */
    }
  };
  return (
    <button type="button" onClick={share} className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold hover:bg-ink-100">
      <Share className="size-4" aria-hidden /> Share
    </button>
  );
}
