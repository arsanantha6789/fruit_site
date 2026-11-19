"use server";

import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { adminOrNull } from "@/modules/auth/session";
import { LIMITS, rateLimit } from "@/modules/auth/rate-limit";

const MAX_BYTES = 3 * 1024 * 1024;

/** Detects the real file type from its first bytes (the browser-supplied type can be faked). */
function sniff(buf: Uint8Array): { ext: string; mime: string } | null {
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { ext: "jpg", mime: "image/jpeg" };
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return { ext: "png", mime: "image/png" };
  if (String.fromCharCode(...buf.slice(0, 4)) === "RIFF" && String.fromCharCode(...buf.slice(8, 12)) === "WEBP") {
    return { ext: "webp", mime: "image/webp" };
  }
  return null;
}

/** Admin only: uploads a product/category/banner photo to Supabase Storage and returns its public URL. */
export async function uploadImageAction(formData: FormData): Promise<ActionResult<{ url: string }>> {
  const admin = await adminOrNull();
  if (!admin) return fail("Only administrators can upload images.");
  if (!(await rateLimit("upload", admin.id, LIMITS.imageUpload.max, LIMITS.imageUpload.window))) {
    return fail("Too many uploads. Please wait a while and try again.");
  }
  const folder = String(formData.get("folder") ?? "products");
  if (!["products", "categories", "banners"].includes(folder)) return fail("Unknown image type.");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return fail("Please choose an image.");
  if (file.size > MAX_BYTES) return fail("Image is too large. Please use a photo under 3 MB.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniff(bytes);
  if (!type) return fail("Please upload a JPG, PNG or WebP photo.");

  const supabase = await createClient();
  const path = `${folder}/${randomUUID()}.${type.ext}`;
  const { error } = await supabase.storage.from("product-images").upload(path, bytes, {
    contentType: type.mime,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) {
    console.error(JSON.stringify({ level: "error", context: "uploadImage", message: error.message }));
    return fail("We couldn't upload that image. Please try again.");
  }
  const { data } = supabase.storage.from("product-images").getPublicUrl(path);
  return ok({ url: data.publicUrl }, "Image uploaded.");
}
