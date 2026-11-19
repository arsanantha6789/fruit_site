import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MessageSquareText, Phone, Printer } from "lucide-react";
import { requireStaffPage } from "@/modules/auth/session";
import { getOrderDetail } from "@/modules/orders/repo";
import { STATUS_LABEL } from "@/modules/orders/status";
import { PAYMENT_METHOD_LABEL } from "@/modules/payments/methods";
import { UNIT_LABEL } from "@/modules/catalog/units";
import { Card, CardHeader } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { PaymentBadge, StatusBadge } from "@/components/shared/status-badge";
import { OrderTotals } from "@/components/store/order-totals";
import { formatINR } from "@/lib/money";
import { formatDateTime, formatQty } from "@/lib/utils";
import { StatusControls } from "./status-controls";
import { PaymentControls } from "./payment-controls";

export const metadata: Metadata = { title: "Order" };

export default async function AdminOrderPage({ params }: PageProps<"/admin/orders/[id]">) {
  await requireStaffPage();
  const { id } = await params;
  const order = await getOrderDetail(id);
  if (!order) notFound();
  const a = order.shippingAddress;
  const mapsQuery = encodeURIComponent([a.line1, a.line2, a.landmark, a.city, a.state, a.pincode].filter(Boolean).join(", "));

  return (
    <div className="mx-auto max-w-6xl">
      <Link href="/admin/orders" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-forest">
        <ArrowLeft className="size-4" aria-hidden="true" /> Orders
      </Link>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Order {order.orderNumber}</h1>
            <StatusBadge status={order.status} />
          </div>
          <p className="mt-1 text-sm text-muted-strong">
            Placed {formatDateTime(order.placedAt)} · {order.itemCount} {order.itemCount === 1 ? "item" : "items"} ·{" "}
            {formatINR(order.totalPaise)}
          </p>
        </div>
        <LinkButton
          href={`/print/orders/${order.id}`}
          target="_blank"
          rel="noopener"
          variant="outline"
          icon={<Printer className="size-4" />}
        >
          Print packing slip
        </LinkButton>
      </div>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Update status" description="Customers see every change on their order page." />
            <div className="p-5 sm:p-6">
              <StatusControls orderId={order.id} status={order.status} />
            </div>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader title="Items to pack" />
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-line text-xs font-semibold tracking-wide text-muted-strong uppercase">
                  <tr>
                    <th scope="col" className="px-5 py-3">
                      Product
                    </th>
                    <th scope="col" className="px-3 py-3 text-right">
                      Qty
                    </th>
                    <th scope="col" className="px-3 py-3 text-right">
                      Unit price
                    </th>
                    <th scope="col" className="px-5 py-3 text-right">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {order.items.map((i) => (
                    <tr key={i.id}>
                      <td className="px-5 py-3.5">
                        <p className="font-semibold">{i.productName}</p>
                        <p className="text-xs text-muted-strong">
                          {i.variantLabel} · {formatQty(i.quantity * i.quantityInBase)} {UNIT_LABEL[i.unit]} total
                        </p>
                      </td>
                      <td className="px-3 py-3.5 text-right font-bold tabular-nums">× {i.quantity}</td>
                      <td className="px-3 py-3.5 text-right tabular-nums">{formatINR(i.unitPricePaise)}</td>
                      <td className="px-5 py-3.5 text-right font-semibold tabular-nums">{formatINR(i.lineTotalPaise)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-line px-5 py-4 sm:ml-auto sm:max-w-xs">
              <OrderTotals
                subtotal={order.subtotalPaise}
                delivery={order.deliveryFeePaise}
                discount={order.discountPaise}
                total={order.totalPaise}
              />
            </div>
          </Card>

          <Card>
            <CardHeader title="History" />
            <ol className="divide-y divide-line">
              {order.history.map((h) => (
                <li key={h.id} className="flex flex-wrap items-baseline justify-between gap-2 px-5 py-3 text-sm">
                  <span>
                    <span className="font-semibold">{STATUS_LABEL[h.toStatus]}</span>
                    <span className="text-muted-strong">
                      {" "}
                      · by {h.changedByRole === "customer" ? "customer" : h.changedByName || h.changedByRole || "system"}
                    </span>
                    {h.note && <span className="block text-muted-strong">“{h.note}”</span>}
                  </span>
                  <span className="text-xs text-muted-strong">{formatDateTime(h.createdAt)}</span>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="text-xs font-bold tracking-wider text-muted-strong uppercase">Customer</h2>
            <p className="mt-2 text-base font-bold">{order.customerName}</p>
            <a
              href={`tel:+91${order.customerPhone}`}
              className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-forest"
            >
              <Phone className="size-4" aria-hidden="true" /> +91 {order.customerPhone}
            </a>
            {order.customerEmail && <p className="mt-1 text-sm break-all text-muted-strong">{order.customerEmail}</p>}
          </Card>
          <Card className="p-5">
            <h2 className="text-xs font-bold tracking-wider text-muted-strong uppercase">Deliver to</h2>
            {a.removed ? (
              <p className="mt-2 text-sm text-muted-strong">Address removed (customer deleted their account).</p>
            ) : (
              <>
                <p className="mt-2 text-sm leading-relaxed">
                  {a.line1}
                  {a.line2 && (
                    <>
                      <br />
                      {a.line2}
                    </>
                  )}
                  {a.landmark && (
                    <>
                      <br />
                      Landmark: {a.landmark}
                    </>
                  )}
                  <br />
                  {a.city}, {a.state} – <b>{a.pincode}</b>
                </p>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-sm font-semibold text-primary hover:text-forest"
                >
                  Open in Maps
                </a>
              </>
            )}
          </Card>
          {order.instructions && (
            <Card className="border-beige-deep bg-beige p-5">
              <h2 className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-forest uppercase">
                <MessageSquareText className="size-4" aria-hidden="true" /> Customer instructions
              </h2>
              <p className="mt-2 text-sm font-medium whitespace-pre-line text-ink">{order.instructions}</p>
            </Card>
          )}
          <Card className="p-5">
            <h2 className="text-xs font-bold tracking-wider text-muted-strong uppercase">Payment</h2>
            <div className="mt-2 flex items-center justify-between gap-2">
              <p className="font-semibold">{PAYMENT_METHOD_LABEL[order.paymentMethod]}</p>
              <PaymentBadge status={order.paymentStatus} />
            </div>
            <p className="mt-1 text-sm text-muted-strong">
              Amount to collect: <b className="text-ink">{formatINR(order.totalPaise)}</b>
            </p>
            {order.paymentReference && <p className="mt-1 text-sm text-muted-strong">Ref: {order.paymentReference}</p>}
            {order.paidAt && <p className="text-xs text-muted-strong">Paid {formatDateTime(order.paidAt)}</p>}
            <PaymentControls orderId={order.id} status={order.paymentStatus} />
          </Card>
          {order.cancelReason && (
            <Card className="border-danger/20 bg-danger-soft p-5 text-sm text-danger">
              <b>Cancelled:</b> {order.cancelReason}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
