import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Package } from "lucide-react";
import { requireUser } from "@/modules/auth/session";
import { listMyOrders } from "@/modules/orders/repo";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/button";
import { formatINR } from "@/lib/money";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "My orders", robots: { index: false } };

export default async function MyOrdersPage({ searchParams }: PageProps<"/orders">) {
  const user = await requireUser("/orders");
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const { orders, total } = await listMyOrders(user.id, page);
  const pages = Math.ceil(total / 20);
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">My orders</h1>
      {orders.length === 0 ? (
        <EmptyState
          className="mt-8 rounded-[var(--radius-card)] border border-line bg-surface"
          icon={<Package className="size-6" />}
          title="No orders yet"
          description="When you place an order, you can follow its journey here."
          action={<LinkButton href="/shop">Start shopping</LinkButton>}
        />
      ) : (
        <ul className="mt-8 space-y-3">
          {orders.map((o) => (
            <li key={o.id}>
              <Link
                href={`/orders/${o.id}`}
                className="flex items-center gap-4 rounded-[var(--radius-card)] border border-line bg-surface p-4 transition-shadow hover:shadow-[var(--shadow-lift)] sm:p-5"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold">Order {o.orderNumber}</span>
                    <StatusBadge status={o.status} />
                  </div>
                  <p className="mt-1 text-sm text-muted-strong">
                    {formatDateTime(o.placedAt)} · {o.itemCount} {o.itemCount === 1 ? "item" : "items"}
                  </p>
                </div>
                <span className="font-bold tabular-nums">{formatINR(o.totalPaise)}</span>
                <ChevronRight className="size-5 text-muted" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}
      {pages > 1 && (
        <nav className="mt-8 flex justify-center gap-2" aria-label="Pages">
          {page > 1 && (
            <LinkButton variant="outline" size="sm" href={`/orders?page=${page - 1}`}>
              Newer
            </LinkButton>
          )}
          {page < pages && (
            <LinkButton variant="outline" size="sm" href={`/orders?page=${page + 1}`}>
              Older
            </LinkButton>
          )}
        </nav>
      )}
    </div>
  );
}
