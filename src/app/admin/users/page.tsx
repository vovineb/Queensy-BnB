import Link from "next/link";
import { db } from "@/server/db";
import type { Prisma } from "@/generated/prisma/client";
import { formatDate } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { Badge } from "@/components/ui/feedback";
import { Pagination } from "@/components/ui/pagination";
import { EmptyRow, FilterBar, filterInput, PageHeader, Table, Td } from "@/components/admin/ui";

export const metadata = { title: "Users" };

type SP = { q?: string; role?: string; marketing?: string; page?: string };

export default async function UsersPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const where: Prisma.UserWhereInput = {
    ...(sp.q ? { OR: [{ name: { contains: sp.q, mode: "insensitive" } }, { email: { contains: sp.q, mode: "insensitive" } }, { phone: { contains: sp.q.replace(/\s/g, "") } }] } : {}),
    ...(sp.role === "ADMIN" || sp.role === "CUSTOMER" ? { role: sp.role } : {}),
    ...(sp.marketing === "yes" ? { marketingPreference: { OR: [{ email: true }, { sms: true }, { whatsapp: true }] } } : sp.marketing === "no" ? { NOT: { marketingPreference: { OR: [{ email: true }, { sms: true }, { whatsapp: true }] } } } : {}),
  };
  const [total, users] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * 25, take: 25, include: { marketingPreference: true, _count: { select: { bookings: true } } } }),
  ]);
  const qs = (p: number) => new URLSearchParams({ ...(Object.fromEntries(Object.entries(sp).filter(([, v]) => v)) as Record<string, string>), page: String(p) }).toString();
  return (
    <>
      <PageHeader title="Users" description={`${total} account${total === 1 ? "" : "s"}. Marketing column shows current opt-ins — only contact opted-in customers with offers.`} />
      <FilterBar action="/admin/users">
        <input name="q" defaultValue={sp.q} placeholder="Name, email or phone" className={`${filterInput} w-full sm:w-64`} aria-label="Search users" />
        <select name="role" defaultValue={sp.role ?? ""} className={filterInput} aria-label="Role"><option value="">All roles</option><option value="CUSTOMER">Customers</option><option value="ADMIN">Admins</option></select>
        <select name="marketing" defaultValue={sp.marketing ?? ""} className={filterInput} aria-label="Marketing consent"><option value="">Any marketing consent</option><option value="yes">Opted in</option><option value="no">Not opted in</option></select>
      </FilterBar>
      <Table head={["Name", "Contact", "Bookings", "Marketing", "Joined", "Status"]}>
        {users.length ? users.map((u) => {
          const channels = [u.marketingPreference?.email && "Email", u.marketingPreference?.sms && "SMS", u.marketingPreference?.whatsapp && "WhatsApp"].filter(Boolean);
          return (
            <tr key={u.id} className="hover:bg-ink-50/60">
              <Td><Link href={`/admin/users/${u.id}`} className="font-medium hover:underline">{u.name}</Link>{u.role === "ADMIN" && <Badge tone="brand" className="ml-2">Admin</Badge>}</Td>
              <Td><span className="block">{u.email}</span><span className="text-xs text-ink-500">{formatPhone(u.phone)}</span></Td>
              <Td className="tabular-nums">{u._count.bookings}</Td>
              <Td>{channels.length ? <Badge tone="success">{channels.join(", ")}</Badge> : <span className="text-ink-500">No</span>}</Td>
              <Td className="whitespace-nowrap">{formatDate(u.createdAt)}</Td>
              <Td><Badge tone={u.status === "ACTIVE" ? "neutral" : "danger"}>{u.status === "ACTIVE" ? "Active" : "Deactivated"}</Badge></Td>
            </tr>
          );
        }) : <EmptyRow colSpan={6}>No users match.</EmptyRow>}
      </Table>
      <div className="mt-6"><Pagination page={page} pageCount={Math.max(1, Math.ceil(total / 25))} hrefFor={(p) => `/admin/users?${qs(p)}`} /></div>
    </>
  );
}
