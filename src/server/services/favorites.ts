import "server-only";
import { db } from "@/server/db";
import { AppError } from "@/server/errors";
import { propertyCardSelect } from "./catalog";

export async function toggleFavorite(userId: string, propertyId: string): Promise<boolean> {
  const property = await db.property.findUnique({ where: { id: propertyId }, select: { status: true } });
  if (!property || property.status !== "PUBLISHED") throw new AppError("NOT_FOUND", "Property not found.");
  const existing = await db.favorite.findUnique({ where: { userId_propertyId: { userId, propertyId } } });
  if (existing) {
    await db.favorite.delete({ where: { userId_propertyId: { userId, propertyId } } });
    return false;
  }
  await db.favorite.create({ data: { userId, propertyId } }).catch(() => undefined);
  return true;
}

export async function favoriteIds(userId: string | undefined): Promise<Set<string>> {
  if (!userId) return new Set();
  const rows = await db.favorite.findMany({ where: { userId }, select: { propertyId: true } });
  return new Set(rows.map((r) => r.propertyId));
}

export async function listFavorites(userId: string) {
  const rows = await db.favorite.findMany({
    where: { userId, property: { status: "PUBLISHED" } },
    orderBy: { createdAt: "desc" },
    select: { property: { select: propertyCardSelect } },
  });
  return rows.map((r) => ({ ...r.property, offer: null }));
}
