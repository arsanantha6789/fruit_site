import type { Unit } from "@/modules/catalog/units";
import type { PaymentMethod, PaymentStatus } from "@/modules/payments/methods";
import type { AppRole } from "@/modules/auth/session";
import type { OrderStatus } from "./status";

export interface ShippingAddress {
  line1: string;
  line2: string;
  landmark: string;
  city: string;
  state: string;
  pincode: string;
  removed?: boolean;
}

export interface OrderItem {
  id: string;
  productId: string | null;
  productName: string;
  variantLabel: string;
  unit: Unit;
  quantityInBase: number;
  quantity: number;
  unitPricePaise: number;
  lineTotalPaise: number;
  imageUrl: string | null;
}

export interface StatusEvent {
  id: string;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  note: string | null;
  changedByRole: AppRole | null;
  changedByName: string | null;
  createdAt: string;
}

export interface OrderSummary {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  customerName: string;
  customerPhone: string;
  totalPaise: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  itemCount: number;
  placedAt: string;
  pincode: string;
}

export interface OrderDetail extends OrderSummary {
  customerId: string | null;
  customerEmail: string | null;
  shippingAddress: ShippingAddress;
  instructions: string;
  subtotalPaise: number;
  deliveryFeePaise: number;
  discountPaise: number;
  cancelReason: string | null;
  paymentReference: string | null;
  paidAt: string | null;
  items: OrderItem[];
  history: StatusEvent[];
}
