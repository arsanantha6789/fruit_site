import Link from "next/link";
import { AlertTriangle, ArrowRight, Boxes, IndianRupee, ReceiptText, ShoppingBag } from "lucide-react";
import { requireStaffPage } from "@/modules/auth/session";
import { dashboardSummary } from "@/modules/reports/repo";
import { listOrdersForStaff } from "@/modules/orders/repo";
import { listInventory } from "@/modules/inventory/repo";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/button";
import { OrdersTable } from "@/components/admin/orders-table";
import { formatINR } from "@/lib/money";
import { formatQty } from "@/lib/utils";
import { UNIT_LABEL } from "@/modules/catalog/units";

export default async function AdminOverview() {
  const user = await requireStaffPage();
  const [summary, recent, inventory] = await Promise.all([dashboardSummary(), listOrdersForStaff({ status: "open" }), listInventory()]);
  const low = inventory.filter((r) => r.isActive && r.isAvailable && r.isLow).slice(0, 8);
  const hour = Number(new Date().toLocaleString("en-IN", { hour: "numeric", hour12: false, timeZone: "Asia/Kolkata" }));
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const cards = [
    {
      label: "New orders",
      value: String(summary.newOrders),
      hint: "Waiting for confirmation",
      icon: ShoppingBag,
      href: "/admin/orders?status=new",
      accent: summary.newOrders > 0,
    },
    {
      label: "Open orders",
      value: String(summary.openOrders),
      hint: "Not yet delivered",
      icon: ReceiptText,
      href: "/admin/orders?status=open",
    },
    {
      label: "Today's revenue",
      value: formatINR(summary.todayRevenuePaise),
      hint: `${summary.todayOrders} orders today`,
      icon: IndianRupee,
      href: "/admin/reports",
    },
    {
      label: "Low stock",
      value: String(low.length),
      hint: "Products to restock",
      icon: Boxes,
      href: "/admin/inventory?filter=low",
      warn: low.length > 0,
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
        {greeting}, {user.fullName.split(" ")[0] || "there"}
      </h1>
      <p className="mt-1 text-muted-strong">Here&apos;s what&apos;s happening in your store today.</p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {cards.map(({ label, value, hint, icon: Icon, href, accent, warn }) => (
          <Link
            key={label}
            href={href}
            className={`group rounded-[var(--radius-card)] border p-4 shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-lift)] sm:p-5 ${accent ? "border-forest bg-forest text-white" : "border-line bg-surface"}`}
          >
            <div className="flex items-center justify-between">
              <p className={`text-sm font-semibold ${accent ? "text-white/80" : "text-muted-strong"}`}>{label}</p>
              <span
                className={`grid size-9 place-items-center rounded-full ${accent ? "bg-white/15" : warn ? "bg-warning-soft text-warning" : "bg-primary-soft text-primary"}`}
              >
                <Icon className="size-[1.125rem]" aria-hidden="true" />
              </span>
            </div>
            <p className="mt-3 text-2xl font-extrabold tracking-tight tabular-nums sm:text-3xl">{value}</p>
            <p className={`mt-1 text-xs ${accent ? "text-white/70" : "text-muted-strong"}`}>{hint}</p>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid items-start gap-6 xl:grid-cols-[1fr_20rem]">
        <Card>
          <CardHeader
            title="Orders to handle"
            description="Newest first"
            action={
              <LinkButton href="/admin/orders" variant="ghost" size="sm">
                All orders <ArrowRight className="size-4" />
              </LinkButton>
            }
          />
          {recent.orders.length ? (
            <OrdersTable orders={recent.orders.slice(0, 10)} />
          ) : (
            <EmptyState
              icon={<ReceiptText className="size-6" />}
              title="No open orders"
              description="New orders will appear here instantly, with a sound alert."
            />
          )}
        </Card>
        <Card>
          <CardHeader
            title="Running low"
            action={
              <Link href="/admin/inventory?filter=low" className="text-sm font-semibold text-primary">
                Update
              </Link>
            }
          />
          {low.length ? (
            <ul className="divide-y divide-line">
              {low.map((r) => (
                <li key={r.productId} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                  <span className="flex items-center gap-2 font-semibold">
                    <AlertTriangle className="size-4 text-warning" aria-hidden="true" />
                    {r.name}
                  </span>
                  <span className="font-bold text-warning tabular-nums">
                    {formatQty(r.stock)} {UNIT_LABEL[r.baseUnit]}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-8 text-center text-sm text-muted-strong">All products are well stocked.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
