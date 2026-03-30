import { z } from "zod";
import { RoleSchema } from "./auth";

export const UserStatusSchema = z.enum(["active", "banned", "pending"]);
export type UserStatus = z.infer<typeof UserStatusSchema>;

/** User list item (admin) */
export const UserSummarySchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  role: RoleSchema,
  status: UserStatusSchema,
  createdAt: z.string().datetime(),
  lastActiveAt: z.string().datetime().optional(),
});
export type UserSummary = z.infer<typeof UserSummarySchema>;

/** User detail (admin) */
export const UserDetailSchema = UserSummarySchema.extend({
  profileId: z.string().optional(), // player or team profile id
});
export type UserDetail = z.infer<typeof UserDetailSchema>;

/** List users query (admin) */
export const ListUsersQuerySchema = z.object({
  role: RoleSchema.optional(),
  status: UserStatusSchema.optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListUsersQuery = z.infer<typeof ListUsersQuerySchema>;

/** List users response */
export const ListUsersResponseSchema = z.object({
  data: z.array(UserSummarySchema),
  meta: z.object({
    page: z.number(),
    pageSize: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});
export type ListUsersResponse = z.infer<typeof ListUsersResponseSchema>;

/** Ban user request (admin) */
export const BanUserRequestSchema = z.object({
  reason: z.string().optional(),
});
export type BanUserRequest = z.infer<typeof BanUserRequestSchema>;
