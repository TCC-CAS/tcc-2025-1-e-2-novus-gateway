import { useParams, Link } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminUsersApi } from "~/lib/api-client";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";

export function meta() {
  return [{ title: "Detalhe do usuário - VárzeaPro" }];
}

export default function AdminUsuarioDetail() {
  const { id } = useParams();
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery({
    queryKey: ["admin", "users", id],
    queryFn: () => adminUsersApi.getById(id!),
    enabled: !!id,
  });

  const banMutation = useMutation({
    mutationFn: () => adminUsersApi.ban(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "users", id] });
    },
  });

  if (isLoading || !user) {
    return (
      <div className="container px-4 py-8">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="container space-y-6 px-4 py-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/admin/usuarios">Voltar</Link>
        </Button>
      </div>
      <h1 className="text-2xl font-bold">Usuário</h1>
      <Card>
        <CardHeader>
          <p className="font-medium">{user.name}</p>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </CardHeader>
        <CardContent className="space-y-2">
          <p>
            <span className="text-muted-foreground">Função:</span> {user.role}
          </p>
          <p>
            <span className="text-muted-foreground">Status:</span> {user.status}
          </p>
        </CardContent>
      </Card>
      <div className="flex gap-2">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={user.status === "banned"}>
              Banir
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Banir usuário?</AlertDialogTitle>
              <AlertDialogDescription>
                O usuário não poderá acessar a plataforma até ser desbanido.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => banMutation.mutate()}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Banir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
