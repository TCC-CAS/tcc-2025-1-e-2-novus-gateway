import type { UserSummary } from "~shared/contracts";

export const mockUserSummaries: UserSummary[] = [
  {
    id: "user-player-1",
    email: "jogador@example.com",
    name: "João Silva",
    role: "player",
    status: "active",
    createdAt: "2024-01-01T00:00:00Z",
    lastActiveAt: "2024-01-15T14:00:00Z",
  },
  {
    id: "user-team-1",
    email: "time@example.com",
    name: "Time São Paulo FC",
    role: "team",
    status: "active",
    createdAt: "2024-01-01T00:00:00Z",
    lastActiveAt: "2024-01-14T10:00:00Z",
  },
  {
    id: "user-admin-1",
    email: "admin@varzeapro.com",
    name: "Administrador",
    role: "admin",
    status: "active",
    createdAt: "2024-01-01T00:00:00Z",
  },
];
