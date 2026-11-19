import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireAdminPage } from "@/modules/auth/session";
import { getProductForAdmin } from "@/modules/catalog/admin-repo";
import { listAllCategories } from "@/modules/categories/repo";
import { ProductForm } from "../product-form";
import { ProductDangerZone } from "./danger-zone";

export const metadata: Metadata = { title: "Edit product" };

export default async function EditProductPage({ params }: PageProps<"/admin/products/[id]">) {
  await requireAdminPage();
  const { id } = await params;
  const [product, categories] = await Promise.all([getProductForAdmin(id), listAllCategories()]);
  if (!product) notFound();
  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/admin/products" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-forest">
        <ArrowLeft className="size-4" /> Products
      </Link>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{product.name}</h1>
        {product.isActive && (
          <Link href={`/products/${product.slug}`} target="_blank" className="text-sm font-semibold text-primary hover:text-forest">
            View in store
          </Link>
        )}
      </div>
      <ProductForm product={product} categories={categories.map((c) => ({ id: c.id, name: c.name }))} />
      <ProductDangerZone productId={product.id} name={product.name} />
    </div>
  );
}
