import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { adminUsersApi } from "~/lib/api-client";
import { adminModerationApi } from "~/lib/api-client";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { Button } from "~/components/ui/button";

export function meta() {
  return [{ title: "Painel - VárzeaPro" }];
}

export default function AdminDashboard() {
  const { data: usersData } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => adminUsersApi.list({ pageSize: 1 }),
  });
  const { data: reportsData } = useQuery({
    queryKey: ["admin", "reports"],
    queryFn: () => adminModerationApi.listReports({ pageSize: 1 }),
  });

  const totalUsers = usersData?.meta.total ?? 0;
  const totalReports = reportsData?.meta.total ?? 0;

  return (
    <div className="container space-y-8 px-4 py-8">
      <h1 className="text-2xl font-bold">Painel</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <span className="text-sm font-medium text-muted-foreground">
              Usuários
            </span>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalUsers}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <span className="text-sm font-medium text-muted-foreground">
              Denúncias pendentes
            </span>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalReports}</p>
          </CardContent>
        </Card>
      </div>
      <div className="flex flex-wrap gap-4">
        <Button asChild>
          <Link to="/admin/usuarios">Gerenciar usuários</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/admin/moderation">Fila de moderação</Link>
        </Button>
      </div>
    </div>
  );
}
