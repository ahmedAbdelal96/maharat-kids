"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export interface ProductImageProps {
  src?: string;
  alt: string;
  aspectRatio?: "square" | "portrait" | "video";
  priority?: boolean;
  className?: string;
  fill?: boolean;
  fit?: "contain" | "cover";
}

const DEFAULT_PLACEHOLDER = "/placeholders/product-placeholder.svg";

export function ProductImage({
  src,
  alt,
  aspectRatio = "square",
  priority = false,
  className,
  fit = "cover",
}: ProductImageProps) {
  const [imgSrc, setImgSrc] = useState<string>(src || DEFAULT_PLACEHOLDER);
  const [isLoading, setIsLoading] = useState(true);

  const aspectClasses = {
    square: "aspect-square",
    portrait: "aspect-[3/4]",
    video: "aspect-video",
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[var(--radius-md)] bg-[var(--surface-muted)] flex items-center justify-center select-none",
        aspectClasses[aspectRatio],
        className,
      )}
    >
      <Image
        src={imgSrc}
        alt={alt}
        fill
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        priority={priority}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setImgSrc(DEFAULT_PLACEHOLDER);
          setIsLoading(false);
        }}
        className={cn(
          `${fit === "contain" ? "object-contain p-3" : "object-cover"} transition-all duration-500 ease-out group-hover:scale-105`,
          isLoading ? "scale-105 blur-xs opacity-60" : "scale-100 blur-0 opacity-100",
        )}
      />
    </div>
  );
}
