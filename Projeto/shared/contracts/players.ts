import { z } from "zod";
import { OptionalBrazilianPhoneSchema } from "./common.js";

/** Position / role on the field */
export const POSITIONS = [
  "goleiro",
  "lateral",
  "zagueiro",
  "volante",
  "meia",
  "atacante",
] as const;
export const PositionSchema = z.enum(POSITIONS);
export type Position = z.infer<typeof PositionSchema>;

/** Player level / competitiveness — mirrors team levels */
export const PLAYER_LEVELS = [
  "amador",
  "recreativo",
  "semi-profissional",
  "outro",
] as const;
export const PlayerLevelSchema = z.enum(PLAYER_LEVELS);
export type PlayerLevel = z.infer<typeof PlayerLevelSchema>;

/** Player profile (full) */
export const PlayerProfileSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  photoUrl: z.string().url().optional(),
  positions: z.array(PositionSchema),
  bio: z.string().optional(),
  skills: z.array(z.string()),
  height: z.number().optional(), // cm
  weight: z.number().optional(), // kg
  birthDate: z.string().optional(), // ISO date
  phone: OptionalBrazilianPhoneSchema,
  availability: z.string().optional(),
  region: z.string().optional(),
  city: z.string().optional(),
  level: PlayerLevelSchema.optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type PlayerProfile = z.infer<typeof PlayerProfileSchema>;

/** Player summary (cards, search results) */
export const PlayerSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  photoUrl: z.string().url().optional(),
  positions: z.array(PositionSchema),
  skills: z.array(z.string()),
  availability: z.string().optional(),
  region: z.string().optional(),
  level: PlayerLevelSchema.optional(),
});
export type PlayerSummary = z.infer<typeof PlayerSummarySchema>;

/** Create/update player profile request */
export const UpsertPlayerProfileRequestSchema = z.object({
  name: z.string().min(2, "Nome obrigatório"),
  photoUrl: z.string().url().optional().or(z.literal("")),
  positions: z.array(PositionSchema),
  bio: z.string().optional(),
  skills: z.array(z.string()),
  height: z.preprocess((v: unknown) => (v === "" || v === null || (typeof v === "number" && isNaN(v)) ? undefined : v), z.number().int().min(100).max(250).optional()),
  weight: z.preprocess((v: unknown) => (v === "" || v === null || (typeof v === "number" && isNaN(v)) ? undefined : v), z.number().int().min(30).max(200).optional()),
  birthDate: z.string().optional(),
  phone: z.string().optional(),
  availability: z.string().optional(),
  region: z.string().optional(),
  city: z.string().optional(),
  level: PlayerLevelSchema.optional(),
});
export type UpsertPlayerProfileRequest = z.infer<
  typeof UpsertPlayerProfileRequestSchema
>;
