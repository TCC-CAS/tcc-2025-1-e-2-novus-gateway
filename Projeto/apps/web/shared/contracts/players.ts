import { z } from "zod";
import { OptionalBrazilianPhoneSchema } from "./common";

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
});
export type PlayerSummary = z.infer<typeof PlayerSummarySchema>;

/** Create/update player profile request */
export const UpsertPlayerProfileRequestSchema = z.object({
  name: z.string().min(2, "Nome obrigatório"),
  photoUrl: z.string().url().optional().or(z.literal("")),
  positions: z.array(PositionSchema).min(1, "Selecione pelo menos uma posição"),
  bio: z.string().optional(),
  skills: z.array(z.string()),
  height: z.coerce.number().int().min(100).max(250).optional(),
  weight: z.coerce.number().int().min(30).max(200).optional(),
  birthDate: z.string().optional(),
  phone: z.string().optional(),
  availability: z.string().optional(),
});
export type UpsertPlayerProfileRequest = z.infer<
  typeof UpsertPlayerProfileRequestSchema
>;
