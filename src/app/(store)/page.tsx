import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Leaf, ShieldCheck, Truck, Wallet } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { ProductGrid } from "@/components/store/product-card";
import { ProductImage } from "@/components/shared/product-image";
import { listProducts } from "@/modules/catalog/repo";
import { listActiveCategories } from "@/modules/categories/repo";
import { getBusinessSettings } from "@/modules/settings/repo";
import { formatINR } from "@/lib/money";
import { Alert } from "@/components/ui/alert";
import { isAllowedImageUrl } from "@/lib/images";

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const sp = await searchParams;
  const [settings, categories, featured] = await Promise.all([
    getBusinessSettings(),
    listActiveCategories(),
    listProducts({ featuredOnly: true, limit: 8 }),
  ]);
  const products = featured.products.length ? featured.products : (await listProducts({ limit: 8 })).products;

  return (
    <>
      {sp.account === "deleted" && (
        <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
          <Alert tone="success">Your account has been deleted. We&apos;re sorry to see you go.</Alert>
        </div>
      )}

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 sm:pt-8 lg:px-8">
        <div className="relative isolate overflow-hidden rounded-[1.75rem] bg-forest">
          {isAllowedImageUrl(settings.heroImageUrl) ? (
            <>
              <Image
                src={settings.heroImageUrl!}
                alt=""
                fill
                priority
                sizes="(max-width: 1280px) 100vw, 1280px"
                className="-z-10 object-cover"
              />
              <div className="absolute inset-0 -z-10 bg-gradient-to-r from-forest/90 via-forest/60 to-forest/10" />
            </>
          ) : (
            <HeroArt />
          )}
          <div className="flex min-h-[26rem] max-w-2xl flex-col justify-center px-6 py-14 sm:min-h-[32rem] sm:px-12 lg:px-16">
            <p className="inline-flex w-fit items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide text-white/90 uppercase ring-1 ring-white/20">
              <Leaf className="size-3.5" aria-hidden="true" /> Harvested this morning
            </p>
            <h1 className="mt-5 text-[2.5rem] leading-[1.05] font-extrabold tracking-tight text-balance text-white sm:text-6xl">
              Fresh from the farm,
              <br />
              <span className="text-beige">to your kitchen.</span>
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-white/80 sm:text-lg">
              Seasonal fruits, crisp vegetables and fragrant greens, hand-picked and delivered the same day. Pay when it arrives.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <LinkButton href="/shop" size="lg" variant="beige">
                Shop fresh produce <ArrowRight className="size-4" aria-hidden="true" />
              </LinkButton>
              {categories[0] && (
                <LinkButton
                  href={`/shop?category=${categories[0].slug}`}
                  size="lg"
                  variant="ghost"
                  className="text-white ring-1 ring-white/30 hover:bg-white/10 hover:text-white"
                >
                  Browse {categories[0].name.toLowerCase()}
                </LinkButton>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section aria-label="Why shop with us" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <ul className="grid gap-px overflow-hidden rounded-b-[1.25rem] border-x border-b border-line bg-line sm:grid-cols-3">
          {[
            {
              Icon: Truck,
              title: settings.freeDeliveryMinPaise ? `Free delivery over ${formatINR(settings.freeDeliveryMinPaise)}` : "Free delivery",
              text: "Same-day, carefully packed",
            },
            { Icon: ShieldCheck, title: "Quality promise", text: "Not happy? We'll replace it" },
            { Icon: Wallet, title: "Pay on delivery", text: "Cash or UPI at your door" },
          ].map(({ Icon, title, text }) => (
            <li key={title} className="flex items-center gap-3.5 bg-surface px-5 py-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <span>
                <span className="block text-sm font-bold text-ink">{title}</span>
                <span className="block text-sm text-muted-strong">{text}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Categories */}
      {categories.length > 0 && (
        <section className="mx-auto mt-20 max-w-7xl px-4 sm:px-6 lg:px-8" aria-labelledby="cat-heading">
          <SectionHeading id="cat-heading" eyebrow="Shop by category" title="Something fresh for every meal" href="/shop" />
          <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
            {categories.slice(0, 8).map((c) => (
              <Link
                key={c.id}
                href={`/shop?category=${c.slug}`}
                className="group relative block aspect-[4/5] overflow-hidden rounded-[var(--radius-card)] bg-beige sm:aspect-[5/6]"
              >
                <ProductImage
                  src={c.imageUrl}
                  alt={c.name}
                  sizes="(max-width: 1024px) 50vw, 25vw"
                  showLabel={false}
                  className="transition-transform duration-500 group-hover:scale-[1.05]"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-forest/85 via-forest/40 to-transparent p-4 pt-16 sm:p-5">
                  <h3 className="text-lg font-bold text-white sm:text-xl">{c.name}</h3>
                  <span className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-white/85 group-hover:text-white">
                    Shop now <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Featured products */}
      <section className="mx-auto mt-20 max-w-7xl px-4 sm:px-6 lg:px-8" aria-labelledby="featured-heading">
        <SectionHeading id="featured-heading" eyebrow="This week's picks" title="Fresh arrivals" href="/shop" />
        <div className="mt-8">
          {products.length ? (
            <ProductGrid products={products} />
          ) : (
            <p className="rounded-[var(--radius-card)] border border-dashed border-line-strong bg-surface px-6 py-12 text-center text-muted-strong">
              Our shelves are being stocked. Please check back soon.
            </p>
          )}
        </div>
      </section>

      {/* Promo banner */}
      <section className="mx-auto mt-20 max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative isolate grid overflow-hidden rounded-[1.75rem] bg-beige md:grid-cols-2">
          <div className="px-6 py-12 sm:px-12 sm:py-16">
            <p className="text-xs font-bold tracking-wider text-primary uppercase">Weekly basket</p>
            <h2 className="mt-3 text-3xl leading-tight font-extrabold tracking-tight text-forest sm:text-4xl">
              Stock up on the season&apos;s best.
            </h2>
            <p className="mt-4 max-w-md text-muted-strong">
              Fill your basket with what&apos;s at its peak right now.
              {settings.freeDeliveryMinPaise > 0 && ` Orders above ${formatINR(settings.freeDeliveryMinPaise)} ship free.`}
            </p>
            <LinkButton href="/shop" className="mt-8" size="lg">
              Start your basket
            </LinkButton>
          </div>
          <div className="relative min-h-60 md:min-h-full">
            {isAllowedImageUrl(settings.promoImageUrl) ? (
              <Image src={settings.promoImageUrl!} alt="" fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
            ) : (
              <div className="absolute inset-0 bg-beige-deep">
                <HeroArt subtle />
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

function SectionHeading({ id, eyebrow, title, href }: { id: string; eyebrow: string; title: string; href: string }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <p className="text-xs font-bold tracking-wider text-primary uppercase">{eyebrow}</p>
        <h2 id={id} className="mt-2 text-2xl font-extrabold tracking-tight text-ink sm:text-[2rem]">
          {title}
        </h2>
      </div>
      <Link href={href} className="hidden shrink-0 items-center gap-1 text-sm font-semibold text-primary hover:text-forest sm:inline-flex">
        View all <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
    </div>
  );
}

/** Calm botanical line-art used until a real photo is uploaded in Settings. */
function HeroArt({ subtle }: { subtle?: boolean }) {
  const stroke = subtle ? "#164A32" : "#F3EEDC";
  return (
    <svg
      className="absolute inset-0 -z-10 h-full w-full"
      viewBox="0 0 800 520"
      preserveAspectRatio={subtle ? "xMidYMid slice" : "xMaxYMid slice"}
      aria-hidden="true"
    >
      <g fill="none" stroke={stroke} strokeOpacity={subtle ? 0.35 : 0.14} strokeWidth={subtle ? 2 : 1.5}>
        <circle cx="640" cy="260" r="210" />
        <circle cx="640" cy="260" r="150" />
        <path d="M640 70c80 60 110 140 0 380C530 210 560 130 640 70Z" />
        <path d="M640 120v300M580 200l60 40 60-40M570 280l70 45 70-45" />
        <path d="M470 430c40-70 110-90 170-60M810 120c-50 10-90 50-100 110" />
      </g>
    </svg>
  );
}
