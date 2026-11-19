import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Leaf, MapPin, Truck } from "lucide-react";
import { getProductBySlug, listProducts } from "@/modules/catalog/repo";
import { getBusinessSettings } from "@/modules/settings/repo";
import { AddToCart } from "@/components/store/add-to-cart";
import { ProductGrid } from "@/components/store/product-card";
import { ProductImage } from "@/components/shared/product-image";
import { Badge } from "@/components/ui/badge";
import { formatINR } from "@/lib/money";

export async function generateMetadata({ params }: PageProps<"/products/[slug]">): Promise<Metadata> {
  const product = await getProductBySlug((await params).slug);
  if (!product) return { title: "Product not found" };
  return {
    title: product.name,
    description: product.description.slice(0, 155) || `Buy fresh ${product.name} online.`,
    openGraph: product.imageUrl ? { images: [{ url: product.imageUrl }] } : undefined,
  };
}

export default async function ProductPage({ params }: PageProps<"/products/[slug]">) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();
  const [settings, related] = await Promise.all([
    getBusinessSettings(),
    product.category ? listProducts({ categorySlug: product.category.slug, limit: 5 }) : Promise.resolve({ products: [] }),
  ]);
  const others = related.products.filter((p) => p.id !== product.id).slice(0, 4);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-muted-strong">
        <Link href="/shop" className="hover:text-primary">
          Shop
        </Link>
        {product.category && (
          <>
            <ChevronRight className="size-3.5" aria-hidden="true" />
            <Link href={`/shop?category=${product.category.slug}`} className="hover:text-primary">
              {product.category.name}
            </Link>
          </>
        )}
        <ChevronRight className="size-3.5" aria-hidden="true" />
        <span className="truncate text-ink" aria-current="page">
          {product.name}
        </span>
      </nav>

      <div className="mt-6 grid gap-8 lg:grid-cols-2 lg:gap-14">
        <div className="relative aspect-square overflow-hidden rounded-[1.5rem] bg-beige">
          <ProductImage src={product.imageUrl} alt={product.name} sizes="(max-width: 1024px) 100vw, 50vw" priority />
        </div>
        <div className="flex flex-col lg:py-4">
          {product.category && <p className="text-xs font-bold tracking-wider text-primary uppercase">{product.category.name}</p>}
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-[2.5rem] sm:leading-tight">{product.name}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {product.isAvailable ? (
              product.lowStock ? (
                <Badge tone="warning" dot>
                  Only a few left
                </Badge>
              ) : (
                <Badge tone="success" dot>
                  In stock
                </Badge>
              )
            ) : (
              <Badge tone="neutral" dot>
                Sold out for today
              </Badge>
            )}
            {product.origin && (
              <span className="inline-flex items-center gap-1 text-sm text-muted-strong">
                <MapPin className="size-3.5" aria-hidden="true" /> {product.origin}
              </span>
            )}
          </div>
          {product.description && <p className="mt-6 leading-relaxed whitespace-pre-line text-muted-strong">{product.description}</p>}
          <div className="mt-8 rounded-[var(--radius-card)] border border-line bg-surface p-5 sm:p-6">
            <AddToCart product={product} layout="page" />
          </div>
          <ul className="mt-6 space-y-3 text-sm text-muted-strong">
            <li className="flex items-center gap-2.5">
              <Truck className="size-4 text-primary" aria-hidden="true" />
              {settings.freeDeliveryMinPaise > 0
                ? `Free delivery on orders above ${formatINR(settings.freeDeliveryMinPaise)}, otherwise ${formatINR(settings.deliveryFeePaise)}`
                : "Free delivery on every order"}
            </li>
            <li className="flex items-center gap-2.5">
              <Leaf className="size-4 text-primary" aria-hidden="true" /> Hand-picked and checked before packing
            </li>
          </ul>
        </div>
      </div>

      {others.length > 0 && (
        <section className="mt-20" aria-labelledby="related">
          <h2 id="related" className="text-2xl font-extrabold tracking-tight">
            You may also like
          </h2>
          <div className="mt-6">
            <ProductGrid products={others} />
          </div>
        </section>
      )}
    </div>
  );
}
