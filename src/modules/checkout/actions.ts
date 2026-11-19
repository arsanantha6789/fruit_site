"use server";

import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { friendlyDbError } from "@/lib/errors";
import { parseForm } from "@/lib/form";
import { getCurrentUser } from "@/modules/auth/session";
import { CartLines } from "@/modules/cart/schema";
import { notifyNewOrder } from "@/modules/notifications/service";
import { CHECKOUT_FIELDS, CheckoutInput } from "./schema";

export async function placeOrderAction(
  _prev: ActionResult<{ orderId: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ orderId: string }>> {
  const user = await getCurrentUser();
  if (!user) return fail("Please log in to place your order.");

  const parsed = parseForm(CheckoutInput, formData, CHECKOUT_FIELDS);
  if (!parsed.success) return fail("Please check the highlighted fields.", parsed.fieldErrors);
  const input = parsed.data;

  let items;
  try {
    items = CartLines.min(1).parse(JSON.parse(input.items));
  } catch {
    return fail("Your cart is empty or out of date. Please review it and try again.");
  }

  const address = {
    line1: input.line1,
    line2: input.line2,
    landmark: input.landmark,
    city: input.city,
    state: input.state,
    pincode: input.pincode,
  };
  const supabase = await createClient();
  const { data: orderId, error } = await supabase.rpc("place_order", {
    p_items: items.map((i) => ({ variant_id: i.variantId, quantity: i.quantity })),
    p_contact: { name: input.name, phone: input.phone, email: input.email || user.email },
    p_address: address,
    p_payment_method: input.paymentMethod,
    p_instructions: input.instructions,
    p_idempotency_key: input.idempotencyKey,
  });
  if (error || !orderId) return fail(friendlyDbError(error, "placeOrder"));

  if (input.saveAddress === "on") {
    const { count } = await supabase.from("addresses").select("id", { count: "exact", head: true }).eq("user_id", user.id);
    if ((count ?? 0) < 10) {
      await supabase.from("addresses").insert({
        user_id: user.id,
        label: "Home",
        full_name: input.name,
        phone: input.phone,
        ...address,
        is_default: (count ?? 0) === 0,
      });
    }
  }

  // Email/WhatsApp delivery happens after the response is sent; it can never fail the order.
  after(() => notifyNewOrder(orderId as string));
  return ok({ orderId: orderId as string });
}
