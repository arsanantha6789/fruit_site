import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Unit } from "@/modules/catalog/units";

export interface DailySales {
  day: string;
  orders: number;
  revenuePaise: number;
}
export interface TopProduct {
  productName: string;
  quantitySold: number;
  unit: Unit;
  revenuePaise: number;
}

const istDate = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

export function rangeForDays(days: number) {
  const to = new Date();
  const from = new Date(Date.now() - (days - 1) * 86400000);
  return { from: istDate(from), to: istDate(to) };
}

/** Uses SECURITY INVOKER report functions, so RLS limits results to what the caller may see. */
export async function salesReport(days: number) {
  const { from, to } = rangeForDays(days);
  const supabase = await createClient();
  const [daily, top] = await Promise.all([
    supabase.rpc("report_daily_sales", { p_from: from, p_to: to }),
    supabase.rpc("report_top_products", { p_from: from, p_to: to, p_limit: 10 }),
  ]);
  if (daily.error) throw new Error(`report_daily_sales: ${daily.error.message}`);
  if (top.error) throw new Error(`report_top_products: ${top.error.message}`);
  const series: DailySales[] = (daily.data ?? []).map((d: { day: string; orders: number; revenue_paise: number }) => ({
    day: d.day,
    orders: Number(d.orders),
    revenuePaise: Number(d.revenue_paise),
  }));
  const topProducts: TopProduct[] = (top.data ?? []).map(
    (t: { product_name: string; quantity_sold: string; unit: Unit; revenue_paise: number }) => ({
      productName: t.product_name,
      quantitySold: Number(t.quantity_sold),
      unit: t.unit,
      revenuePaise: Number(t.revenue_paise),
    }),
  );
  const totals = series.reduce((a, d) => ({ orders: a.orders + d.orders, revenuePaise: a.revenuePaise + d.revenuePaise }), {
    orders: 0,
    revenuePaise: 0,
  });
  return { series, topProducts, totals, from, to };
}

/** Numbers for the dashboard's summary cards. */
export async function dashboardSummary() {
  const supabase = await createClient();
  const today = istDate(new Date());
  const startOfDayIST = new Date(`${today}T00:00:00+05:30`).toISOString();
  const [newOrders, openOrders, todays] = await Promise.all([
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "new"),
    supabase.from("orders").select("id", { count: "exact", head: true }).not("status", "in", "(delivered,cancelled)"),
    supabase.from("orders").select("total_paise, status").gte("placed_at", startOfDayIST).limit(2000),
  ]);
  for (const r of [newOrders, openOrders, todays]) if (r.error) throw new Error(`dashboardSummary: ${r.error.message}`);
  const valid = (todays.data ?? []).filter((o) => o.status !== "cancelled");
  return {
    newOrders: newOrders.count ?? 0,
    openOrders: openOrders.count ?? 0,
    todayOrders: valid.length,
    todayRevenuePaise: valid.reduce((s, o) => s + o.total_paise, 0),
  };
}
