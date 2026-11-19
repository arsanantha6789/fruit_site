import type { Metadata } from "next";
import { LegalPage } from "@/components/store/legal-page";
import { getBusinessSettings } from "@/modules/settings/repo";
import { formatINR } from "@/lib/money";

export const metadata: Metadata = { title: "Terms of service" };

// TEMPLATE: review with a lawyer before launch.
export default async function TermsPage() {
  const s = await getBusinessSettings();
  return (
    <LegalPage title="Terms of service" updated="16 November 2026">
      <p>These terms apply when you use the {s.businessName} website and place orders with us.</p>
      <h2>Your account</h2>
      <p>Please give accurate details and keep your password private. You are responsible for orders placed from your account.</p>
      <h2>Products and prices</h2>
      <p>
        Fresh produce varies naturally in size, colour and weight. Prices are in Indian Rupees and include applicable taxes. The price you
        pay is the price shown when you place your order.
      </p>
      <h2>Orders and availability</h2>
      <p>
        An order is accepted when we confirm it. If an item becomes unavailable we may cancel it and let you know. You can cancel an order
        online until we confirm it; after that, please call us.
      </p>
      <h2>Delivery</h2>
      <p>
        We deliver to the areas we serve.{" "}
        {s.freeDeliveryMinPaise > 0
          ? `Delivery is free on orders above ${formatINR(s.freeDeliveryMinPaise)}; otherwise a fee of ${formatINR(s.deliveryFeePaise)} applies.`
          : "Delivery is currently free."}{" "}
        Please make sure someone can receive the order.
      </p>
      <h2>Payment</h2>
      <p>You pay on delivery by cash or UPI. Please keep the exact amount ready if paying in cash.</p>
      <h2>Quality and refunds</h2>
      <p>If anything arrives damaged or not fresh, tell us within 24 hours of delivery and we will replace it or refund that item.</p>
      <h2>Acceptable use</h2>
      <p>
        Don&apos;t misuse the website, attempt to access other people&apos;s data or place fake orders. We may suspend accounts that do.
      </p>
      <h2>Liability</h2>
      <p>To the extent allowed by law, our responsibility for any order is limited to the amount you paid for it.</p>
      <h2>Governing law</h2>
      <p>These terms are governed by the laws of India. [Add the city whose courts have jurisdiction.]</p>
      <h2>Contact</h2>
      <p>
        {s.email || s.phone
          ? `Questions? Reach us at ${[s.phone, s.email].filter(Boolean).join(" or ")}.`
          : "Questions? Use the contact details on our website."}
      </p>
    </LegalPage>
  );
}
