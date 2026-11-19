export interface BusinessSettings {
  businessName: string;
  tagline: string;
  addressLine: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
  gstin: string;
  deliveryFeePaise: number;
  freeDeliveryMinPaise: number;
  minOrderPaise: number;
  serviceablePincodes: string[];
  acceptingOrders: boolean;
  codEnabled: boolean;
  upiOnDeliveryEnabled: boolean;
  ownerCanEditPrices: boolean;
  defaultLowStockThreshold: number;
  packingSlipNote: string;
  heroImageUrl: string | null;
  promoImageUrl: string | null;
}

/** Delivery fee rule shared by the cart preview (the database recomputes it at checkout). */
export function deliveryFeeFor(subtotalPaise: number, s: Pick<BusinessSettings, "deliveryFeePaise" | "freeDeliveryMinPaise">) {
  return subtotalPaise === 0 || subtotalPaise >= s.freeDeliveryMinPaise ? 0 : s.deliveryFeePaise;
}
