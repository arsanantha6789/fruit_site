"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteProductAction } from "@/modules/catalog/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";

export function ProductDangerZone({ productId, name }: { productId: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  return (
    <Card className="mt-6 border-danger/20 p-5 sm:p-6">
      <h2 className="font-bold">Delete product</h2>
      <p className="mt-1 text-sm text-muted-strong">
        To stop selling it temporarily, untick “Visible in store” instead. Past orders keep their details either way.
      </p>
      <Button variant="outline" size="sm" className="mt-4 text-danger hover:border-danger hover:text-danger" onClick={() => setOpen(true)}>
        Delete permanently
      </Button>
      <ConfirmDialog
        open={open}
        title={`Delete ${name}?`}
        description="This removes the product, its sizes and its stock record. This can't be undone."
        confirmLabel="Delete product"
        tone="danger"
        loading={pending}
        onCancel={() => setOpen(false)}
        onConfirm={() =>
          start(async () => {
            const r = await deleteProductAction(productId);
            setOpen(false);
            if (r.ok) {
              toast(r.message ?? "Deleted");
              router.push("/admin/products");
            } else toast(r.error, "error");
          })
        }
      />
    </Card>
  );
}
