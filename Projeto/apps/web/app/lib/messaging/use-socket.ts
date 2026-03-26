import { useEffect, useRef } from "react"
import { io, type Socket } from "socket.io-client"
import { useQueryClient } from "@tanstack/react-query"
import type { Message } from "~shared/contracts"

interface TypingEvent {
  conversationId: string
  userId: string
}

interface PresenceEvent {
  userId: string
}

interface UseSocketOptions {
  conversationId: string | null
  onTypingStart?: (event: TypingEvent) => void
  onTypingStop?: (event: TypingEvent) => void
  onUserOnline?: (event: PresenceEvent) => void
  onUserOffline?: (event: PresenceEvent) => void
}

export function useSocket({
  conversationId,
  onTypingStart,
  onTypingStop,
  onUserOnline,
  onUserOffline,
}: UseSocketOptions) {
  const queryClient = useQueryClient()
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    if (!conversationId) return

    // D-08: withCredentials sends session cookie, no token in URL
    // Derive socket origin only (strip path like /api) so socket.io connects to the
    // default namespace "/" instead of treating "/api" as a namespace.
    const apiUrl = import.meta.env.VITE_API_URL || ""
    let socketOrigin = ""
    if (apiUrl) {
      try {
        socketOrigin = new URL(apiUrl).origin
      } catch {
        // relative URL or empty — same-origin connection
        socketOrigin = ""
      }
    }
    const socket = io(socketOrigin, {
      withCredentials: true,
      transports: ["websocket"],
    })

    socketRef.current = socket

    // D-06: optimistic append to React Query cache — no full refetch
    // Query key matches what mensagens.tsx uses: ["messages", conversationId]
    socket.on("new_message", (message: Message) => {
      queryClient.setQueryData(
        ["messages", conversationId],
        (old: { data: Message[]; meta?: unknown } | undefined) => {
          if (!old) return { data: [message] }
          // Deduplicate: don't append if message already in cache (sender already sees it via HTTP response)
          const exists = old.data.some((m) => String(m.id) === String(message.id))
          if (exists) return old
          return { ...old, data: [...old.data, message] }
        }
      )
    })

    socket.on("typing_start", (event: TypingEvent) => {
      onTypingStart?.(event)
    })

    socket.on("typing_stop", (event: TypingEvent) => {
      onTypingStop?.(event)
    })

    socket.on("user_online", (event: PresenceEvent) => {
      onUserOnline?.(event)
    })

    socket.on("user_offline", (event: PresenceEvent) => {
      onUserOffline?.(event)
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [conversationId, queryClient, onTypingStart, onTypingStop, onUserOnline, onUserOffline])

  // Emit typing events from the component
  const emitTypingStart = () => {
    if (conversationId && socketRef.current?.connected) {
      socketRef.current.emit("typing_start", { conversationId })
    }
  }

  const emitTypingStop = () => {
    if (conversationId && socketRef.current?.connected) {
      socketRef.current.emit("typing_stop", { conversationId })
    }
  }

  return { emitTypingStart, emitTypingStop }
}
