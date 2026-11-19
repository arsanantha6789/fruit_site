import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Manrope } from "next/font/google";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";

const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"], display: "swap" });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Fresh Basket · Farm-fresh fruits & vegetables", template: "%s · Fresh Basket" },
  description: "Hand-picked fruits, vegetables and greens delivered fresh to your door. Order online, pay on delivery.",
  openGraph: {
    type: "website",
    siteName: "Fresh Basket",
    title: "Fresh Basket · Farm-fresh fruits & vegetables",
    description: "Hand-picked fruits, vegetables and greens delivered fresh to your door.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = { themeColor: "#164A32", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: LayoutProps<"/">) {
  const plausible = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
  return (
    <html lang="en-IN" className={`${manrope.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[200] focus:rounded-full focus:bg-forest focus:px-4 focus:py-2 focus:text-white"
        >
          Skip to content
        </a>
        <ToastProvider>{children}</ToastProvider>
        {plausible && <Script defer data-domain={plausible} src="https://plausible.io/js/script.js" strategy="afterInteractive" />}
      </body>
    </html>
  );
}
