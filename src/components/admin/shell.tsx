"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { BarChart3, Boxes, ExternalLink, FolderTree, LayoutDashboard, LogOut, Menu, Package, ReceiptText, Settings, X } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { logoutAction } from "@/modules/auth/actions";
import { cn } from "@/lib/utils";
import { NotificationBell } from "./notification-bell";

type Role = "customer" | "owner" | "admin";

const NAV: { href: string; label: string; icon: typeof Package; roles: Role[] }[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, roles: ["owner", "admin"] },
  { href: "/admin/orders", label: "Orders", icon: ReceiptText, roles: ["owner", "admin"] },
  { href: "/admin/inventory", label: "Stock", icon: Boxes, roles: ["owner", "admin"] },
  { href: "/admin/reports", label: "Reports", icon: BarChart3, roles: ["owner", "admin"] },
  { href: "/admin/products", label: "Products", icon: Package, roles: ["admin"] },
  { href: "/admin/categories", label: "Categories", icon: FolderTree, roles: ["admin"] },
  { href: "/admin/settings", label: "Settings", icon: Settings, roles: ["admin"] },
];

export function AdminShell({
  user,
  businessName,
  children,
}: {
  user: { name: string; role: Role };
  businessName: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const items = NAV.filter((n) => n.roles.includes(user.role));
  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center px-5">
        <Link href="/admin" aria-label="Dashboard home">
          <Logo name={businessName} inverted />
        </Link>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Dashboard">
        {items.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={isActive(href) ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
              isActive(href) ? "bg-white/12 text-white" : "text-white/70 hover:bg-white/8 hover:text-white",
            )}
          >
            <Icon className="size-[1.125rem]" aria-hidden="true" />
            {label}
          </Link>
        ))}
      </nav>
      <div className="space-y-1 border-t border-white/10 px-3 py-4">
        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/70 hover:bg-white/8 hover:text-white"
        >
          <ExternalLink className="size-[1.125rem]" aria-hidden="true" /> View store
        </Link>
        <form action={logoutAction}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/70 hover:bg-white/8 hover:text-white"
          >
            <LogOut className="size-[1.125rem]" aria-hidden="true" /> Log out
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-canvas">
      <aside className="fixed inset-y-0 left-0 hidden w-64 bg-forest lg:block">{sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Dashboard menu">
          <div className="absolute inset-0 animate-fade-in bg-ink/40" onClick={() => setOpen(false)} />
          <aside
            className="absolute inset-y-0 left-0 w-72 animate-slide-up bg-forest"
            onClick={(e) => (e.target as HTMLElement).closest("a") && setOpen(false)}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute top-4 right-3 rounded-full p-2 text-white/80 hover:bg-white/10"
              aria-label="Close menu"
            >
              <X className="size-5" />
            </button>
            {sidebar}
          </aside>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-surface/95 px-4 backdrop-blur sm:px-6">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="-ml-1 rounded-full p-2 hover:bg-primary-soft lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </button>
          <p className="truncate text-sm font-semibold text-muted-strong">{items.find((i) => isActive(i.href))?.label ?? "Dashboard"}</p>
          <div className="ml-auto flex items-center gap-2">
            <NotificationBell />
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold leading-tight">{user.name}</p>
              <p className="text-xs text-muted-strong capitalize">{user.role === "admin" ? "Administrator" : "Owner"}</p>
            </div>
          </div>
        </header>
        <main id="main" className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
        {/* Thumb-friendly bottom bar for the owner's most frequent tasks on a phone */}
        <nav
          className="sticky bottom-0 z-30 grid grid-cols-4 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
          aria-label="Quick links"
        >
          {items.slice(0, 4).map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={isActive(href) ? "page" : undefined}
              className={cn(
                "flex flex-col items-center gap-0.5 py-2.5 text-[0.6875rem] font-semibold",
                isActive(href) ? "text-primary" : "text-muted-strong",
              )}
            >
              <Icon className="size-5" aria-hidden="true" />
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
