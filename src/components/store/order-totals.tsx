import { formatINR } from "@/lib/money";
import { cn } from "@/lib/utils";

export function OrderTotals({
  subtotal,
  delivery,
  discount,
  total,
  className,
}: {
  subtotal: number;
  delivery: number;
  discount: number;
  total: number;
  className?: string;
}) {
  return (
    <dl className={cn("space-y-2.5 text-sm", className)}>
      <div className="flex justify-between">
        <dt className="text-muted-strong">Subtotal</dt>
        <dd className="font-semibold tabular-nums">{formatINR(subtotal)}</dd>
      </div>
      <div className="flex justify-between">
        <dt className="text-muted-strong">Delivery</dt>
        <dd className="font-semibold tabular-nums">{delivery === 0 ? <span className="text-primary">Free</span> : formatINR(delivery)}</dd>
      </div>
      {discount > 0 && (
        <div className="flex justify-between">
          <dt className="text-muted-strong">Discount</dt>
          <dd className="font-semibold text-primary tabular-nums">−{formatINR(discount)}</dd>
        </div>
      )}
      <div className="flex justify-between border-t border-line pt-3 text-base">
        <dt className="font-bold">Total</dt>
        <dd className="font-extrabold tabular-nums">{formatINR(total)}</dd>
      </div>
    </dl>
  );
}
