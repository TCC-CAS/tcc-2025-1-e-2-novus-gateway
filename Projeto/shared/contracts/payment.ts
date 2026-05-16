import { z } from "zod"
import { PlanIdSchema } from "./subscription.js"

export const CheckoutRequestSchema = z.object({
  planId: PlanIdSchema,
})
export type CheckoutRequest = z.infer<typeof CheckoutRequestSchema>

export const CheckoutResponseSchema = z.object({
  initPoint: z.string().url(),
  preferenceId: z.string(),
})
export type CheckoutResponse = z.infer<typeof CheckoutResponseSchema>

export const WebhookPayloadSchema = z.object({
  type: z.string().optional(),
  action: z.string().optional(),
  data: z
    .object({
      id: z.string().optional(),
    })
    .optional(),
  live_mode: z.boolean().optional(),
})
export type WebhookPayload = z.infer<typeof WebhookPayloadSchema>
