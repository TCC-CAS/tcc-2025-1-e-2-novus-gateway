import { useState } from "react"
import type { GalleryMedia } from "~shared/contracts"
import { GalleryItem } from "./gallery-item"
import { GalleryLightbox } from "./gallery-lightbox"

interface GalleryGridProps {
  items: GalleryMedia[]
  isOwner?: boolean
  onDelete?: (id: string) => void
  onToggleHighlight?: (id: string, isHighlight: boolean) => void
}

export function GalleryGrid({ items, isOwner, onDelete, onToggleHighlight }: GalleryGridProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  if (items.length === 0) {
    return (
      <div className="border-4 border-dashed border-foreground bg-muted/10 py-16 text-center">
        <p className="font-display text-2xl tracking-widest text-muted-foreground uppercase">
          NENHUMA MÍDIA PUBLICADA
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((item, i) => (
          <GalleryItem
            key={item.id}
            item={item}
            isOwner={isOwner}
            onClick={() => setLightboxIndex(i)}
            onDelete={onDelete}
            onToggleHighlight={onToggleHighlight}
          />
        ))}
      </div>

      {lightboxIndex !== null && (
        <GalleryLightbox
          items={items}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  )
}
