import { z } from "zod"

export const MatchStatusSchema = z.enum(["scheduled", "completed", "cancelled"])
export type MatchStatus = z.infer<typeof MatchStatusSchema>

export const CreateMatchRequestSchema = z.object({
  opponentName: z.string().min(1).optional(),
  matchDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato AAAA-MM-DD"),
  matchTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Hora deve estar no formato HH:MM")
    .optional(),
  address: z.string().optional(),
  venueName: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
})

export const UpdateMatchRequestSchema = CreateMatchRequestSchema.partial().extend({
  result: z.string().optional(),
  status: MatchStatusSchema.optional(),
})

export const MatchSchema = z.object({
  id: z.string(),
  teamId: z.string(),
  opponentName: z.string().nullable(),
  matchDate: z.string(),
  matchTime: z.string().nullable(),
  address: z.string().nullable(),
  venueName: z.string().nullable(),
  neighborhood: z.string().nullable(),
  city: z.string().nullable(),
  result: z.string().nullable(),
  status: MatchStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type Match = z.infer<typeof MatchSchema>
export type CreateMatchRequest = z.infer<typeof CreateMatchRequestSchema>
export type UpdateMatchRequest = z.infer<typeof UpdateMatchRequestSchema>

// --- Convites ---

export const InviteStatusSchema = z.enum(["pending", "accepted", "declined"])
export type InviteStatus = z.infer<typeof InviteStatusSchema>

export const MatchInviteSchema = z.object({
  id: z.string(),
  matchId: z.string(),
  playerId: z.string(),
  playerName: z.string(),
  playerPhotoUrl: z.string().url().nullable(),
  status: InviteStatusSchema,
  createdAt: z.string(),
})
export type MatchInvite = z.infer<typeof MatchInviteSchema>

export const MatchWithInvitesSchema = MatchSchema.extend({
  invites: z.array(MatchInviteSchema),
})
export type MatchWithInvites = z.infer<typeof MatchWithInvitesSchema>

export const PlayerMatchInviteSchema = z.object({
  id: z.string(),
  matchId: z.string(),
  status: InviteStatusSchema,
  match: z.object({
    teamId: z.string(),
    teamName: z.string(),
    teamLogoUrl: z.string().url().nullable(),
    opponentName: z.string().nullable(),
    matchDate: z.string(),
    matchTime: z.string().nullable(),
    venueName: z.string().nullable(),
    address: z.string().nullable(),
    city: z.string().nullable(),
  }),
  createdAt: z.string(),
})
export type PlayerMatchInvite = z.infer<typeof PlayerMatchInviteSchema>
