import { Outlet } from "react-router";
import { ClientAuthGuard } from "~/lib/auth";

export default function TeamLayout() {
  return (
    <ClientAuthGuard requiredRole="team">
      <Outlet />
    </ClientAuthGuard>
  );
}
