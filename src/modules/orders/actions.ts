"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { friendlyDbError } from "@/lib/errors";
import { getCurrentUser, staffOrNull } from "@/modules/auth/session";
import { notifyCustomerStatus } from "@/modules/notifications/service";
import { STATUS_LABEL } from "./status";

const StatusInput = z
  .object({
    orderId: z.string().uuid(),
    status: z.enum(["new", "confirmed", "preparing", "ready_for_delivery", "out_for_delivery", "delivered", "cancelled"]),
    note: z.string().trim().max(300).optional(),
  })
  .strict();

export async function updateOrderStatusAction(input: z.input<typeof StatusInput>): Promise<ActionResult> {
  if (!(await staffOrNull())) return fail("You don't have permission to do that.");
  const parsed = StatusInput.safeParse(input);
  if (!parsed.success) return fail("Please choose a valid status.");
  const { orderId, status, note } = parsed.data;
  if (status === "cancelled" && !note) return fail("Please add a reason for cancelling.");

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_order_status", { p_order_id: orderId, p_status: status, p_note: note ?? null });
  if (error) return fail(friendlyDbError(error, "updateOrderStatus"));
  after(() => notifyCustomerStatus(orderId));
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  return ok(undefined, `Order marked as ${STATUS_LABEL[status].toLowerCase()}.`);
}

const PaymentInput = z
  .object({
    orderId: z.string().uuid(),
    status: z.enum(["pending", "paid", "failed", "refunded"]),
    reference: z.string().trim().max(120).optional(),
  })
  .strict();

export async function setPaymentStatusAction(input: z.input<typeof PaymentInput>): Promise<ActionResult> {
  if (!(await staffOrNull())) return fail("You don't have permission to do that.");
  const parsed = PaymentInput.safeParse(input);
  if (!parsed.success) return fail("Please choose a valid payment status.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_payment_status", {
    p_order_id: parsed.data.orderId,
    p_status: parsed.data.status,
    p_reference: parsed.data.reference ?? null,
  });
  if (error) return fail(friendlyDbError(error, "setPaymentStatus"));
  revalidatePath(`/admin/orders/${parsed.data.orderId}`);
  return ok(undefined, "Payment updated.");
}

const CancelInput = z.object({ orderId: z.string().uuid(), reason: z.string().trim().max(300).optional() }).strict();

export async function cancelMyOrderAction(input: z.input<typeof CancelInput>): Promise<ActionResult> {
  if (!(await getCurrentUser())) return fail("Please log in again.");
  const parsed = CancelInput.safeParse(input);
  if (!parsed.success) return fail("We couldn't read that request.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_my_order", { p_order_id: parsed.data.orderId, p_reason: parsed.data.reason ?? null });
  if (error) return fail(friendlyDbError(error, "cancelMyOrder"));
  revalidatePath(`/orders/${parsed.data.orderId}`);
  revalidatePath("/orders");
  return ok(undefined, "Your order has been cancelled.");
}
