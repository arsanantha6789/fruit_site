import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireAdminPage } from "@/modules/auth/session";
import { listAllCategories } from "@/modules/categories/repo";
import { Alert } from "@/components/ui/alert";
import { ProductForm } from "../product-form";

export const metadata: Metadata = { title: "Add product" };

export default async function NewProductPage() {
  await requireAdminPage();
  const categories = await listAllCategories();
  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/admin/products" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-forest">
        <ArrowLeft className="size-4" /> Products
      </Link>
      <h1 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">Add product</h1>
      {categories.length === 0 ? (
        <Alert tone="info" className="mt-6">
          Create a category first.{" "}
          <Link href="/admin/categories" className="underline">
            Go to categories
          </Link>
        </Alert>
      ) : (
        <ProductForm categories={categories.map((c) => ({ id: c.id, name: c.name }))} />
      )}
    </div>
  );
}
