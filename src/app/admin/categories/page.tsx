import type { Metadata } from "next";
import { requireAdminPage } from "@/modules/auth/session";
import { listAllCategories } from "@/modules/categories/repo";
import { CategoryManager } from "./category-manager";

export const metadata: Metadata = { title: "Categories" };

export default async function CategoriesPage() {
  await requireAdminPage();
  const categories = await listAllCategories();
  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Categories</h1>
      <p className="mt-1 text-muted-strong">Group products the way customers shop. Lower numbers appear first.</p>
      <CategoryManager categories={categories} />
    </div>
  );
}
