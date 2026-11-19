import Link from "next/link";
import type { ProductView } from "@/modules/catalog/types";
import { ProductImage } from "@/components/shared/product-image";
import { Badge } from "@/components/ui/badge";
import { AddToCart } from "./add-to-cart";

export function ProductCard({ product, priority }: { product: ProductView; priority?: boolean }) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface shadow-[var(--shadow-card)] transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]">
      <Link
        href={`/products/${product.slug}`}
        className="relative block aspect-[4/3.4] overflow-hidden bg-beige"
        tabIndex={-1}
        aria-hidden="true"
      >
        <ProductImage
          src={product.imageUrl}
          alt={product.name}
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          priority={priority}
          className="transition-transform duration-500 group-hover:scale-[1.04]"
        />
        {!product.isAvailable ? (
          <Badge tone="neutral" className="absolute top-3 left-3 bg-surface/95">
            Sold out
          </Badge>
        ) : product.lowStock ? (
          <Badge tone="warning" className="absolute top-3 left-3">
            Few left
          </Badge>
        ) : null}
      </Link>
      <div className="flex flex-1 flex-col gap-3 p-3.5 sm:p-4">
        <div>
          {product.category && <p className="text-[0.6875rem] font-bold tracking-wider text-primary uppercase">{product.category.name}</p>}
          <h3 className="mt-0.5 line-clamp-2 text-[0.9375rem] leading-snug font-bold text-ink sm:text-base">
            <Link href={`/products/${product.slug}`} className="hover:text-primary">
              {product.name}
            </Link>
          </h3>
        </div>
        <div className="mt-auto">
          <AddToCart product={product} />
        </div>
      </div>
    </article>
  );
}

export function ProductGrid({ products }: { products: ProductView[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} priority={i < 4} />
      ))}
    </div>
  );
}
