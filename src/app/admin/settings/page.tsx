import type { Metadata } from "next";
import { requireAdminPage } from "@/modules/auth/session";
import { getBusinessSettings } from "@/modules/settings/repo";
import { SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requireAdminPage();
  const settings = await getBusinessSettings();
  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Business settings</h1>
      <p className="mt-1 text-muted-strong">These appear on the store, on checkout and on packing slips.</p>
      <SettingsForm s={settings} />
    </div>
  );
}
