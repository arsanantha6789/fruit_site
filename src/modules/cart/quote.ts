"use server";

import { createClient } from "@/lib/supabase/server";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { toProductView, PRODUCT_SELECT } from "@/modules/catalog/repo";
import { getBusinessSettings } from "@/modules/settings/repo";
import { deliveryFeeFor } from "@/modules/settings/types";
import { CartLines } from "./schema";

export interface QuotedLine {
  variantId: string;
  productSlug: string;
  productName: string;
  imageUrl: string | null;
  variantLabel: string;
  unitPricePaise: number;
  quantity: number;
  lineTotalPaise: number;
  available: boolean;
  maxQuantity: number;
}

export interface CartQuote {
  lines: QuotedLine[];
  missing: string[]; // variant ids no longer sold
  subtotalPaise: number;
  deliveryFeePaise: number;
  totalPaise: number;
  freeDeliveryMinPaise: number;
  minOrderPaise: number;
  acceptingOrders: boolean;
}

/**
 * Prices the cart from the database. Prices or stock stored in the browser
 * are never trusted; the final check happens again inside place_order().
 */
export async function quoteCart(input: unknown): Promise<ActionResult<CartQuote>> {
  const parsed = CartLines.safeParse(input);
  if (!parsed.success) return fail("Your cart couldn't be read. Please refresh the page.");
  const lines = parsed.data;
  const settings = await getBusinessSettings();
  const empty: CartQuote = {
    lines: [],
    missing: [],
    subtotalPaise: 0,
    deliveryFeePaise: 0,
    totalPaise: 0,
    freeDeliveryMinPaise: settings.freeDeliveryMinPaise,
    minOrderPaise: settings.minOrderPaise,
    acceptingOrders: settings.acceptingOrders,
  };
  if (lines.length === 0) return ok(empty);

  const supabase = await createClient();
  const ids = [...new Set(lines.map((l) => l.variantId))];
  const { data, error } = await supabase
    .from("product_variants")
    .select(`id, product:products!inner ( ${PRODUCT_SELECT} )`)
    .in("id", ids)
    .eq("is_active", true);
  if (error) return fail("We couldn't refresh your cart. Please try again.");

  // Stock is shared between variants of one product: allocate in cart order.
  const usedByProduct = new Map<string, number>();
  const quoted: QuotedLine[] = [];
  const found = new Set<string>();
  for (const line of lines) {
    const row = data.find((d) => d.id === line.variantId);
    if (!row) continue;
    const product = toProductView(row.product as never);
    const variant = product.variants.find((v) => v.id === line.variantId);
    const inv = (row.product as unknown as { inventory: { stock_quantity: string | number; is_available: boolean } | null }).inventory;
    if (!variant || !product.category) continue;
    found.add(line.variantId);
    const stock = inv?.is_available ? Number(inv.stock_quantity) : 0;
    const used = usedByProduct.get(product.id) ?? 0;
    const maxQuantity = Math.max(0, Math.min(50, Math.floor((stock - used + 1e-9) / variant.quantityInBase)));
    const available = maxQuantity >= line.quantity;
    usedByProduct.set(product.id, used + Math.min(line.quantity, maxQuantity) * variant.quantityInBase);
    quoted.push({
      variantId: variant.id,
      productSlug: product.slug,
      productName: product.name,
      imageUrl: product.imageUrl,
      variantLabel: variant.label,
      unitPricePaise: variant.pricePaise,
      quantity: line.quantity,
      lineTotalPaise: variant.pricePaise * line.quantity,
      available,
      maxQuantity,
    });
  }
  const subtotal = quoted.filter((l) => l.available).reduce((s, l) => s + l.lineTotalPaise, 0);
  const fee = deliveryFeeFor(subtotal, settings);
  return ok({
    ...empty,
    lines: quoted,
    missing: ids.filter((id) => !found.has(id)),
    subtotalPaise: subtotal,
    deliveryFeePaise: fee,
    totalPaise: subtotal + fee,
  });
}
