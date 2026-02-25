import type { ReportSummary } from "~shared/contracts";

export const mockReports: ReportSummary[] = [
  {
    id: "report-1",
    reporterId: "user-player-1",
    reporterName: "João Silva",
    reportedEntityType: "team",
    reportedEntityId: "team-2",
    reason: "spam",
    description: "Perfil com informações falsas.",
    status: "pending",
    createdAt: "2024-01-14T09:00:00Z",
  },
];
