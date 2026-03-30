import { Outlet } from "react-router";
import { ClientAuthGuard } from "~/lib/auth";

export default function PlayerLayout() {
  return (
    <ClientAuthGuard requiredRole="player">
      <Outlet />
    </ClientAuthGuard>
  );
}
