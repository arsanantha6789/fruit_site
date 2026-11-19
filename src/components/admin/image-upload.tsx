"use client";

import { useRef, useState, useTransition } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { uploadImageAction } from "@/modules/catalog/images";
import { ProductImage } from "@/components/shared/product-image";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

/** Upload a photo to Supabase Storage; stores the resulting URL in a hidden form field. */
export function ImageUpload({
  name,
  defaultUrl,
  folder,
  label,
  aspect = "aspect-square",
}: {
  name: string;
  defaultUrl: string | null;
  folder: "products" | "categories" | "banners";
  label: string;
  aspect?: string;
}) {
  const [url, setUrl] = useState(defaultUrl ?? "");
  const [pending, start] = useTransition();
  const input = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const onFile = (file: File | undefined) => {
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) return toast("Image is too large. Please use a photo under 3 MB.", "error");
    const fd = new FormData();
    fd.set("file", file);
    fd.set("folder", folder);
    start(async () => {
      const r = await uploadImageAction(fd);
      if (r.ok) {
        setUrl(r.data.url);
        toast("Photo uploaded. Save to apply it.");
      } else toast(r.error, "error");
      if (input.current) input.current.value = "";
    });
  };
  return (
    <div>
      <p className="text-sm font-semibold">{label}</p>
      <input type="hidden" name={name} value={url} />
      <div
        className={cn(
          "relative mt-1.5 w-full max-w-xs overflow-hidden rounded-xl border border-line bg-beige",
          aspect,
          pending && "opacity-60",
        )}
      >
        <ProductImage src={url || null} alt={label} sizes="320px" />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          id={`${name}-file`}
          onChange={(e) => onFile(e.target.files?.[0])}
        />
        <Button
          size="sm"
          variant="outline"
          loading={pending}
          icon={<ImagePlus className="size-4" />}
          onClick={() => input.current?.click()}
        >
          {url ? "Replace photo" : "Upload photo"}
        </Button>
        {url && (
          <Button size="sm" variant="ghost" icon={<Trash2 className="size-4" />} onClick={() => setUrl("")}>
            Remove
          </Button>
        )}
      </div>
      <p className="mt-1.5 text-xs text-muted-strong">JPG, PNG or WebP, up to 3 MB. Natural light on a plain background works best.</p>
    </div>
  );
}
