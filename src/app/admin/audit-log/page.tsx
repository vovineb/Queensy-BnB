import { db } from "@/server/db";
import { formatDateTime } from "@/lib/format";
import { Pagination } from "@/components/ui/pagination";
import { EmptyRow, FilterBar, filterInput, PageHeader, Table, Td } from "@/components/admin/ui";

export const metadata = { title: "Audit log" };

export default async function AuditLogPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const where = sp.q ? { OR: [{ action: { contains: sp.q, mode: "insensitive" as const } }, { entityType: { contains: sp.q, mode: "insensitive" as const } }, { entityId: sp.q }] } : {};
  const [total, rows] = await Promise.all([
    db.auditLog.count({ where }),
    db.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * 50, take: 50, include: { actor: { select: { name: true, email: true } } } }),
  ]);
  return (
    <>
      <PageHeader title="Audit log" description="Every administrative and security-relevant change, newest first." />
      <FilterBar action="/admin/audit-log"><input name="q" defaultValue={sp.q} placeholder="Action, type or record id" className={`${filterInput} w-full sm:w-72`} aria-label="Search audit log" /></FilterBar>
      <Table head={["When", "Who", "Action", "Record", "Details"]}>
        {rows.length ? rows.map((r) => (
          <tr key={r.id}>
            <Td className="whitespace-nowrap text-ink-600">{formatDateTime(r.createdAt)}</Td>
            <Td>{r.actor ? <><span className="block">{r.actor.name}</span><span className="text-xs text-ink-500">{r.actor.email}</span></> : "System"}</Td>
            <Td className="font-medium">{r.action}</Td>
            <Td className="text-xs text-ink-600">{r.entityType}{r.entityId ? ` · ${r.entityId}` : ""}</Td>
            <Td className="max-w-xs truncate font-mono text-xs text-ink-500">{r.metadata ? JSON.stringify(r.metadata) : ""}</Td>
          </tr>
        )) : <EmptyRow colSpan={5}>Nothing logged yet.</EmptyRow>}
      </Table>
      <div className="mt-6"><Pagination page={page} pageCount={Math.max(1, Math.ceil(total / 50))} hrefFor={(p) => `/admin/audit-log?${new URLSearchParams({ ...(sp.q ? { q: sp.q } : {}), page: String(p) })}`} /></div>
    </>
  );
}
