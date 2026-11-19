"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/modules/cart/cart-context";

export function CartButton() {
  const { count, ready } = useCart();
  return (
    <Link
      href="/cart"
      className="relative inline-flex h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
      aria-label={ready && count > 0 ? `Cart, ${count} items` : "Cart"}
    >
      <ShoppingBag className="size-[1.125rem]" aria-hidden="true" />
      <span className="hidden sm:inline">Cart</span>
      {ready && count > 0 && (
        <span className="grid min-w-5 place-items-center rounded-full bg-white px-1.5 text-xs font-bold text-forest tabular-nums">
          {count}
        </span>
      )}
    </Link>
  );
}
