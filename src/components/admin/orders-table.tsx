import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { OrderSummary } from "@/modules/orders/types";
import { PAYMENT_METHOD_LABEL } from "@/modules/payments/methods";
import { PaymentBadge, StatusBadge } from "@/components/shared/status-badge";
import { formatINR } from "@/lib/money";
import { formatDateTime } from "@/lib/utils";

/** Table on desktop, stacked cards on phones. */
export function OrdersTable({ orders }: { orders: OrderSummary[] }) {
  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line text-xs font-semibold tracking-wide text-muted-strong uppercase">
            <tr>
              <th scope="col" className="px-5 py-3">
                Order
              </th>
              <th scope="col" className="px-3 py-3">
                Customer
              </th>
              <th scope="col" className="px-3 py-3">
                Placed
              </th>
              <th scope="col" className="px-3 py-3">
                Status
              </th>
              <th scope="col" className="px-3 py-3">
                Payment
              </th>
              <th scope="col" className="px-5 py-3 text-right">
                Total
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {orders.map((o) => (
              <tr key={o.id} className="group relative transition-colors hover:bg-canvas">
                <td className="px-5 py-3.5">
                  <Link href={`/admin/orders/${o.id}`} className="font-bold text-ink after:absolute after:inset-0 group-hover:text-primary">
                    {o.orderNumber}
                  </Link>
                  <p className="text-xs text-muted-strong">
                    {o.itemCount} {o.itemCount === 1 ? "item" : "items"}
                  </p>
                </td>
                <td className="px-3 py-3.5">
                  <p className="font-semibold">{o.customerName}</p>
                  <p className="text-xs text-muted-strong">
                    {o.customerPhone} · {o.pincode}
                  </p>
                </td>
                <td className="px-3 py-3.5 whitespace-nowrap text-muted-strong">{formatDateTime(o.placedAt)}</td>
                <td className="px-3 py-3.5">
                  <StatusBadge status={o.status} />
                </td>
                <td className="px-3 py-3.5">
                  <PaymentBadge status={o.paymentStatus} />
                  <p className="mt-1 text-xs text-muted-strong">{PAYMENT_METHOD_LABEL[o.paymentMethod]}</p>
                </td>
                <td className="px-5 py-3.5 text-right font-bold tabular-nums">{formatINR(o.totalPaise)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="divide-y divide-line md:hidden">
        {orders.map((o) => (
          <li key={o.id}>
            <Link href={`/admin/orders/${o.id}`} className="flex items-center gap-3 px-4 py-3.5 active:bg-canvas">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold">{o.orderNumber}</span>
                  <StatusBadge status={o.status} />
                </div>
                <p className="mt-0.5 truncate text-sm">
                  {o.customerName} · {o.customerPhone}
                </p>
                <p className="text-xs text-muted-strong">
                  {formatDateTime(o.placedAt)} · {PAYMENT_METHOD_LABEL[o.paymentMethod]}
                </p>
              </div>
              <span className="font-bold tabular-nums">{formatINR(o.totalPaise)}</span>
              <ChevronRight className="size-4 text-muted" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
