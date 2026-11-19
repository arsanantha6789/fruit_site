"use client";

import { useActionState, useEffect } from "react";
import { saveSettingsAction } from "@/modules/settings/actions";
import type { BusinessSettings } from "@/modules/settings/types";
import { Card, CardHeader } from "@/components/ui/card";
import { Checkbox, Input, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormMessage } from "@/components/ui/form-message";
import { ImageUpload } from "@/components/admin/image-upload";
import { useToast } from "@/components/ui/toast";

const r = (paise: number) => String(paise / 100);

export function SettingsForm({ s }: { s: BusinessSettings }) {
  const [state, action] = useActionState(saveSettingsAction, null);
  const toast = useToast();
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  useEffect(() => {
    if (state?.ok) toast(state.message ?? "Saved");
  }, [state, toast]);

  return (
    <form action={action} className="mt-6 space-y-6" noValidate>
      <Card>
        <CardHeader title="Store status" />
        <div className="grid gap-4 p-5 sm:p-6">
          <Checkbox
            name="acceptingOrders"
            defaultChecked={s.acceptingOrders}
            label="Accepting orders"
            description="Switch off to pause checkout (e.g. holidays). The store stays visible."
          />
        </div>
      </Card>

      <Card>
        <CardHeader title="Business details" description="Printed on every packing slip." />
        <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
          <Input label="Business name" name="businessName" defaultValue={s.businessName} required errors={fe?.businessName} />
          <Input label="Tagline" name="tagline" defaultValue={s.tagline} optional errors={fe?.tagline} />
          <Input
            label="Address"
            name="addressLine"
            defaultValue={s.addressLine}
            optional
            errors={fe?.addressLine}
            wrapperClassName="sm:col-span-2"
          />
          <Input label="City" name="city" defaultValue={s.city} optional errors={fe?.city} />
          <Input label="State" name="state" defaultValue={s.state} optional errors={fe?.state} />
          <Input label="Pincode" name="pincode" defaultValue={s.pincode} inputMode="numeric" maxLength={6} optional errors={fe?.pincode} />
          <Input label="Phone" name="phone" defaultValue={s.phone} type="tel" optional errors={fe?.phone} />
          <Input label="Email" name="email" defaultValue={s.email} type="email" optional errors={fe?.email} />
          <Input label="GSTIN" name="gstin" defaultValue={s.gstin} optional errors={fe?.gstin} />
          <Textarea
            label="Packing slip note"
            name="packingSlipNote"
            defaultValue={s.packingSlipNote}
            maxLength={300}
            optional
            errors={fe?.packingSlipNote}
            wrapperClassName="sm:col-span-2"
          />
        </div>
      </Card>

      <Card>
        <CardHeader title="Delivery & checkout" />
        <div className="grid gap-4 p-5 sm:grid-cols-3 sm:p-6">
          <Input
            label="Delivery fee (₹)"
            name="deliveryFee"
            type="number"
            min={0}
            step="0.01"
            defaultValue={r(s.deliveryFeePaise)}
            errors={fe?.deliveryFee}
          />
          <Input
            label="Free delivery above (₹)"
            name="freeDeliveryMin"
            type="number"
            min={0}
            step="0.01"
            defaultValue={r(s.freeDeliveryMinPaise)}
            errors={fe?.freeDeliveryMin}
            hint="0 = always free"
          />
          <Input
            label="Minimum order (₹)"
            name="minOrder"
            type="number"
            min={0}
            step="0.01"
            defaultValue={r(s.minOrderPaise)}
            errors={fe?.minOrder}
            hint="0 = no minimum"
          />
          <Textarea
            label="Delivery pincodes"
            name="serviceablePincodes"
            defaultValue={s.serviceablePincodes.join(", ")}
            optional
            errors={fe?.serviceablePincodes}
            wrapperClassName="sm:col-span-3"
            hint="Separate with commas. Leave empty to deliver everywhere."
          />
          <div className="space-y-3 sm:col-span-3">
            <p className="text-sm font-semibold">Payment methods</p>
            <Checkbox name="codEnabled" defaultChecked={s.codEnabled} label="Cash on delivery" />
            <Checkbox name="upiOnDeliveryEnabled" defaultChecked={s.upiOnDeliveryEnabled} label="UPI on delivery" />
            {fe?.codEnabled && <p className="text-sm font-medium text-danger">{fe.codEnabled[0]}</p>}
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Stock & permissions" />
        <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
          <Input
            label="Default low-stock warning"
            name="defaultLowStock"
            type="number"
            min={0}
            step="any"
            defaultValue={String(s.defaultLowStockThreshold)}
            errors={fe?.defaultLowStock}
            hint="Applied to newly added products"
          />
          <Checkbox
            name="ownerCanEditPrices"
            defaultChecked={s.ownerCanEditPrices}
            label="Owner can edit prices"
            description="Lets the business owner change selling prices from the Stock page."
            className="self-end"
          />
        </div>
      </Card>

      <Card>
        <CardHeader title="Home page photos" description="A wide, bright photo of fresh produce works best." />
        <div className="grid gap-6 p-5 sm:grid-cols-2 sm:p-6">
          <ImageUpload name="heroImageUrl" defaultUrl={s.heroImageUrl} folder="banners" label="Hero banner" aspect="aspect-[16/9]" />
          <ImageUpload
            name="promoImageUrl"
            defaultUrl={s.promoImageUrl}
            folder="banners"
            label="Promotional banner"
            aspect="aspect-[4/3]"
          />
        </div>
      </Card>

      <div className="sticky bottom-16 z-20 flex flex-col gap-3 rounded-[var(--radius-card)] border border-line bg-surface/95 p-4 shadow-[var(--shadow-lift)] backdrop-blur sm:flex-row sm:items-center lg:bottom-4">
        <div className="flex-1">
          <FormMessage state={state && !state.ok ? state : null} />
        </div>
        <SubmitButton size="lg" pendingText="Saving…">
          Save settings
        </SubmitButton>
      </div>
    </form>
  );
}
