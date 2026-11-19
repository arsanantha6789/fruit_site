import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, PartyPopper } from "lucide-react";
import { requireUser } from "@/modules/auth/session";
import { getOrderDetail } from "@/modules/orders/repo";
import { TrackingTimeline } from "@/modules/tracking/timeline";
import { PAYMENT_METHOD_LABEL } from "@/modules/payments/methods";
import { PaymentBadge, StatusBadge } from "@/components/shared/status-badge";
import { OrderTotals } from "@/components/store/order-totals";
import { ProductImage } from "@/components/shared/product-image";
import { productPhoto } from "@/lib/produce-photos";
import { Card } from "@/components/ui/card";
import { formatINR } from "@/lib/money";
import { formatDateTime } from "@/lib/utils";
import { CancelOrderButton } from "./cancel-button";
import { AutoRefresh } from "@/components/shared/auto-refresh";

export const metadata: Metadata = { title: "Order details", robots: { index: false } };

export default async function OrderPage({ params, searchParams }: PageProps<"/orders/[id]">) {
  const { id } = await params;
  const user = await requireUser(`/orders/${id}`);
  const order = await getOrderDetail(id);
  // RLS already hides other people's orders; this also hides them from staff browsing as customers.
  if (!order || order.customerId !== user.id) notFound();
  const placed = (await searchParams).placed === "1";
  const a = order.shippingAddress;
  const open = order.status !== "delivered" && order.status !== "cancelled";

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      {open && <AutoRefresh seconds={45} />}
      <Link href="/orders" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-forest">
        <ArrowLeft className="size-4" aria-hidden="true" /> All orders
      </Link>

      {placed && (
        <div className="mt-6 flex items-start gap-4 rounded-[var(--radius-card)] bg-forest p-5 text-white sm:p-6">
          <PartyPopper className="size-7 shrink-0 text-beige" aria-hidden="true" />
          <div>
            <h2 className="text-xl font-bold">Thank you! Your order is placed.</h2>
            <p className="mt-1 text-white/80">We&apos;ve sent it to the store. You can follow every step right here.</p>
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Order {order.orderNumber}</h1>
          <p className="mt-1 text-sm text-muted-strong">Placed {formatDateTime(order.placedAt)}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <Card className="p-5 sm:p-6">
            <h2 className="mb-5 text-lg font-bold">Order status</h2>
            <TrackingTimeline status={order.status} history={order.history} />
            {order.status === "new" && <CancelOrderButton orderId={order.id} />}
          </Card>
          <Card>
            <h2 className="border-b border-line px-5 py-4 text-lg font-bold sm:px-6">Items</h2>
            <ul className="divide-y divide-line">
              {order.items.map((i) => (
                <li key={i.id} className="flex items-center gap-4 px-5 py-4 sm:px-6">
                  <div className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-beige">
                    <ProductImage
                      src={i.imageUrl}
                      fallbackSrc={productPhoto(i.productName)}
                      alt={i.productName}
                      sizes="56px"
                      showLabel={false}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{i.productName}</p>
                    <p className="text-sm text-muted-strong">
                      {i.variantLabel} × {i.quantity} · {formatINR(i.unitPricePaise)} each
                    </p>
                  </div>
                  <p className="font-semibold tabular-nums">{formatINR(i.lineTotalPaise)}</p>
                </li>
              ))}
            </ul>
            <div className="border-t border-line px-5 py-4 sm:px-6">
              <OrderTotals
                subtotal={order.subtotalPaise}
                delivery={order.deliveryFeePaise}
                discount={order.discountPaise}
                total={order.totalPaise}
              />
            </div>
          </Card>
        </div>
        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="text-sm font-bold tracking-wide text-muted-strong uppercase">Delivering to</h2>
            <p className="mt-2 font-semibold">{order.customerName}</p>
            <p className="text-sm text-muted-strong">{order.customerPhone}</p>
            {!a.removed && (
              <p className="mt-2 text-sm leading-relaxed">
                {[a.line1, a.line2, a.landmark].filter(Boolean).join(", ")}
                <br />
                {a.city}, {a.state} {a.pincode}
              </p>
            )}
            {order.instructions && <p className="mt-3 rounded-lg bg-beige px-3 py-2 text-sm">“{order.instructions}”</p>}
          </Card>
          <Card className="p-5">
            <h2 className="text-sm font-bold tracking-wide text-muted-strong uppercase">Payment</h2>
            <p className="mt-2 font-semibold">{PAYMENT_METHOD_LABEL[order.paymentMethod]}</p>
            <div className="mt-2">
              <PaymentBadge status={order.paymentStatus} />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
