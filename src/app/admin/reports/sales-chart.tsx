"use client";

import { useState } from "react";
import type { DailySales } from "@/modules/reports/repo";
import { formatINR } from "@/lib/money";

// Single-series bar chart (validated colour #2F7D4F vs white surface).
const BAR = "#2F7D4F";

const dayLabel = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

export function SalesChart({ series }: { series: DailySales[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...series.map((d) => d.revenuePaise));
  const step = niceStep(max / 100);
  const top = Math.ceil(max / 100 / step) * step * 100 || 100;
  const ticks = [0, 0.5, 1].map((f) => Math.round(top * f));
  const labelEvery = Math.ceil(series.length / 8);

  return (
    <figure className="m-0">
      <div className="relative flex h-64 gap-2">
        {/* y axis */}
        <div className="flex w-14 shrink-0 flex-col-reverse justify-between pb-6 text-right text-[0.6875rem] text-muted-strong tabular-nums">
          {ticks.map((t) => (
            <span key={t}>{formatINR(t).replace(".00", "")}</span>
          ))}
        </div>
        <div className="relative flex-1">
          {/* recessive grid */}
          <div className="absolute inset-x-0 top-0 bottom-6 flex flex-col justify-between" aria-hidden="true">
            {ticks.map((t) => (
              <div key={t} className="border-t border-line first:border-dashed" />
            ))}
          </div>
          <div className="absolute inset-x-0 top-0 bottom-6 flex items-end gap-[2px]" role="list" aria-label="Revenue per day">
            {series.map((d, i) => (
              <div
                key={d.day}
                role="listitem"
                tabIndex={0}
                aria-label={`${dayLabel(d.day)}: ${formatINR(d.revenuePaise)}, ${d.orders} orders`}
                className="group relative flex h-full flex-1 cursor-default items-end focus:outline-none"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
              >
                <div
                  className="w-full rounded-t-[4px] transition-opacity"
                  style={{
                    height: `${(d.revenuePaise / top) * 100}%`,
                    minHeight: d.revenuePaise > 0 ? 2 : 0,
                    background: BAR,
                    opacity: hover === null || hover === i ? 1 : 0.45,
                  }}
                />
                {hover === i && (
                  <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 rounded-lg border border-line bg-surface px-3 py-2 text-xs whitespace-nowrap shadow-[var(--shadow-lift)]">
                    <p className="font-semibold text-muted-strong">{dayLabel(d.day)}</p>
                    <p className="text-sm font-bold text-ink tabular-nums">{formatINR(d.revenuePaise)}</p>
                    <p className="text-muted-strong">
                      {d.orders} {d.orders === 1 ? "order" : "orders"}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
          {/* x axis */}
          <div className="absolute inset-x-0 bottom-0 flex h-5 gap-[2px] text-[0.6875rem] text-muted-strong" aria-hidden="true">
            {series.map((d, i) => (
              <span key={d.day} className="flex-1 text-center whitespace-nowrap">
                {i % labelEvery === 0 ? dayLabel(d.day) : ""}
              </span>
            ))}
          </div>
        </div>
      </div>
      <figcaption className="sr-only">Revenue per day, excluding cancelled orders. A table of the same data follows.</figcaption>
    </figure>
  );
}

function niceStep(raw: number) {
  const p = Math.pow(10, Math.floor(Math.log10(Math.max(raw, 1))));
  const n = raw / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}
