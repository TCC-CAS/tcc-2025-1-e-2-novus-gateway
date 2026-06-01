import { z } from "zod";

/** Team level / category */
export const TEAM_LEVELS = [
  "amador",
  "recreativo",
  "semi-profissional",
  "outro",
] as const;
export const TeamLevelSchema = z.enum(TEAM_LEVELS);
export type TeamLevel = z.infer<typeof TeamLevelSchema>;

/** Team lineup sex. Teams only advertise male or female lineups. */
export const TEAM_LINEUP_SEXES = ["male", "female"] as const;
export const TeamLineupSexSchema = z.enum(TEAM_LINEUP_SEXES);
export type TeamLineupSex = z.infer<typeof TeamLineupSexSchema>;

/** Team profile (full) */
export const TeamProfileSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  lineupSex: TeamLineupSexSchema,
  logoUrl: z.string().url().optional(),
  level: TeamLevelSchema,
  region: z.string().optional(),
  city: z.string().optional(),
  description: z.string().optional(),
  openPositions: z.array(z.string()),
  matchDays: z.array(z.string()).optional(),
  matchTime: z.string().optional(),
  whatsapp: z.string().optional(),
  cardTier: z.enum(["none", "gold", "legendary"]).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type TeamProfile = z.infer<typeof TeamProfileSchema>;

/** Team summary (cards, search results) */
export const TeamSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  lineupSex: TeamLineupSexSchema,
  logoUrl: z.string().url().optional(),
  level: TeamLevelSchema,
  region: z.string().optional(),
  openPositions: z.array(z.string()),
  cardTier: z.enum(["none", "gold", "legendary"]).optional(),
});
export type TeamSummary = z.infer<typeof TeamSummarySchema>;

/** Create/update team profile request */
export const UpsertTeamProfileRequestSchema = z.object({
  name: z.string().min(2, "Nome do time obrigatório"),
  lineupSex: TeamLineupSexSchema.default("male"),
  logoUrl: z.string().url().optional().or(z.literal("")),
  level: TeamLevelSchema,
  region: z.string().optional(),
  city: z.string().optional(),
  description: z.string().optional(),
  openPositions: z.array(z.string()),
  matchDays: z.array(z.string()).optional(),
  matchTime: z.string().optional(),
  whatsapp: z.string().optional(),
});
export type UpsertTeamProfileRequest = z.infer<
  typeof UpsertTeamProfileRequestSchema
>;
