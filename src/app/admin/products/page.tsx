import type { Metadata } from "next";
import Link from "next/link";
import { Package, Plus, Search } from "lucide-react";
import { requireAdminPage } from "@/modules/auth/session";
import { listProductsForAdmin } from "@/modules/catalog/admin-repo";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/button";
import { ProductImage } from "@/components/shared/product-image";
import { formatINR } from "@/lib/money";

export const metadata: Metadata = { title: "Products" };

export default async function AdminProductsPage({ searchParams }: PageProps<"/admin/products">) {
  await requireAdminPage();
  const q = String((await searchParams).q ?? "").slice(0, 60);
  const products = await listProductsForAdmin(q);
  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Products</h1>
          <p className="mt-1 text-muted-strong">{products.length} products in the catalogue</p>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <form className="relative flex-1 sm:w-64" role="search">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
            <input
              name="q"
              defaultValue={q}
              placeholder="Search"
              aria-label="Search products"
              className="h-11 w-full rounded-full border border-line-strong bg-surface pr-4 pl-10 text-sm focus:border-primary focus:outline-none"
            />
          </form>
          <LinkButton href="/admin/products/new" icon={<Plus className="size-4" />}>
            Add product
          </LinkButton>
        </div>
      </div>
      <Card className="mt-5 overflow-hidden">
        {products.length ? (
          <ul className="divide-y divide-line">
            {products.map((p) => (
              <li key={p.id}>
                <Link href={`/admin/products/${p.id}`} className="flex items-center gap-4 px-4 py-3.5 hover:bg-canvas sm:px-5">
                  <div className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-beige">
                    <ProductImage src={p.imageUrl} alt={p.name} sizes="48px" showLabel={false} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{p.name}</p>
                    <p className="text-sm text-muted-strong">
                      {p.categoryName} · {p.variantCount} {p.variantCount === 1 ? "size" : "sizes"}
                    </p>
                  </div>
                  <div className="hidden gap-1.5 sm:flex">
                    {p.isFeatured && <Badge tone="brand">Featured</Badge>}
                    {!p.isActive && <Badge tone="neutral">Hidden</Badge>}
                  </div>
                  <span className="text-sm font-semibold tabular-nums">
                    {p.fromPricePaise ? `from ${formatINR(p.fromPricePaise)}` : "No price"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={<Package className="size-6" />}
            title={q ? "No matches" : "Your catalogue is empty"}
            description={q ? "Try another name." : "Add your first product. Start with your best sellers."}
            action={<LinkButton href="/admin/products/new">Add product</LinkButton>}
          />
        )}
      </Card>
    </div>
  );
}
