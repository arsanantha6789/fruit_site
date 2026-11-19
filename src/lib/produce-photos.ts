/**
 * Bundled stock photographs (served from /public/images) shown whenever a
 * product, category or banner has no photo uploaded in Supabase Storage yet.
 * An uploaded photo always takes priority. Photos: Unsplash (Unsplash License).
 */

const PRODUCT_PHOTOS: Record<string, string> = {
  "robusta-bananas": "robusta-bananas",
  "shimla-apples": "shimla-apples",
  pomegranate: "pomegranate",
  papaya: "papaya",
  guava: "guava",
  "nagpur-oranges": "nagpur-oranges",
  tomatoes: "tomatoes",
  onions: "onions",
  potatoes: "potatoes",
  carrots: "carrots",
  "lady-finger": "lady-finger",
  "green-capsicum": "green-capsicum",
  spinach: "spinach",
  coriander: "coriander",
  mint: "mint",
  "hass-avocado": "hass-avocado",
  broccoli: "broccoli",
};

/** Product names as stored on past orders (snapshots keep the name, not the slug). */
const PRODUCT_NAMES: Record<string, string> = {
  "robusta bananas": "robusta-bananas",
  "shimla apples": "shimla-apples",
  "nagpur oranges": "nagpur-oranges",
  "lady finger (bhindi)": "lady-finger",
  "green capsicum": "green-capsicum",
  "spinach (palak)": "spinach",
  "mint (pudina)": "mint",
  "hass avocado": "hass-avocado",
};

const CATEGORY_PHOTOS = new Set(["fruits", "vegetables", "leafy-greens-herbs", "exotics"]);

export const HERO_PHOTO = "/images/banners/hero.webp";
export const PROMO_PHOTO = "/images/banners/promo.webp";

/** Accepts a product slug or product name; returns its bundled photo, if any. */
export function productPhoto(slugOrName: string | null | undefined): string | null {
  const key = (slugOrName ?? "").trim().toLowerCase();
  const file = PRODUCT_PHOTOS[key] ?? PRODUCT_NAMES[key];
  return file ? `/images/products/${file}.webp` : null;
}

export function categoryPhoto(slug: string | null | undefined): string | null {
  return slug && CATEGORY_PHOTOS.has(slug) ? `/images/categories/${slug}.webp` : null;
}
