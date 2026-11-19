import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { BusinessSettings } from "./types";

export const getBusinessSettings = cache(async (): Promise<BusinessSettings> => {
  const supabase = await createClient();
  const { data: s, error } = await supabase.from("business_settings").select("*").eq("id", 1).single();
  if (error) throw new Error(`getBusinessSettings: ${error.message}`);
  return {
    businessName: s.business_name,
    tagline: s.tagline,
    addressLine: s.address_line,
    city: s.city,
    state: s.state,
    pincode: s.pincode,
    phone: s.phone,
    email: s.email,
    gstin: s.gstin,
    deliveryFeePaise: s.delivery_fee_paise,
    freeDeliveryMinPaise: s.free_delivery_min_paise,
    minOrderPaise: s.min_order_paise,
    serviceablePincodes: s.serviceable_pincodes ?? [],
    acceptingOrders: s.accepting_orders,
    codEnabled: s.cod_enabled,
    upiOnDeliveryEnabled: s.upi_on_delivery_enabled,
    ownerCanEditPrices: s.owner_can_edit_prices,
    defaultLowStockThreshold: Number(s.default_low_stock_threshold),
    packingSlipNote: s.packing_slip_note,
    heroImageUrl: s.hero_image_url,
    promoImageUrl: s.promo_image_url,
  };
});
