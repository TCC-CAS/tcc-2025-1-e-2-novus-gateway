import { z } from "zod";
import { PaginationQuerySchema, PaginationMetaSchema } from "./common.js";
import { PlayerSummarySchema, PositionSchema, PlayerLevelSchema, SexFilterSchema } from "./players.js";
import { TeamSummarySchema, TeamLevelSchema, TeamLineupSexSchema } from "./teams.js";

/** Search players query (teams use this) */
export const SearchPlayersQuerySchema = PaginationQuerySchema.extend({
  name: z.string().optional(),
  position: PositionSchema.optional(),
  skills: z.string().optional(), // comma-separated or single
  region: z.string().optional(),
  availability: z.string().optional(),
  level: PlayerLevelSchema.optional(),
  sex: SexFilterSchema.optional(),
  minAge: z.coerce.number().int().optional(),
  maxAge: z.coerce.number().int().optional(),
});
export type SearchPlayersQuery = z.infer<typeof SearchPlayersQuerySchema>;

/** Search players response */
export const SearchPlayersResponseSchema = z.object({
  data: z.array(PlayerSummarySchema),
  meta: PaginationMetaSchema,
});
export type SearchPlayersResponse = z.infer<typeof SearchPlayersResponseSchema>;

/** Search teams query (players use this) */
export const SearchTeamsQuerySchema = PaginationQuerySchema.extend({
  name: z.string().optional(),
  level: TeamLevelSchema.optional(),
  lineupSex: TeamLineupSexSchema.optional(),
  region: z.string().optional(),
  openPosition: z.string().optional(),
});
export type SearchTeamsQuery = z.infer<typeof SearchTeamsQuerySchema>;

/** Search teams response */
export const SearchTeamsResponseSchema = z.object({
  data: z.array(TeamSummarySchema),
  meta: PaginationMetaSchema,
});
export type SearchTeamsResponse = z.infer<typeof SearchTeamsResponseSchema>;
