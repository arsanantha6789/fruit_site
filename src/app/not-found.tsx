import Link from "next/link";
import { Logo } from "@/components/shared/logo";
import { LinkButton } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main id="main" className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <Link href="/" aria-label="Home">
        <Logo />
      </Link>
      <p className="mt-12 text-sm font-bold tracking-wider text-primary uppercase">404</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">We couldn&apos;t find that page</h1>
      <p className="mt-3 max-w-md text-muted-strong">
        It may have moved, or the link might be mistyped. Let&apos;s get you back to something fresh.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <LinkButton href="/">Go home</LinkButton>
        <LinkButton href="/shop" variant="outline">
          Browse produce
        </LinkButton>
      </div>
    </main>
  );
}
