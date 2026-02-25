import type { PlayerProfile, PlayerSummary } from "~shared/contracts";

export const mockPlayerProfiles: PlayerProfile[] = [
  {
    id: "player-1",
    userId: "user-player-1",
    name: "João Silva",
    photoUrl: undefined,
    positions: ["meia", "atacante"],
    bio: "Jogador de várzea há 5 anos.",
    skills: ["drible", "finalização", "visão"],
    height: 178,
    weight: 75,
    birthDate: "1995-03-15",
    phone: "(11) 98765-4321",
    availability: "fins de semana",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "player-2",
    userId: "user-player-2",
    name: "Carlos Santos",
    photoUrl: undefined,
    positions: ["goleiro"],
    bio: "Goleiro experiente.",
    skills: ["reflexos", "saída"],
    height: 185,
    weight: 82,
    birthDate: "1990-07-20",
    phone: "(11) 91234-5678",
    availability: "sábados",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
];

export const mockPlayerSummaries: PlayerSummary[] = mockPlayerProfiles.map((p) => ({
  id: p.id,
  name: p.name,
  photoUrl: p.photoUrl,
  positions: p.positions,
  skills: p.skills,
  availability: p.availability,
}));
