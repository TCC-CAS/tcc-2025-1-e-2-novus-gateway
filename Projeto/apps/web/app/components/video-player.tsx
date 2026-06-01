export function VideoPlayer({ src, className = "" }: { src: string; className?: string }) {
  return (
    <video
      src={src}
      controls
      playsInline
      className={`w-full object-cover ${className}`}
    />
  )
}
