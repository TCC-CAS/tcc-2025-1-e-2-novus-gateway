import type { TeamProfile, TeamSummary } from "~shared/contracts";

export const mockTeamProfiles: TeamProfile[] = [
  {
    id: "team-1",
    userId: "user-team-1",
    name: "Time São Paulo FC",
    logoUrl: undefined,
    level: "amador",
    region: "São Paulo",
    city: "São Paulo",
    description: "Time de várzea buscando jogadores.",
    openPositions: ["meia", "atacante"],
    matchDays: ["sábado"],
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "team-2",
    userId: "user-team-2",
    name: "Pelada do Bairro",
    logoUrl: undefined,
    level: "recreativo",
    region: "São Paulo",
    city: "Guarulhos",
    description: "Pelada semanal.",
    openPositions: ["goleiro", "lateral"],
    matchDays: ["domingo"],
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
];

export const mockTeamSummaries: TeamSummary[] = mockTeamProfiles.map((t) => ({
  id: t.id,
  name: t.name,
  logoUrl: t.logoUrl,
  level: t.level,
  region: t.region,
  openPositions: t.openPositions,
}));
