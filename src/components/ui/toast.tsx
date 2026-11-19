"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { AlertCircle, CheckCircle2, Bell, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastTone = "success" | "error" | "info";
interface Toast {
  id: number;
  tone: ToastTone;
  message: string;
  action?: { label: string; href: string };
}

const ToastContext = createContext<{ toast: (message: string, tone?: ToastTone, action?: Toast["action"]) => void } | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const toast = useCallback(
    (message: string, tone: ToastTone = "success", action?: Toast["action"]) => {
      const id = Date.now() + Math.random();
      setToasts((t) => [...t.slice(-3), { id, tone, message, action }]);
      setTimeout(() => dismiss(id), tone === "error" ? 7000 : 4500);
    },
    [dismiss],
  );
  const value = useMemo(() => ({ toast }), [toast]);
  return (
    <ToastContext value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-5 sm:bottom-5 sm:items-end"
        aria-live="polite"
      >
        {toasts.map((t) => {
          const Icon = t.tone === "error" ? AlertCircle : t.tone === "info" ? Bell : CheckCircle2;
          return (
            <div
              key={t.id}
              role={t.tone === "error" ? "alert" : "status"}
              className={cn(
                "pointer-events-auto flex w-full max-w-sm animate-slide-up items-start gap-3 rounded-2xl border bg-surface px-4 py-3 text-sm shadow-[var(--shadow-lift)]",
                t.tone === "error" ? "border-danger/20" : "border-line",
              )}
            >
              <Icon
                className={cn("mt-0.5 size-[1.125rem] shrink-0", t.tone === "error" ? "text-danger" : "text-primary")}
                aria-hidden="true"
              />
              <div className="flex-1">
                <p className="font-medium text-ink">{t.message}</p>
                {t.action && (
                  <a href={t.action.href} className="mt-1 inline-block font-semibold text-primary underline-offset-2 hover:underline">
                    {t.action.label}
                  </a>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="rounded-full p-0.5 text-muted hover:bg-canvas hover:text-ink"
                aria-label="Dismiss"
              >
                <X className="size-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx.toast;
}
