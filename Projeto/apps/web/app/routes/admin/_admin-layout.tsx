import { Outlet } from "react-router";
import { ClientAuthGuard } from "~/lib/auth";

export default function AdminLayout() {
  return (
    <ClientAuthGuard requiredRole="admin">
      <Outlet />
    </ClientAuthGuard>
  );
}
