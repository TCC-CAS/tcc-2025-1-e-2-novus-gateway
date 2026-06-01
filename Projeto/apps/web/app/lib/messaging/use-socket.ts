import { useEffect, useRef, useState, useCallback } from "react"
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
  /** The current user's id — used to filter out self-typing events */
  currentUserId?: string
}

export function useSocket({
  conversationId,
  currentUserId,
}: UseSocketOptions) {
  const queryClient = useQueryClient()
  const socketRef = useRef<Socket | null>(null)

  // Track whether the other participant in this conversation is typing
  const [isTyping, setIsTyping] = useState(false)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Track online user ids across all conversations the socket hears about
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())

  // Clear typing state when switching conversations
  useEffect(() => {
    setIsTyping(false)
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = null
    }
  }, [conversationId])

  useEffect(() => {
    if (!conversationId) return

    // D-08: withCredentials sends session cookie, no token in URL
    // When VITE_API_URL is relative (e.g. "/api") or unset, the Vite dev proxy
    // forwards /socket.io to the API server. Socket.IO connects to same origin.
    // When VITE_API_URL is absolute (e.g. "http://api:3000"), we extract its origin.
    const apiUrl = import.meta.env.VITE_API_URL || ""
    let socketOrigin = ""
    if (apiUrl && apiUrl.startsWith("http")) {
      try {
        socketOrigin = new URL(apiUrl).origin
      } catch {
        socketOrigin = ""
      }
    }
    // If socketOrigin is empty, Socket.IO will connect to window.location.origin
    // which is the Vite dev server — and Vite proxies /socket.io to the API.
    const socket = io(socketOrigin, {
      withCredentials: true,
      transports: ["websocket", "polling"],
      path: "/socket.io",
    })

    socketRef.current = socket

    // D-06: optimistic append to React Query cache — no full refetch
    // Only append to thread cache if the message belongs to the currently viewed conversation
    socket.on("new_message", (message: Message) => {
      const msgConvId = String(message.conversationId)
      const activeConvId = String(conversationId)

      if (msgConvId === activeConvId) {
        queryClient.setQueryData(
          ["messages", conversationId],
          (old: { data: Message[]; meta?: unknown } | undefined) => {
            if (!old) return { data: [message] }
            const exists = old.data.some((m) => String(m.id) === String(message.id))
            if (exists) return old
            return { ...old, data: [...old.data, message] }
          }
        )
      } else {
        // Message from another conversation — just refresh the conversation list
        queryClient.invalidateQueries({ queryKey: ["conversations"] })
      }

      if (String(message.senderId) !== String(currentUserId)) {
        setIsTyping(false)
      }
    })

    socket.on("typing_start", (event: TypingEvent) => {
      // Ignore own typing events
      if (String(event.userId) === String(currentUserId)) return
      // Only care about typing in the current conversation
      if (event.conversationId !== conversationId) return
      setIsTyping(true)
      // Auto-clear after 3 seconds of no new typing_start
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 3000)
    })

    socket.on("typing_stop", (event: TypingEvent) => {
      if (String(event.userId) === String(currentUserId)) return
      if (event.conversationId !== conversationId) return
      setIsTyping(false)
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
        typingTimeoutRef.current = null
      }
    })

    socket.on("user_online", (event: PresenceEvent) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev)
        next.add(String(event.userId))
        return next
      })
    })

    socket.on("user_offline", (event: PresenceEvent) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev)
        next.delete(String(event.userId))
        return next
      })
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
        typingTimeoutRef.current = null
      }
    }
  }, [conversationId, queryClient, currentUserId])

  // Emit typing events from the component
  const emitTypingStart = useCallback(() => {
    if (conversationId && socketRef.current?.connected) {
      socketRef.current.emit("typing_start", { conversationId })
    }
  }, [conversationId])

  const emitTypingStop = useCallback(() => {
    if (conversationId && socketRef.current?.connected) {
      socketRef.current.emit("typing_stop", { conversationId })
    }
  }, [conversationId])

  const isUserOnline = useCallback(
    (userId: string) => onlineUsers.has(String(userId)),
    [onlineUsers]
  )

  return { emitTypingStart, emitTypingStop, isTyping, onlineUsers, isUserOnline }
}
