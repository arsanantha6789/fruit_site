import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Unit } from "@/modules/catalog/units";

export interface InventoryRow {
  productId: string;
  name: string;
  imageUrl: string | null;
  categoryName: string;
  baseUnit: Unit;
  isActive: boolean;
  stock: number;
  threshold: number;
  isAvailable: boolean;
  isLow: boolean;
  updatedAt: string;
  variants: { id: string; label: string; pricePaise: number; mrpPaise: number | null; isActive: boolean }[];
}

export type InventoryFilter = "all" | "low" | "out" | "unavailable";

export async function listInventory(opts: { filter?: InventoryFilter; q?: string } = {}): Promise<InventoryRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from("products")
    .select(
      `
      id, name, image_url, base_unit, is_active,
      category:categories ( name ),
      inventory ( stock_quantity, low_stock_threshold, is_available, updated_at ),
      variants:product_variants ( id, label, price_paise, mrp_paise, is_active, sort_order )
    `,
    )
    .order("name")
    .limit(500);
  const q = opts.q?.trim().slice(0, 60);
  if (q) query = query.ilike("name", `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`);
  const { data, error } = await query;
  if (error) throw new Error(`listInventory: ${error.message}`);
  const rows: InventoryRow[] = data.map((p) => {
    const inv = p.inventory as unknown as {
      stock_quantity: string;
      low_stock_threshold: string;
      is_available: boolean;
      updated_at: string;
    } | null;
    const stock = Number(inv?.stock_quantity ?? 0);
    const threshold = Number(inv?.low_stock_threshold ?? 0);
    return {
      productId: p.id,
      name: p.name,
      imageUrl: p.image_url,
      categoryName: (p.category as unknown as { name: string } | null)?.name ?? "",
      baseUnit: p.base_unit,
      isActive: p.is_active,
      stock,
      threshold,
      isAvailable: inv?.is_available ?? false,
      isLow: stock <= threshold,
      updatedAt: inv?.updated_at ?? "",
      variants: [...p.variants]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((v) => ({ id: v.id, label: v.label, pricePaise: v.price_paise, mrpPaise: v.mrp_paise, isActive: v.is_active })),
    };
  });
  switch (opts.filter) {
    case "low":
      return rows.filter((r) => r.isActive && r.isAvailable && r.isLow && r.stock > 0);
    case "out":
      return rows.filter((r) => r.isActive && r.stock <= 0);
    case "unavailable":
      return rows.filter((r) => !r.isAvailable);
    default:
      // Most urgent first: out of stock, then low, then the rest.
      return rows.sort((a, b) => Number(b.stock <= 0) - Number(a.stock <= 0) || Number(b.isLow) - Number(a.isLow));
  }
}

export async function lowStockCount(): Promise<number> {
  const rows = await listInventory();
  return rows.filter((r) => r.isActive && r.isAvailable && r.isLow).length;
}
