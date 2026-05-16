# VarzeaPro

Plataforma social para e-sports que conecta jogadores competitivos e times — "LinkedIn meets Discord" para a cena competitiva brasileira de games. Usuários criam perfis públicos, descobrem companheiros de equipe via busca avançada, comunicam-se via chat em tempo real e desbloqueiam funcionalidades através de planos de assinatura.

## Estrutura do Projeto

```
Projeto/
├── docker-compose.yml        # PostgreSQL + API + Web via Docker
├── .env.example              # Variáveis para o Docker Compose
├── shared/
│   └── contracts/            # Schemas Zod e tipos compartilhados
└── apps/
    ├── api/                  # Backend (Fastify + TypeScript)
    │   ├── src/routes/       # Rotas da API
    │   ├── src/db/schema/    # Schemas Drizzle ORM
    │   ├── src/db/migrations/ # Migrações SQL geradas
    │   └── src/lib/          # Auth, email, storage, utils
    └── web/                  # Frontend (React 19 + React Router 7)
        ├── app/routes/       # Páginas e layouts
        ├── app/components/   # Componentes UI (shadcn/ui)
        ├── app/lib/          # API client, auth context, plan context
        └── mocks/            # Handlers MSW para API simulada
```

## Stack

### Frontend (`apps/web`)
- **React 19** + **React Router 7** (SSR habilitado)
- **TypeScript** + **Tailwind CSS 4** + **shadcn/ui** (design brutalista)
- **TanStack React Query** para estado assíncrono
- **React Hook Form** + **Zod** para formulários e validação
- **MSW (Mock Service Worker)** para mock de API em desenvolvimento
- **Socket.io client** para mensagens em tempo real

### Backend (`apps/api`)
- **Fastify** + **TypeScript**
- **PostgreSQL** + **Drizzle ORM**
- **Better Auth** para autenticação (cookies HttpOnly, verificação de email)
- **Socket.io** para WebSockets (chat em tempo real)
- **Resend** para envio de emails (verificação, reset de senha, boas-vindas)
- **AWS S3** para upload de imagens (presigned URLs)
- **MercadoPago** para checkout de planos de assinatura (sandbox)
- **Zod** para validação de entrada

## Funcionalidades

| Feature | Descrição |
|---------|-----------|
| **Autenticação** | Cadastro, login, reset de senha, verificação de email (Better Auth) |
| **Perfis** | Jogadores e times com foto, bio, posição, nível, região, cidade |
| **Busca** | Busca avançada com filtros por posição, nível, região, habilidades, idade |
| **Chat** | Mensagens em tempo real via WebSocket (Socket.io) |
| **Galeria** | Upload de fotos/vídeos com presigned URL S3, limite por plano |
| **Planos** | Free, Craque (jogador), Titular, Campeão (time) com gating de features |
| **Pagamentos** | Checkout via MercadoPago (sandbox) para upgrade de plano |
| **Emails** | Verificação de email, reset de senha, boas-vindas (Resend) |
| **Admin** | Gestão de usuários, moderação de denúncias (painel admin) |
| **Favoritos** | Players e times podem ser favoritados |
| **Onboarding** | Fluxo guiado de configuração de perfil após cadastro |

## Pré-requisitos

- [Node.js](https://nodejs.org/) v20+ (ou [Bun](https://bun.sh/) v1.0+)
- [Docker](https://www.docker.com/) (para o banco de dados PostgreSQL)
- Conta no [Resend](https://resend.com) (para emails) — opcional em dev
- Conta no [MercadoPago Developers](https://www.mercadopago.com.br/developers/) (para pagamentos sandbox) — opcional em dev

## Como rodar

### Modo mock (só frontend, sem backend)

Ideal para trabalhar no frontend sem precisar do backend ou banco rodando. O MSW intercepta todas as chamadas de API.

```bash
cd apps/web
npm install
cp .env.example .env
```

Edite `apps/web/.env` e defina:
```env
VITE_USE_MOCK=true
```

Inicie o servidor:
```bash
npm run dev
```

Acesse `http://localhost:5173`.

---

### Modo completo (frontend + backend + banco)

#### 1. Banco de dados (PostgreSQL via Docker)

Na raiz de `Projeto/`, copie o `.env` e suba o container:

```bash
cp .env.example .env
docker compose up postgres -d
```

Verifique que o banco está saudável:
```bash
docker compose ps
```

#### 2. Backend

```bash
cd apps/api
npm install
cp .env.example .env
```

Edite `apps/api/.env` — no mínimo ajuste as variáveis de autenticação:

```env
# Obrigatório — gere com: openssl rand -hex 32
BETTER_AUTH_SECRET=sua-chave-secreta-aqui
JWT_SECRET=sua-chave-jwt-aqui

# Banco (local, fora do Docker networking)
DATABASE_URL=postgresql://varzeapro:varzeapro_dev@localhost:5432/varzeapro

# Email (Resend) — pode deixar vazio em dev (emails vão para console)
RESEND_API_KEY=re_xxxxxxxxxxxx
EMAIL_FROM=noreply@seudominio.com

# MercadoPago sandbox — opcional em dev
MERCADOPAGO_ACCESS_TOKEN=seu-token-sandbox
```

Rode as migrações e inicie o servidor:

```bash
npm run db:migrate
npm run dev
```

O servidor estará disponível em `http://localhost:3000`.

#### 3. Frontend

```bash
cd apps/web
npm install
cp .env.example .env
```

Edite `apps/web/.env`:
```env
VITE_API_URL=http://localhost:3000/api
VITE_USE_MOCK=false
```

```bash
npm run dev
```

Acesse `http://localhost:5173`.

---

### Docker Compose (tudo junto)

Para subir todos os serviços de uma vez:

```bash
cp .env.example .env
# Edite o .env com valores reais
docker compose up --build
```

Isso sobe PostgreSQL (5432), API (3000) e Web (5173).

---

## Variáveis de ambiente

### Docker Compose (`.env` na raiz de `Projeto/`)

| Variável | Descrição | Padrão |
|---|---|---|
| `POSTGRES_PASSWORD` | Senha do PostgreSQL | `varzeapro_dev` |
| `NODE_ENV` | Ambiente de execução | `development` |
| `PORT` | Porta do servidor backend | `3000` |
| `DATABASE_URL` | URL de conexão com o banco (Docker) | `postgresql://varzeapro:varzeapro_dev@postgres:5432/varzeapro` |
| `BETTER_AUTH_SECRET` | Segredo para assinatura de tokens (min. 32 chars) | — |
| `BETTER_AUTH_URL` | URL base do servidor de autenticação | `http://localhost:3000` |
| `CORS_ORIGIN` | Origem permitida pelo CORS | `http://localhost:5173` |

### Backend (`apps/api/.env`)

| Variável | Descrição | Padrão |
|---|---|---|
| `NODE_ENV` | Ambiente de execução | `development` |
| `PORT` | Porta do servidor | `3000` |
| `DATABASE_URL` | URL de conexão com o banco (local) | `postgresql://varzeapro:varzeapro_dev@localhost:5432/varzeapro` |
| `JWT_SECRET` | Segredo JWT (min. 32 chars) | — |
| `BETTER_AUTH_SECRET` | Segredo Better Auth (min. 32 chars) | — |
| `BETTER_AUTH_URL` | URL base do servidor de autenticação | `http://localhost:3000` |
| `CORS_ORIGIN` | Origem permitida pelo CORS | `http://localhost:5173` |
| `S3_ENDPOINT` | Endpoint do storage S3 | `https://s3.amazonaws.com` |
| `S3_REGION` | Região do bucket S3 | `us-east-1` |
| `S3_BUCKET` | Nome do bucket S3 | `varzeapro-media` |
| `S3_ACCESS_KEY_ID` | Access key do S3 | — |
| `S3_SECRET_ACCESS_KEY` | Secret key do S3 | — |
| `S3_PUBLIC_URL` | URL pública/CDN do storage | — |
| `S3_USE_PATH_STYLE` | Path-style para MinIO | `false` |
| `IMAGE_MAX_SIZE_MB` | Tamanho máximo de imagem | `10` |
| `IMAGE_MAX_DIMENSION` | Dimensão máxima de imagem (px) | `4000` |
| `PRESIGNED_URL_TTL_SECONDS` | TTL de URLs assinadas | `3600` |
| `UPLOAD_RATE_LIMIT_MAX` | Máx. uploads por janela | `10` |
| `UPLOAD_RATE_LIMIT_WINDOW_MINUTES` | Janela de rate limit | `60` |
| `MERCADOPAGO_ACCESS_TOKEN` | Token sandbox MercadoPago | — |
| `MERCADOPAGO_WEBHOOK_URL` | URL de webhook MercadoPago | — |
| `RESEND_API_KEY` | API key do Resend | — |
| `EMAIL_FROM` | Email remetente | `onboarding@resend.dev` |

### Frontend (`apps/web/.env`)

| Variável | Descrição | Padrão |
|---|---|---|
| `VITE_API_URL` | URL base da API backend | `/api` (mesma origem) |
| `VITE_USE_MOCK` | Ativar mock MSW (`"true"` ou `"false"`) | `false` em dev |

---

## Scripts úteis

### Backend (`apps/api`)

```bash
npm run dev              # Servidor em modo watch (tsx watch)
npm run build            # Compila TypeScript (tsc)
npm start                # Roda o build compilado
npm test                 # Roda todos os testes (vitest)
npm run test:watch       # Testes em modo watch
npm run db:generate      # Gera migração a partir do schema Drizzle
npm run db:migrate       # Aplica migrações pendentes no banco
```

### Frontend (`apps/web`)

```bash
npm run dev              # Servidor de desenvolvimento (react-router dev)
npm run build            # Build de produção (react-router build)
npm start                # Serve o build de produção (react-router-serve)
npm run typecheck        # Verificação de tipos TypeScript
```

---

## Rotas da aplicação

### Públicas
| Rota | Descrição |
|------|-----------|
| `/` | Landing page |
| `/login` | Login |
| `/cadastro` | Cadastro (jogador ou time) |
| `/recuperar-senha` | Reset de senha |
| `/onboarding` | Configuração de perfil após cadastro |
| `/planos` | Página de planos e assinatura |
| `/pagamento-sucesso` | Confirmação de pagamento |
| `/jogadores/:id` | Perfil público de jogador |
| `/times/:id` | Perfil público de time |

### Jogador (`/jogador/`)
| Rota | Descrição |
|------|-----------|
| `/` | Home do jogador |
| `/perfil` | Perfil próprio |
| `/perfil-editar` | Editar perfil |
| `/buscar-times` | Buscar times com filtros |
| `/mensagens` | Chat em tempo real |

### Time (`/time/`)
| Rota | Descrição |
|------|-----------|
| `/` | Home do time |
| `/perfil` | Perfil do time |
| `/perfil-editar` | Editar perfil do time |
| `/buscar-jogadores` | Buscar jogadores com filtros |
| `/mensagens` | Chat em tempo real |

### Admin (`/admin/`)
| Rota | Descrição |
|------|-----------|
| `/` | Dashboard admin |
| `/usuarios` | Gestão de usuários |
| `/usuarios/:id` | Detalhes do usuário |
| `/moderation` | Denúncias e moderação |

---

## Rotas da API

### Autenticação (`/api/auth/*`)
Better Auth gerencia login, cadastro, reset de senha e verificação de email.

| Rota | Método | Descrição |
|------|--------|-----------|
| `/api/auth/sign-up/email` | POST | Cadastro |
| `/api/auth/sign-in/email` | POST | Login |
| `/api/auth/sign-out` | POST | Logout |
| `/api/auth/reset-password` | POST | Solicitar reset |
| `/api/auth/verify-email` | GET | Verificar email |

### Jogadores (`/api/players`)
| Rota | Método | Descrição |
|------|--------|-----------|
| `/api/players/me` | GET | Perfil do jogador logado |
| `/api/players/:id` | GET | Perfil público |
| `/api/players` | PUT | Criar/atualizar perfil |

### Times (`/api/teams`)
| Rota | Método | Descrição |
|------|--------|-----------|
| `/api/teams/me` | GET | Perfil do time logado |
| `/api/teams/:id` | GET | Perfil público |
| `/api/teams` | PUT | Criar/atualizar perfil |

### Busca (`/api/search`)
| Rota | Método | Descrição |
|------|--------|-----------|
| `/api/search/players` | GET | Buscar jogadores com filtros |
| `/api/search/teams` | GET | Buscar times com filtros |

### Galeria (`/api/gallery`)
| Rota | Método | Descrição |
|------|--------|-----------|
| `/api/gallery/presign` | POST | Gerar URL presigned para upload |
| `/api/gallery/confirm` | POST | Confirmar upload e salvar metadata |
| `/api/gallery/me` | GET | Galeria do jogador logado |
| `/api/gallery/:userId` | GET | Galeria pública |
| `/api/gallery/:assetId` | PUT | Atualizar metadata do item |
| `/api/gallery/:assetId` | DELETE | Soft delete de item |

### Upload de imagem (`/api/upload`)
| Rota | Método | Descrição |
|------|--------|-----------|
| `/api/upload/image` | POST | Upload de foto de perfil |

### Mensagens (`/api/conversations`)
| Rota | Método | Descrição |
|------|--------|-----------|
| `/api/conversations` | GET | Listar conversas |
| `/api/conversations` | POST | Criar conversa |
| `/api/conversations/:id/messages` | GET | Mensagens da conversa |

### Assinatura (`/api/subscription`)
| Rota | Método | Descrição |
|------|--------|-----------|
| `/api/subscription/me` | GET | Status da assinatura |
| `/api/subscription/checkout` | POST | Criar checkout MercadoPago |

### Webhooks
| Rota | Método | Descrição |
|------|--------|-----------|
| `/api/webhooks/mercadopago` | POST | IPN do MercadoPago |

### Favoritos (`/api/favorites`)
| Rota | Método | Descrição |
|------|--------|-----------|
| `/api/favorites` | GET | Listar favoritos |
| `/api/favorites` | POST | Adicionar favorito |
| `/api/favorites/:id` | DELETE | Remover favorito |

### Admin (`/api/admin`)
| Rota | Método | Descrição |
|------|--------|-----------|
| `/api/admin/users` | GET | Listar usuários |
| `/api/admin/users/:id` | GET | Detalhes do usuário |
| `/api/admin/users/:id/ban` | POST | Banir usuário |
| `/api/admin/users/:id/unban` | POST | Desbanir usuário |
| `/api/admin/reports` | GET | Listar denúncias |
| `/api/admin/reports/:id/resolve` | POST | Resolver denúncia |

### Health
| Rota | Método | Descrição |
|------|--------|-----------|
| `/health` | GET | Health check do servidor |

---

## Build de produção

### Backend

```bash
cd apps/api
npm run build
npm start
```

### Frontend

```bash
cd apps/web
npm run build
npm start
```

### Docker (todos os serviços)

```bash
# Na raiz de Projeto/
docker compose up --build
```

---

## Testes

```bash
cd apps/api

# Rodar todos os testes
npm test

# Rodar testes em modo watch
npm run test:watch

# Rodar testes de auth especificamente
npm run test:auth
```

> **Nota:** Os testes exigem PostgreSQL rodando localmente. Suba o banco com `docker compose up postgres -d` antes de rodar os testes.

---

## Estrutura de planos

| Plano | Para | Galeria | Vídeo | Busca | Preço |
|-------|------|---------|-------|-------|-------|
| **Free** | Jogador/Time | 5 itens | Não | Limitado | Grátis |
| **Craque** | Jogador | 20 itens | Sim | Completo | R$ 19,90/mês |
| **Titular** | Time | — | — | Completo | R$ 29,90/mês |
| **Campeão** | Time | — | — | Completo | R$ 49,90/mês |
