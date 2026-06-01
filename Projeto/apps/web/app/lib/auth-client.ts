/**
 * Better Auth client instance for VarzeaPro.
 * Use this for type-safe auth calls (signIn, signUp, getSession, signOut).
 * baseURL must be the server root — Better Auth appends /api/auth/* internally.
 */
import { createAuthClient } from "better-auth/react"

// Strip the /api suffix that VITE_API_URL carries so Better Auth can build its own paths.
const apiUrl = import.meta.env.VITE_API_URL ?? ""
const serverRoot = apiUrl
  ? apiUrl.replace(/\/$/, "").replace(/\/api$/, "")
  : (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000")

export const authClient = createAuthClient({
  baseURL: serverRoot,
})
