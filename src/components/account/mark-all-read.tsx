"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { markNotificationsReadAction } from "@/server/actions/account";
import { Button } from "@/components/ui/button";

export function MarkAllRead() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button variant="secondary" size="sm" loading={pending} onClick={() => start(async () => { await markNotificationsReadAction(); router.refresh(); })}>
      Mark all as read
    </Button>
  );
}
