import type { Metadata } from "next";
import { requireAdminPage } from "@/server/auth/guards";
import { unreadCountForStaff } from "@/server/services/messaging";
import { db } from "@/server/db";
import { AdminShell } from "@/components/admin/shell";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Queensy Admin" }, robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdminPage("/admin");
  const [unread, pending, newInquiries] = await Promise.all([
    unreadCountForStaff(),
    db.booking.count({ where: { status: "PENDING" } }),
    db.inquiry.count({ where: { status: "NEW" } }),
  ]);
  return (
    <AdminShell user={{ name: user.name, email: user.email }} badges={{ inbox: unread, bookings: pending, inquiries: newInquiries }}>
      {children}
    </AdminShell>
  );
}
