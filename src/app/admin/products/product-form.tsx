"use client";

import { useActionState, useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { saveProductAction } from "@/modules/catalog/actions";
import type { AdminProduct } from "@/modules/catalog/admin-repo";
import { UNITS, UNIT_LABEL, type Unit } from "@/modules/catalog/units";
import { Card, CardHeader } from "@/components/ui/card";
import { Checkbox, Input, Select, Textarea, controlClass } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormMessage } from "@/components/ui/form-message";
import { ImageUpload } from "@/components/admin/image-upload";
import { useToast } from "@/components/ui/toast";
import { cn, slugify } from "@/lib/utils";

type VariantDraft = { key: string; id?: string; label: string; quantityInBase: string; price: string; mrp: string; isActive: boolean };

const toDraft = (v: AdminProduct["variants"][number]): VariantDraft => ({
  key: v.id,
  id: v.id,
  label: v.label,
  quantityInBase: String(v.quantityInBase),
  price: String(v.price),
  mrp: v.mrp ? String(v.mrp) : "",
  isActive: v.isActive,
});

export function ProductForm({ product, categories }: { product?: AdminProduct; categories: { id: string; name: string }[] }) {
  const [state, action] = useActionState(saveProductAction, null);
  const [name, setName] = useState(product?.name ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(product));
  const [unit, setUnit] = useState<Unit>(product?.baseUnit ?? "kg");
  const [variants, setVariants] = useState<VariantDraft[]>(
    product?.variants.map(toDraft) ?? [{ key: "v1", label: "1 kg", quantityInBase: "1", price: "", mrp: "", isActive: true }],
  );
  const toast = useToast();
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  useEffect(() => {
    if (state?.ok) toast(state.message ?? "Saved");
  }, [state, toast]);

  const update = (key: string, patch: Partial<VariantDraft>) =>
    setVariants((vs) => vs.map((v) => (v.key === key ? { ...v, ...patch } : v)));
  const payload = JSON.stringify(
    variants.map((v) => ({
      ...(v.id ? { id: v.id } : {}),
      label: v.label,
      quantityInBase: v.quantityInBase,
      price: v.price,
      mrp: v.mrp || null,
      isActive: v.isActive,
    })),
  );

  return (
    <form action={action} className="mt-6 space-y-6" noValidate>
      {product && <input type="hidden" name="productId" value={product.id} />}
      <input type="hidden" name="variants" value={payload} />

      <Card>
        <CardHeader title="Details" />
        <div className="grid gap-5 p-5 sm:p-6 md:grid-cols-[1fr_16rem]">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Product name"
              name="name"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!slugTouched) setSlug(slugify(e.target.value));
              }}
              errors={fe?.name}
              wrapperClassName="sm:col-span-2"
            />
            <Input
              label="Link name"
              name="slug"
              required
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugTouched(true);
              }}
              errors={fe?.slug}
              hint={`Shown in the web address: /products/${slug || "…"}`}
            />
            <Select label="Category" name="categoryId" defaultValue={product?.categoryId ?? categories[0]?.id} errors={fe?.categoryId}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            <Select
              label="Stock is counted in"
              name="baseUnit"
              value={unit}
              onChange={(e) => setUnit(e.target.value as Unit)}
              errors={fe?.baseUnit}
              hint="The owner updates stock in this unit"
            >
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {UNIT_LABEL[u]}
                </option>
              ))}
            </Select>
            <Input
              label="Origin"
              name="origin"
              optional
              defaultValue={product?.origin}
              placeholder="e.g. Nashik, Maharashtra"
              errors={fe?.origin}
            />
            <Textarea
              label="Description"
              name="description"
              optional
              defaultValue={product?.description}
              maxLength={2000}
              errors={fe?.description}
              wrapperClassName="sm:col-span-2"
            />
            <div className="flex flex-wrap gap-6 sm:col-span-2">
              <Checkbox name="isActive" defaultChecked={product?.isActive ?? true} label="Visible in store" />
              <Checkbox name="isFeatured" defaultChecked={product?.isFeatured} label="Feature on home page" />
            </div>
          </div>
          <ImageUpload name="imageUrl" defaultUrl={product?.imageUrl ?? null} folder="products" label="Product photo" />
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Sizes & prices"
          description={`Each size uses some of the stock (in ${UNIT_LABEL[unit]}). E.g. “500 g” uses 0.5 kg.`}
        />
        <div className="space-y-3 p-5 sm:p-6">
          {variants.map((v, i) => (
            <div
              key={v.key}
              className="grid grid-cols-2 items-end gap-3 rounded-xl border border-line p-3 sm:grid-cols-[1.2fr_1fr_1fr_1fr_auto]"
            >
              <VField label="Label" value={v.label} onChange={(x) => update(v.key, { label: x })} placeholder="500 g" />
              <VField
                label={`Uses (${UNIT_LABEL[unit]})`}
                value={v.quantityInBase}
                onChange={(x) => update(v.key, { quantityInBase: x })}
                type="number"
              />
              <VField label="Price (₹)" value={v.price} onChange={(x) => update(v.key, { price: x })} type="number" />
              <VField label="MRP (₹)" value={v.mrp} onChange={(x) => update(v.key, { mrp: x })} type="number" optional />
              <div className="col-span-2 flex items-center justify-between gap-2 sm:col-span-1">
                <label className="flex items-center gap-1.5 text-xs font-medium">
                  <input
                    type="checkbox"
                    className="accent-primary"
                    checked={v.isActive}
                    onChange={(e) => update(v.key, { isActive: e.target.checked })}
                  />{" "}
                  On sale
                </label>
                <button
                  type="button"
                  disabled={variants.length === 1}
                  onClick={() => setVariants((vs) => vs.filter((x) => x.key !== v.key))}
                  className="rounded-full p-2 text-muted-strong hover:bg-danger-soft hover:text-danger disabled:opacity-30"
                  aria-label={`Remove size ${i + 1}`}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          ))}
          {fe?.variants && (
            <p className="text-sm font-medium text-danger" role="alert">
              {fe.variants[0]}
            </p>
          )}
          {variants.length < 20 && (
            <Button
              size="sm"
              variant="outline"
              icon={<Plus className="size-4" />}
              onClick={() =>
                setVariants((vs) => [
                  ...vs,
                  { key: crypto.randomUUID(), label: "", quantityInBase: "", price: "", mrp: "", isActive: true },
                ])
              }
            >
              Add size
            </Button>
          )}
        </div>
      </Card>

      <div className="sticky bottom-16 z-20 flex flex-col gap-3 rounded-[var(--radius-card)] border border-line bg-surface/95 p-4 shadow-[var(--shadow-lift)] backdrop-blur sm:flex-row sm:items-center lg:bottom-4">
        <div className="flex-1">
          <FormMessage state={state && !state.ok ? state : null} />
        </div>
        <SubmitButton size="lg" pendingText="Saving…">
          {product ? "Save changes" : "Create product"}
        </SubmitButton>
      </div>
    </form>
  );
}

function VField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  optional,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  optional?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs font-semibold">
      <span>
        {label}
        {optional && <span className="font-normal text-muted"> (optional)</span>}
      </span>
      <input
        type={type}
        inputMode={type === "number" ? "decimal" : undefined}
        min={type === "number" ? 0 : undefined}
        step="any"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={cn(controlClass, "h-10 text-sm")}
      />
    </label>
  );
}
