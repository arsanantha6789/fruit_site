// Client-safe payment definitions. Online payments (e.g. Razorpay) would add
// a new method here plus a server-side provider in modules/payments/providers.
export type PaymentMethod = "cod" | "upi_on_delivery";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  cod: "Cash on delivery",
  upi_on_delivery: "UPI on delivery",
};

export const PAYMENT_METHOD_HINT: Record<PaymentMethod, string> = {
  cod: "Pay in cash when your order arrives.",
  upi_on_delivery: "Scan and pay with any UPI app at your door.",
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  pending: "Payment pending",
  paid: "Paid",
  failed: "Failed",
  refunded: "Refunded",
};
