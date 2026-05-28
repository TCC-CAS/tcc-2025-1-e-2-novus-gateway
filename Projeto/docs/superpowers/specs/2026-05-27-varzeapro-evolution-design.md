# VárzeaPro Evolution — Design Spec

**Data:** 2026-05-27  
**Status:** Aprovado  
**Abordagem:** Feature-by-feature end-to-end (DB → API → contrato → frontend → teste)

---

## Contexto

VárzeaPro é uma rede social esportiva para futebol amador brasileiro. Este spec cobre 5 features de evolução solicitadas pelos stakeholders, implementadas em sequência para minimizar risco de integração.

**Regra de integração:** Frontend sempre integra com backend real. Sem MSW para novos endpoints.

---

## Ordem de Implementação

| # | Feature | DB changes | Nova tabela |
|---|---------|------------|-------------|
| F1 | Cadastro separado (CPF + campos por role) | sim | não |
| F2 | Acesso público (landing vitrine + perfis sem auth) | não | não |
| F3 | Rede social bilateral (busca jogador↔jogador + elenco no time) | sim | `team_members` |
| F4 | Gestão de partidas (horário, endereço, histórico regional) | sim | `matches` |
| F5 | Destaque de fotos de perfil (UX) | não | não |

**Dependência:** F2 depende de F1 (campo `teamName` precisa existir antes da vitrine). F3 e F4 são independentes. F5 pode ser feita junto com qualquer outra feature.

---

## F1 — Cadastro Separado (CPF + Campos por Role)

### Problema

`cadastro.tsx` tem um campo `name` genérico para jogador e time. Times precisam de "Nome do Time" e "Nome do Responsável" separados. CPF não é coletado.

### DB Migrations

```sql
-- users: CPF obrigatório, único
ALTER TABLE users ADD COLUMN cpf text UNIQUE;
-- nullable inicialmente para não quebrar dados existentes;
-- novos cadastros sempre enviarão cpf

-- teams: campo para nome do responsável
ALTER TABLE teams ADD COLUMN responsible_name text;
```

### Shared Contracts (`shared/contracts/auth.ts`)

`SignUpRequestSchema` atualizado:

```ts
cpf: z.string().regex(/^\d{11}$/, "CPF deve ter 11 dígitos sem pontuação"),
teamName: z.string().min(2, "Nome do time obrigatório").optional(),
// Refinement: se role=team, teamName é obrigatório
.refine(
  (data) => data.role !== "team" || (!!data.teamName && data.teamName.length >= 2),
  { message: "Nome do time é obrigatório para times", path: ["teamName"] }
)
```

### API (`apps/api/src/routes/auth.ts`)

No sign-up com `role=team`:
1. Criar usuário com `cpf`
2. Criar registro em `teams` com `name = teamName` e `responsible_name = name` (nome da pessoa)

No sign-up com `role=player`:
1. Criar usuário com `cpf` e `name`

### Frontend (`app/routes/cadastro.tsx`)

- Manter página única `/cadastro`
- Campo CPF para todos os roles (aceitar entrada formatada, armazenar só 11 dígitos)
- Quando `role=team`: campos "NOME DO TIME" (`teamName`) + "NOME DO RESPONSÁVEL" (`name`)
- Quando `role=player`: campo "NOME COMPLETO" (`name`)
- Labels mudam dinamicamente conforme seleção de role

### Testes

- Sign-up `role=team` sem `teamName` → erro de validação
- Sign-up com CPF duplicado → erro 409
- Sign-up com CPF inválido (não 11 dígitos) → erro de validação
- Sign-up `role=team` com campos corretos → `teams` criado com `responsible_name` e `name` corretos
- Sign-up `role=player` → `name` salvo corretamente

---

## F2 — Acesso Público (Landing Vitrine + Perfis sem Auth)

### Problema

- `GET /teams/:id` e `GET /players/:id` exigem `requireSession` — não acessíveis sem login
- `times.$id.tsx` e `jogadores.$id.tsx` estão dentro do `_authenticated-layout.tsx`
- Landing page `_index.tsx` mostra números estáticos (2.5K jogadores, 380+ times) em vez de dados reais

### Backend

**Remover auth de endpoints de perfil:**
- `GET /api/teams/:id` — remover `preHandler: [requireSession]`. Dados do perfil de time são públicos.
- `GET /api/players/:id` — idem.

**Novo endpoint de vitrine:**
- `GET /api/public/showcase` — sem auth, retorna:
  ```ts
  {
    teams: TeamSummary[],   // 6 times (mais recentes com logoUrl)
    players: PlayerSummary[] // 6 jogadores (mais recentes com avatarUrl)
  }
  ```
  Não expor `userId` nem dados sensíveis. Apenas campos de apresentação: `id, name, logoUrl/avatarUrl, level/positions, region, city`.

**Nova rota de listagem pública de times:**
- `GET /api/public/teams` — lista paginada de times sem auth (page, pageSize, region?)
  - Substitui a tela de "times contratando" como landing para visitantes

### Frontend

**Routes fora do layout autenticado** (`app/routes.ts`):
```ts
// Mover para fora do layout():
route("jogadores/:id", "routes/jogadores.$id.tsx"),
route("times/:id", "routes/times.$id.tsx"),
route("times", "routes/times.tsx"),  // nova: listagem pública
```

**`_index.tsx` (landing page):**
- Adicionar seção "TIMES EM DESTAQUE" com dados reais via `GET /api/public/showcase`
- Adicionar seção "JOGADORES EM DESTAQUE" com dados reais
- Substituir números estáticos por contagem real (adicionar `GET /api/public/stats` ou incluir no showcase)

**`routes/times.tsx` (nova):**
- Listagem pública de times com filtro por região
- CTA "VER PERFIL" em cada card → `/times/:id`
- CTA "CADASTRE SEU TIME" → `/cadastro`

**`routes/times.$id.tsx` e `jogadores.$id.tsx`:**
- Remover dependência de `useAuth` para dados básicos
- Manter CTA de contato apenas para usuários logados ("ENTRAR PARA CONTATAR")

### Testes

- `GET /api/teams/:id` sem token → 200 (não 401)
- `GET /api/players/:id` sem token → 200
- `GET /api/public/showcase` → retorna 6 times e 6 jogadores sem expor `userId`
- `/times/:id` acessível sem login (sem redirect para `/login`)
- `/jogadores/:id` acessível sem login

---

## F3 — Rede Social Bilateral

### F3a — Jogador Busca Outros Jogadores

**Problema:** `GET /search/players` requer `requireRole("team")`. Jogadores não conseguem descobrir outros jogadores.

**Backend — nova rota:**
- `GET /api/search/community-players` — autenticado (qualquer role), sem restrição de plano
- Filtros: `position`, `region`, `level` (sem age/skills avançados — isso é feature de recrutamento)
- Exclui o próprio usuário, exclui perfis `hidden=true`
- Sem paginação de plano — limite fixo de 20 resultados por página

**Frontend:**
- Nova rota `/jogador/buscar-jogadores` (já existe slot na nav)

  Espera: a rota `/jogador/buscar-times` já existe. A nova é "buscar jogadores" para o papel de jogador — diferente de `/time/buscar-jogadores` que é recrutamento.

- Filtros: posição, região, nível
- Cards de jogadores navegam para `/jogadores/:id`

### F3b — Elenco Visível no Perfil do Time

**Modelo de dados: Roster auto-declarativo**

Time declara quais jogadores fazem parte do elenco. Sem fluxo de convite/aceite (v2).

**DB — nova tabela:**
```sql
CREATE TABLE team_members (
  id text PRIMARY KEY,
  team_id text NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  player_id text NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  added_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(team_id, player_id)
);
```

**Backend — novas rotas:**
- `GET /api/teams/:id/roster` — lista pública de jogadores do time (sem auth)
  - Retorna: `[{ id, name, avatarUrl, positions, region }]`
- `POST /api/teams/me/roster` — adicionar jogador ao elenco
  - Body: `{ playerId: string }`
  - Valida que o `playerId` existe em `players`
- `DELETE /api/teams/me/roster/:playerId` — remover jogador

**Frontend:**
- `routes/times.$id.tsx`: nova seção "ELENCO" com avatars/nomes dos jogadores, link para perfil de cada um
- `routes/time/perfil-editar.tsx`: nova seção "GERENCIAR ELENCO"
  - Busca por nome de jogador (usando `/api/search/community-players`)
  - Adicionar/remover membros

### Testes

- Jogador autenticado consegue acessar `GET /search/community-players`
- Time autenticado consegue adicionar jogador ao roster
- Adicionar mesmo jogador duas vezes → erro 409
- `GET /teams/:id/roster` sem auth → 200
- Roster aparece em `times.$id.tsx`

---

## F4 — Gestão de Partidas

### Domínio novo — zero código existente

**DB — nova tabela `matches`:**
```sql
CREATE TABLE matches (
  id text PRIMARY KEY,
  team_id text NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  opponent_name text,
  match_date date NOT NULL,
  match_time time,
  address text,
  venue_name text,
  neighborhood text,
  city text,
  result text,
  status text NOT NULL DEFAULT 'scheduled',
  -- status: 'scheduled' | 'completed' | 'cancelled'
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX matches_team_id_idx ON matches(team_id);
CREATE INDEX matches_match_date_idx ON matches(match_date DESC);
```

**Shared Contracts (`shared/contracts/matches.ts` — novo arquivo):**
```ts
export const MatchStatusSchema = z.enum(["scheduled", "completed", "cancelled"])
export type MatchStatus = z.infer<typeof MatchStatusSchema>

export const CreateMatchRequestSchema = z.object({
  opponentName: z.string().optional(),
  matchDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // ISO date
  matchTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  address: z.string().optional(),
  venueName: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
})

export const UpdateMatchRequestSchema = CreateMatchRequestSchema.partial().extend({
  result: z.string().optional(),
  status: MatchStatusSchema.optional(),
})

export const MatchSchema = CreateMatchRequestSchema.extend({
  id: z.string(),
  teamId: z.string(),
  result: z.string().nullable(),
  status: MatchStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type Match = z.infer<typeof MatchSchema>
export type CreateMatchRequest = z.infer<typeof CreateMatchRequestSchema>
export type UpdateMatchRequest = z.infer<typeof UpdateMatchRequestSchema>
```

**Backend — novas rotas (`apps/api/src/routes/matches.ts`):**
- `GET /api/teams/:id/matches?status=&page=` — lista pública, paginada
- `POST /api/teams/me/matches` — criar (autenticado, role=team)
- `PUT /api/teams/me/matches/:matchId` — editar (autenticado, role=team, dono do time)
- `DELETE /api/teams/me/matches/:matchId` — cancelar (soft: status='cancelled')

**Frontend:**
- `routes/time/index.tsx` (dashboard): card "PRÓXIMO JOGO" com data, horário, local
- `routes/time/perfil-editar.tsx`: nova aba/seção "JOGOS"
  - Form para criar novo jogo
  - Lista de jogos agendados com ação de editar/cancelar
  - Form de resultado para jogos passados
- `routes/times.$id.tsx` (público): seção "HISTÓRICO DE JOGOS"
  - Últimas 5 partidas completadas
  - Bairro/região em destaque para identificação geográfica
  - Próximo jogo agendado no topo

**API client (`app/lib/api-client.ts`):**
```ts
export const matchesApi = {
  getTeamMatches: (teamId: string, params?) => request<ListResponse<Match>>(...),
  createMatch: (data: CreateMatchRequest) => request<Match>(...),
  updateMatch: (matchId: string, data: UpdateMatchRequest) => request<Match>(...),
  deleteMatch: (matchId: string) => request<void>(...),
}
```

### Testes

- Criar partida com `matchDate` inválida → erro de validação
- `GET /teams/:id/matches` sem auth → 200
- Time A não consegue editar partida do time B → 403
- Partida criada aparece no dashboard do time
- Filtro por `status=scheduled` retorna apenas jogos futuros

---

## F5 — Destaque de Fotos de Perfil

**Frontend only — sem mudanças de backend.**

### Mudanças

**`routes/jogador/perfil-editar.tsx`:**
- Mover campo de foto/avatar para o topo do formulário (antes dos outros campos)
- Quando sem foto: estado visual com borda tracejada e texto "ADICIONE SUA FOTO — jogadores com foto recebem 3x mais contato"
- Botão de upload com preview inline

**`routes/time/perfil-editar.tsx`:**
- Idem para logo do time
- "ADICIONE O ESCUDO DO TIME"

**`routes/onboarding.tsx`:**
- Mover step de foto para o primeiro step após seleção de role

### Testes

- Visual: foto ausente mostra CTA correto
- Upload funciona e preview aparece antes de salvar
- Sem obrigatoriedade no backend (campo continua nullable)

---

## Resumo de Mudanças de Schema

| Tabela | Mudança |
|--------|---------|
| `users` | + `cpf text UNIQUE` |
| `teams` | + `responsible_name text` |
| `team_members` | nova tabela |
| `matches` | nova tabela |

## Resumo de Novos Endpoints

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/api/public/showcase` | não | 6 times + 6 jogadores para vitrine |
| GET | `/api/public/teams` | não | Listagem paginada de times |
| GET | `/api/teams/:id` | não | Perfil público de time (remover requireSession) |
| GET | `/api/players/:id` | não | Perfil público de jogador (remover requireSession) |
| GET | `/api/search/community-players` | sim (any role) | Busca comunitária jogador↔jogador |
| GET | `/api/teams/:id/roster` | não | Elenco do time |
| POST | `/api/teams/me/roster` | sim (team) | Adicionar jogador ao elenco |
| DELETE | `/api/teams/me/roster/:playerId` | sim (team) | Remover jogador do elenco |
| GET | `/api/teams/:id/matches` | não | Partidas do time |
| POST | `/api/teams/me/matches` | sim (team) | Criar partida |
| PUT | `/api/teams/me/matches/:matchId` | sim (team) | Editar partida |
| DELETE | `/api/teams/me/matches/:matchId` | sim (team) | Cancelar partida |

## Resumo de Novas Rotas Frontend

| Rota | Arquivo | Descrição |
|------|---------|-----------|
| `/times` | `routes/times.tsx` | Listagem pública de times — fora do layout autenticado |
| `/jogador/buscar-jogadores` | `routes/jogador/buscar-jogadores.tsx` | Jogador busca outros jogadores — dentro do `_player-layout.tsx` |

**`app/routes.ts` — mudanças necessárias:**
```ts
// Mover para fora do layout autenticado:
route("jogadores/:id", "routes/jogadores.$id.tsx"),
route("times/:id", "routes/times.$id.tsx"),
route("times", "routes/times.tsx"),  // nova

// Adicionar dentro do player layout:
route("buscar-jogadores", "routes/jogador/buscar-jogadores.tsx"),
```

## Notas de Contrato

- `times.$id.tsx` e `jogadores.$id.tsx` movidos para fora do layout autenticado
- `shared/contracts/matches.ts` — novo arquivo
- `shared/contracts/auth.ts` — `SignUpRequestSchema` atualizado com `cpf` e `teamName`
- `shared/contracts/teams.ts` — `UpsertTeamProfileRequest` sem mudanças (F1 altera só sign-up)
