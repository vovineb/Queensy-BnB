import "server-only";
import { db, type Tx } from "@/server/db";
import type { Prisma } from "@/generated/prisma/client";

export async function audit(
  entry: { actorId: string | null; action: string; entityType: string; entityId?: string | null; metadata?: Prisma.InputJsonValue },
  tx: Tx | typeof db = db,
) {
  await tx.auditLog.create({
    data: {
      actorId: entry.actorId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      metadata: entry.metadata,
    },
  });
}
