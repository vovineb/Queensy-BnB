"use client";

import { useRouter } from "next/navigation";
import { useRealtime } from "@/hooks/use-realtime";

/** Refreshes server-rendered data when matching realtime events arrive. */
export function LiveRefresh({ channels, events }: { channels: string[]; events: string[] }) {
  const router = useRouter();
  useRealtime(channels, (type) => {
    if (events.includes(type)) router.refresh();
  }, { onReconnect: () => router.refresh() });
  return null;
}
