import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Unit } from "./units";

export interface AdminProductListRow {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  categoryName: string;
  isActive: boolean;
  isFeatured: boolean;
  variantCount: number;
  fromPricePaise: number | null;
}

export async function listProductsForAdmin(q?: string): Promise<AdminProductListRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from("products")
    .select(
      "id, name, slug, image_url, is_active, is_featured, category:categories(name), variants:product_variants(price_paise, is_active)",
    )
    .order("name")
    .limit(500);
  if (q?.trim())
    query = query.ilike(
      "name",
      `%${q
        .trim()
        .slice(0, 60)
        .replace(/[\\%_]/g, (c) => `\\${c}`)}%`,
    );
  const { data, error } = await query;
  if (error) throw new Error(`listProductsForAdmin: ${error.message}`);
  return data.map((p) => {
    const prices = p.variants.filter((v) => v.is_active).map((v) => v.price_paise);
    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      imageUrl: p.image_url,
      categoryName: (p.category as unknown as { name: string } | null)?.name ?? "",
      isActive: p.is_active,
      isFeatured: p.is_featured,
      variantCount: p.variants.length,
      fromPricePaise: prices.length ? Math.min(...prices) : null,
    };
  });
}

export interface AdminProduct {
  id: string;
  name: string;
  slug: string;
  categoryId: string;
  description: string;
  origin: string;
  baseUnit: Unit;
  imageUrl: string | null;
  isActive: boolean;
  isFeatured: boolean;
  variants: { id: string; label: string; quantityInBase: number; price: number; mrp: number | null; isActive: boolean }[];
}

export async function getProductForAdmin(id: string): Promise<AdminProduct | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data: p, error } = await supabase
    .from("products")
    .select(
      "id, name, slug, category_id, description, origin, base_unit, image_url, is_active, is_featured, variants:product_variants(id, label, quantity_in_base, price_paise, mrp_paise, is_active, sort_order)",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`getProductForAdmin: ${error.message}`);
  if (!p) return null;
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    categoryId: p.category_id,
    description: p.description,
    origin: p.origin,
    baseUnit: p.base_unit,
    imageUrl: p.image_url,
    isActive: p.is_active,
    isFeatured: p.is_featured,
    variants: [...p.variants]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((v) => ({
        id: v.id,
        label: v.label,
        quantityInBase: Number(v.quantity_in_base),
        price: v.price_paise / 100,
        mrp: v.mrp_paise ? v.mrp_paise / 100 : null,
        isActive: v.is_active,
      })),
  };
}
