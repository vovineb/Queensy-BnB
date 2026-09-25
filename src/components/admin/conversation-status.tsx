"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { CheckCircle2, RotateCcw } from "lucide-react";
import { setConversationStatusAction } from "@/server/actions/admin/people";
import { Button } from "@/components/ui/button";

export function ConversationStatusButton({ conversationId, status }: { conversationId: string; status: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const next = status === "OPEN" ? "CLOSED" : "OPEN";
  return (
    <Button size="sm" variant="secondary" loading={pending} icon={next === "CLOSED" ? <CheckCircle2 className="size-4" /> : <RotateCcw className="size-4" />}
      onClick={() => start(async () => { const r = await setConversationStatusAction(conversationId, next); if (r.ok) toast.success(r.message ?? "Updated"); else toast.error(r.error); router.refresh(); })}>
      {next === "CLOSED" ? "Mark resolved" : "Reopen"}
    </Button>
  );
}
