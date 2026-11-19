import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireStaffPage } from "@/modules/auth/session";
import { getOrderDetail } from "@/modules/orders/repo";
import { getBusinessSettings } from "@/modules/settings/repo";
import { PackingSlip } from "@/modules/packing-slip/packing-slip";
import { PrintToolbar } from "./print-toolbar";

export const metadata: Metadata = { title: "Packing slip", robots: { index: false, follow: false } };

export default async function PackingSlipPage({ params }: PageProps<"/print/orders/[id]">) {
  await requireStaffPage();
  const { id } = await params;
  const [order, business] = await Promise.all([getOrderDetail(id), getBusinessSettings()]);
  if (!order) notFound();
  return (
    <main className="print-page">
      <PrintToolbar orderNumber={order.orderNumber} />
      <PackingSlip order={order} business={business} />
    </main>
  );
}
