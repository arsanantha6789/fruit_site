import { z } from "zod";
import { isAllowedImageUrl } from "@/lib/images";
import { UNITS } from "./units";

const slug = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers and dashes only")
  .max(80);
const httpsUrl = z.union([z.literal(""), z.string().trim().max(500).refine(isAllowedImageUrl, "Please upload the photo here instead of pasting a link")]);
const rupees = z.coerce.number().finite().positive("Enter a price above ₹0").max(100000, "That price looks too high");

export const VariantInput = z
  .object({
    id: z.string().uuid().optional(),
    label: z.string().trim().min(1, "Add a label like 500 g").max(40),
    quantityInBase: z.coerce.number().finite().positive("Must be more than 0").max(1000),
    price: rupees,
    mrp: z.union([z.literal(""), z.null(), rupees]).optional(),
    isActive: z.boolean().default(true),
  })
  .strict()
  .refine((v) => !v.mrp || Number(v.mrp) >= v.price, { message: "MRP can't be lower than the price", path: ["mrp"] });

export const ProductInput = z
  .object({
    name: z.string().trim().min(2, "Enter a product name").max(120),
    slug,
    categoryId: z.string().uuid("Choose a category"),
    description: z.string().trim().max(2000).default(""),
    origin: z.string().trim().max(80).default(""),
    baseUnit: z.enum(UNITS),
    imageUrl: httpsUrl.default(""),
    isActive: z.enum(["on"]).optional(),
    isFeatured: z.enum(["on"]).optional(),
    variants: z.string().max(20000),
  })
  .strict();

export const PRODUCT_FIELDS = [
  "name",
  "slug",
  "categoryId",
  "description",
  "origin",
  "baseUnit",
  "imageUrl",
  "isActive",
  "isFeatured",
  "variants",
] as const;

export const CategoryInput = z
  .object({
    name: z.string().trim().min(2, "Enter a category name").max(80),
    slug,
    description: z.string().trim().max(500).default(""),
    imageUrl: httpsUrl.default(""),
    sortOrder: z.coerce.number().int().min(0).max(1000).default(0),
    isActive: z.enum(["on"]).optional(),
  })
  .strict();

export const CATEGORY_FIELDS = ["name", "slug", "description", "imageUrl", "sortOrder", "isActive"] as const;
