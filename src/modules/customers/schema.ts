import { z } from "zod";
import { indianPhone } from "@/modules/auth/schema";
import { AddressFields } from "@/modules/checkout/schema";

export const ProfileInput = z.object({ fullName: z.string().trim().min(2, "Enter your name").max(120), phone: indianPhone }).strict();

export const AddressInput = z
  .object({
    label: z.string().trim().min(1).max(40).default("Home"),
    fullName: z.string().trim().min(2, "Enter the recipient's name").max(120),
    phone: indianPhone,
    ...AddressFields,
    isDefault: z.enum(["on"]).optional(),
  })
  .strict();

export const ADDRESS_FIELDS = [
  "label",
  "fullName",
  "phone",
  "line1",
  "line2",
  "landmark",
  "city",
  "state",
  "pincode",
  "isDefault",
] as const;
