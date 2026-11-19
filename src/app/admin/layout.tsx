import type { Metadata } from "next";
import { requireStaffPage } from "@/modules/auth/session";
import { getBusinessSettings } from "@/modules/settings/repo";
import { AdminShell } from "@/components/admin/shell";

export const metadata: Metadata = { title: { default: "Dashboard", template: "%s · Dashboard" }, robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await requireStaffPage();
  const settings = await getBusinessSettings();
  return (
    <AdminShell user={{ name: user.fullName || user.email, role: user.role }} businessName={settings.businessName}>
      {children}
    </AdminShell>
  );
}
