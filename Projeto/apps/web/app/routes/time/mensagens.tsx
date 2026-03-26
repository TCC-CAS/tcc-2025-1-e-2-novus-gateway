import { useState, useEffect, useRef } from "react"
import { useSearchParams } from "react-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { messagingApi } from "~/lib/api-client"
import { useSocket } from "~/lib/messaging/use-socket"
import { useAuth } from "~/lib/auth/auth-context"
import { usePlan } from "~/lib/plan"
import { MessageLimitBanner } from "~/lib/plan/plan-gate"
import { isUnlimited } from "~shared/contracts"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { ScrollArea } from "~/components/ui/scroll-area"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "~/lib/utils"
import { ArrowLeft, Send, MessageCircle, User } from "lucide-react"

export function meta() {
  return [{ title: "Mensagens - VárzeaPro" }]
}

export default function TimeMensagens() {
  const { user } = useAuth()
  const { getRemainingConversations, limits } = usePlan()
  const remaining = getRemainingConversations()
  const showLimitBanner = !isUnlimited(limits.conversations)
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const [selectedId, setSelectedId] = useState<string | null>(
    searchParams.get("conversationId")
  )
  const [message, setMessage] = useState("")

  // If a conversationId arrives via query param after mount, select it
  useEffect(() => {
    const id = searchParams.get("conversationId")
    if (id) setSelectedId(id)
  }, [searchParams])

  const { data: conversations } = useQuery({
    queryKey: ["conversations"],
    queryFn: () => messagingApi.listConversations(),
  })

  const { data: thread, isLoading: loadingThread } = useQuery({
    queryKey: ["messages", selectedId],
    queryFn: () => messagingApi.getMessages(selectedId!),
    enabled: !!selectedId,
  })

  const sendMutation = useMutation({
    mutationFn: (content: string) =>
      messagingApi.sendMessage(selectedId!, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", selectedId] })
      queryClient.invalidateQueries({ queryKey: ["conversations"] })
      setMessage("")
    },
  })

  const { emitTypingStart, emitTypingStop } = useSocket({
    conversationId: selectedId ?? null,
  })

  const messagesEndRef = useRef<HTMLDivElement>(null)

  const list = conversations?.data ?? []
  const current = list.find((c) => c.id === selectedId)

  // Auto-scroll to latest message whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [thread?.data])

  return (
    <div className="flex h-[calc(100dvh-3rem)] flex-col md:h-[calc(100dvh-5rem)] md:flex-row border-4 border-foreground bg-background shadow-[8px_8px_0px_0px_var(--color-primary)] dark:shadow-[8px_8px_0px_0px_var(--color-primary)] m-4 md:m-8 overflow-hidden">
      {/* Conversation list */}
      <aside
        className={cn(
          "flex flex-col border-foreground md:w-80 lg:w-96 md:border-r-4 relative z-10 bg-background",
          selectedId ? "hidden md:flex" : "flex h-full",
        )}
      >
        <div className="border-b-4 border-foreground px-6 py-5 bg-primary relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-background/20 rotate-12 blur-sm" />
          <div className="relative z-10">
            <h2 className="font-display text-4xl tracking-wide text-primary-foreground uppercase">
              PROPOSTAS
            </h2>
            <p className="font-bold tracking-widest text-[10px] text-primary-foreground/80 uppercase mb-1">
              MENSAGENS DIRETAS DO TIME
            </p>
          </div>
        </div>
        {showLimitBanner ? (
          <MessageLimitBanner remaining={remaining} total={limits.conversations} />
        ) : null}
        <ScrollArea className="flex-1 bg-muted/10">
          {list.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full px-6 py-20 text-center">
              <MessageCircle className="size-16 text-muted-foreground/30 mb-4" />
              <p className="font-display text-2xl tracking-widest text-muted-foreground uppercase opacity-50">
                MERCADO FRIO
              </p>
              <p className="font-bold tracking-widest text-[11px] text-muted-foreground uppercase opacity-40 mt-2">
                VISITE UM PERFIL DE JOGADOR PARA ENVIAR UMA PROPOSTA
              </p>
            </div>
          ) : (
            <div className="divide-y-2 divide-foreground/10">
              {list.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={cn(
                    "flex w-full items-start gap-4 px-6 py-5 text-left transition-colors border-l-8 group",
                    selectedId === c.id
                      ? "border-primary bg-primary/10"
                      : "border-transparent hover:bg-muted/30",
                  )}
                  onClick={() => setSelectedId(c.id)}
                >
                  <div
                    className={cn(
                      "flex size-12 shrink-0 items-center justify-center border-2 border-foreground bg-background group-hover:bg-primary transition-colors",
                      selectedId === c.id &&
                        "bg-primary text-primary-foreground",
                    )}
                  >
                    <User className="size-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-display text-xl tracking-wide uppercase text-foreground leading-none block truncate pb-1">
                      {c.otherParticipant.name}
                    </span>
                    {c.lastMessage && (
                      <span className="font-bold tracking-widest text-[11px] text-muted-foreground uppercase truncate block opacity-80">
                        {c.lastMessage.content}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </aside>

      {/* Chat area */}
      <section
        className={cn(
          "flex flex-1 flex-col min-h-0 bg-background relative z-0",
          selectedId ? "flex h-full" : "hidden md:flex",
        )}
      >
        {/* Background Noise for Chat Area */}
        <div
          className="pointer-events-none absolute inset-0 z-0 opacity-[0.03] mix-blend-overlay"
          style={{
            backgroundImage:
              'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noise%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noise)%22/%3E%3C/svg%3E")',
          }}
        />

        {!selectedId ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-muted-foreground/30 relative z-10">
            <MessageCircle className="size-24" />
            <p className="font-display text-4xl tracking-widest uppercase opacity-50">
              SELECIONE UM JOGADOR
            </p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="flex items-center gap-4 border-b-4 border-foreground px-6 py-5 bg-background relative z-10 shadow-sm">
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="flex size-10 items-center justify-center border-2 border-foreground transition-transform hover:-translate-x-1 hover:shadow-[2px_2px_0px_0px_var(--color-primary)] md:hidden"
              >
                <ArrowLeft className="size-5" />
              </button>
              <div className="flex size-12 items-center justify-center border-2 border-foreground bg-primary shadow-[2px_2px_0px_0px_var(--color-foreground)] dark:shadow-[2px_2px_0px_0px_var(--color-foreground)]">
                <User className="size-6 text-primary-foreground" />
              </div>
              <p className="font-display text-3xl tracking-wide text-foreground uppercase pt-1">
                {current?.otherParticipant.name}
              </p>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 min-h-0 px-4 py-8 relative z-10">
              {loadingThread && (
                <div className="flex justify-center p-8">
                  <p className="font-display tracking-widest text-xl animate-pulse text-primary uppercase">
                    Mapeando histórico...
                  </p>
                </div>
              )}
              <div className="space-y-6 max-w-4xl mx-auto">
                {thread?.data.map((msg) => {
                  const isMine = msg.senderId === user?.id
                  return (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex",
                        isMine ? "justify-end" : "justify-start",
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[85%] border-2 border-foreground px-5 py-4 relative",
                          isMine
                            ? "bg-primary text-primary-foreground shadow-[4px_4px_0px_0px_var(--color-foreground)] dark:shadow-[4px_4px_0px_0px_var(--color-foreground)]"
                            : "bg-muted/80 text-foreground shadow-[4px_4px_0px_0px_var(--color-primary)] dark:shadow-[4px_4px_0px_0px_var(--color-primary)]",
                        )}
                      >
                        <p className="text-lg font-medium leading-relaxed">
                          {msg.content}
                        </p>
                        <p
                          className={cn(
                            "mt-3 text-[10px] font-bold tracking-widest uppercase flex items-center justify-end border-t border-dashed border-foreground/20 pt-2",
                            isMine
                              ? "text-background"
                              : "text-muted-foreground",
                          )}
                        >
                          {format(new Date(msg.createdAt), "HH:mm", {
                            locale: ptBR,
                          })}
                        </p>
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="flex-shrink-0 border-t-4 border-foreground bg-background p-4 relative z-10">
              <div className="flex gap-4 max-w-5xl mx-auto">
                <Input
                  placeholder="ENVIE UMA PROPOSTA OU MENSAGEM..."
                  value={message}
                  onChange={(e) => { setMessage(e.target.value); emitTypingStart() }}
                  onBlur={() => emitTypingStop()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      if (message.trim()) sendMutation.mutate(message.trim())
                    }
                  }}
                  className="h-16 flex-1 rounded-none border-4 border-foreground bg-muted/30 px-6 font-display text-xl tracking-wider text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-0 focus-visible:border-primary transition-colors"
                />
                <Button
                  size="icon"
                  className="h-16 w-16 shrink-0 rounded-none border-4 border-foreground bg-primary transition-all hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_var(--color-foreground)] dark:hover:shadow-[4px_4px_0px_0px_var(--color-foreground)] disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none"
                  onClick={() =>
                    message.trim() && sendMutation.mutate(message.trim())
                  }
                  disabled={!message.trim() || sendMutation.isPending}
                >
                  <Send className="size-8 text-foreground" />
                </Button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
