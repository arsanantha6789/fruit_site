/** Only images stored in this project's Supabase Storage are rendered or accepted. */
export function storagePrefix(): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return base ? `${base.replace(/\/$/, "")}/storage/v1/object/public/product-images/` : "";
}

export function isAllowedImageUrl(url: string | null | undefined): url is string {
  const prefix = storagePrefix();
  return Boolean(url && prefix && url.startsWith(prefix) && !url.includes(".."));
}
