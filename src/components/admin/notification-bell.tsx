"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { formatDateTime } from "@/lib/utils";

interface Item {
  id: string;
  type: string;
  title: string;
  body: string;
  orderId: string | null;
  createdAt: string;
}

/** Short two-note chime generated in the browser (no audio file needed). */
function chime() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    [880, 1320].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.18);
      g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + i * 0.18 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.18 + 0.35);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + i * 0.18);
      o.stop(ctx.currentTime + i * 0.18 + 0.4);
    });
  } catch {
    /* audio blocked until the user interacts with the page */
  }
}

export function NotificationBell() {
  const [items, setItems] = useState<Item[]>([]);
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const seen = useRef<Set<string> | null>(null);
  const toast = useToast();
  const router = useRouter();

  const poll = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const data: { items: Item[]; count: number } = await res.json();
      const fresh = seen.current ? data.items.filter((i) => !seen.current!.has(i.id)) : [];
      seen.current = new Set([...(seen.current ?? []), ...data.items.map((i) => i.id)]);
      setItems(data.items);
      setCount(data.count);
      if (fresh.length) {
        chime();
        const first = fresh[0];
        toast(
          first.title + (first.body ? ` · ${first.body}` : ""),
          "info",
          first.orderId ? { label: "Open order", href: `/admin/orders/${first.orderId}` } : undefined,
        );
        router.refresh();
      }
    } catch {
      /* offline: try again next tick */
    }
  }, [toast, router]);

  useEffect(() => {
    const first = setTimeout(poll, 0);
    const id = setInterval(() => document.visibilityState === "visible" && poll(), 20000);
    const onVisible = () => document.visibilityState === "visible" && poll();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(first);
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [poll]);

  useEffect(() => {
    const base = document.title.replace(/^\(\d+\) /, "");
    document.title = count > 0 ? `(${count}) ${base}` : base;
  }, [count]);

  const markAll = async () => {
    await fetch("/api/admin/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }).catch(
      () => null,
    );
    setItems([]);
    setCount(0);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-full p-2.5 text-ink hover:bg-primary-soft"
        aria-label={count ? `${count} new notifications` : "Notifications"}
        aria-expanded={open}
      >
        <Bell className="size-5" />
        {count > 0 && (
          <span className="absolute top-1 right-1 grid min-w-[1.125rem] place-items-center rounded-full bg-danger px-1 text-[0.625rem] font-bold text-white tabular-nums">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] animate-slide-up overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--shadow-lift)]">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <p className="text-sm font-bold">Notifications</p>
              {count > 0 && (
                <button type="button" onClick={markAll} className="text-xs font-semibold text-primary hover:text-forest">
                  Mark all read
                </button>
              )}
            </div>
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-strong">You&apos;re all caught up.</p>
            ) : (
              <ul className="max-h-96 divide-y divide-line overflow-y-auto">
                {items.map((n) => (
                  <li key={n.id}>
                    <Link
                      href={n.orderId ? `/admin/orders/${n.orderId}` : "/admin/orders"}
                      onClick={() => setOpen(false)}
                      className="block px-4 py-3 hover:bg-canvas"
                    >
                      <p className="text-sm font-semibold">{n.title}</p>
                      {n.body && <p className="text-sm text-muted-strong">{n.body}</p>}
                      <p className="mt-0.5 text-xs text-muted">{formatDateTime(n.createdAt)}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
