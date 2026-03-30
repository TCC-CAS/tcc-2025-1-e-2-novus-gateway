import {
  type RouteConfig,
  index,
  layout,
  route,
} from "@react-router/dev/routes";

export default [
  index("routes/_index.tsx"),
  route("login", "routes/login.tsx"),
  route("cadastro", "routes/cadastro.tsx"),
  route("onboarding", "routes/onboarding.tsx"),
  route("recuperar-senha", "routes/recuperar-senha.tsx"),
  route("planos", "routes/planos.tsx"),
  layout("routes/_authenticated-layout.tsx", [
    route("jogador", "routes/jogador/_player-layout.tsx", [
      index("routes/jogador/index.tsx"),
      route("perfil", "routes/jogador/perfil.tsx"),
      route("perfil/editar", "routes/jogador/perfil-editar.tsx"),
      route("buscar-times", "routes/jogador/buscar-times.tsx"),
      route("mensagens", "routes/jogador/mensagens.tsx"),
    ]),
    route("time", "routes/time/_team-layout.tsx", [
      index("routes/time/index.tsx"),
      route("perfil", "routes/time/perfil.tsx"),
      route("perfil/editar", "routes/time/perfil-editar.tsx"),
      route("buscar-jogadores", "routes/time/buscar-jogadores.tsx"),
      route("mensagens", "routes/time/mensagens.tsx"),
    ]),
    route("admin", "routes/admin/_admin-layout.tsx", [
      index("routes/admin/index.tsx"),
      route("usuarios", "routes/admin/usuarios.tsx"),
      route("usuarios/:id", "routes/admin/usuarios.$id.tsx"),
      route("moderation", "routes/admin/moderation.tsx"),
    ]),
    route("configuracoes", "routes/configuracoes.tsx"),
    route("jogadores/:id", "routes/jogadores.$id.tsx"),
    route("times/:id", "routes/times.$id.tsx"),
  ]),
  route("*", "routes/404.tsx"),
] satisfies RouteConfig;
