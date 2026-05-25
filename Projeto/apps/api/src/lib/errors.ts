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
        const details = error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        }))
        // Use first issue message as the top-level message when there's only one field error
        const topMessage = details.length === 1
          ? details[0].message
          : "Dados inválidos. Verifique os campos e tente novamente."
        return reply.status(400).send({
          error: {
            code: "VALIDATION_ERROR",
            message: topMessage,
            details,
          },
        })
      }

      // Fastify schema validation errors (422 from Zod type provider)
      if ("statusCode" in error && (error.statusCode === 400 || error.statusCode === 422)) {
        return reply.status(400).send({
          error: {
            code: "VALIDATION_ERROR",
            message: "Dados inválidos. Verifique os campos e tente novamente.",
          },
        })
      }

      // In production, log minimal info to avoid leaking stack traces.
      // In development/test, log the full error for debugging.
      if (process.env.NODE_ENV === "production") {
        fastify.log.error({ code: "INTERNAL_SERVER_ERROR", message: error.message })
      } else {
        fastify.log.error(error)
      }
      return reply.status(500).send({
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Ocorreu um erro interno. Tente novamente mais tarde.",
        },
      })
    }
  )
}
