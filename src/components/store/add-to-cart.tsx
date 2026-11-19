"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useCart } from "@/modules/cart/cart-context";
import type { ProductView } from "@/modules/catalog/types";
import { formatINR } from "@/lib/money";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { QuantityStepper } from "./quantity-stepper";

/** Variant chooser + price + add/stepper. Used on cards and the product page. */
export function AddToCart({ product, layout = "card" }: { product: ProductView; layout?: "card" | "page" }) {
  const firstInStock = product.variants.find((v) => v.inStock) ?? product.variants[0];
  const [variantId, setVariantId] = useState(firstInStock?.id);
  const variant = product.variants.find((v) => v.id === variantId) ?? firstInStock;
  const cart = useCart();
  const toast = useToast();
  if (!variant) return null;

  const inCart = cart.quantityOf(variant.id);
  const page = layout === "page";

  return (
    <div className={cn("flex flex-col", page ? "gap-6" : "gap-3")}>
      {product.variants.length > 1 && (
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={`Choose size for ${product.name}`}>
          {product.variants.map((v) => (
            <button
              key={v.id}
              type="button"
              role="radio"
              aria-checked={v.id === variant.id}
              onClick={() => setVariantId(v.id)}
              disabled={!v.inStock}
              className={cn(
                "rounded-full border font-semibold transition-colors disabled:cursor-not-allowed disabled:line-through disabled:opacity-45",
                page ? "px-4 py-2 text-sm" : "px-2.5 py-1 text-xs",
                v.id === variant.id
                  ? "border-primary bg-primary-soft text-forest"
                  : "border-line text-muted-strong hover:border-primary/50",
              )}
            >
              {v.label}
            </button>
          ))}
        </div>
      )}
      <div className="flex items-end justify-between gap-2">
        <div>
          <div className="flex items-baseline gap-2">
            <span className={cn("font-extrabold text-ink tabular-nums", page ? "text-3xl" : "text-lg")}>
              {formatINR(variant.pricePaise)}
            </span>
            {variant.mrpPaise && variant.mrpPaise > variant.pricePaise && (
              <span className="text-sm text-muted line-through tabular-nums">{formatINR(variant.mrpPaise)}</span>
            )}
          </div>
          <span className="text-xs font-medium text-muted-strong">per {variant.label}</span>
        </div>
        {!variant.inStock ? (
          <span className="pb-1 text-xs font-semibold text-muted">Out of stock</span>
        ) : inCart > 0 ? (
          <QuantityStepper
            value={inCart}
            onChange={(n) => cart.setQuantity(variant.id, n)}
            size={page ? "md" : "sm"}
            label={`${product.name} ${variant.label}`}
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              cart.add(variant.id);
              toast(`${product.name} (${variant.label}) added to cart`, "success", { label: "View cart", href: "/cart" });
            }}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full bg-primary font-semibold text-white transition-[background-color,transform] hover:bg-primary-hover active:scale-95",
              page ? "h-12 px-7 text-base" : "h-9 px-4 text-sm",
            )}
            aria-label={`Add ${product.name} ${variant.label} to cart`}
          >
            <Plus className="size-4" aria-hidden="true" /> Add
          </button>
        )}
      </div>
    </div>
  );
}
