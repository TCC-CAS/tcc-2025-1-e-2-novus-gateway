import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globalSetup: ["tests/setup/global-setup.ts"],
    env: {
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://varzeapro:varzeapro_dev@localhost:5432/varzeapro_test",
      BETTER_AUTH_SECRET: "test-better-auth-secret-long-enough-32chars",
      BETTER_AUTH_URL: "http://localhost:3000",
      JWT_SECRET: "test-secret-that-is-long-enough-for-validation",
      CORS_ORIGIN: "http://localhost:5173",
    },
    pool: "forks",
  },
})
