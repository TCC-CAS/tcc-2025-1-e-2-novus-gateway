import { z } from "zod"

export const ConnectionStatusSchema = z.enum(["pending", "accepted", "declined"])
export type ConnectionStatus = z.infer<typeof ConnectionStatusSchema>

export const ConnectionSchema = z.object({
  id: z.string(),
  requesterId: z.string(),
  receiverId: z.string(),
  status: ConnectionStatusSchema,
  createdAt: z.string(),
  // The other party's info (populated by backend)
  otherUser: z.object({
    id: z.string(),
    profileId: z.string(),
    name: z.string(),
    role: z.string(),
    photoUrl: z.string().url().nullable().optional(),
  }),
})
export type Connection = z.infer<typeof ConnectionSchema>

export const SendConnectionRequestSchema = z.object({
  receiverId: z.string(),
})
export type SendConnectionRequest = z.infer<typeof SendConnectionRequestSchema>

// What the viewer sees on a profile page regarding connection status
export const ConnectionStatusViewSchema = z.object({
  connectionId: z.string().nullable(),
  status: ConnectionStatusSchema.nullable(),
  isRequester: z.boolean(),
})
export type ConnectionStatusView = z.infer<typeof ConnectionStatusViewSchema>
