import type { Metadata } from "next";
import Link from "next/link";
import { requireStaffPage } from "@/modules/auth/session";
import { salesReport } from "@/modules/reports/repo";
import { UNIT_LABEL } from "@/modules/catalog/units";
import { Card, CardHeader } from "@/components/ui/card";
import { formatINR } from "@/lib/money";
import { cn, formatDate, formatQty } from "@/lib/utils";
import { SalesChart } from "./sales-chart";

export const metadata: Metadata = { title: "Reports" };

const RANGES = [7, 30, 90] as const;

export default async function ReportsPage({ searchParams }: PageProps<"/admin/reports">) {
  await requireStaffPage();
  const sp = await searchParams;
  const days = RANGES.find((r) => String(r) === sp.days) ?? 7;
  const report = await salesReport(days);
  const avg = report.totals.orders ? Math.round(report.totals.revenuePaise / report.totals.orders) : 0;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Reports</h1>
          <p className="mt-1 text-muted-strong">
            {formatDate(report.from)} – {formatDate(report.to)} · cancelled orders excluded
          </p>
        </div>
        <nav className="flex rounded-full border border-line bg-surface p-1" aria-label="Date range">
          {RANGES.map((r) => (
            <Link
              key={r}
              href={`/admin/reports?days=${r}`}
              aria-current={r === days ? "page" : undefined}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-semibold",
                r === days ? "bg-forest text-white" : "text-muted-strong hover:text-forest",
              )}
            >
              {r} days
            </Link>
          ))}
        </nav>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3 sm:gap-4">
        {[
          { label: "Revenue", value: formatINR(report.totals.revenuePaise) },
          { label: "Orders", value: String(report.totals.orders) },
          { label: "Average order", value: formatINR(avg) },
        ].map((s) => (
          <Card key={s.label} className="p-5">
            <p className="text-sm font-semibold text-muted-strong">{s.label}</p>
            <p className="mt-2 text-3xl font-extrabold tracking-tight tabular-nums">{s.value}</p>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <CardHeader title="Revenue per day" />
        <div className="p-5 sm:p-6">
          <SalesChart series={report.series} />
          <details className="mt-4 text-sm">
            <summary className="cursor-pointer font-semibold text-primary">Show as table</summary>
            <table className="mt-3 w-full text-left">
              <thead className="text-xs text-muted-strong uppercase">
                <tr>
                  <th className="py-1.5">Day</th>
                  <th className="py-1.5 text-right">Orders</th>
                  <th className="py-1.5 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {report.series.map((d) => (
                  <tr key={d.day}>
                    <td className="py-1.5">{formatDate(d.day)}</td>
                    <td className="py-1.5 text-right tabular-nums">{d.orders}</td>
                    <td className="py-1.5 text-right tabular-nums">{formatINR(d.revenuePaise)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </div>
      </Card>

      <Card className="mt-6 overflow-hidden">
        <CardHeader title="Best sellers" description="By revenue" />
        {report.topProducts.length ? (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-xs font-semibold tracking-wide text-muted-strong uppercase">
              <tr>
                <th className="px-5 py-3">#</th>
                <th className="px-3 py-3">Product</th>
                <th className="px-3 py-3 text-right">Sold</th>
                <th className="px-5 py-3 text-right">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {report.topProducts.map((p, i) => (
                <tr key={p.productName}>
                  <td className="px-5 py-3 text-muted-strong">{i + 1}</td>
                  <td className="px-3 py-3 font-semibold">{p.productName}</td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {formatQty(p.quantitySold)} {UNIT_LABEL[p.unit]}
                  </td>
                  <td className="px-5 py-3 text-right font-semibold tabular-nums">{formatINR(p.revenuePaise)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="px-5 py-10 text-center text-sm text-muted-strong">No sales in this period yet.</p>
        )}
      </Card>
    </div>
  );
}
