"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelMyOrderAction } from "@/modules/orders/actions";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";

export function CancelOrderButton({ orderId }: { orderId: string }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  return (
    <div className="mt-6 border-t border-line pt-5">
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Cancel order
      </Button>
      <ConfirmDialog
        open={open}
        title="Cancel this order?"
        description="You can cancel while the store hasn't confirmed it yet. This can't be undone."
        confirmLabel="Yes, cancel order"
        tone="danger"
        loading={pending}
        onCancel={() => setOpen(false)}
        onConfirm={() =>
          start(async () => {
            const r = await cancelMyOrderAction({ orderId });
            setOpen(false);
            if (r.ok) {
              toast(r.message ?? "Order cancelled.");
              router.refresh();
            } else toast(r.error, "error");
          })
        }
      />
    </div>
  );
}
