import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { OrderDetail, OrderSummary } from "./types";
import { ALL_STATUSES, type OrderStatus } from "./status";

const SUMMARY_SELECT = `
  id, order_number, status, customer_name, customer_phone, total_paise, payment_method, placed_at, shipping_address,
  payments ( status, created_at ),
  order_items ( count )
`;

type SummaryRow = {
  id: string;
  order_number: string;
  status: OrderStatus;
  customer_name: string;
  customer_phone: string;
  total_paise: number;
  payment_method: OrderSummary["paymentMethod"];
  placed_at: string;
  shipping_address: { pincode?: string };
  payments: { status: OrderSummary["paymentStatus"]; created_at: string }[];
  order_items: { count: number }[];
};

function latestPayment<T extends { created_at: string }>(rows: T[] | null | undefined): T | undefined {
  return [...(rows ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
}

function toSummary(r: SummaryRow): OrderSummary {
  return {
    id: r.id,
    orderNumber: r.order_number,
    status: r.status,
    customerName: r.customer_name,
    customerPhone: r.customer_phone,
    totalPaise: r.total_paise,
    paymentMethod: r.payment_method,
    paymentStatus: latestPayment(r.payments)?.status ?? "pending",
    itemCount: r.order_items?.[0]?.count ?? 0,
    placedAt: r.placed_at,
    pincode: r.shipping_address?.pincode ?? "",
  };
}

const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

/** Customer: their own orders (RLS also enforces this). */
export async function listMyOrders(userId: string, page = 1): Promise<{ orders: OrderSummary[]; total: number }> {
  const supabase = await createClient();
  const size = 20;
  const { data, error, count } = await supabase
    .from("orders")
    .select(SUMMARY_SELECT, { count: "exact" })
    .eq("customer_id", userId)
    .order("placed_at", { ascending: false })
    .range((page - 1) * size, page * size - 1);
  if (error) throw new Error(`listMyOrders: ${error.message}`);
  return { orders: (data as unknown as SummaryRow[]).map(toSummary), total: count ?? 0 };
}

export interface AdminOrderFilters {
  status?: OrderStatus | "open";
  q?: string;
  page?: number;
}

export const ADMIN_PAGE_SIZE = 25;

/** Staff: all orders with filters. RLS returns nothing for non-staff. */
export async function listOrdersForStaff(f: AdminOrderFilters) {
  const supabase = await createClient();
  const page = Math.max(1, Math.min(f.page ?? 1, 1000));
  let query = supabase
    .from("orders")
    .select(SUMMARY_SELECT, { count: "exact" })
    .order("placed_at", { ascending: false })
    .range((page - 1) * ADMIN_PAGE_SIZE, page * ADMIN_PAGE_SIZE - 1);
  if (f.status === "open") query = query.not("status", "in", "(delivered,cancelled)");
  else if (f.status && ALL_STATUSES.includes(f.status)) query = query.eq("status", f.status);
  const q = f.q?.trim().slice(0, 60);
  if (q) {
    const digits = q.replace(/\D/g, "");
    if (/^fb\d+$/i.test(q)) query = query.eq("order_number", q.toUpperCase());
    else if (digits.length >= 4 && digits.length === q.replace(/[\s+-]/g, "").length)
      query = query.like("customer_phone", `%${digits.slice(-10)}%`);
    else query = query.ilike("customer_name", `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`);
  }
  const { data, error, count } = await query;
  if (error) throw new Error(`listOrdersForStaff: ${error.message}`);
  return { orders: (data as unknown as SummaryRow[]).map(toSummary), total: count ?? 0, page, pageSize: ADMIN_PAGE_SIZE };
}

/**
 * One order with items, payment and history. Uses the caller's session, so
 * a customer asking for someone else's order simply gets null (-> 404).
 */
export async function getOrderDetail(orderId: string): Promise<OrderDetail | null> {
  if (!isUuid(orderId)) return null;
  const supabase = await createClient();
  const { data: o, error } = await supabase
    .from("orders")
    .select(
      `
      id, order_number, status, customer_id, customer_name, customer_phone, customer_email, shipping_address, instructions,
      subtotal_paise, delivery_fee_paise, discount_paise, total_paise, payment_method, placed_at, cancel_reason,
      payments ( status, provider_reference, paid_at, created_at ),
      order_items ( id, product_id, product_name, variant_label, unit, quantity_in_base, quantity, unit_price_paise, line_total_paise, image_url, created_at ),
      order_status_history ( id, from_status, to_status, note, changed_by, changed_by_role, created_at )
    `,
    )
    .eq("id", orderId)
    .maybeSingle();
  if (error) throw new Error(`getOrderDetail: ${error.message}`);
  if (!o) return null;

  // Names of staff who changed the status (visible to staff only via RLS).
  const staffIds = [
    ...new Set(o.order_status_history.filter((h) => h.changed_by_role !== "customer" && h.changed_by).map((h) => h.changed_by as string)),
  ];
  const names = new Map<string, string>();
  if (staffIds.length) {
    const { data: people } = await supabase.from("profiles").select("id, full_name").in("id", staffIds);
    people?.forEach((p) => names.set(p.id, p.full_name));
  }
  const payment = latestPayment(o.payments);
  return {
    id: o.id,
    orderNumber: o.order_number,
    status: o.status,
    customerId: o.customer_id,
    customerName: o.customer_name,
    customerPhone: o.customer_phone,
    customerEmail: o.customer_email,
    shippingAddress: o.shipping_address,
    instructions: o.instructions,
    subtotalPaise: o.subtotal_paise,
    deliveryFeePaise: o.delivery_fee_paise,
    discountPaise: o.discount_paise,
    totalPaise: o.total_paise,
    paymentMethod: o.payment_method,
    paymentStatus: payment?.status ?? "pending",
    paymentReference: payment?.provider_reference ?? null,
    paidAt: payment?.paid_at ?? null,
    placedAt: o.placed_at,
    cancelReason: o.cancel_reason,
    pincode: o.shipping_address?.pincode ?? "",
    itemCount: o.order_items.length,
    items: [...o.order_items]
      .sort((a, b) => a.product_name.localeCompare(b.product_name))
      .map((i) => ({
        id: i.id,
        productId: i.product_id,
        productName: i.product_name,
        variantLabel: i.variant_label,
        unit: i.unit,
        quantityInBase: Number(i.quantity_in_base),
        quantity: i.quantity,
        unitPricePaise: i.unit_price_paise,
        lineTotalPaise: i.line_total_paise,
        imageUrl: i.image_url,
      })),
    history: [...o.order_status_history]
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((h) => ({
        id: h.id,
        fromStatus: h.from_status,
        toStatus: h.to_status,
        note: h.note,
        changedByRole: h.changed_by_role,
        changedByName: h.changed_by ? (names.get(h.changed_by) ?? null) : null,
        createdAt: h.created_at,
      })),
  };
}
