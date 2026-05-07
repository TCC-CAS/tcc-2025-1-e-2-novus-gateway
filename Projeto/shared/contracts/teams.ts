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

/** Team profile (full) */
export const TeamProfileSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  logoUrl: z.string().url().optional(),
  level: TeamLevelSchema,
  region: z.string().optional(),
  city: z.string().optional(),
  description: z.string().optional(),
  openPositions: z.array(z.string()),
  matchDays: z.array(z.string()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type TeamProfile = z.infer<typeof TeamProfileSchema>;

/** Team summary (cards, search results) */
export const TeamSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  logoUrl: z.string().url().optional(),
  level: TeamLevelSchema,
  region: z.string().optional(),
  openPositions: z.array(z.string()),
});
export type TeamSummary = z.infer<typeof TeamSummarySchema>;

/** Create/update team profile request */
export const UpsertTeamProfileRequestSchema = z.object({
  name: z.string().min(2, "Nome do time obrigatório"),
  logoUrl: z.string().url().optional().or(z.literal("")),
  level: TeamLevelSchema,
  region: z.string().optional(),
  city: z.string().optional(),
  description: z.string().optional(),
  openPositions: z.array(z.string()),
  matchDays: z.array(z.string()).optional(),
});
export type UpsertTeamProfileRequest = z.infer<
  typeof UpsertTeamProfileRequestSchema
>;
