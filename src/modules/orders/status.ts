// Client-safe order lifecycle definitions (mirrors public.order_status).
export const ORDER_FLOW = ["new", "confirmed", "preparing", "ready_for_delivery", "out_for_delivery", "delivered"] as const;
export type OrderStatus = (typeof ORDER_FLOW)[number] | "cancelled";
export const ALL_STATUSES: OrderStatus[] = [...ORDER_FLOW, "cancelled"];

export const STATUS_LABEL: Record<OrderStatus, string> = {
  new: "New order",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready_for_delivery: "Ready for delivery",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

/** Wording for the customer's tracking timeline. */
export const STATUS_CUSTOMER_TEXT: Record<OrderStatus, string> = {
  new: "We've received your order",
  confirmed: "Your order is confirmed",
  preparing: "We're hand-picking your produce",
  ready_for_delivery: "Packed and ready to go",
  out_for_delivery: "On the way to you",
  delivered: "Delivered. Enjoy!",
  cancelled: "This order was cancelled",
};

export const STATUS_TONE: Record<OrderStatus, "info" | "warning" | "success" | "neutral" | "danger" | "brand"> = {
  new: "info",
  confirmed: "brand",
  preparing: "warning",
  ready_for_delivery: "warning",
  out_for_delivery: "brand",
  delivered: "success",
  cancelled: "danger",
};

/** The single next step the owner most likely wants (null when closed). */
export function nextStatus(s: OrderStatus): OrderStatus | null {
  if (s === "cancelled" || s === "delivered") return null;
  return ORDER_FLOW[ORDER_FLOW.indexOf(s) + 1] ?? null;
}

export function isOpen(s: OrderStatus): boolean {
  return s !== "delivered" && s !== "cancelled";
}
