import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { CategoryView } from "@/modules/catalog/types";

export async function listActiveCategories(): Promise<CategoryView[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug, description, image_url")
    .eq("is_active", true)
    .order("sort_order")
    .order("name")
    .limit(100);
  if (error) throw new Error(`listActiveCategories: ${error.message}`);
  return data.map((c) => ({ id: c.id, name: c.name, slug: c.slug, description: c.description, imageUrl: c.image_url }));
}

export interface CategoryAdminRow extends CategoryView {
  sortOrder: number;
  isActive: boolean;
  productCount: number;
}

export async function listAllCategories(): Promise<CategoryAdminRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug, description, image_url, sort_order, is_active, products(count)")
    .order("sort_order")
    .order("name")
    .limit(200);
  if (error) throw new Error(`listAllCategories: ${error.message}`);
  return data.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    imageUrl: c.image_url,
    sortOrder: c.sort_order,
    isActive: c.is_active,
    productCount: (c.products as unknown as { count: number }[])[0]?.count ?? 0,
  }));
}
