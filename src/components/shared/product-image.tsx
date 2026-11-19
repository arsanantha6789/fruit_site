"use client";

import Image from "next/image";
import { useState } from "react";
import { Leaf } from "lucide-react";
import { cn } from "@/lib/utils";
import { isAllowedImageUrl } from "@/lib/images";

/**
 * Product photograph with a quiet branded placeholder when no photo has
 * been uploaded yet (or the image fails to load). Never an emoji.
 */
export function ProductImage({
  src,
  alt,
  sizes,
  className,
  priority,
  showLabel = true,
  fallbackSrc,
}: {
  src: string | null;
  alt: string;
  sizes: string;
  className?: string;
  priority?: boolean;
  showLabel?: boolean;
  /** Bundled local photo (see lib/produce-photos) used when no uploaded photo is available. */
  fallbackSrc?: string | null;
}) {
  const [failed, setFailed] = useState(false);
  const [fallbackFailed, setFallbackFailed] = useState(false);
  const useUploaded = isAllowedImageUrl(src) && !failed;
  const shown = useUploaded ? src : !fallbackFailed ? fallbackSrc : null;
  if (!shown) {
    return (
      <div
        className={cn("flex h-full w-full flex-col items-center justify-center gap-2 bg-beige text-forest/70", className)}
        role="img"
        aria-label={alt}
      >
        <Leaf className={showLabel ? "size-8" : "size-5"} strokeWidth={1.4} aria-hidden="true" />
        {showLabel && <span className="max-w-[80%] truncate text-xs font-semibold tracking-wide uppercase">{alt}</span>}
      </div>
    );
  }
  return (
    <Image
      key={shown}
      src={shown}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className={cn("object-cover", className)}
      onError={() => (useUploaded ? setFailed(true) : setFallbackFailed(true))}
    />
  );
}
