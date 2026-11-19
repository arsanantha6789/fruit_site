import { Badge } from "@/components/ui/badge";
import { STATUS_LABEL, STATUS_TONE, type OrderStatus } from "@/modules/orders/status";
import { PAYMENT_STATUS_LABEL, type PaymentStatus } from "@/modules/payments/methods";

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <Badge tone={STATUS_TONE[status]} dot>
      {STATUS_LABEL[status]}
    </Badge>
  );
}

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  const tone = status === "paid" ? "success" : status === "pending" ? "warning" : status === "refunded" ? "info" : "danger";
  return <Badge tone={tone}>{PAYMENT_STATUS_LABEL[status]}</Badge>;
}
