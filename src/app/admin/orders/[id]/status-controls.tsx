"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check } from "lucide-react";
import { updateOrderStatusAction } from "@/modules/orders/actions";
import { ORDER_FLOW, STATUS_LABEL, nextStatus, type OrderStatus } from "@/modules/orders/status";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

export function StatusControls({ orderId, status }: { orderId: string; status: OrderStatus }) {
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState<OrderStatus | null>(null);
  const [note, setNote] = useState("");
  const toast = useToast();
  const router = useRouter();
  const next = nextStatus(status);
  const idx = ORDER_FLOW.indexOf(status as (typeof ORDER_FLOW)[number]);

  const run = (target: OrderStatus, n?: string) =>
    start(async () => {
      const r = await updateOrderStatusAction({ orderId, status: target, note: n || undefined });
      setConfirm(null);
      setNote("");
      if (r.ok) {
        toast(r.message ?? "Updated");
        router.refresh();
      } else toast(r.error, "error");
    });

  if (status === "delivered" || status === "cancelled") {
    return <p className="text-sm text-muted-strong">This order is {STATUS_LABEL[status].toLowerCase()} and closed.</p>;
  }

  return (
    <div>
      {/* Progress steps (tap a later step to jump ahead) */}
      <ol className="grid grid-cols-3 gap-2 sm:grid-cols-6" aria-label="Order lifecycle">
        {ORDER_FLOW.map((s, i) => {
          const done = i <= idx;
          return (
            <li key={s}>
              <button
                type="button"
                disabled={done || pending}
                onClick={() => (s === "delivered" ? setConfirm(s) : run(s))}
                className={cn(
                  "flex h-full w-full flex-col items-start gap-1.5 rounded-xl border p-2.5 text-left text-xs font-semibold transition-colors",
                  done
                    ? "border-primary/20 bg-primary-soft text-forest"
                    : "border-line text-muted-strong hover:border-primary hover:text-forest",
                  i === idx && "ring-2 ring-primary/30",
                )}
                aria-current={i === idx ? "step" : undefined}
              >
                <span
                  className={cn(
                    "grid size-5 place-items-center rounded-full text-[0.625rem]",
                    done ? "bg-primary text-white" : "bg-canvas ring-1 ring-line-strong",
                  )}
                >
                  {done ? <Check className="size-3" strokeWidth={3} /> : i + 1}
                </span>
                {STATUS_LABEL[s]}
              </button>
            </li>
          );
        })}
      </ol>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        {next && (
          <Button size="lg" className="sm:flex-1" loading={pending} onClick={() => (next === "delivered" ? setConfirm(next) : run(next))}>
            Mark as {STATUS_LABEL[next].toLowerCase()} <ArrowRight className="size-4" aria-hidden="true" />
          </Button>
        )}
        <Button
          size="lg"
          variant="outline"
          className="text-danger hover:border-danger hover:text-danger"
          disabled={pending}
          onClick={() => setConfirm("cancelled")}
        >
          Cancel order
        </Button>
      </div>

      <ConfirmDialog
        open={confirm === "delivered"}
        title="Mark this order as delivered?"
        description="This closes the order. Remember to mark the payment as received too."
        confirmLabel="Yes, delivered"
        loading={pending}
        onCancel={() => setConfirm(null)}
        onConfirm={() => run("delivered")}
      />
      <ConfirmDialog
        open={confirm === "cancelled"}
        title="Cancel this order?"
        description="The items go back into stock and the customer sees the order as cancelled. This can't be undone."
        confirmLabel="Cancel order"
        tone="danger"
        loading={pending}
        onCancel={() => setConfirm(null)}
        onConfirm={() => (note.trim() ? run("cancelled", note.trim()) : toast("Please add a reason for the customer.", "error"))}
      >
        <Textarea
          label="Reason (shown to the customer)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={300}
          placeholder="e.g. Customer requested cancellation by phone"
        />
      </ConfirmDialog>
    </div>
  );
}
