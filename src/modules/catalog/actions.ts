"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { friendlyDbError } from "@/lib/errors";
import { parseForm } from "@/lib/form";
import { rupeesToPaise } from "@/lib/money";
import { adminOrNull } from "@/modules/auth/session";
import { PRODUCT_FIELDS, ProductInput, VariantInput } from "./schema";

const NO_PERMISSION = "Only administrators can change the catalogue.";

function revalidateCatalogue(slug?: string) {
  revalidatePath("/");
  revalidatePath("/shop");
  if (slug) revalidatePath(`/products/${slug}`);
  revalidatePath("/admin/products");
  revalidatePath("/admin/inventory");
}

/** Create (no productId) or update a product and its variants. */
export async function saveProductAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  if (!(await adminOrNull())) return fail(NO_PERMISSION);
  const parsed = parseForm(ProductInput, formData, PRODUCT_FIELDS);
  if (!parsed.success) return fail("Please check the highlighted fields.", parsed.fieldErrors);
  const p = parsed.data;

  let variants: z.infer<typeof VariantInput>[];
  try {
    variants = z.array(VariantInput).min(1, "Add at least one size/price").max(20).parse(JSON.parse(p.variants));
  } catch (err) {
    const msg = err instanceof z.ZodError ? (err.issues[0]?.message ?? "Check the sizes and prices") : "Check the sizes and prices";
    return fail(msg, { variants: [msg] });
  }
  const labels = variants.map((v) => v.label.toLowerCase());
  if (new Set(labels).size !== labels.length) return fail("Each size needs a different label.", { variants: ["Duplicate size labels"] });

  const productIdRaw = formData.get("productId");
  const productId = typeof productIdRaw === "string" && productIdRaw ? z.string().uuid().safeParse(productIdRaw) : null;
  if (productId && !productId.success) return fail("We couldn't find that product.");

  const supabase = await createClient();
  const row = {
    name: p.name,
    slug: p.slug,
    category_id: p.categoryId,
    description: p.description,
    origin: p.origin,
    base_unit: p.baseUnit,
    image_url: p.imageUrl || null,
    is_active: p.isActive === "on",
    is_featured: p.isFeatured === "on",
  };

  let id: string;
  if (productId?.success) {
    id = productId.data;
    const { error } = await supabase.from("products").update(row).eq("id", id);
    if (error)
      return fail(
        error.code === "23505" ? "Another product already uses that link name." : friendlyDbError(error, "updateProduct"),
        error.code === "23505" ? { slug: ["Already in use"] } : undefined,
      );
  } else {
    const { data, error } = await supabase.from("products").insert(row).select("id").single();
    if (error)
      return fail(
        error.code === "23505" ? "Another product already uses that link name." : friendlyDbError(error, "createProduct"),
        error.code === "23505" ? { slug: ["Already in use"] } : undefined,
      );
    id = data.id;
  }

  // Sync variants: update existing, insert new, deactivate-or-delete removed ones.
  const { data: existing, error: exErr } = await supabase.from("product_variants").select("id").eq("product_id", id);
  if (exErr) return fail(friendlyDbError(exErr, "loadVariants"));
  const keepIds = new Set(variants.filter((v) => v.id).map((v) => v.id!));
  const toRemove = existing.filter((e) => !keepIds.has(e.id)).map((e) => e.id);
  if (toRemove.length) {
    const { error } = await supabase.from("product_variants").delete().in("id", toRemove);
    if (error) return fail(friendlyDbError(error, "removeVariants"));
  }
  for (const [i, v] of variants.entries()) {
    const vr = {
      product_id: id,
      label: v.label,
      quantity_in_base: v.quantityInBase,
      price_paise: rupeesToPaise(v.price),
      mrp_paise: v.mrp ? rupeesToPaise(Number(v.mrp)) : null,
      is_active: v.isActive,
      sort_order: i,
    };
    const { error } =
      v.id && existing.some((e) => e.id === v.id)
        ? await supabase.from("product_variants").update(vr).eq("id", v.id).eq("product_id", id)
        : await supabase.from("product_variants").insert(vr);
    if (error) return fail(error.code === "23505" ? "Each size needs a different label." : friendlyDbError(error, "saveVariant"));
  }

  revalidateCatalogue(p.slug);
  if (!productId) redirect(`/admin/products/${id}?created=1`);
  return ok({ id }, "Product saved.");
}

const IdInput = z.string().uuid();

export async function deleteProductAction(productId: string): Promise<ActionResult> {
  if (!(await adminOrNull())) return fail(NO_PERMISSION);
  const id = IdInput.safeParse(productId);
  if (!id.success) return fail("We couldn't find that product.");
  const supabase = await createClient();
  // Past orders keep their own copy of name/price, so deleting is safe for history.
  const { error, count } = await supabase.from("products").delete({ count: "exact" }).eq("id", id.data);
  if (error) return fail(friendlyDbError(error, "deleteProduct"));
  if (!count) return fail("We couldn't find that product.");
  revalidateCatalogue();
  return ok(undefined, "Product deleted.");
}

export async function setProductActiveAction(productId: string, isActive: boolean): Promise<ActionResult> {
  if (!(await adminOrNull())) return fail(NO_PERMISSION);
  const id = IdInput.safeParse(productId);
  if (!id.success || typeof isActive !== "boolean") return fail("We couldn't find that product.");
  const supabase = await createClient();
  const { error } = await supabase.from("products").update({ is_active: isActive }).eq("id", id.data);
  if (error) return fail(friendlyDbError(error, "setProductActive"));
  revalidateCatalogue();
  return ok(undefined, isActive ? "Product is visible in the store." : "Product hidden from the store.");
}
