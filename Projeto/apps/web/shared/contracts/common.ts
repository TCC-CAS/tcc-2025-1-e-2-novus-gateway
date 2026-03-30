import { z } from "zod";

/** Pagination query params for list endpoints */
export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().optional(),
  order: z.enum(["asc", "desc"]).default("desc"),
});
export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

/** Pagination metadata in list responses */
export const PaginationMetaSchema = z.object({
  page: z.number(),
  pageSize: z.number(),
  total: z.number(),
  totalPages: z.number(),
});
export type PaginationMeta = z.infer<typeof PaginationMetaSchema>;

/** UUID or numeric id param */
export const IdParamSchema = z.object({ id: z.string() });
export type IdParam = z.infer<typeof IdParamSchema>;

/** Brazilian phone: (XX) XXXXX-XXXX or (XX) XXXX-XXXX */
export const BrazilianPhoneSchema = z
  .string()
  .regex(/^\(\d{2}\)\s?\d{4,5}-?\d{4}$/, "Telefone inválido. Use (11) 98765-4321");
export type BrazilianPhone = z.infer<typeof BrazilianPhoneSchema>;

/** Optional Brazilian phone (empty string or valid format) */
export const OptionalBrazilianPhoneSchema = z
  .union([z.string().regex(/^\(\d{2}\)\s?\d{4,5}-?\d{4}$/), z.literal("")])
  .optional();

/** API error envelope */
export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.array(z.record(z.unknown())).optional(),
  }),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;
