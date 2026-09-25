import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { formatDateTime } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { toIsoDate } from "@/lib/dates";
import { Badge } from "@/components/ui/feedback";
import { PageHeader, Panel } from "@/components/admin/ui";
import { ProspectControls } from "@/components/admin/prospect-controls";

export const metadata = { title: "Prospect" };

export default async function ProspectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await db.prospect.findUnique({
    where: { id },
    include: {
      notes: { orderBy: { createdAt: "desc" }, include: { author: { select: { name: true } } } },
      inquiries: { orderBy: { createdAt: "desc" }, include: { property: { select: { name: true } } } },
      user: { select: { id: true, name: true, _count: { select: { bookings: true } } } },
    },
  });
  if (!p) notFound();
  return (
    <>
      <PageHeader back={{ href: "/admin/prospects", label: "Prospects" }} title={p.name ?? p.email ?? "Prospect"} description={`Added ${formatDateTime(p.createdAt)}`} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <ProspectControls prospectId={p.id} status={p.status} nextFollowUpAt={p.nextFollowUpAt ? toIsoDate(p.nextFollowUpAt) : ""} />
          <Panel title="Notes">
            {p.notes.length ? (
              <ul className="space-y-4 text-sm">
                {p.notes.map((n) => <li key={n.id}><p className="whitespace-pre-wrap">{n.body}</p><p className="mt-1 text-xs text-ink-500">{n.author?.name ?? "Staff"} · {formatDateTime(n.createdAt)}</p></li>)}
              </ul>
            ) : <p className="text-sm text-ink-500">No notes yet.</p>}
          </Panel>
          <Panel title="Inquiries">
            {p.inquiries.length ? (
              <ul className="space-y-4 text-sm">
                {p.inquiries.map((i) => <li key={i.id}><p className="font-medium">{i.topic}{i.property ? ` · ${i.property.name}` : ""}</p><p className="whitespace-pre-wrap text-ink-700">{i.message}</p><p className="text-xs text-ink-500">{formatDateTime(i.createdAt)}</p></li>)}
              </ul>
            ) : <p className="text-sm text-ink-500">No inquiries.</p>}
          </Panel>
        </div>
        <aside className="space-y-6">
          <Panel title="Contact">
            {p.email && <p className="break-all text-sm"><a href={`mailto:${p.email}`} className="hover:underline">{p.email}</a></p>}
            {p.phone && <p className="mt-2 text-sm"><a href={`tel:${p.phone}`} className="hover:underline">{formatPhone(p.phone)}</a></p>}
            <p className="mt-4 text-sm">Marketing consent: {p.marketingConsent ? <Badge tone="success">Opted in</Badge> : <Badge>Not given</Badge>}</p>
            {!p.marketingConsent && <p className="mt-2 text-xs text-ink-500">You can reply about their inquiry, but don&apos;t add them to promotional campaigns.</p>}
            {p.user && <Link href={`/admin/users/${p.user.id}`} className="mt-4 inline-block text-sm font-medium text-lagoon-700 hover:underline">Customer account · {p.user._count.bookings} booking{p.user._count.bookings === 1 ? "" : "s"}</Link>}
          </Panel>
        </aside>
      </div>
    </>
  );
}
