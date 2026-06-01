"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, X, Loader2, ImageIcon } from "lucide-react";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

type UploadState =
  | { stage: "idle" }
  | { stage: "preview"; objectUrl: string }
  | { stage: "uploading"; progress: number }
  | { stage: "error"; message: string }
  | { stage: "done"; thumbnailUrl: string; mediumUrl: string };

interface ImageUploadProps {
  /** Current image URL (if any) — shown before new upload */
  currentUrl?: string | null;
  /** Called when upload completes successfully */
  onUpload: (file: File) => Promise<{ thumbnailUrl: string; mediumUrl: string; originalUrl: string }>;
  /** Called when the user wants to remove the current image */
  onRemove?: () => Promise<void>;
  /** Accepted MIME types */
  accept?: string;
  /** Maximum file size in MB (client-side pre-check) */
  maxSizeMB?: number;
  /** Label for the upload zone */
  label?: string;
  /** Show remove button when there's a current image */
  showRemove?: boolean;
  className?: string;
}

export function ImageUpload({
  currentUrl,
  onUpload,
  onRemove,
  accept = "image/jpeg,image/png,image/webp,image/avif",
  maxSizeMB = 10,
  label = "Arraste uma imagem ou clique para fazer upload",
  showRemove = true,
  className,
}: ImageUploadProps) {
  const [state, setState] = useState<UploadState>({ stage: "idle" });
  const [isRemoving, setIsRemoving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const retryCount = useRef(0);
  const maxRetries = 3;

  const displayUrl =
    state.stage === "done"
      ? state.mediumUrl
      : state.stage === "preview"
        ? state.objectUrl
        : currentUrl;

  const validateFile = useCallback(
    (file: File): string | null => {
      if (!accept.split(",").some((t) => file.type === t.trim())) {
        return "Formato de arquivo não permitido.";
      }
      if (file.size > maxSizeMB * 1024 * 1024) {
        return `Arquivo maior que ${maxSizeMB}MB.`;
      }
      return null;
    },
    [accept, maxSizeMB]
  );

  const handleFile = useCallback(
    async (file: File) => {
      const error = validateFile(file);
      if (error) {
        setState({ stage: "error", message: error });
        return;
      }

      // Show preview immediately
      const objectUrl = URL.createObjectURL(file);
      setState({ stage: "preview", objectUrl });

      try {
        setState({ stage: "uploading", progress: 0 });

        const result = await onUpload(file);

        // Cleanup preview URL
        URL.revokeObjectURL(objectUrl);
        retryCount.current = 0;
        setState({
          stage: "done",
          thumbnailUrl: result.thumbnailUrl,
          mediumUrl: result.mediumUrl,
        });
      } catch (err) {
        URL.revokeObjectURL(objectUrl);
        const message =
          err instanceof Error ? err.message : "Erro ao fazer upload. Tente novamente.";
        setState({ stage: "error", message });
      }
    },
    [onUpload, validateFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      // Reset so the same file can be re-selected
      if (inputRef.current) inputRef.current.value = "";
    },
    [handleFile]
  );

  const handleRetry = useCallback(() => {
    if (retryCount.current >= maxRetries) return;
    retryCount.current++;
    setState({ stage: "idle" });
    inputRef.current?.click();
  }, []);

  const handleRemove = useCallback(async () => {
    if (!onRemove) return;
    setIsRemoving(true);
    try {
      await onRemove();
      setState({ stage: "idle" });
    } catch {
      // Keep current visual state on remove failure
    } finally {
      setIsRemoving(false);
    }
  }, [onRemove]);

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="hidden"
        aria-label="Upload de imagem"
      />

      {/* Upload zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        className={cn(
          "relative flex size-32 cursor-pointer items-center justify-center overflow-hidden border-4 border-foreground bg-muted/30 transition-all hover:border-primary hover:bg-primary/10",
          state.stage === "uploading" && "pointer-events-none opacity-70",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        )}
      >
        {displayUrl ? (
          <img
            src={displayUrl}
            alt="Preview"
            className="size-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-1 p-2 text-center">
            <Upload className="size-6 text-muted-foreground" />
            <span className="font-display text-[9px] tracking-widest text-muted-foreground uppercase leading-tight">
              {label}
            </span>
          </div>
        )}

        {/* Upload progress overlay */}
        {state.stage === "uploading" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 gap-2">
            <Loader2 className="size-8 animate-spin text-primary" />
            <span className="font-display text-xs tracking-widest text-primary uppercase">
              ENVIANDO...
            </span>
          </div>
        )}
      </div>

      {/* Error state */}
      {state.stage === "error" && (
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm text-red-500 font-medium">{state.message}</p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRetry}
              disabled={retryCount.current >= maxRetries}
              className="rounded-none border-2 font-display tracking-widest uppercase text-xs"
            >
              Tentar novamente
            </Button>
          </div>
        </div>
      )}

      {/* Remove button */}
      {showRemove && displayUrl && onRemove && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleRemove}
          disabled={isRemoving}
          className="rounded-none border-2 border-destructive font-display tracking-widest uppercase text-xs text-destructive hover:bg-destructive hover:text-destructive-foreground"
        >
          {isRemoving ? (
            <Loader2 className="size-3 animate-spin mr-1" />
          ) : (
            <X className="size-3 mr-1" />
          )}
          Remover
        </Button>
      )}
    </div>
  );
}
