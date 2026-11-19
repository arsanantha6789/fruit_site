import { z } from "zod";
import { emailField, indianPhone } from "@/modules/auth/schema";

export const AddressFields = {
  line1: z.string().trim().min(3, "Enter your house/flat and street").max(200),
  line2: z.string().trim().max(200).default(""),
  landmark: z.string().trim().max(120).default(""),
  city: z.string().trim().min(2, "Enter your city").max(80),
  state: z.string().trim().min(2, "Enter your state").max(80),
  pincode: z
    .string()
    .trim()
    .regex(/^[1-9]\d{5}$/, "Enter a valid 6-digit pincode"),
};

export const CheckoutInput = z
  .object({
    name: z.string().trim().min(2, "Enter the recipient's name").max(120),
    phone: indianPhone,
    email: z.union([z.literal(""), emailField]).default(""),
    ...AddressFields,
    instructions: z.string().trim().max(500, "Keep instructions under 500 characters").default(""),
    paymentMethod: z.enum(["cod", "upi_on_delivery"], { message: "Choose a payment method" }),
    saveAddress: z.enum(["on"]).optional(),
    idempotencyKey: z.string().uuid(),
    items: z.string().max(10000),
  })
  .strict();

export const CHECKOUT_FIELDS = [
  "name",
  "phone",
  "email",
  "line1",
  "line2",
  "landmark",
  "city",
  "state",
  "pincode",
  "instructions",
  "paymentMethod",
  "saveAddress",
  "idempotencyKey",
  "items",
] as const;
