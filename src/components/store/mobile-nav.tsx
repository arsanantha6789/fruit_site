"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, Search, X } from "lucide-react";

export function MobileNav({ links, signedIn, isStaff }: { links: { href: string; label: string }[]; signedIn: boolean; isStaff: boolean }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="-ml-2 rounded-full p-2 text-ink hover:bg-primary-soft"
        aria-label="Open menu"
        aria-expanded={open}
      >
        <Menu className="size-6" />
      </button>
      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 animate-fade-in bg-forest/30 backdrop-blur-[2px]" onClick={() => setOpen(false)} />
          <div
            className="absolute inset-y-0 left-0 flex w-[85%] max-w-sm animate-slide-up flex-col bg-canvas shadow-[var(--shadow-lift)]"
            onClick={(e) => (e.target as HTMLElement).closest("a") && setOpen(false)}
          >
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <span className="text-base font-bold text-forest">Menu</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full p-2 hover:bg-primary-soft"
                aria-label="Close menu"
              >
                <X className="size-5" />
              </button>
            </div>
            <form action="/shop" role="search" className="relative px-5 pt-5">
              <Search
                className="pointer-events-none absolute top-1/2 left-8.5 mt-2.5 size-4 -translate-y-1/2 text-muted"
                aria-hidden="true"
              />
              <input
                name="q"
                type="search"
                placeholder="Search produce"
                aria-label="Search products"
                maxLength={60}
                className="h-11 w-full rounded-full border border-line bg-surface pr-4 pl-10 text-sm focus:border-primary focus:outline-none"
              />
            </form>
            <nav className="flex flex-col gap-1 overflow-y-auto px-3 py-4" aria-label="Mobile">
              <Link href="/shop" className="rounded-xl px-3 py-3 text-base font-semibold hover:bg-primary-soft">
                Shop all
              </Link>
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="rounded-xl px-3 py-3 text-base font-medium text-muted-strong hover:bg-primary-soft hover:text-forest"
                >
                  {l.label}
                </Link>
              ))}
              <div className="my-2 border-t border-line" />
              {signedIn ? (
                <>
                  <Link href="/orders" className="rounded-xl px-3 py-3 text-base font-medium hover:bg-primary-soft">
                    My orders
                  </Link>
                  <Link href="/account" className="rounded-xl px-3 py-3 text-base font-medium hover:bg-primary-soft">
                    Account
                  </Link>
                  {isStaff && (
                    <Link href="/admin" className="rounded-xl px-3 py-3 text-base font-semibold text-forest hover:bg-primary-soft">
                      Owner dashboard
                    </Link>
                  )}
                </>
              ) : (
                <>
                  <Link href="/login" className="rounded-xl px-3 py-3 text-base font-medium hover:bg-primary-soft">
                    Log in
                  </Link>
                  <Link href="/signup" className="rounded-xl px-3 py-3 text-base font-medium hover:bg-primary-soft">
                    Create account
                  </Link>
                </>
              )}
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}
