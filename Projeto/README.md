# VarzeaPro

Plataforma web para conectar jogadores e times de e-sports, facilitando a busca, comunicação e gerenciamento de equipes.

## Estrutura do Projeto

```
Projeto/
└── apps/
    └── web/          # Frontend (React)
```

> Por enquanto, o projeto conta apenas com a aplicação frontend. O backend será adicionado futuramente.

## Stack

- **React 19** com **React Router 7** (SSR habilitado)
- **TypeScript**
- **Tailwind CSS 4** com componentes **shadcn/ui** e **Radix UI**
- **Vite 7** como bundler
- **TanStack React Query** para gerenciamento de estado assíncrono
- **React Hook Form** + **Zod** para formulários e validação
- **MSW (Mock Service Worker)** para mock de APIs durante o desenvolvimento
- **Bun** como runtime e gerenciador de pacotes

## Funcionalidades

- Autenticação (login, cadastro, recuperação de senha)
- Onboarding de novos usuários
- Perfil de jogador (visualização e edição)
- Perfil de time (visualização e edição)
- Busca de jogadores e times
- Sistema de mensagens
- Planos de assinatura
- Painel administrativo (gerenciamento de usuários e moderação)

## Pré-requisitos

- [Bun](https://bun.sh/) (v1.0+) **(recomendado)** ou [Node](https://nodejs.org/) (v24.0+)

> **Recomendação:** Utilize o **Bun** como runtime e gerenciador de pacotes para melhor performance e compatibilidade com o projeto.

## Como rodar

### 1. Clone o repositório

```bash
git clone <url-do-repositorio>
cd tcc-2025-1-e-2-novus-gateway/Projeto/apps/web
```

### 2. Instale as dependências

**Com Bun:**
```bash
bun install
```

**Com Node (npm):**
```bash
npm install
```

### 3. Inicie o servidor de desenvolvimento

**Com Bun:**
```bash
bun dev
```

**Com Node (npm):**
```bash
npm run dev
```

A aplicação estará disponível em `http://localhost:5173` (ou na porta indicada no terminal).

### Build de produção

**Com Bun:**
```bash
bun run build
bun start
```

**Com Node (npm):**
```bash
npm run build
npm start
```

### Type checking

```bash
bun run typecheck
# ou
npm run typecheck
```

## Docker

O frontend possui um Dockerfile para deploy containerizado:

```bash
cd Projeto/apps/web
docker build -t varzeapro-web .
docker run -p 3000:3000 varzeapro-web
```

## Mocks

O projeto utiliza **MSW** para simular respostas de API durante o desenvolvimento. Os handlers ficam em `apps/web/mocks/handlers/` e os dados de fixture em `apps/web/mocks/fixtures/`.
