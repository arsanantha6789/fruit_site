"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { CartLines, MAX_LINES, MAX_QTY, type CartLineInput } from "./schema";

// The browser only remembers WHICH items and HOW MANY. Names, prices and
// stock are always fetched fresh from the server (quoteCart / place_order).
const KEY = "fb-cart-v1";

interface CartContextValue {
  lines: CartLineInput[];
  ready: boolean;
  count: number;
  add: (variantId: string, quantity?: number) => void;
  setQuantity: (variantId: string, quantity: number) => void;
  remove: (variantId: string) => void;
  clear: () => void;
  quantityOf: (variantId: string) => number;
}

const CartContext = createContext<CartContextValue | null>(null);

function load(): CartLineInput[] {
  try {
    const parsed = CartLines.safeParse(JSON.parse(localStorage.getItem(KEY) ?? "[]"));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

// Tiny external store over localStorage (shared across tabs via the storage event).
const EMPTY: CartLineInput[] = [];
const listeners = new Set<() => void>();
let snapshot: CartLineInput[] | null = null;

function getSnapshot(): CartLineInput[] {
  if (snapshot === null) snapshot = load();
  return snapshot;
}

function setLinesStore(update: (prev: CartLineInput[]) => CartLineInput[]) {
  const prev = getSnapshot();
  const next = update(prev);
  // No-op updates must not notify subscribers (avoids render loops).
  if (next === prev || JSON.stringify(next) === JSON.stringify(prev)) return;
  snapshot = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(snapshot));
  } catch {
    /* private mode: cart lives in memory only */
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    snapshot = load();
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

const noopSubscribe = () => () => {};

export function CartProvider({ children }: { children: ReactNode }) {
  const lines = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
  const ready = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  const add = useCallback((variantId: string, quantity = 1) => {
    setLinesStore((prev) => {
      const existing = prev.find((l) => l.variantId === variantId);
      if (existing) return prev.map((l) => (l.variantId === variantId ? { ...l, quantity: Math.min(MAX_QTY, l.quantity + quantity) } : l));
      if (prev.length >= MAX_LINES) return prev;
      return [...prev, { variantId, quantity: Math.min(MAX_QTY, Math.max(1, quantity)) }];
    });
  }, []);
  const setQuantity = useCallback((variantId: string, quantity: number) => {
    setLinesStore((prev) =>
      quantity <= 0
        ? prev.filter((l) => l.variantId !== variantId)
        : prev.map((l) => (l.variantId === variantId ? { ...l, quantity: Math.min(MAX_QTY, Math.floor(quantity)) } : l)),
    );
  }, []);
  const remove = useCallback((variantId: string) => setLinesStore((prev) => prev.filter((l) => l.variantId !== variantId)), []);
  const clear = useCallback(() => setLinesStore(() => []), []);

  const value = useMemo<CartContextValue>(
    () => ({
      lines,
      ready,
      count: lines.reduce((s, l) => s + l.quantity, 0),
      add,
      setQuantity,
      remove,
      clear,
      quantityOf: (id) => lines.find((l) => l.variantId === id)?.quantity ?? 0,
    }),
    [lines, ready, add, setQuantity, remove, clear],
  );
  return <CartContext value={value}>{children}</CartContext>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
