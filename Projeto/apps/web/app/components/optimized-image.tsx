"use client";

import { useState } from "react";
import { Skeleton } from "~/components/ui/skeleton";
import { cn } from "~/lib/utils";

interface OptimizedImageProps {
  /** Primary image URL (medium size) */
  src?: string | null;
  /** Thumbnail URL for lists/cards */
  thumbnailSrc?: string | null;
  /** Original resolution URL */
  originalSrc?: string | null;
  /** Alt text */
  alt: string;
  /** Display size variant */
  size?: "sm" | "md" | "lg" | "xl";
  /** Fallback element when no image is available */
  fallback?: React.ReactNode;
  /** Extra class names for the container */
  className?: string;
  /** Use rounded-full for avatars */
  rounded?: boolean;
  /** Object-fit strategy */
  fit?: "cover" | "contain";
  /** Called when the image fails to load */
  onError?: () => void;
}

const sizeClasses = {
  sm: "size-10",
  md: "size-20",
  lg: "size-32",
  xl: "size-48",
};

export function OptimizedImage({
  src,
  thumbnailSrc,
  originalSrc,
  alt,
  size = "md",
  fallback,
  className,
  rounded = false,
  fit = "cover",
  onError,
}: OptimizedImageProps) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">(
    src ? "loading" : "error"
  );

  // Build srcSet for responsive images
  const srcSet = [thumbnailSrc, src, originalSrc]
    .filter(Boolean)
    .map((url, i) => {
      const widths = [150, 500, 2000];
      return `${url} ${widths[i]}w`;
    })
    .join(", ");

  if (!src || status === "error") {
    if (fallback) {
      return (
        <div
          className={cn(
            "flex items-center justify-center overflow-hidden border-2 border-foreground bg-muted/30",
            sizeClasses[size],
            rounded && "rounded-full",
            className
          )}
        >
          {fallback}
        </div>
      );
    }

    return (
      <div
        className={cn(
          "flex items-center justify-center overflow-hidden border-2 border-foreground bg-muted/30",
          sizeClasses[size],
          rounded && "rounded-full",
          className
        )}
      >
        <span className="font-display text-muted-foreground text-[9px] tracking-widest uppercase text-center px-1">
          SEM IMAGEM
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden",
        sizeClasses[size],
        rounded && "rounded-full",
        className
      )}
    >
      {status === "loading" && (
        <Skeleton
          className={cn(
            "absolute inset-0 rounded-none bg-muted",
            rounded && "rounded-full"
          )}
        />
      )}

      <img
        src={src}
        srcSet={srcSet}
        sizes={
          size === "sm"
            ? "150px"
            : size === "md"
              ? "500px"
              : size === "lg"
                ? "500px"
                : "2000px"
        }
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setStatus("loaded")}
        onError={() => {
          setStatus("error")
          onError?.()
        }}
        className={cn(
          "block h-full w-full transition-opacity duration-300",
          rounded && "rounded-full",
          fit === "cover" ? "object-cover" : "object-contain",
          status === "loaded" ? "opacity-100" : "opacity-0"
        )}
      />
    </div>
  )
}
