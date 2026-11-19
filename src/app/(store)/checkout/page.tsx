import type { Metadata } from "next";
import { requireUser } from "@/modules/auth/session";
import { listMyAddresses } from "@/modules/customers/repo";
import { getBusinessSettings } from "@/modules/settings/repo";
import { CheckoutForm } from "./checkout-form";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function CheckoutPage() {
  const user = await requireUser("/checkout");
  const [addresses, settings] = await Promise.all([listMyAddresses(user.id), getBusinessSettings()]);
  const methods = [
    ...(settings.codEnabled ? (["cod"] as const) : []),
    ...(settings.upiOnDeliveryEnabled ? (["upi_on_delivery"] as const) : []),
  ];
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Checkout</h1>
      <p className="mt-2 text-muted-strong">Almost done. Tell us where to deliver.</p>
      <CheckoutForm
        user={{ name: user.fullName, phone: user.phone ?? "", email: user.email }}
        addresses={addresses}
        methods={methods}
        serviceablePincodes={settings.serviceablePincodes}
      />
    </div>
  );
}
