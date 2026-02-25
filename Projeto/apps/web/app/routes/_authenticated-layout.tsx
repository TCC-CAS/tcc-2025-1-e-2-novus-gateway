import { Outlet } from "react-router";
import { ClientAuthGuard } from "~/lib/auth";
import { AppShell } from "~/components/app-shell";

export default function AuthenticatedLayout() {
  return (
    <ClientAuthGuard>
      <AppShell>
        <Outlet />
      </AppShell>
    </ClientAuthGuard>
  );
}
