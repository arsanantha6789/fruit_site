import type { Metadata } from "next";
import Link from "next/link";
import { ReceiptText, Search } from "lucide-react";
import { requireStaffPage } from "@/modules/auth/session";
import { listOrdersForStaff } from "@/modules/orders/repo";
import { ALL_STATUSES, STATUS_LABEL, type OrderStatus } from "@/modules/orders/status";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/button";
import { OrdersTable } from "@/components/admin/orders-table";
import { AutoRefresh } from "@/components/shared/auto-refresh";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Orders" };

const TABS: { value: OrderStatus | "open" | "all"; label: string }[] = [
  { value: "open", label: "Open" },
  ...ALL_STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] })),
  { value: "all", label: "All" },
];

export default async function AdminOrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  await requireStaffPage();
  const sp = await searchParams;
  const status = (TABS.find((t) => t.value === sp.status)?.value ?? "open") as OrderStatus | "open" | "all";
  const q = typeof sp.q === "string" ? sp.q.slice(0, 60) : "";
  const page = Math.max(1, Number(sp.page) || 1);
  const result = await listOrdersForStaff({ status: status === "all" ? undefined : status, q, page });
  const pages = Math.ceil(result.total / result.pageSize);
  const href = (p: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams();
    Object.entries({ status, q, ...p }).forEach(([k, v]) => v !== undefined && v !== "" && params.set(k, String(v)));
    return `/admin/orders?${params}`;
  };

  return (
    <div className="mx-auto max-w-6xl">
      <AutoRefresh seconds={60} />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Orders</h1>
          <p className="mt-1 text-muted-strong">
            {result.total} {status === "all" ? "in total" : (STATUS_LABEL[status as OrderStatus]?.toLowerCase() ?? "open")}
          </p>
        </div>
        <form className="relative w-full sm:w-80" role="search">
          <input type="hidden" name="status" value={status} />
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Order no., phone or name"
            aria-label="Search orders"
            className="h-11 w-full rounded-full border border-line-strong bg-surface pr-4 pl-10 text-sm focus:border-primary focus:outline-none"
          />
        </form>
      </div>

      <nav className="-mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0" aria-label="Filter by status">
        {TABS.map((t) => (
          <Link
            key={t.value}
            href={href({ status: t.value, page: undefined })}
            aria-current={t.value === status ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors",
              t.value === status
                ? "border-forest bg-forest text-white"
                : "border-line bg-surface text-muted-strong hover:border-primary hover:text-forest",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      <Card className="mt-5 overflow-hidden">
        {result.orders.length ? (
          <OrdersTable orders={result.orders} />
        ) : (
          <EmptyState
            icon={<ReceiptText className="size-6" />}
            title={q ? "No matching orders" : "No orders here"}
            description={q ? "Try the full order number (e.g. FB10023) or a phone number." : "Orders in this status will show up here."}
          />
        )}
      </Card>

      {pages > 1 && (
        <nav className="mt-6 flex items-center justify-center gap-2" aria-label="Pages">
          {page > 1 && (
            <LinkButton variant="outline" size="sm" href={href({ page: page - 1 })}>
              Previous
            </LinkButton>
          )}
          <span className="px-2 text-sm text-muted-strong">
            Page {page} of {pages}
          </span>
          {page < pages && (
            <LinkButton variant="outline" size="sm" href={href({ page: page + 1 })}>
              Next
            </LinkButton>
          )}
        </nav>
      )}
    </div>
  );
}
