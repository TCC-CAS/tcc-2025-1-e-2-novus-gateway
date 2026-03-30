import { z } from "zod";
import { PaginationMetaSchema } from "./common";

/** Single message */
export const MessageSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  senderId: z.string(),
  content: z.string(),
  createdAt: z.string().datetime(),
  readAt: z.string().datetime().optional(),
});
export type Message = z.infer<typeof MessageSchema>;

/** Conversation (full) */
export const ConversationSchema = z.object({
  id: z.string(),
  participantA: z.string(),
  participantB: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Conversation = z.infer<typeof ConversationSchema>;

/** Conversation list item (with last message preview) */
export const ConversationSummarySchema = z.object({
  id: z.string(),
  otherParticipant: z.object({
    id: z.string(),
    name: z.string(),
    avatarUrl: z.string().url().optional(),
  }),
  lastMessage: z
    .object({
      content: z.string(),
      createdAt: z.string().datetime(),
      senderId: z.string(),
    })
    .optional(),
  unreadCount: z.number().default(0),
});
export type ConversationSummary = z.infer<typeof ConversationSummarySchema>;

/** List conversations response */
export const ListConversationsResponseSchema = z.object({
  data: z.array(ConversationSummarySchema),
});
export type ListConversationsResponse = z.infer<
  typeof ListConversationsResponseSchema
>;

/** Get thread (messages) response */
export const GetMessagesResponseSchema = z.object({
  data: z.array(MessageSchema),
  meta: PaginationMetaSchema.optional(),
});
export type GetMessagesResponse = z.infer<typeof GetMessagesResponseSchema>;

/** Create conversation request (from player: teamId; from team: playerId) */
export const CreateConversationRequestSchema = z.object({
  teamId: z.string().optional(),
  playerId: z.string().optional(),
}).refine((d) => d.teamId != null || d.playerId != null, {
  message: "Informe teamId ou playerId",
});
export type CreateConversationRequest = z.infer<
  typeof CreateConversationRequestSchema
>;

/** Send message request */
export const SendMessageRequestSchema = z.object({
  content: z.string().min(1, "Mensagem não pode ser vazia").max(2000),
});
export type SendMessageRequest = z.infer<typeof SendMessageRequestSchema>;
