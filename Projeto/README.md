# VarzeaPro

Plataforma social para e-sports que conecta jogadores competitivos e times — "LinkedIn meets Discord" para a cena competitiva brasileira de games. Usuários criam perfis públicos, descobrem companheiros de equipe via busca avançada, comunicam-se via chat em tempo real e desbloqueiam funcionalidades através de planos de assinatura.

## Estrutura do Projeto

```
Projeto/
├── docker-compose.yml        # PostgreSQL para desenvolvimento
├── .env.example              # Variáveis para o Docker Compose
└── apps/
    ├── api/                  # Backend (Fastify + TypeScript)
    └── web/                  # Frontend (React 19 + React Router 7)
```

## Stack

### Frontend (`apps/web`)
- **React 19** + **React Router 7** (SSR habilitado)
- **TypeScript** + **Tailwind CSS 4** + **shadcn/ui**
- **TanStack React Query** para estado assíncrono
- **React Hook Form** + **Zod** para formulários e validação
- **MSW (Mock Service Worker)** para mock de API em desenvolvimento
- **Socket.io client** para mensagens em tempo real

### Backend (`apps/api`)
- **Fastify** + **TypeScript**
- **PostgreSQL** + **Drizzle ORM**
- **Better Auth** para autenticação
- **Socket.io** para WebSockets
- **Zod** para validação de entrada

## Pré-requisitos

- [Bun](https://bun.sh/) v1.0+ **(recomendado)** ou [Node.js](https://nodejs.org/) v20+
- [Docker](https://www.docker.com/) (para o banco de dados PostgreSQL)

## Como rodar

### Modo mock (só frontend, sem banco de dados)

Ideal para trabalhar no frontend sem precisar do backend rodando.

```bash
cd apps/web
bun install
```

Crie o `.env` copiando o exemplo:
```bash
cp .env.example .env
```

Edite `apps/web/.env` e defina:
```env
VITE_USE_MOCK=true
```

Inicie o servidor de desenvolvimento:
```bash
bun dev
```

A aplicação estará disponível em `http://localhost:5173`.

---

### Modo completo (frontend + backend + banco)

#### 1. Banco de dados (PostgreSQL via Docker)

Na raiz de `Projeto/`, copie o `.env` e suba o container:

```bash
cp .env.example .env
docker compose up postgres -d
```

#### 2. Backend

```bash
cd apps/api
bun install
cp .env.example .env
```

Edite `apps/api/.env` conforme necessário (veja a seção de variáveis abaixo), depois rode as migrações e inicie:

```bash
bun run db:migrate
bun dev
```

O servidor estará disponível em `http://localhost:3000`.

#### 3. Frontend

```bash
cd apps/web
bun install
cp .env.example .env
```

Edite `apps/web/.env`:
```env
VITE_API_URL=http://localhost:3000/api
VITE_USE_MOCK=false
```

```bash
bun dev
```

A aplicação estará disponível em `http://localhost:5173`.

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
| `BETTER_AUTH_SECRET` | Segredo para assinatura de tokens (min. 32 chars) | — |
| `BETTER_AUTH_URL` | URL base do servidor de autenticação | `http://localhost:3000` |
| `CORS_ORIGIN` | Origem permitida pelo CORS | `http://localhost:5173` |

### Frontend (`apps/web/.env`)

| Variável | Descrição | Padrão |
|---|---|---|
| `VITE_API_URL` | URL base da API backend | `/api` (mesma origem) |
| `VITE_USE_MOCK` | Ativar mock MSW (`"true"` ou `"false"`) | `false` em dev |

---

## Scripts úteis

### Backend (`apps/api`)

```bash
bun dev              # Servidor em modo watch
bun run build        # Compila TypeScript
bun start            # Roda o build compilado
bun test             # Roda todos os testes
bun run db:migrate   # Aplica migrações do banco
bun run db:generate  # Gera arquivos de migração a partir do schema
```

### Frontend (`apps/web`)

```bash
bun dev              # Servidor de desenvolvimento
bun run build        # Build de produção
bun start            # Serve o build de produção
bun run typecheck    # Verificação de tipos TypeScript
```

---

## Build de produção

### Backend

```bash
cd apps/api
bun run build
bun start
```

### Frontend

```bash
cd apps/web
bun run build
bun start
```

### Docker (banco de dados)

```bash
# Na raiz de Projeto/
docker compose up postgres
```

> O `docker-compose.yml` atual sobe apenas o PostgreSQL. Os serviços de API e web são iniciados manualmente em desenvolvimento.
