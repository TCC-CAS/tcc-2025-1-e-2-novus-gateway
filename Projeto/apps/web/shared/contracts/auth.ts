import { z } from "zod";

export const RoleSchema = z.enum(["player", "team", "admin"]);
export type Role = z.infer<typeof RoleSchema>;

/** Login request body */
export const LoginRequestSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(1, "Senha obrigatória"),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

/** Login response: user + token */
export const LoginResponseSchema = z.object({
  user: z.object({
    id: z.string(),
    email: z.string().email(),
    name: z.string(),
    role: RoleSchema,
  }),
  token: z.string(),
});
export type LoginResponse = z.infer<typeof LoginResponseSchema>;

/** Sign up request body */
export const SignUpRequestSchema = z
  .object({
    name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
    email: z.string().email("E-mail inválido"),
    password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
    confirmPassword: z.string(),
    role: RoleSchema,
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });
export type SignUpRequest = z.infer<typeof SignUpRequestSchema>;

/** Sign up response: same as login */
export const SignUpResponseSchema = LoginResponseSchema;
export type SignUpResponse = z.infer<typeof SignUpResponseSchema>;

/** Forgot password request */
export const ForgotPasswordRequestSchema = z.object({
  email: z.string().email("E-mail inválido"),
});
export type ForgotPasswordRequest = z.infer<typeof ForgotPasswordRequestSchema>;

/** Forgot password response */
export const ForgotPasswordResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});
export type ForgotPasswordResponse = z.infer<typeof ForgotPasswordResponseSchema>;

/** Session user (from token or context) */
export const SessionUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  role: RoleSchema,
  planId: z.enum(["free", "craque", "titular", "campeao"]).default("free"),
});
export type SessionUser = z.infer<typeof SessionUserSchema>;
