"use client";

import { useEffect, useState, useTransition } from "react";
import type { ActionResult } from "@/lib/action-result";
import { useCart } from "./cart-context";
import { quoteCart, type CartQuote } from "./quote";

/** Re-prices the cart on the server whenever it changes. */
export function useCartQuote() {
  const cart = useCart();
  const [result, setResult] = useState<ActionResult<CartQuote> | null>(null);
  const [pending, startTransition] = useTransition();
  const key = JSON.stringify(cart.lines);

  useEffect(() => {
    if (!cart.ready) return;
    let cancelled = false;
    const t = setTimeout(() => {
      startTransition(async () => {
        try {
          const r = await quoteCart(JSON.parse(key));
          if (!cancelled) setResult(r);
        } catch {
          if (!cancelled) setResult({ ok: false, error: "We couldn't reach the store. Check your connection and try again." });
        }
      });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [key, cart.ready]);

  // Drop items that are no longer sold at all.
  const { remove } = cart;
  useEffect(() => {
    if (result?.ok) result.data.missing.forEach((id) => remove(id));
  }, [result, remove]);

  return { cart, result, loading: !cart.ready || (pending && !result) || (cart.lines.length > 0 && !result), refreshing: pending };
}
