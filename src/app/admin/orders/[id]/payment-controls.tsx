"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setPaymentStatusAction } from "@/modules/orders/actions";
import type { PaymentStatus } from "@/modules/payments/methods";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";

export function PaymentControls({ orderId, status }: { orderId: string; status: PaymentStatus }) {
  const [pending, start] = useTransition();
  const [open, setOpen] = useState<PaymentStatus | null>(null);
  const [reference, setReference] = useState("");
  const toast = useToast();
  const router = useRouter();
  const run = (s: PaymentStatus) =>
    start(async () => {
      const r = await setPaymentStatusAction({ orderId, status: s, reference: reference.trim() || undefined });
      setOpen(null);
      if (r.ok) {
        toast(r.message ?? "Updated");
        router.refresh();
      } else toast(r.error, "error");
    });

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {status !== "paid" && (
        <Button size="sm" onClick={() => setOpen("paid")}>
          Mark as paid
        </Button>
      )}
      {status === "paid" && (
        <Button size="sm" variant="outline" onClick={() => setOpen("refunded")}>
          Mark refunded
        </Button>
      )}
      {status === "pending" && (
        <Button size="sm" variant="ghost" onClick={() => setOpen("failed")}>
          Payment failed
        </Button>
      )}
      <ConfirmDialog
        open={open !== null}
        title={open === "paid" ? "Confirm payment received" : open === "refunded" ? "Mark payment as refunded?" : "Mark payment as failed?"}
        confirmLabel="Confirm"
        tone={open === "paid" ? "primary" : "danger"}
        loading={pending}
        onCancel={() => setOpen(null)}
        onConfirm={() => open && run(open)}
      >
        {open === "paid" && (
          <Input
            label="UPI / receipt reference"
            optional
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            maxLength={120}
          />
        )}
      </ConfirmDialog>
    </div>
  );
}
