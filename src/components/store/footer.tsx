import Link from "next/link";
import { Logo } from "@/components/shared/logo";
import { getBusinessSettings } from "@/modules/settings/repo";

export async function StoreFooter() {
  const s = await getBusinessSettings().catch(() => null);
  const year = new Date().getFullYear();
  return (
    <footer className="mt-20 bg-forest text-white/80">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr] lg:px-8">
        <div>
          <Logo name={s?.businessName} inverted />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/70">
            {s?.tagline || "Hand-picked fruits and vegetables from trusted farms, delivered to your door the same day."}
          </p>
          {s && (s.phone || s.email) && (
            <p className="mt-4 text-sm text-white/70">
              {s.phone && (
                <a href={`tel:${s.phone.replace(/\s/g, "")}`} className="hover:text-white">
                  {s.phone}
                </a>
              )}
              {s.phone && s.email && " · "}
              {s.email && (
                <a href={`mailto:${s.email}`} className="hover:text-white">
                  {s.email}
                </a>
              )}
            </p>
          )}
        </div>
        <div>
          <h2 className="text-sm font-bold tracking-wide text-white uppercase">Shop</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li>
              <Link className="hover:text-white" href="/shop">
                All products
              </Link>
            </li>
            <li>
              <Link className="hover:text-white" href="/cart">
                Your cart
              </Link>
            </li>
            <li>
              <Link className="hover:text-white" href="/orders">
                Track an order
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-bold tracking-wide text-white uppercase">Company</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li>
              <Link className="hover:text-white" href="/account">
                My account
              </Link>
            </li>
            <li>
              <Link className="hover:text-white" href="/privacy">
                Privacy policy
              </Link>
            </li>
            <li>
              <Link className="hover:text-white" href="/terms">
                Terms of service
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-7xl px-4 py-5 text-xs text-white/60 sm:px-6 lg:px-8">
          © {year} {s?.businessName ?? "Fresh Basket"}. All prices in INR, inclusive of applicable taxes.
        </p>
      </div>
    </footer>
  );
}
