"use client";

import Link from "next/link";
import { ShoppingBasket, Trash2 } from "lucide-react";
import { useCartQuote } from "@/modules/cart/use-quote";
import { ProductImage } from "@/components/shared/product-image";
import { productPhoto } from "@/lib/produce-photos";
import { QuantityStepper } from "@/components/store/quantity-stepper";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { OrderTotals } from "@/components/store/order-totals";
import { formatINR } from "@/lib/money";

export function CartView() {
  const { cart, result, loading, refreshing } = useCartQuote();

  if (cart.ready && cart.lines.length === 0) {
    return (
      <EmptyState
        className="mt-8 rounded-[var(--radius-card)] border border-line bg-surface"
        icon={<ShoppingBasket className="size-6" />}
        title="Your cart is empty"
        description="Fresh fruits and vegetables are just a tap away."
        action={<LinkButton href="/shop">Start shopping</LinkButton>}
      />
    );
  }
  if (loading) {
    return (
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_22rem]" aria-busy="true">
        <div className="space-y-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }
  if (!result?.ok)
    return (
      <Alert tone="error" className="mt-8">
        {result?.error ?? "Something went wrong."}
      </Alert>
    );

  const q = result.data;
  const unavailable = q.lines.filter((l) => !l.available);
  const belowMin = q.minOrderPaise > 0 && q.subtotalPaise < q.minOrderPaise;
  const canCheckout = q.acceptingOrders && unavailable.length === 0 && q.lines.length > 0 && !belowMin;
  const toFree = q.freeDeliveryMinPaise - q.subtotalPaise;

  return (
    <div className="mt-8 grid items-start gap-8 lg:grid-cols-[1fr_22rem]">
      <section aria-label="Items in your cart" className="rounded-[var(--radius-card)] border border-line bg-surface">
        <ul className="divide-y divide-line">
          {q.lines.map((l) => (
            <li key={l.variantId} className="flex gap-4 p-4 sm:p-5">
              <Link
                href={`/products/${l.productSlug}`}
                className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-beige sm:size-24"
                tabIndex={-1}
                aria-hidden="true"
              >
                <ProductImage
                  src={l.imageUrl}
                  fallbackSrc={productPhoto(l.productSlug)}
                  alt={l.productName}
                  sizes="96px"
                  showLabel={false}
                />
              </Link>
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/products/${l.productSlug}`} className="font-bold text-ink hover:text-primary">
                      {l.productName}
                    </Link>
                    <p className="text-sm text-muted-strong">
                      {l.variantLabel} · {formatINR(l.unitPricePaise)} each
                    </p>
                  </div>
                  <p className="font-bold tabular-nums">{formatINR(l.lineTotalPaise)}</p>
                </div>
                {!l.available && (
                  <p className="text-sm font-medium text-danger">
                    {l.maxQuantity === 0
                      ? "Sold out right now. Please remove it."
                      : `Only ${l.maxQuantity} available. Please reduce the quantity.`}
                  </p>
                )}
                <div className="mt-auto flex items-center justify-between">
                  <QuantityStepper
                    value={l.quantity}
                    onChange={(n) => cart.setQuantity(l.variantId, n)}
                    size="sm"
                    label={`${l.productName} ${l.variantLabel}`}
                    max={Math.max(l.maxQuantity, 1)}
                  />
                  <button
                    type="button"
                    onClick={() => cart.remove(l.variantId)}
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-muted-strong hover:bg-danger-soft hover:text-danger"
                  >
                    <Trash2 className="size-4" aria-hidden="true" /> Remove
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <aside
        className="rounded-[var(--radius-card)] border border-line bg-surface p-5 sm:p-6 lg:sticky lg:top-28"
        aria-label="Order summary"
      >
        <h2 className="text-lg font-bold">Order summary</h2>
        {toFree > 0 && q.subtotalPaise > 0 && q.deliveryFeePaise > 0 && (
          <p className="mt-3 rounded-xl bg-beige px-3.5 py-2.5 text-sm text-forest">
            Add <b>{formatINR(toFree)}</b> more for free delivery.
          </p>
        )}
        <OrderTotals subtotal={q.subtotalPaise} delivery={q.deliveryFeePaise} discount={0} total={q.totalPaise} className="mt-4" />
        <div className="mt-6 space-y-3">
          {!q.acceptingOrders && <Alert tone="info">We&apos;re not taking orders right now. Your cart will be saved.</Alert>}
          {belowMin && <Alert tone="info">Minimum order is {formatINR(q.minOrderPaise)}.</Alert>}
          {unavailable.length > 0 && <Alert tone="error">Some items need your attention before checkout.</Alert>}
          {canCheckout ? (
            <LinkButton href="/checkout" size="lg" className="w-full" aria-disabled={refreshing}>
              Continue to checkout
            </LinkButton>
          ) : (
            <button type="button" disabled className="h-13 w-full rounded-full bg-primary/40 font-semibold text-white">
              Continue to checkout
            </button>
          )}
          <Link href="/shop" className="block text-center text-sm font-semibold text-primary hover:text-forest">
            Keep shopping
          </Link>
        </div>
      </aside>
    </div>
  );
}
