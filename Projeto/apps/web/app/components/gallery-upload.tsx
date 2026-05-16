import { useState, useCallback, useRef } from "react"
import { toast } from "sonner"
import { Upload } from "lucide-react"
import { galleryApi } from "~/lib/api-client"
import { cn } from "~/lib/utils"

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm"]
const MAX_SIZE_MB = 50

interface GalleryUploadProps {
  onUploadComplete?: () => void
}

export function GalleryUpload({ onUploadComplete }: GalleryUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const uploadFile = useCallback(async (file: File) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error("Tipo de arquivo não suportado")
      return
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`Arquivo muito grande (máx ${MAX_SIZE_MB}MB)`)
      return
    }

    setIsUploading(true)
    setProgress(0)

    try {
      const mediaType = file.type.startsWith("video/") ? "video" as const : "image" as const

      // Step 1: Get presigned URL
      const { uploadUrl, assetId } = await galleryApi.presign({
        fileName: file.name,
        mediaType,
        contentType: file.type,
        sizeBytes: file.size,
      })

      setProgress(30)

      // Step 2: Upload directly to S3
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      })

      if (!uploadRes.ok) throw new Error("Upload to storage failed")

      setProgress(70)

      // Step 3: Confirm upload
      await galleryApi.confirm({ assetId, mediaType, contentType: file.type })

      setProgress(100)
      toast.success("Upload concluído!")
      onUploadComplete?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro no upload")
    } finally {
      setIsUploading(false)
      setProgress(0)
    }
  }, [onUploadComplete])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
    files.forEach(uploadFile)
  }, [uploadFile])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    files.forEach(uploadFile)
    if (inputRef.current) inputRef.current.value = ""
  }, [uploadFile])

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={cn(
        "border-4 border-dashed p-8 text-center transition-colors cursor-pointer",
        isDragging
          ? "border-primary bg-primary/10"
          : "border-foreground bg-muted/50 hover:border-primary"
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        multiple
        onChange={handleChange}
        className="hidden"
        id="gallery-upload-input"
      />
      <label htmlFor="gallery-upload-input" className="cursor-pointer block">
        {isUploading ? (
          <div className="space-y-4">
            <p className="font-display text-2xl tracking-widest text-primary uppercase">
              ENVIANDO... {progress}%
            </p>
            <div className="h-4 border-2 border-foreground bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Upload className="mx-auto size-12 text-muted-foreground" />
            <p className="font-display text-2xl tracking-widest text-foreground uppercase">
              ARRASTE FOTOS E VÍDEOS
            </p>
            <p className="font-bold tracking-widest text-xs text-muted-foreground uppercase">
              OU CLIQUE PARA SELECIONAR
            </p>
          </div>
        )}
      </label>
    </div>
  )
}
