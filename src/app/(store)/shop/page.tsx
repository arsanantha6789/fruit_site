import type { Metadata } from "next";
import Link from "next/link";
import { SearchX } from "lucide-react";
import { ProductGrid } from "@/components/store/product-card";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/button";
import { listProducts } from "@/modules/catalog/repo";
import { listActiveCategories } from "@/modules/categories/repo";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Shop fresh produce", description: "Browse seasonal fruits, vegetables and greens." };

export default async function ShopPage({ searchParams }: PageProps<"/shop">) {
  const sp = await searchParams;
  const category = typeof sp.category === "string" ? sp.category.slice(0, 80) : undefined;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 60) : undefined;
  const page = Math.max(1, Number(sp.page) || 1);

  const [categories, result] = await Promise.all([listActiveCategories(), listProducts({ categorySlug: category, q, page })]);
  const current = categories.find((c) => c.slug === category);
  const pages = Math.ceil(result.total / result.pageSize);
  const href = (p: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams();
    Object.entries({ category, q, ...p }).forEach(([k, v]) => v !== undefined && v !== "" && params.set(k, String(v)));
    const s = params.toString();
    return `/shop${s ? `?${s}` : ""}`;
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <header>
        <p className="text-xs font-bold tracking-wider text-primary uppercase">{q ? "Search" : "Shop"}</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
          {q ? `Results for “${q}”` : (current?.name ?? "All fresh produce")}
        </h1>
        {current?.description && <p className="mt-2 max-w-2xl text-muted-strong">{current.description}</p>}
      </header>

      <nav aria-label="Filter by category" className="-mx-4 mt-7 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        <Chip href={href({ category: undefined, page: undefined })} active={!category}>
          All
        </Chip>
        {categories.map((c) => (
          <Chip key={c.id} href={href({ category: c.slug, page: undefined })} active={c.slug === category}>
            {c.name}
          </Chip>
        ))}
      </nav>

      <div className="mt-8">
        {result.products.length ? (
          <>
            <p className="mb-4 text-sm text-muted-strong">
              {result.total} {result.total === 1 ? "product" : "products"}
            </p>
            <ProductGrid products={result.products} />
          </>
        ) : (
          <EmptyState
            icon={<SearchX className="size-6" />}
            title={q ? "No matches found" : "Nothing here yet"}
            description={q ? "Try a different spelling, or browse all our produce." : "We're restocking this section. Check back soon."}
            action={
              <LinkButton href="/shop" variant="outline">
                Browse everything
              </LinkButton>
            }
          />
        )}
      </div>

      {pages > 1 && (
        <nav aria-label="Pages" className="mt-10 flex items-center justify-center gap-2">
          {page > 1 && (
            <LinkButton href={href({ page: page - 1 })} variant="outline" size="sm">
              Previous
            </LinkButton>
          )}
          <span className="px-3 text-sm text-muted-strong">
            Page {page} of {pages}
          </span>
          {page < pages && (
            <LinkButton href={href({ page: page + 1 })} variant="outline" size="sm">
              Next
            </LinkButton>
          )}
        </nav>
      )}
    </div>
  );
}

function Chip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
        active ? "border-forest bg-forest text-white" : "border-line bg-surface text-muted-strong hover:border-primary hover:text-forest",
      )}
    >
      {children}
    </Link>
  );
}
