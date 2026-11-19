"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export function QuantityStepper({
  value,
  onChange,
  max = 50,
  size = "md",
  label,
}: {
  value: number;
  onChange: (n: number) => void;
  max?: number;
  size?: "sm" | "md";
  label: string;
}) {
  const h = size === "sm" ? "h-9" : "h-11";
  return (
    <div
      className={cn("inline-flex items-center rounded-full border border-primary/30 bg-primary-soft text-forest", h)}
      role="group"
      aria-label={`Quantity for ${label}`}
    >
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        className={cn("grid aspect-square h-full place-items-center rounded-full hover:bg-primary/10")}
        aria-label={`Remove one ${label}`}
      >
        <Minus className="size-4" />
      </button>
      <span className="min-w-7 text-center text-sm font-bold tabular-nums" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
        className="grid aspect-square h-full place-items-center rounded-full hover:bg-primary/10 disabled:opacity-40"
        aria-label={`Add one more ${label}`}
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}
