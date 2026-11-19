import type { Metadata } from "next";
import { LegalPage } from "@/components/store/legal-page";
import { getBusinessSettings } from "@/modules/settings/repo";

export const metadata: Metadata = { title: "Privacy policy" };

// TEMPLATE: review with a lawyer before launch (India's DPDP Act 2023 applies).
export default async function PrivacyPage() {
  const s = await getBusinessSettings();
  const contact = s.email || s.phone || "the contact details on our website";
  return (
    <LegalPage title="Privacy policy" updated="16 November 2026">
      <p>
        {s.businessName} (“we”, “us”) runs this online store. This policy explains what personal data we collect, why, and the choices you
        have.
      </p>
      <h2>What we collect</h2>
      <ul>
        <li>
          <b>Account details:</b> name, email address, mobile number and an encrypted password.
        </li>
        <li>
          <b>Delivery details:</b> addresses you save or enter at checkout, and delivery instructions.
        </li>
        <li>
          <b>Orders:</b> what you bought, prices, payment method (cash or UPI on delivery) and payment status. We do not collect card or
          bank details.
        </li>
        <li>
          <b>Technical data:</b> basic server logs (such as IP address and browser type) kept for security and to prevent abuse.
        </li>
        <li>
          <b>Analytics:</b> if enabled, privacy-friendly page-view statistics without cookies or personal profiles.
        </li>
      </ul>
      <h2>Why we use it</h2>
      <ul>
        <li>To create your account, deliver your orders and contact you about them.</li>
        <li>To keep the service secure and prevent fraud or misuse.</li>
        <li>To meet legal, tax and accounting obligations.</li>
      </ul>
      <h2>Who we share it with</h2>
      <p>
        We never sell your data. We use trusted providers to run the store: Supabase (database, login and file storage), our hosting
        provider, an email delivery service for order and account emails, and optionally a privacy-friendly analytics tool. They process
        data only on our instructions.
      </p>
      <h2>How long we keep it</h2>
      <p>
        We keep your account until you delete it. Order records are kept as long as the law requires for accounting; when you delete your
        account, your name, phone number and address are removed from those records.
      </p>
      <h2>Your rights</h2>
      <ul>
        <li>
          View and update your profile and addresses from <b>My account</b>.
        </li>
        <li>
          Delete your account at any time from <b>My account → Delete account</b>.
        </li>
        <li>Ask us for a copy of your data or raise a concern by contacting {contact}.</li>
      </ul>
      <h2>Cookies</h2>
      <p>We use only essential cookies to keep you logged in securely. Your cart is stored in your own browser.</p>
      <h2>Children</h2>
      <p>This store is intended for adults. We do not knowingly collect data from children.</p>
      <h2>Changes</h2>
      <p>We may update this policy and will change the date above when we do.</p>
    </LegalPage>
  );
}
