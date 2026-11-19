import { Check, X } from "lucide-react";
import { ORDER_FLOW, STATUS_CUSTOMER_TEXT, STATUS_LABEL, type OrderStatus } from "@/modules/orders/status";
import type { StatusEvent } from "@/modules/orders/types";
import { formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

/**
 * Customer-facing progress tracker. Built from the status history so the
 * same component can later show delivery-partner or live-location steps.
 */
export function TrackingTimeline({ status, history }: { status: OrderStatus; history: StatusEvent[] }) {
  const at = new Map<OrderStatus, string>();
  history.forEach((h) => at.set(h.toStatus, h.createdAt));
  if (status === "cancelled") {
    const ev = history.find((h) => h.toStatus === "cancelled");
    return (
      <div className="flex items-start gap-3 rounded-xl bg-danger-soft p-4 text-danger">
        <X className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        <div>
          <p className="font-bold">{STATUS_CUSTOMER_TEXT.cancelled}</p>
          {ev?.note && <p className="mt-0.5 text-sm">Reason: {ev.note}</p>}
          {ev && <p className="mt-0.5 text-sm opacity-80">{formatDateTime(ev.createdAt)}</p>}
        </div>
      </div>
    );
  }
  const currentIdx = ORDER_FLOW.indexOf(status as (typeof ORDER_FLOW)[number]);
  return (
    <ol className="relative" aria-label="Order progress">
      {ORDER_FLOW.map((s, i) => {
        const done = i <= currentIdx;
        const current = i === currentIdx;
        return (
          <li key={s} className="relative flex gap-4 pb-7 last:pb-0">
            {i < ORDER_FLOW.length - 1 && (
              <span
                className={cn("absolute top-8 left-[0.9375rem] h-[calc(100%-2rem)] w-0.5", i < currentIdx ? "bg-primary" : "bg-line")}
                aria-hidden="true"
              />
            )}
            <span
              className={cn(
                "relative z-10 grid size-8 shrink-0 place-items-center rounded-full border-2",
                done ? "border-primary bg-primary text-white" : "border-line-strong bg-surface text-muted",
                current && "ring-4 ring-primary/15",
              )}
              aria-hidden="true"
            >
              {done ? <Check className="size-4" strokeWidth={3} /> : <span className="size-2 rounded-full bg-line-strong" />}
            </span>
            <div className="pt-1">
              <p className={cn("text-sm font-bold", done ? "text-ink" : "text-muted")}>
                {STATUS_LABEL[s]}
                {current && <span className="sr-only"> (current status)</span>}
              </p>
              {current && <p className="text-sm text-muted-strong">{STATUS_CUSTOMER_TEXT[s]}</p>}
              {at.get(s) && <p className="text-xs text-muted-strong">{formatDateTime(at.get(s)!)}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
