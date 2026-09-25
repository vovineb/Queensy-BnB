import { Badge } from "./feedback";

const BOOKING: Record<string, { label: string; tone: "neutral" | "brand" | "accent" | "success" | "warning" | "danger" }> = {
  PENDING: { label: "Awaiting confirmation", tone: "warning" },
  AWAITING_PAYMENT: { label: "Awaiting payment", tone: "accent" },
  PAID: { label: "Paid", tone: "success" },
  CONFIRMED: { label: "Confirmed", tone: "success" },
  COMPLETED: { label: "Completed", tone: "neutral" },
  CANCELLED: { label: "Cancelled", tone: "danger" },
  EXPIRED: { label: "Expired", tone: "neutral" },
  REFUNDED: { label: "Refunded", tone: "neutral" },
};

export function bookingStatusLabel(status: string) {
  return BOOKING[status]?.label ?? status;
}

export function BookingStatusBadge({ status }: { status: string }) {
  const s = BOOKING[status] ?? { label: status, tone: "neutral" as const };
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

export function StatusPill({ status, map }: { status: string; map: Record<string, { label: string; tone: "neutral" | "brand" | "accent" | "success" | "warning" | "danger" }> }) {
  const s = map[status] ?? { label: status, tone: "neutral" as const };
  return <Badge tone={s.tone}>{s.label}</Badge>;
}
