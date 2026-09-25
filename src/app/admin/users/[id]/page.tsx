import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { requireAdminPage } from "@/server/auth/guards";
import { formatDateRange, formatDateTime, formatMoney } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { daysAgo } from "@/lib/dates";
import { setUserRoleAction, setUserStatusAction, prospectFromUserAction } from "@/server/actions/admin/people";
import { BookingStatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/feedback";
import { PageHeader, Panel, StatCard } from "@/components/admin/ui";
import { ActionButton } from "@/components/admin/inline-actions";

export const metadata = { title: "User" };

const CONSENT_LABEL: Record<string, string> = { PRIVACY_NOTICE: "Privacy notice", TERMS: "Terms", MARKETING_EMAIL: "Marketing email", MARKETING_SMS: "Marketing SMS", MARKETING_WHATSAPP: "Marketing WhatsApp" };

export default async function UserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = await requireAdminPage(`/admin/users/${id}`);
  const user = await db.user.findUnique({
    where: { id },
    include: {
      marketingPreference: true,
      consents: { orderBy: { createdAt: "desc" }, take: 20 },
      bookings: { orderBy: { createdAt: "desc" }, take: 20, include: { property: { select: { name: true } } } },
      conversations: { orderBy: { lastMessageAt: "desc" }, take: 10, select: { id: true, subject: true, lastMessageAt: true, status: true } },
      prospects: { select: { id: true } },
      _count: { select: { favorites: true, reviews: true } },
    },
  });
  if (!user) notFound();
  const since = daysAgo(90);
  const events = await db.analyticsEvent.groupBy({ by: ["name"], where: { userId: id, createdAt: { gte: since } }, _count: true });
  const ev = (n: string) => events.find((e) => e.name === n)?._count ?? 0;
  const lifetime = user.bookings.filter((b) => ["PAID", "CONFIRMED", "COMPLETED"].includes(b.status));
  const self = admin.id === user.id;

  return (
    <>
      <PageHeader
        back={{ href: "/admin/users", label: "Users" }}
        title={<span className="flex flex-wrap items-center gap-2">{user.name}{user.role === "ADMIN" && <Badge tone="brand">Admin</Badge>}{user.status !== "ACTIVE" && <Badge tone="danger">Deactivated</Badge>}</span>}
        description={`Joined ${formatDateTime(user.createdAt)}${user.lastLoginAt ? ` · last sign-in ${formatDateTime(user.lastLoginAt)}` : ""}`}
        actions={!self && (
          <>
            {user.prospects.length === 0 && user.role === "CUSTOMER" && <ActionButton onClick={prospectFromUserAction.bind(null, user.id)}>Add to prospects</ActionButton>}
            <ActionButton onClick={setUserRoleAction.bind(null, user.id, user.role === "ADMIN" ? "CUSTOMER" : "ADMIN")}>{user.role === "ADMIN" ? "Remove admin access" : "Make admin"}</ActionButton>
            <ActionButton tone={user.status === "ACTIVE" ? "danger" : "default"} onClick={setUserStatusAction.bind(null, user.id, user.status === "ACTIVE" ? "DEACTIVATED" : "ACTIVE")}>{user.status === "ACTIVE" ? "Deactivate" : "Reactivate"}</ActionButton>
          </>
        )}
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Bookings" value={user.bookings.length} />
        <StatCard label="Confirmed stays" value={lifetime.length} />
        <StatCard label="Property views (90d)" value={ev("property_view")} />
        <StatCard label="Saved stays" value={user._count.favorites} />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <Panel title="Bookings">
            {user.bookings.length ? (
              <ul className="divide-y divide-ink-100 text-sm">
                {user.bookings.map((b) => (
                  <li key={b.id}><Link href={`/admin/bookings/${b.id}`} className="flex items-center justify-between gap-4 py-2.5 hover:bg-ink-50"><span><span className="font-medium">{b.property.name}</span><span className="block text-xs text-ink-500">{b.reference} · {formatDateRange(b.checkIn, b.checkOut)} · {formatMoney(b.total, b.currency)}</span></span><BookingStatusBadge status={b.status} /></Link></li>
                ))}
              </ul>
            ) : <p className="text-sm text-ink-500">No bookings.</p>}
          </Panel>
          <Panel title="Conversations">
            {user.conversations.length ? (
              <ul className="divide-y divide-ink-100 text-sm">
                {user.conversations.map((c) => <li key={c.id}><Link href={`/admin/inbox/${c.id}`} className="flex justify-between gap-4 py-2.5 hover:bg-ink-50"><span className="font-medium">{c.subject}</span><span className="text-ink-500">{formatDateTime(c.lastMessageAt)}</span></Link></li>)}
              </ul>
            ) : <p className="text-sm text-ink-500">No conversations.</p>}
          </Panel>
          <Panel title="Engagement (last 90 days)">
            <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
              {[["Searches", "search"], ["Property views", "property_view"], ["Booking starts", "booking_started"], ["Messages", "message_sent"]].map(([l, n]) => (
                <div key={n}><dt className="text-ink-500">{l}</dt><dd className="text-lg font-semibold tabular-nums">{ev(n)}</dd></div>
              ))}
            </dl>
          </Panel>
        </div>
        <aside className="space-y-6">
          <Panel title="Contact">
            <p className="break-all text-sm"><a href={`mailto:${user.email}`} className="hover:underline">{user.email}</a> {user.emailVerifiedAt ? <Badge tone="success">verified</Badge> : <Badge tone="warning">unverified</Badge>}</p>
            {user.phone && <p className="mt-2 text-sm"><a href={`tel:${user.phone}`} className="hover:underline">{formatPhone(user.phone)}</a></p>}
          </Panel>
          <Panel title="Marketing consent">
            <ul className="space-y-1.5 text-sm">
              {(["email", "sms", "whatsapp"] as const).map((c) => (
                <li key={c} className="flex justify-between"><span className="capitalize">{c === "sms" ? "SMS" : c === "whatsapp" ? "WhatsApp" : "Email"}</span>{user.marketingPreference?.[c] ? <Badge tone="success">Opted in</Badge> : <Badge>Not opted in</Badge>}</li>
              ))}
            </ul>
            {user.consents.length > 0 && (
              <details className="mt-4 text-xs text-ink-600">
                <summary className="cursor-pointer font-medium">Consent history</summary>
                <ul className="mt-2 space-y-1">
                  {user.consents.map((c) => <li key={c.id}>{CONSENT_LABEL[c.type]}: {c.granted ? "granted" : "withdrawn"} · {c.source} · v{c.policyVersion} · {formatDateTime(c.createdAt)}</li>)}
                </ul>
              </details>
            )}
          </Panel>
        </aside>
      </div>
    </>
  );
}
