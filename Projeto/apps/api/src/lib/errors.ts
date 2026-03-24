import type { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from "fastify"
import { ZodError } from "zod"

export class AppError extends Error {
  public readonly statusCode: number
  public readonly code: string

  constructor(statusCode: number, code: string, message: string) {
    super(message)
    this.name = "AppError"
    this.statusCode = statusCode
    this.code = code
  }
}

export function registerErrorHandler(fastify: FastifyInstance) {
  fastify.setErrorHandler(
    (error: FastifyError | AppError | ZodError | Error, _req: FastifyRequest, reply: FastifyReply) => {
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send({
          error: {
            code: error.code,
            message: error.message,
          },
        })
      }

      if (error instanceof ZodError) {
        return reply.status(400).send({
          error: {
            code: "VALIDATION_ERROR",
            message: "Validation failed",
            details: error.issues.map((i) => ({
              path: i.path.join("."),
              message: i.message,
            })),
          },
        })
      }

      // Fastify validation errors
      if ("statusCode" in error && error.statusCode === 400) {
        return reply.status(400).send({
          error: {
            code: "VALIDATION_ERROR",
            message: error.message,
          },
        })
      }

      fastify.log.error(error)
      return reply.status(500).send({
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred",
        },
      })
    }
  )
}
