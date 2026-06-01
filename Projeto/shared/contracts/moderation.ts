import { z } from "zod";

export const ReportStatusSchema = z.enum(["pending", "dismissed", "resolved"]);
export type ReportStatus = z.infer<typeof ReportStatusSchema>;

export const ReportReasonSchema = z.enum([
  "inappropriate",
  "spam",
  "harassment",
  "fake",
  "other",
]);
export type ReportReason = z.infer<typeof ReportReasonSchema>;

/** Report item (admin queue) */
export const ReportSummarySchema = z.object({
  id: z.string(),
  reporterId: z.string(),
  reporterName: z.string(),
  reportedEntityType: z.enum(["player", "team", "message"]),
  reportedEntityId: z.string(),
  reason: ReportReasonSchema,
  description: z.string().optional(),
  status: ReportStatusSchema,
  createdAt: z.string().datetime(),
});
export type ReportSummary = z.infer<typeof ReportSummarySchema>;

/** List reports query */
export const ListReportsQuerySchema = z.object({
  status: ReportStatusSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListReportsQuery = z.infer<typeof ListReportsQuerySchema>;

/** List reports response */
export const ListReportsResponseSchema = z.object({
  data: z.array(ReportSummarySchema),
  meta: z.object({
    page: z.number(),
    pageSize: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});
export type ListReportsResponse = z.infer<typeof ListReportsResponseSchema>;

/** Create report request (user-facing) */
export const CreateReportRequestSchema = z.object({
  reportedEntityType: z.enum(["player", "team", "message"]),
  reportedEntityId: z.string(),
  reason: ReportReasonSchema,
  description: z.string().optional(),
});
export type CreateReportRequest = z.infer<typeof CreateReportRequestSchema>;

/** Create report response */
export const CreateReportResponseSchema = z.object({
  data: z.object({ id: z.string() }),
});
export type CreateReportResponse = z.infer<typeof CreateReportResponseSchema>;

/** Moderate action request */
export const ModerateReportRequestSchema = z.object({
  action: z.enum(["dismiss", "remove", "warn"]),
  note: z.string().optional(),
});
export type ModerateReportRequest = z.infer<typeof ModerateReportRequestSchema>;
