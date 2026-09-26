import Link from "next/link";
import { db } from "@/server/db";
import { formatDateTime } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { setInquiryStatusAction } from "@/server/actions/admin/people";
import { EmptyState } from "@/components/ui/feedback";
import { FilterBar, filterInput, PageHeader } from "@/components/admin/ui";
import { ActionSelect } from "@/components/admin/inline-actions";
import { MessageSquareQuote } from "lucide-react";

export const metadata = { title: "Inquiries" };

export default async function InquiriesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status = "open" } = await searchParams;
  const where = status === "open" ? { status: { in: ["NEW" as const, "IN_PROGRESS" as const] } } : status === "CLOSED" ? { status: "CLOSED" as const } : {};
  const items = await db.inquiry.findMany({ where, orderBy: { createdAt: "desc" }, take: 200, include: { property: { select: { name: true } }, prospect: { select: { id: true, marketingConsent: true } } } });
  return (
    <>
      <PageHeader title="Inquiries" description="Messages from the public contact form. Reply by email or phone, then update the status." />
      <FilterBar action="/admin/inquiries">
        <select name="status" defaultValue={status} className={filterInput} aria-label="Status">
          <option value="open">Open</option><option value="CLOSED">Closed</option><option value="all">All</option>
        </select>
      </FilterBar>
      {items.length === 0 ? <EmptyState icon={<MessageSquareQuote />} title="No inquiries here" /> : (
        <ul className="space-y-3">
          {items.map((i) => (
            <li key={i.id} className="rounded-xl bg-surface p-5 ring-1 ring-ink-200">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="font-semibold">{i.topic}{i.property ? ` · ${i.property.name}` : ""}</p>
                  <p className="text-sm text-ink-600">
                    {i.name}
                    {i.email && <> · <a href={`mailto:${i.email}?subject=${encodeURIComponent(`Re: ${i.topic}`)}`} className="text-lagoon-700 hover:underline">{i.email}</a></>}
                    {i.phone && <> · <a href={`tel:${i.phone}`} className="hover:underline">{formatPhone(i.phone)}</a></>}
                  </p>
                  <p className="text-xs text-ink-500">{formatDateTime(i.createdAt)}{i.legacyId ? " · imported from old site" : ""}{i.prospect ? <> · <Link href={`/admin/prospects/${i.prospect.id}`} className="underline">prospect</Link>{i.prospect.marketingConsent ? " (opted in to marketing)" : " (no marketing consent)"}</> : ""}</p>
                </div>
                <ActionSelect label="Inquiry status" value={i.status} options={[{ value: "NEW", label: "New" }, { value: "IN_PROGRESS", label: "In progress" }, { value: "CLOSED", label: "Closed" }]} onChange={setInquiryStatusAction.bind(null, i.id) as (v: string) => ReturnType<typeof setInquiryStatusAction>} />
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink-800">{i.message}</p>
              {i.attachmentUrl && <a href={i.attachmentUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm text-lagoon-700 underline">View attachment</a>}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
