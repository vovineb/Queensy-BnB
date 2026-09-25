import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { toIsoDate } from "@/lib/dates";
import { today } from "@/server/services/availability";
import { PageHeader } from "@/components/admin/ui";
import { AnnouncementForm } from "@/components/admin/announcement-form";

export const metadata = { title: "Announcement" };

export default async function AnnouncementEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a = id === "new" ? null : await db.announcement.findUnique({ where: { id } });
  if (id !== "new" && !a) notFound();
  return (
    <>
      <PageHeader back={{ href: "/admin/announcements", label: "Announcements" }} title={a ? a.title : "New announcement"} />
      <AnnouncementForm
        id={a?.id ?? null}
        values={{
          title: a?.title ?? "", slug: a?.slug ?? "", body: a?.body ?? "", kind: a?.kind ?? "SERVICE", imageUrl: a?.imageUrl ?? "", ctaLabel: a?.ctaLabel ?? "", ctaUrl: a?.ctaUrl ?? "",
          status: a?.status ?? "DRAFT", publishAt: toIsoDate(a?.publishAt ?? today()), expiresAt: a?.expiresAt ? toIsoDate(a.expiresAt) : "",
        }}
      />
    </>
  );
}
