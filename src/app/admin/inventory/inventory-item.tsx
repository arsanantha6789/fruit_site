"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, IndianRupee } from "lucide-react";
import type { InventoryRow } from "@/modules/inventory/repo";
import { setVariantPriceAction, updateInventoryAction } from "@/modules/inventory/actions";
import { UNIT_LABEL } from "@/modules/catalog/units";
import { ProductImage } from "@/components/shared/product-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { controlClass } from "@/components/ui/field";
import { formatINR, rupeesToPaise } from "@/lib/money";
import { cn, formatQty } from "@/lib/utils";

export function InventoryItem({ row, canEditPrices }: { row: InventoryRow; canEditPrices: boolean }) {
  const [stock, setStock] = useState(formatQty(row.stock));
  const [threshold, setThreshold] = useState(formatQty(row.threshold));
  const [expanded, setExpanded] = useState(false);
  const [confirmOff, setConfirmOff] = useState(false);
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const unit = UNIT_LABEL[row.baseUnit];
  const dirty = Number(stock) !== row.stock || Number(threshold) !== row.threshold;

  const save = (patch: Parameters<typeof updateInventoryAction>[0]) =>
    start(async () => {
      const r = await updateInventoryAction(patch);
      if (r.ok) {
        toast(r.message ?? "Saved");
        router.refresh();
      } else toast(r.error, "error");
    });

  const saveStock = () => {
    const s = Number(stock);
    const t = Number(threshold);
    if (!Number.isFinite(s) || s < 0 || !Number.isFinite(t) || t < 0) return toast("Enter a number of 0 or more.", "error");
    save({ productId: row.productId, stock: s !== row.stock ? s : undefined, threshold: t !== row.threshold ? t : undefined });
  };

  const status = !row.isAvailable ? (
    <Badge tone="neutral">Unavailable</Badge>
  ) : row.stock <= 0 ? (
    <Badge tone="danger">Out of stock</Badge>
  ) : row.isLow ? (
    <Badge tone="warning">Low</Badge>
  ) : (
    <Badge tone="success">In stock</Badge>
  );

  return (
    <li className={cn("px-4 py-4 sm:px-5", !row.isActive && "opacity-60")}>
      <div className="flex flex-wrap items-center gap-3 sm:flex-nowrap">
        <div className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-beige">
          <ProductImage src={row.imageUrl} alt={row.name} sizes="48px" showLabel={false} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold">{row.name}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-strong">
            {status}
            <span>{row.categoryName}</span>
            {!row.isActive && <Badge tone="neutral">Hidden by admin</Badge>}
          </div>
        </div>
        <form
          className="flex w-full items-center gap-2 sm:w-auto"
          onSubmit={(e) => {
            e.preventDefault();
            saveStock();
          }}
        >
          <label className="sr-only" htmlFor={`stock-${row.productId}`}>
            Stock for {row.name} in {unit}
          </label>
          <div className="relative flex-1 sm:w-32 sm:flex-none">
            <input
              id={`stock-${row.productId}`}
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              className={cn(controlClass, "h-11 pr-12 text-right font-bold tabular-nums")}
            />
            <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-sm text-muted-strong">{unit}</span>
          </div>
          <Button type="submit" size="sm" className="h-11" disabled={!dirty} loading={pending && dirty}>
            Save
          </Button>
        </form>
        <div className="flex w-full items-center justify-between gap-2 sm:w-auto">
          {row.isAvailable ? (
            <Button variant="outline" size="sm" onClick={() => setConfirmOff(true)} disabled={pending}>
              Mark unavailable
            </Button>
          ) : (
            <Button variant="beige" size="sm" onClick={() => save({ productId: row.productId, isAvailable: true })} loading={pending}>
              Make available
            </Button>
          )}
          <button
            type="button"
            onClick={() => setExpanded((x) => !x)}
            className="rounded-full p-2 text-muted-strong hover:bg-primary-soft"
            aria-expanded={expanded}
            aria-label={`More options for ${row.name}`}
          >
            <ChevronDown className={cn("size-5 transition-transform", expanded && "rotate-180")} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 grid animate-fade-in gap-4 rounded-xl bg-canvas p-4 sm:grid-cols-[14rem_1fr]">
          <div>
            <label htmlFor={`thr-${row.productId}`} className="text-sm font-semibold">
              Low-stock warning at
            </label>
            <div className="relative mt-1.5">
              <input
                id={`thr-${row.productId}`}
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                className={cn(controlClass, "h-10 pr-12 tabular-nums")}
              />
              <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-sm text-muted-strong">{unit}</span>
            </div>
            <p className="mt-1 text-xs text-muted-strong">Press Save above after changing.</p>
          </div>
          <div>
            <p className="text-sm font-semibold">Sizes & prices</p>
            <ul className="mt-1.5 space-y-2">
              {row.variants.map((v) => (
                <PriceRow key={v.id} variant={v} editable={canEditPrices} />
              ))}
            </ul>
            {!canEditPrices && <p className="mt-2 text-xs text-muted-strong">Prices are managed by the admin team.</p>}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmOff}
        title={`Mark ${row.name} as unavailable?`}
        description="It stays in your catalogue but customers can't order it until you make it available again. Stock is kept as is."
        confirmLabel="Mark unavailable"
        loading={pending}
        onCancel={() => setConfirmOff(false)}
        onConfirm={() => {
          setConfirmOff(false);
          save({ productId: row.productId, isAvailable: false });
        }}
      />
    </li>
  );
}

function PriceRow({ variant, editable }: { variant: InventoryRow["variants"][number]; editable: boolean }) {
  const [price, setPrice] = useState(String(variant.pricePaise / 100));
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const changed = rupeesToPaise(Number(price)) !== variant.pricePaise;
  return (
    <li className="flex items-center gap-3 text-sm">
      <span className="w-20 font-medium">{variant.label}</span>
      {editable ? (
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const p = rupeesToPaise(Number(price));
            if (!Number.isFinite(p) || p <= 0) return toast("Enter a price above ₹0.", "error");
            start(async () => {
              const r = await setVariantPriceAction({
                variantId: variant.id,
                pricePaise: p,
                mrpPaise: variant.mrpPaise && variant.mrpPaise >= p ? variant.mrpPaise : null,
              });
              toast(r.ok ? (r.message ?? "Saved") : r.error, r.ok ? "success" : "error");
              if (r.ok) router.refresh();
            });
          }}
        >
          <div className="relative w-28">
            <IndianRupee
              className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted"
              aria-hidden="true"
            />
            <input
              type="number"
              inputMode="decimal"
              min={0.01}
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              aria-label={`Price for ${variant.label}`}
              className={cn(controlClass, "h-9 pl-7 tabular-nums")}
            />
          </div>
          <Button type="submit" size="sm" variant="outline" disabled={!changed} loading={pending}>
            Update
          </Button>
        </form>
      ) : (
        <span className="font-semibold tabular-nums">{formatINR(variant.pricePaise)}</span>
      )}
      {!variant.isActive && <Badge tone="neutral">Hidden</Badge>}
    </li>
  );
}
