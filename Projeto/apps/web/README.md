# VarzeaPro — Web

Frontend da plataforma **VarzeaPro**, construído com React 19, React Router 7 e Tailwind CSS 4.

## Stack

| Tecnologia | Uso |
|---|---|
| React 19 | UI |
| React Router 7 | Roteamento e SSR |
| TypeScript | Tipagem estática |
| Tailwind CSS 4 | Estilização |
| shadcn/ui (New York) | Componentes de interface |
| Lucide React | Ícones |
| TanStack React Query | Gerenciamento de estado assíncrono |
| React Hook Form + Zod | Formulários e validação |
| Vite 7 | Bundler e dev server |
| MSW | Mock de APIs no desenvolvimento |

## Estrutura de pastas

```
web/
├── app/
│   ├── components/       # Componentes reutilizáveis
│   │   └── ui/           # Componentes shadcn/ui
│   ├── hooks/            # Custom hooks
│   ├── lib/              # Utilitários, API client, auth, etc.
│   ├── routes/           # Páginas e layouts
│   │   ├── admin/        # Painel administrativo
│   │   ├── jogador/      # Área do jogador
│   │   └── time/         # Área do time
│   ├── app.css           # Estilos globais
│   ├── root.tsx          # Componente raiz
│   └── routes.ts         # Definição de rotas
├── mocks/
│   ├── fixtures/         # Dados de mock
│   └── handlers/         # Handlers do MSW
├── shared/
│   └── contracts/        # Contratos/tipos compartilhados
└── public/               # Arquivos estáticos
```

## Rotas

| Rota | Descrição |
|---|---|
| `/` | Landing page |
| `/login` | Login |
| `/cadastro` | Cadastro |
| `/recuperar-senha` | Recuperação de senha |
| `/onboarding` | Onboarding de novos usuários |
| `/planos` | Planos de assinatura |
| `/jogador` | Dashboard do jogador |
| `/jogador/perfil` | Perfil do jogador |
| `/jogador/perfil/editar` | Editar perfil do jogador |
| `/jogador/buscar-times` | Busca de times |
| `/jogador/mensagens` | Mensagens do jogador |
| `/time` | Dashboard do time |
| `/time/perfil` | Perfil do time |
| `/time/perfil/editar` | Editar perfil do time |
| `/time/buscar-jogadores` | Busca de jogadores |
| `/time/mensagens` | Mensagens do time |
| `/admin` | Painel administrativo |
| `/admin/usuarios` | Gerenciamento de usuários |
| `/admin/moderation` | Moderação |
| `/configuracoes` | Configurações |
| `/jogadores/:id` | Perfil público de jogador |
| `/times/:id` | Perfil público de time |

## Scripts

> **Recomendação:** utilize o [Bun](https://bun.sh/) para melhor performance.

| Comando | Descrição |
|---|---|
| `bun install` / `npm install` | Instalar dependências |
| `bun dev` / `npm run dev` | Iniciar servidor de desenvolvimento |
| `bun run build` / `npm run build` | Build de produção |
| `bun start` / `npm start` | Servir build de produção |
| `bun run typecheck` / `npm run typecheck` | Verificação de tipos |

O servidor de desenvolvimento estará disponível em `http://localhost:5173`.

## Path aliases

Configurados no `tsconfig.json`:

| Alias | Caminho |
|---|---|
| `~/*` | `./app/*` |
| `~shared/*` | `./shared/*` |

## Mocks (MSW)

Durante o desenvolvimento, o **MSW** intercepta as chamadas de API e retorna dados mockados. Isso permite desenvolver o frontend sem depender do backend.

- **Handlers:** `mocks/handlers/` — define as rotas mockadas (auth, players, teams, messaging, search, subscription, admin)
- **Fixtures:** `mocks/fixtures/` — dados estáticos retornados pelos handlers

## Docker

```bash
docker build -t varzeapro-web .
docker run -p 3000:3000 varzeapro-web
```
