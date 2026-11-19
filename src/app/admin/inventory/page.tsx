import type { Metadata } from "next";
import Link from "next/link";
import { Boxes, Search } from "lucide-react";
import { requireStaffPage } from "@/modules/auth/session";
import { listInventory, type InventoryFilter } from "@/modules/inventory/repo";
import { getBusinessSettings } from "@/modules/settings/repo";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { InventoryItem } from "./inventory-item";

export const metadata: Metadata = { title: "Stock" };

const FILTERS: { value: InventoryFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "low", label: "Low stock" },
  { value: "out", label: "Out of stock" },
  { value: "unavailable", label: "Marked unavailable" },
];

export default async function InventoryPage({ searchParams }: PageProps<"/admin/inventory">) {
  const user = await requireStaffPage();
  const sp = await searchParams;
  const filter = (FILTERS.find((f) => f.value === sp.filter)?.value ?? "all") as InventoryFilter;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 60) : "";
  const [rows, settings] = await Promise.all([listInventory({ filter, q }), getBusinessSettings()]);
  const canEditPrices = user.role === "admin" || settings.ownerCanEditPrices;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Stock</h1>
          <p className="mt-1 text-muted-strong">Update quantities after each delivery. Customers only see what&apos;s available.</p>
        </div>
        <form className="relative w-full sm:w-72" role="search">
          <input type="hidden" name="filter" value={filter} />
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Find a product"
            aria-label="Search products"
            className="h-11 w-full rounded-full border border-line-strong bg-surface pr-4 pl-10 text-sm focus:border-primary focus:outline-none"
          />
        </form>
      </div>
      <nav className="-mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0" aria-label="Filter stock">
        {FILTERS.map((f) => (
          <Link
            key={f.value}
            href={`/admin/inventory?filter=${f.value}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            aria-current={f.value === filter ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-semibold",
              f.value === filter
                ? "border-forest bg-forest text-white"
                : "border-line bg-surface text-muted-strong hover:border-primary hover:text-forest",
            )}
          >
            {f.label}
          </Link>
        ))}
      </nav>
      <Card className="mt-5 overflow-hidden">
        {rows.length ? (
          <ul className="divide-y divide-line">
            {rows.map((r) => (
              <InventoryItem key={r.productId} row={r} canEditPrices={canEditPrices} />
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={<Boxes className="size-6" />}
            title={filter === "all" && !q ? "No products yet" : "Nothing to show"}
            description={
              filter === "all" && !q
                ? "Products added by the admin team will appear here for stock updates."
                : "No products match this filter."
            }
            action={
              filter !== "all" || q ? (
                <LinkButton href="/admin/inventory" variant="outline">
                  Show all
                </LinkButton>
              ) : undefined
            }
          />
        )}
      </Card>
    </div>
  );
}
