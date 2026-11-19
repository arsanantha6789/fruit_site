import type { Unit } from "./units";

export interface VariantView {
  id: string;
  label: string;
  quantityInBase: number;
  pricePaise: number;
  mrpPaise: number | null;
  inStock: boolean;
}

export interface ProductView {
  id: string;
  name: string;
  slug: string;
  description: string;
  origin: string;
  imageUrl: string | null;
  baseUnit: Unit;
  isFeatured: boolean;
  category: { name: string; slug: string } | null;
  variants: VariantView[];
  isAvailable: boolean; // at least one variant can be bought now
  lowStock: boolean;
}

export interface CategoryView {
  id: string;
  name: string;
  slug: string;
  description: string;
  imageUrl: string | null;
}
