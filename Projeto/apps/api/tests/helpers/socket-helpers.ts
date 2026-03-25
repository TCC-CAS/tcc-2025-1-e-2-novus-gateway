import { io, type Socket } from "socket.io-client"
import type { FastifyInstance } from "fastify"

/**
 * Creates an unauthenticated socket.io-client connected to the test server.
 * Pass a real session cookie to authenticate.
 */
export function createSocketClient(
  app: FastifyInstance,
  sessionCookie?: string
): Socket {
  const address = app.server.address()
  const port = typeof address === "object" && address ? address.port : 3000
  return io(`http://localhost:${port}`, {
    extraHeaders: sessionCookie ? { cookie: sessionCookie } : {},
    autoConnect: false,
    transports: ["websocket"],
  })
}

/**
 * Creates an authenticated socket and waits for the connection event.
 * Rejects if connection fails (unauthenticated session).
 */
export function createAuthenticatedSocket(
  app: FastifyInstance,
  sessionCookie: string
): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const socket = createSocketClient(app, sessionCookie)
    socket.on("connect", () => resolve(socket))
    socket.on("connect_error", (err) => reject(err))
    socket.connect()
  })
}
