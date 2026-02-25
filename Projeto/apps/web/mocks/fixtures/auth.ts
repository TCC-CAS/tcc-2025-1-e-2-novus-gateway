import type { SessionUser } from "~shared/contracts";

export const mockUsers: Record<string, SessionUser> = {
  player1: {
    id: "user-player-1",
    email: "jogador@example.com",
    name: "João Silva",
    role: "player",
    planId: "free",
  },
  team1: {
    id: "user-team-1",
    email: "time@example.com",
    name: "Time São Paulo FC",
    role: "team",
    planId: "free",
  },
  admin1: {
    id: "user-admin-1",
    email: "admin@varzeapro.com",
    name: "Administrador",
    role: "admin",
    planId: "free",
  },
};

export const mockTokens: Record<string, string> = {
  "user-player-1": "mock-token-player-1",
  "user-team-1": "mock-token-team-1",
  "user-admin-1": "mock-token-admin-1",
};

export const mockCredentials = [
  { email: "jogador@example.com", password: "123456", userId: "user-player-1" },
  { email: "time@example.com", password: "123456", userId: "user-team-1" },
  { email: "admin@varzeapro.com", password: "123456", userId: "user-admin-1" },
];
