"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { friendlyDbError } from "@/lib/errors";
import { parseForm } from "@/lib/form";
import { getCurrentUser } from "@/modules/auth/session";
import { ADDRESS_FIELDS, AddressInput, ProfileInput } from "./schema";

export async function updateProfileAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return fail("Please log in again.");
  const parsed = parseForm(ProfileInput, formData, ["fullName", "phone"]);
  if (!parsed.success) return fail("Please check the highlighted fields.", parsed.fieldErrors);
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ full_name: parsed.data.fullName, phone: parsed.data.phone }).eq("id", user.id);
  if (error) return fail(friendlyDbError(error, "updateProfile"));
  revalidatePath("/account");
  return ok(undefined, "Profile saved.");
}

export async function saveAddressAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return fail("Please log in again.");
  const parsed = parseForm(AddressInput, formData, ADDRESS_FIELDS);
  if (!parsed.success) return fail("Please check the highlighted fields.", parsed.fieldErrors);
  const a = parsed.data;
  const supabase = await createClient();
  const row = {
    label: a.label,
    full_name: a.fullName,
    phone: a.phone,
    line1: a.line1,
    line2: a.line2,
    landmark: a.landmark,
    city: a.city,
    state: a.state,
    pincode: a.pincode,
    is_default: a.isDefault === "on",
  };
  if (row.is_default) {
    await supabase.from("addresses").update({ is_default: false }).eq("user_id", user.id);
  }
  const idRaw = formData.get("addressId");
  let error;
  if (typeof idRaw === "string" && idRaw) {
    const id = z.string().uuid().safeParse(idRaw);
    if (!id.success) return fail("We couldn't find that address.");
    // RLS + explicit user filter: only your own address can change.
    ({ error } = await supabase.from("addresses").update(row).eq("id", id.data).eq("user_id", user.id));
  } else {
    const { count } = await supabase.from("addresses").select("id", { count: "exact", head: true }).eq("user_id", user.id);
    if ((count ?? 0) >= 10) return fail("You can save up to 10 addresses. Please remove one first.");
    ({ error } = await supabase.from("addresses").insert({ ...row, user_id: user.id }));
  }
  if (error) return fail(friendlyDbError(error, "saveAddress"));
  revalidatePath("/account");
  return ok(undefined, "Address saved.");
}

export async function deleteAddressAction(addressId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return fail("Please log in again.");
  const id = z.string().uuid().safeParse(addressId);
  if (!id.success) return fail("We couldn't find that address.");
  const supabase = await createClient();
  const { error, count } = await supabase.from("addresses").delete({ count: "exact" }).eq("id", id.data).eq("user_id", user.id);
  if (error) return fail(friendlyDbError(error, "deleteAddress"));
  if (!count) return fail("We couldn't find that address.");
  revalidatePath("/account");
  return ok(undefined, "Address removed.");
}
