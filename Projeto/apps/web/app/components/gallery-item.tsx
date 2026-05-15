import type { GalleryMedia } from "~shared/contracts"
import { VideoPlayer } from "./video-player"
import { Star, Trash2 } from "lucide-react"
import { cn } from "~/lib/utils"

interface GalleryItemProps {
  item: GalleryMedia
  isOwner?: boolean
  onDelete?: (id: string) => void
  onToggleHighlight?: (id: string, isHighlight: boolean) => void
}

export function GalleryItem({ item, isOwner, onDelete, onToggleHighlight }: GalleryItemProps) {
  const isVideo = item.mediaType === "video"

  return (
    <div className={cn(
      "group relative border-4 border-foreground bg-background transition-transform hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_var(--color-primary)]",
      item.isHighlight && "ring-2 ring-primary ring-offset-2"
    )}>
      <div className="aspect-square overflow-hidden">
        {isVideo ? (
          <VideoPlayer src={item.originalUrl} className="h-full w-full" />
        ) : (
          <img
            src={item.thumbnailUrl || item.originalUrl}
            alt={item.caption || ""}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        )}
      </div>

      {item.isHighlight && (
        <div className="absolute top-2 left-2 border-2 border-foreground bg-primary px-2 py-1">
          <Star className="size-3 fill-primary-foreground text-primary-foreground" />
        </div>
      )}

      {item.caption && (
        <div className="border-t-2 border-foreground p-2">
          <p className="font-bold tracking-widest text-xs text-foreground uppercase truncate">
            {item.caption}
          </p>
        </div>
      )}

      {isOwner && (
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onToggleHighlight?.(item.id, !item.isHighlight)}
            className="border-2 border-foreground bg-background p-1.5 hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            <Star className={cn("size-3", item.isHighlight && "fill-current")} />
          </button>
          <button
            onClick={() => onDelete?.(item.id)}
            className="border-2 border-foreground bg-background p-1.5 hover:bg-destructive hover:text-destructive-foreground transition-colors"
          >
            <Trash2 className="size-3" />
          </button>
        </div>
      )}
    </div>
  )
}
