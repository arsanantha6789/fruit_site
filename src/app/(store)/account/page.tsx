import type { Metadata } from "next";
import Link from "next/link";
import { LogOut, Package, Sparkles } from "lucide-react";
import { requireUser } from "@/modules/auth/session";
import { logoutAction } from "@/modules/auth/actions";
import { listMyAddresses } from "@/modules/customers/repo";
import { listMyOrders } from "@/modules/orders/repo";
import { Card, CardHeader } from "@/components/ui/card";
import { Button, LinkButton } from "@/components/ui/button";
import { ProfileForm } from "./profile-form";
import { AddressBook } from "./address-book";
import { PasswordForm } from "./password-form";
import { DeleteAccount } from "./delete-account";

export const metadata: Metadata = { title: "My account", robots: { index: false } };

export default async function AccountPage() {
  const user = await requireUser("/account");
  const [addresses, orders] = await Promise.all([listMyAddresses(user.id), listMyOrders(user.id)]);
  const firstName = user.fullName.split(" ")[0] || "there";

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Hello, {firstName}</h1>
          <p className="mt-1 text-muted-strong">{user.email}</p>
        </div>
        <form action={logoutAction}>
          <Button type="submit" variant="outline" size="sm" icon={<LogOut className="size-4" />}>
            Log out
          </Button>
        </form>
      </div>

      {orders.total === 0 ? (
        <div className="mt-8 flex flex-col gap-4 rounded-[var(--radius-card)] bg-forest p-6 text-white sm:flex-row sm:items-center">
          <Sparkles className="size-8 shrink-0 text-beige" aria-hidden="true" />
          <div className="flex-1">
            <p className="text-lg font-bold">Welcome to the freshest basket in town</p>
            <p className="text-sm text-white/80">Pick your produce, pay on delivery, and follow your order live.</p>
          </div>
          <LinkButton href="/shop" variant="beige">
            Start shopping
          </LinkButton>
        </div>
      ) : (
        <Link
          href="/orders"
          className="mt-8 flex items-center gap-4 rounded-[var(--radius-card)] border border-line bg-surface p-5 hover:shadow-[var(--shadow-lift)]"
        >
          <span className="grid size-11 place-items-center rounded-full bg-primary-soft text-primary">
            <Package className="size-5" aria-hidden="true" />
          </span>
          <span className="flex-1">
            <span className="block font-bold">My orders</span>
            <span className="text-sm text-muted-strong">
              {orders.total} {orders.total === 1 ? "order" : "orders"} · track and view receipts
            </span>
          </span>
        </Link>
      )}

      <div className="mt-8 space-y-6">
        <Card>
          <CardHeader title="Profile" description="Used for delivery updates." />
          <div className="p-5 sm:p-6">
            <ProfileForm fullName={user.fullName} phone={user.phone ?? ""} />
          </div>
        </Card>
        <Card>
          <CardHeader title="Saved addresses" description="Choose one at checkout in a tap." />
          <div className="p-5 sm:p-6">
            <AddressBook addresses={addresses} />
          </div>
        </Card>
        <Card>
          <CardHeader title="Password" />
          <div className="p-5 sm:p-6">
            <PasswordForm />
          </div>
        </Card>
        {user.role === "customer" && (
          <Card className="border-danger/20">
            <CardHeader title="Delete account" description="Permanently remove your account and personal details." />
            <div className="p-5 sm:p-6">
              <DeleteAccount />
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
