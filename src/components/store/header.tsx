import Link from "next/link";
import { Search, UserRound } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { getCurrentUser, isStaffRole } from "@/modules/auth/session";
import { listActiveCategories } from "@/modules/categories/repo";
import { getBusinessSettings } from "@/modules/settings/repo";
import { formatINR } from "@/lib/money";
import { CartButton } from "./cart-button";
import { MobileNav } from "./mobile-nav";

export async function StoreHeader() {
  const [user, categories, settings] = await Promise.all([
    getCurrentUser(),
    listActiveCategories().catch(() => []),
    getBusinessSettings().catch(() => null),
  ]);
  const links = categories.slice(0, 5).map((c) => ({ href: `/shop?category=${c.slug}`, label: c.name }));
  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-canvas/90 backdrop-blur-md">
      {settings && (
        <div className="bg-forest text-center text-xs font-medium text-white/90">
          <p className="mx-auto max-w-7xl px-4 py-2">
            {settings.acceptingOrders ? (
              <>
                {settings.freeDeliveryMinPaise > 0
                  ? `Free delivery above ${formatINR(settings.freeDeliveryMinPaise)}`
                  : "Free delivery on every order"}
                <span className="hidden sm:inline"> · Harvested fresh every morning</span>
              </>
            ) : (
              "We're taking a short break and not accepting orders right now."
            )}
          </p>
        </div>
      )}
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:h-[4.5rem] sm:px-6 lg:px-8">
        <MobileNav links={links} signedIn={Boolean(user)} isStaff={isStaffRole(user?.role)} />
        <Link href="/" aria-label={`${settings?.businessName ?? "Fresh Basket"} home`} className="shrink-0">
          <Logo name={settings?.businessName} />
        </Link>
        <nav aria-label="Categories" className="ml-6 hidden items-center gap-1 lg:flex">
          <Link
            href="/shop"
            className="rounded-full px-3 py-2 text-sm font-semibold text-ink transition-colors hover:bg-primary-soft hover:text-forest"
          >
            Shop all
          </Link>
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-full px-3 py-2 text-sm font-medium text-muted-strong transition-colors hover:bg-primary-soft hover:text-forest"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <form action="/shop" role="search" className="relative hidden md:block">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
            <input
              name="q"
              type="search"
              placeholder="Search tomatoes, mangoes…"
              aria-label="Search products"
              maxLength={60}
              className="h-10 w-56 rounded-full border border-line bg-surface pr-4 pl-10 text-sm transition-[width,border-color] placeholder:text-muted focus:w-72 focus:border-primary focus:outline-none"
            />
          </form>
          {isStaffRole(user?.role) && (
            <Link
              href="/admin"
              className="hidden rounded-full bg-beige px-3.5 py-2 text-sm font-semibold text-forest hover:bg-beige-deep sm:inline-flex"
            >
              Dashboard
            </Link>
          )}
          <Link
            href={user ? "/account" : "/login"}
            className="hidden items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-ink hover:bg-primary-soft sm:inline-flex"
          >
            <UserRound className="size-[1.125rem]" aria-hidden="true" />
            {user ? "Account" : "Log in"}
          </Link>
          <CartButton />
        </div>
      </div>
    </header>
  );
}
