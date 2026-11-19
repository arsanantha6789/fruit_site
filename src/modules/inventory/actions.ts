"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { friendlyDbError } from "@/lib/errors";
import { staffOrNull } from "@/modules/auth/session";

const qty = z.number().finite().min(0, "Stock can't be negative").max(1_000_000);

const InventoryInput = z
  .object({
    productId: z.string().uuid(),
    stock: qty.optional(),
    isAvailable: z.boolean().optional(),
    threshold: qty.optional(),
    note: z.string().trim().max(300).optional(),
  })
  .strict();

/** Owner/admin: set stock, availability or low-stock threshold. */
export async function updateInventoryAction(input: z.input<typeof InventoryInput>): Promise<ActionResult> {
  if (!(await staffOrNull())) return fail("You don't have permission to do that.");
  const parsed = InventoryInput.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Please enter a valid number.");
  const d = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_inventory", {
    p_product_id: d.productId,
    p_stock: d.stock ?? null,
    p_is_available: d.isAvailable ?? null,
    p_low_stock_threshold: d.threshold ?? null,
    p_note: d.note ?? null,
  });
  if (error) return fail(friendlyDbError(error, "updateInventory"));
  revalidatePath("/admin/inventory");
  revalidatePath("/admin");
  revalidatePath("/shop");
  const msg = d.isAvailable === false ? "Marked as unavailable." : d.isAvailable === true ? "Back in the store." : "Stock updated.";
  return ok(undefined, msg);
}

const PriceInput = z
  .object({
    variantId: z.string().uuid(),
    pricePaise: z.number().int().min(1, "Price must be more than ₹0").max(10_000_000),
    mrpPaise: z.number().int().min(1).max(10_000_000).nullable().optional(),
  })
  .strict()
  .refine((d) => d.mrpPaise == null || d.mrpPaise >= d.pricePaise, { message: "MRP can't be lower than the selling price" });

/** Admin always; owner only when "owner can edit prices" is switched on (checked in the database). */
export async function setVariantPriceAction(input: z.input<typeof PriceInput>): Promise<ActionResult> {
  if (!(await staffOrNull())) return fail("You don't have permission to do that.");
  const parsed = PriceInput.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Please enter a valid price.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_variant_price", {
    p_variant_id: parsed.data.variantId,
    p_price_paise: parsed.data.pricePaise,
    p_mrp_paise: parsed.data.mrpPaise ?? null,
  });
  if (error) return fail(friendlyDbError(error, "setVariantPrice"));
  revalidatePath("/admin/inventory");
  revalidatePath("/shop");
  return ok(undefined, "Price updated.");
}
