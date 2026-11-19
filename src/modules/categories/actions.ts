"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { friendlyDbError } from "@/lib/errors";
import { parseForm } from "@/lib/form";
import { adminOrNull } from "@/modules/auth/session";
import { CATEGORY_FIELDS, CategoryInput } from "@/modules/catalog/schema";

function revalidateCategories() {
  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath("/admin/categories");
}

export async function saveCategoryAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  if (!(await adminOrNull())) return fail("Only administrators can manage categories.");
  const parsed = parseForm(CategoryInput, formData, CATEGORY_FIELDS);
  if (!parsed.success) return fail("Please check the highlighted fields.", parsed.fieldErrors);
  const c = parsed.data;
  const row = {
    name: c.name,
    slug: c.slug,
    description: c.description,
    image_url: c.imageUrl || null,
    sort_order: c.sortOrder,
    is_active: c.isActive === "on",
  };
  const idRaw = formData.get("categoryId");
  const supabase = await createClient();
  let error;
  if (typeof idRaw === "string" && idRaw) {
    const id = z.string().uuid().safeParse(idRaw);
    if (!id.success) return fail("We couldn't find that category.");
    ({ error } = await supabase.from("categories").update(row).eq("id", id.data));
  } else {
    ({ error } = await supabase.from("categories").insert(row));
  }
  if (error) {
    if (error.code === "23505") return fail("A category with that name or link already exists.", { name: ["Already in use"] });
    return fail(friendlyDbError(error, "saveCategory"));
  }
  revalidateCategories();
  return ok(undefined, "Category saved.");
}

export async function deleteCategoryAction(categoryId: string): Promise<ActionResult> {
  if (!(await adminOrNull())) return fail("Only administrators can manage categories.");
  const id = z.string().uuid().safeParse(categoryId);
  if (!id.success) return fail("We couldn't find that category.");
  const supabase = await createClient();
  const { error } = await supabase.from("categories").delete().eq("id", id.data);
  if (error) {
    if (error.code === "23503") return fail("This category still has products. Move or delete them first, or hide the category instead.");
    return fail(friendlyDbError(error, "deleteCategory"));
  }
  revalidateCategories();
  return ok(undefined, "Category deleted.");
}
