import "server-only";
import { env } from "@/lib/env";
import { formatINR } from "@/lib/money";
import { createAdminClient } from "@/lib/supabase/admin";
import { STATUS_CUSTOMER_TEXT, STATUS_LABEL, type OrderStatus } from "@/modules/orders/status";
import { PAYMENT_METHOD_LABEL, type PaymentMethod } from "@/modules/payments/methods";
import { esc, sendEmail } from "./email";

// Runs after the response (next/server `after`), so it uses the service
// client to read the order. It only ever reads the one order it was given.

export async function notifyNewOrder(orderId: string): Promise<void> {
  const to = env().OWNER_NOTIFICATION_EMAIL;
  if (!to) return;
  const { data: o } = await createAdminClient()
    .from("orders")
    .select(
      "order_number, customer_name, customer_phone, total_paise, payment_method, instructions, shipping_address, order_items(product_name, variant_label, quantity)",
    )
    .eq("id", orderId)
    .maybeSingle();
  if (!o) return;
  const site = env().NEXT_PUBLIC_SITE_URL;
  const items = o.order_items.map((i) => `<li>${esc(i.product_name)} (${esc(i.variant_label)}) × ${i.quantity}</li>`).join("");
  const a = o.shipping_address as Record<string, string>;
  await sendEmail(
    to,
    `New order ${o.order_number} · ${formatINR(o.total_paise)}`,
    `<h2>New order ${esc(o.order_number)}</h2>
     <p><b>${esc(o.customer_name)}</b> · ${esc(o.customer_phone)}</p>
     <p>${esc([a.line1, a.line2, a.landmark, a.city, a.pincode].filter(Boolean).join(", "))}</p>
     <ul>${items}</ul>
     <p>Total <b>${formatINR(o.total_paise)}</b> · ${esc(PAYMENT_METHOD_LABEL[o.payment_method as PaymentMethod])}</p>
     ${o.instructions ? `<p>Instructions: ${esc(o.instructions)}</p>` : ""}
     <p><a href="${site}/admin/orders/${orderId}">Open in dashboard</a></p>`,
  );
}

export async function notifyCustomerStatus(orderId: string): Promise<void> {
  const { data: o } = await createAdminClient()
    .from("orders")
    .select("order_number, status, customer_email, customer_name, cancel_reason")
    .eq("id", orderId)
    .maybeSingle();
  if (!o?.customer_email) return;
  const status = o.status as OrderStatus;
  if (status === "preparing" || status === "ready_for_delivery") return; // avoid email fatigue
  const site = env().NEXT_PUBLIC_SITE_URL;
  await sendEmail(
    o.customer_email,
    `Order ${o.order_number}: ${STATUS_LABEL[status]}`,
    `<p>Hi ${esc(o.customer_name)},</p>
     <p>${esc(STATUS_CUSTOMER_TEXT[status])}.</p>
     ${status === "cancelled" && o.cancel_reason ? `<p>Reason: ${esc(o.cancel_reason)}</p>` : ""}
     <p><a href="${site}/orders/${orderId}">Track your order</a></p>`,
  );
}
