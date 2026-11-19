import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { ProductView } from "./types";
import type { Unit } from "./units";

export const PRODUCT_SELECT = `
  id, name, slug, description, origin, image_url, base_unit, is_featured, is_active,
  category:categories!inner ( name, slug, is_active ),
  variants:product_variants ( id, label, quantity_in_base, price_paise, mrp_paise, sort_order, is_active ),
  inventory ( stock_quantity, is_available, low_stock_threshold )
`;

type Row = {
  id: string;
  name: string;
  slug: string;
  description: string;
  origin: string;
  image_url: string | null;
  base_unit: Unit;
  is_featured: boolean;
  category: { name: string; slug: string } | null;
  variants: {
    id: string;
    label: string;
    quantity_in_base: number | string;
    price_paise: number;
    mrp_paise: number | null;
    sort_order: number;
    is_active: boolean;
  }[];
  inventory: { stock_quantity: number | string; is_available: boolean; low_stock_threshold: number | string } | null;
};

/** Maps a database row to what the storefront needs; availability is derived, never trusted from the client. */
export function toProductView(r: Row): ProductView {
  const stock = Number(r.inventory?.stock_quantity ?? 0);
  const available = Boolean(r.inventory?.is_available);
  const variants = (r.variants ?? [])
    .filter((v) => v.is_active)
    .sort((a, b) => a.sort_order - b.sort_order || a.price_paise - b.price_paise)
    .map((v) => ({
      id: v.id,
      label: v.label,
      quantityInBase: Number(v.quantity_in_base),
      pricePaise: v.price_paise,
      mrpPaise: v.mrp_paise,
      inStock: available && stock >= Number(v.quantity_in_base),
    }));
  return {
    id: r.id,
    name: r.name,
    slug: r.slug,
    description: r.description,
    origin: r.origin,
    imageUrl: r.image_url,
    baseUnit: r.base_unit,
    isFeatured: r.is_featured,
    category: r.category ? { name: r.category.name, slug: r.category.slug } : null,
    variants,
    isAvailable: variants.some((v) => v.inStock),
    lowStock: available && stock > 0 && stock <= Number(r.inventory?.low_stock_threshold ?? 0),
  };
}

const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

export const PAGE_SIZE = 24;

export async function listProducts(
  opts: { categorySlug?: string; q?: string; page?: number; featuredOnly?: boolean; limit?: number } = {},
) {
  const supabase = await createClient();
  const limit = Math.min(opts.limit ?? PAGE_SIZE, 48);
  const page = Math.max(1, Math.min(opts.page ?? 1, 500));
  let query = supabase
    .from("products")
    .select(PRODUCT_SELECT, { count: "exact" })
    .eq("is_active", true)
    .eq("category.is_active", true)
    .order("is_featured", { ascending: false })
    .order("name")
    .range((page - 1) * limit, page * limit - 1);
  if (opts.categorySlug) query = query.eq("category.slug", opts.categorySlug);
  if (opts.featuredOnly) query = query.eq("is_featured", true);
  if (opts.q) query = query.ilike("name", `%${escapeLike(opts.q.slice(0, 60))}%`);
  const { data, error, count } = await query;
  if (error) throw new Error(`listProducts: ${error.message}`);
  const products = (data as unknown as Row[]).map(toProductView);
  // In-stock items first, keeping featured/name order within each group.
  products.sort((a, b) => Number(b.isAvailable) - Number(a.isAvailable));
  return { products, total: count ?? 0, page, pageSize: limit };
}

export async function getProductBySlug(slug: string): Promise<ProductView | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("slug", slug)
    .eq("is_active", true)
    .eq("category.is_active", true)
    .maybeSingle();
  if (error) throw new Error(`getProductBySlug: ${error.message}`);
  return data ? toProductView(data as unknown as Row) : null;
}
