import { z } from "zod";
import { PaginationMetaSchema } from "./common.js";

export const GalleryMediaTypeSchema = z.enum(["image", "video"]);
export type GalleryMediaType = z.infer<typeof GalleryMediaTypeSchema>;

export const GalleryMediaSchema = z.object({
  id: z.string(),
  mediaType: GalleryMediaTypeSchema,
  caption: z.string().optional(),
  isHighlight: z.boolean(),
  sortOrder: z.number(),
  thumbnailUrl: z.string().optional(),
  mediumUrl: z.string().optional(),
  originalUrl: z.string(),
  createdAt: z.string().datetime(),
});
export type GalleryMedia = z.infer<typeof GalleryMediaSchema>;

export const PresignRequestSchema = z.object({
  fileName: z.string().min(1),
  mediaType: GalleryMediaTypeSchema,
  contentType: z.string().min(1),
  sizeBytes: z.number().optional(),
});
export type PresignRequest = z.infer<typeof PresignRequestSchema>;

export const PresignResponseSchema = z.object({
  uploadUrl: z.string().url(),
  key: z.string(),
  assetId: z.string(),
});
export type PresignResponse = z.infer<typeof PresignResponseSchema>;

export const ConfirmUploadSchema = z.object({
  assetId: z.string().min(1),
  caption: z.string().optional(),
  isHighlight: z.boolean().optional(),
});
export type ConfirmUploadRequest = z.infer<typeof ConfirmUploadSchema>;

export const UpdateGalleryItemSchema = z.object({
  caption: z.string().optional(),
  isHighlight: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});
export type UpdateGalleryItemRequest = z.infer<typeof UpdateGalleryItemSchema>;

export const ListGalleryResponseSchema = z.object({
  data: z.array(GalleryMediaSchema),
  meta: PaginationMetaSchema,
});
export type ListGalleryResponse = z.infer<typeof ListGalleryResponseSchema>;
