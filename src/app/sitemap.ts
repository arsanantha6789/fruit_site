import type { MetadataRoute } from "next";
import { listProducts } from "@/modules/catalog/repo";
import { listActiveCategories } from "@/modules/categories/repo";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const [{ products }, categories] = await Promise.all([
    listProducts({ limit: 48 }).catch(() => ({ products: [] })),
    listActiveCategories().catch(() => []),
  ]);
  return [
    { url: site, changeFrequency: "daily", priority: 1 },
    { url: `${site}/shop`, changeFrequency: "daily", priority: 0.9 },
    ...categories.map((c) => ({ url: `${site}/shop?category=${c.slug}`, changeFrequency: "daily" as const, priority: 0.8 })),
    ...products.map((p) => ({ url: `${site}/products/${p.slug}`, changeFrequency: "daily" as const, priority: 0.7 })),
    { url: `${site}/privacy`, priority: 0.2 },
    { url: `${site}/terms`, priority: 0.2 },
  ];
}
