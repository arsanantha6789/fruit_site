"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isAllowedImageUrl } from "@/lib/images";
import { createClient } from "@/lib/supabase/server";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { friendlyDbError } from "@/lib/errors";
import { parseForm } from "@/lib/form";
import { rupeesToPaise } from "@/lib/money";
import { adminOrNull } from "@/modules/auth/session";

const money = z.coerce.number().finite().min(0).max(100000);
const flag = z.enum(["on"]).optional();
const httpsUrl = z.union([z.literal(""), z.string().trim().max(500).refine(isAllowedImageUrl, "Please upload the photo here instead of pasting a link")]);

const SettingsInput = z
  .object({
    businessName: z.string().trim().min(1, "Enter the business name").max(120),
    tagline: z.string().trim().max(200).default(""),
    addressLine: z.string().trim().max(300).default(""),
    city: z.string().trim().max(80).default(""),
    state: z.string().trim().max(80).default(""),
    pincode: z
      .union([
        z.literal(""),
        z
          .string()
          .trim()
          .regex(/^[1-9]\d{5}$/, "Enter a valid pincode"),
      ])
      .default(""),
    phone: z.string().trim().max(20).default(""),
    email: z.union([z.literal(""), z.string().trim().email("Enter a valid email").max(200)]).default(""),
    gstin: z.string().trim().toUpperCase().max(20).default(""),
    deliveryFee: money,
    freeDeliveryMin: money,
    minOrder: money,
    serviceablePincodes: z
      .string()
      .max(5000)
      .default("")
      .transform((s) => [...new Set(s.split(/[\s,]+/).filter(Boolean))])
      .pipe(z.array(z.string().regex(/^[1-9]\d{5}$/, "Each pincode must be 6 digits")).max(500)),
    defaultLowStock: z.coerce.number().finite().min(0).max(100000),
    packingSlipNote: z.string().trim().max(300).default(""),
    heroImageUrl: httpsUrl.default(""),
    promoImageUrl: httpsUrl.default(""),
    acceptingOrders: flag,
    codEnabled: flag,
    upiOnDeliveryEnabled: flag,
    ownerCanEditPrices: flag,
  })
  .strict();

const FIELDS = Object.keys(SettingsInput.shape);

export async function saveSettingsAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const admin = await adminOrNull();
  if (!admin) return fail("Only administrators can change business settings.");
  const parsed = parseForm(SettingsInput, formData, FIELDS);
  if (!parsed.success) return fail("Please check the highlighted fields.", parsed.fieldErrors);
  const s = parsed.data;
  if (s.codEnabled !== "on" && s.upiOnDeliveryEnabled !== "on") {
    return fail("Keep at least one payment method switched on.", { codEnabled: ["Choose at least one"] });
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("business_settings")
    .update({
      business_name: s.businessName,
      tagline: s.tagline,
      address_line: s.addressLine,
      city: s.city,
      state: s.state,
      pincode: s.pincode,
      phone: s.phone,
      email: s.email,
      gstin: s.gstin,
      delivery_fee_paise: rupeesToPaise(s.deliveryFee),
      free_delivery_min_paise: rupeesToPaise(s.freeDeliveryMin),
      min_order_paise: rupeesToPaise(s.minOrder),
      serviceable_pincodes: s.serviceablePincodes,
      default_low_stock_threshold: s.defaultLowStock,
      packing_slip_note: s.packingSlipNote,
      hero_image_url: s.heroImageUrl || null,
      promo_image_url: s.promoImageUrl || null,
      accepting_orders: s.acceptingOrders === "on",
      cod_enabled: s.codEnabled === "on",
      upi_on_delivery_enabled: s.upiOnDeliveryEnabled === "on",
      owner_can_edit_prices: s.ownerCanEditPrices === "on",
      updated_by: admin.id,
    })
    .eq("id", 1);
  if (error) return fail(friendlyDbError(error, "saveSettings"));
  revalidatePath("/", "layout");
  return ok(undefined, "Settings saved.");
}
