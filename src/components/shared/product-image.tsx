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
}: {
  src: string | null;
  alt: string;
  sizes: string;
  className?: string;
  priority?: boolean;
  showLabel?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  if (!isAllowedImageUrl(src) || failed) {
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
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className={cn("object-cover", className)}
      onError={() => setFailed(true)}
    />
  );
}
