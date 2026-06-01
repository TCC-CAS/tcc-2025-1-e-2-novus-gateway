import { useState, useEffect, useCallback } from "react"
import type { GalleryMedia } from "~shared/contracts"
import { X, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "~/lib/utils"

interface GalleryLightboxProps {
  items: GalleryMedia[]
  initialIndex: number
  onClose: () => void
}

export function GalleryLightbox({ items, initialIndex, onClose }: GalleryLightboxProps) {
  const [index, setIndex] = useState(initialIndex)

  const goNext = useCallback(() => {
    setIndex((i) => (i + 1) % items.length)
  }, [items.length])

  const goPrev = useCallback(() => {
    setIndex((i) => (i - 1 + items.length) % items.length)
  }, [items.length])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
      if (e.key === "ArrowRight") goNext()
      if (e.key === "ArrowLeft") goPrev()
    }
    document.addEventListener("keydown", handleKey)
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", handleKey)
      document.body.style.overflow = ""
    }
  }, [onClose, goNext, goPrev])

  const item = items[index]
  if (!item) return null

  const isVideo = item.mediaType === "video"

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 flex size-12 items-center justify-center border-2 border-foreground bg-background transition-colors hover:bg-primary hover:text-primary-foreground"
      >
        <X className="size-6" />
      </button>

      {/* Counter */}
      <div className="absolute top-4 left-4 z-10 border-2 border-foreground bg-foreground px-4 py-2">
        <span className="font-display text-lg tracking-widest text-background uppercase">
          {index + 1} / {items.length}
        </span>
      </div>

      {/* Prev */}
      {items.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); goPrev() }}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 flex size-14 items-center justify-center border-2 border-foreground bg-background transition-transform hover:-translate-x-1 hover:bg-primary hover:text-primary-foreground max-sm:left-2 max-sm:size-10"
        >
          <ChevronLeft className="size-8" />
        </button>
      )}

      {/* Next */}
      {items.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); goNext() }}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 flex size-14 items-center justify-center border-2 border-foreground bg-background transition-transform hover:translate-x-1 hover:bg-primary hover:text-primary-foreground max-sm:right-2 max-sm:size-10"
        >
          <ChevronRight className="size-8" />
        </button>
      )}

      {/* Media */}
      <div
        className="relative flex max-h-[85vh] max-w-[90vw] flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        {isVideo ? (
          <video
            src={item.originalUrl}
            controls
            className="max-h-[75vh] max-w-full border-4 border-foreground object-contain"
          />
        ) : (
          <img
            src={item.originalUrl}
            alt={item.caption || ""}
            className="max-h-[75vh] max-w-full border-4 border-foreground object-contain"
          />
        )}

        {item.caption && (
          <div className="mt-3 border-2 border-foreground bg-muted/50 px-4 py-2">
            <p className="font-bold tracking-widest text-sm text-foreground uppercase text-center">
              {item.caption}
            </p>
          </div>
        )}
      </div>

      {/* Thumbnails strip */}
      {items.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 overflow-x-auto max-w-[90vw] px-4 py-2 border-2 border-foreground bg-background/80">
          {items.map((thumb, i) => (
            <button
              key={thumb.id}
              onClick={(e) => { e.stopPropagation(); setIndex(i) }}
              className={cn(
                "shrink-0 size-14 border-2 transition-all overflow-hidden",
                i === index
                  ? "border-primary -translate-y-1 shadow-[2px_2px_0px_0px_var(--color-primary)]"
                  : "border-foreground/40 opacity-60 hover:opacity-100"
              )}
            >
              {thumb.mediaType === "video" ? (
                <div className="size-full bg-muted flex items-center justify-center">
                  <span className="text-[8px] font-bold tracking-widest text-foreground uppercase">VID</span>
                </div>
              ) : (
                <img
                  src={thumb.thumbnailUrl || thumb.originalUrl}
                  alt=""
                  className="size-full object-cover"
                />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
