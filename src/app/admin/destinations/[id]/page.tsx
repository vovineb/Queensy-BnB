import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { PageHeader } from "@/components/admin/ui";
import { DestinationForm } from "@/components/admin/destination-form";

export const metadata = { title: "Destination" };

export default async function DestinationEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const d = id === "new" ? null : await db.destination.findUnique({ where: { id } });
  if (id !== "new" && !d) notFound();
  return (
    <>
      <PageHeader back={{ href: "/admin/destinations", label: "Destinations" }} title={d ? d.name : "New destination"} />
      <DestinationForm id={d?.id ?? null} values={{ name: d?.name ?? "", slug: d?.slug ?? "", region: d?.region ?? "", country: d?.country ?? "KE", summary: d?.summary ?? "", description: d?.description ?? "", imageUrl: d?.imageUrl ?? "", featured: d?.featured ?? false, published: d?.published ?? true, sortOrder: d?.sortOrder ?? 0 }} />
    </>
  );
}
