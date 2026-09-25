"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { deletePropertyAction, setPropertyStatusAction } from "@/server/actions/admin/properties";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";

export function PropertyStatusControls({ propertyId, status }: { propertyId: string; status: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState<"ARCHIVED" | "DELETE" | null>(null);
  const set = (s: "DRAFT" | "PUBLISHED" | "ARCHIVED") =>
    start(async () => {
      const r = await setPropertyStatusAction(propertyId, s);
      if (r.ok) toast.success(r.message ?? "Updated");
      else toast.error(r.error);
      setConfirm(null);
      router.refresh();
    });
  return (
    <>
      {status !== "PUBLISHED" && <Button size="sm" variant="brand" loading={pending} onClick={() => set("PUBLISHED")}>Publish</Button>}
      {status === "PUBLISHED" && <Button size="sm" variant="secondary" loading={pending} onClick={() => set("DRAFT")}>Unpublish</Button>}
      {status !== "ARCHIVED" && <Button size="sm" variant="ghost" onClick={() => setConfirm("ARCHIVED")}>Archive</Button>}
      {status === "ARCHIVED" && <Button size="sm" variant="ghost" className="text-danger-700" onClick={() => setConfirm("DELETE")}>Delete</Button>}
      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={confirm === "DELETE" ? "Delete this property permanently?" : "Archive this property?"}
        description={confirm === "DELETE" ? "This can't be undone. Properties with booking history can't be deleted — keep them archived instead." : "It will be hidden from guests. Existing bookings are not affected. You can restore it later."}
        confirmLabel={confirm === "DELETE" ? "Delete" : "Archive"}
        pending={pending}
        onConfirm={() =>
          confirm === "DELETE"
            ? start(async () => {
                const r = await deletePropertyAction(propertyId);
                if (r && !r.ok) toast.error(r.error);
                setConfirm(null);
              })
            : set("ARCHIVED")
        }
      />
    </>
  );
}
