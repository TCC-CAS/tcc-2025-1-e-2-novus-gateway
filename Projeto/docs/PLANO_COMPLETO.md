# VarzeaPro — Plano Completo: Bugs, Features Faltantes e Deploy AWS

> Gerado em: 2026-05-12
> Branch: `dev`

---

## Sumário

1. [Bugs Encontrados](#1-bugs-encontrados)
2. [Features Faltantes — Prioridade Alta](#2-features-faltantes--prioridade-alta)
3. [Features Faltantes — Prioridade Média](#3-features-faltantes--prioridade-média)
4. [Features Faltantes — Prioridade Baixa](#4-features-faltantes--prioridade-baixa)
5. [Galeria do Jogador — Design Completo](#5-galeria-do-jogador--design-completo)
6. [Deploy na AWS — Passo a Passo](#6-deploy-na-aws--passo-a-passo)
7. [Estimativa de Custo](#7-estimativa-de-custo)
8. [Ordem Sugerida de Implementação](#8-ordem-sugerida-de-implementação)

---

## 1. Bugs Encontrados

### BUG-01: Filtro de posição na busca de jogadores não é aplicado no backend

**Severidade:** Alta
**Arquivos:**
- `apps/api/src/routes/search.ts:24` — desestrutura `position` do query mas **nunca usa**
- `apps/web/app/routes/time/buscar-jogadores.tsx:45` — envia `position` como param

**O que acontece:** O time seleciona "Goleiro" no filtro de posição, mas a API retorna jogadores de todas as posições. O contrato `SearchPlayersQuerySchema` inclui `position: PositionSchema.optional()`, o frontend envia o parâmetro, mas o backend ignora completamente.

**Causa:** Na linha 24 de `search.ts`, `position` é desestruturado do `request.query`, mas **nenhum filtro SQL é adicionado** para ele. Os filtros para `skills`, `availability`, `minAge` e `maxAge` existem, mas `position` foi esquecido.

**Fix necessário:**
```typescript
// Em apps/api/src/routes/search.ts, dentro do handler GET /players:
// Adicionar após o filtro de skills (linha ~51):

if (position) {
  filters.push(
    sql`${players.positions} @> ARRAY[${position}]::text[]` as unknown as ReturnType<typeof sql>
  )
}
```

**Detalhe:** O campo `positions` no DB é `text[]` (array), então precisa usar `@>` (contém) em vez de `=`, porque um jogador pode ter múltiplas posições (ex: `["goleiro", "zagueiro"]`).

---

### BUG-02: Filtro de região na busca de jogadores não é aplicado no backend

**Severidade:** Média
**Arquivos:**
- `apps/api/src/routes/search.ts` — `region` está no contrato mas não é filtrado
- `apps/web/app/routes/time/buscar-jogadores.tsx:47` — envia `region` como param

**O que acontece:** O time digita uma região no campo de busca, mas a API ignora. Resultado: mostra jogadores de todas as regiões.

**Causa:** O contrato `SearchPlayersQuerySchema` inclui `region`, o frontend envia, mas o backend não tem o filtro. A tabela `players` **não tem coluna `region`** — os jogadores só têm `availability`, `phone`, etc. Não há como filtrar por região sem adicionar a coluna ao schema.

**Fix necessário:**
1. Adicionar coluna `region` (text) e `city` (text) na tabela `players` (nova migration)
2. Adicionar ao Drizzle schema: `region: text("region"), city: text("city")`
3. Adicionar ao contrato `UpsertPlayerProfileRequestSchema`: `region` e `city` opcionais
4. Adicionar ao contrato `PlayerProfileSchema` e `PlayerSummarySchema`
5. Adicionar no frontend de editar perfil os campos de região e cidade
6. Adicionar o filtro no backend: `if (region) { filters.push(ilike(players.region, `%${region}%`)) }`

---

### BUG-03: Jogador não pode selecionar nível de competitividade (amador, recreativo, etc.)

**Severidade:** Alta
**Arquivos:**
- `shared/contracts/players.ts` — **não existe campo `level`** no perfil do jogador
- `apps/api/src/db/schema/players.ts` — **sem coluna `level`**
- `apps/web/app/routes/jogador/perfil-editar.tsx` — sem campo de nível
- `apps/web/app/routes/onboarding.tsx` — sem campo de nível

**O que acontece:** Times têm `level` (amador, recreativo, semi-profissional, outro), mas jogadores **não têm campo equivalente**. Um jogador que só quer jogar pelada recreativa aparece para times semi-profissionais, e vice-versa.

**Fix necessário:**
1. Adicionar coluna `level` no schema do jogador (novo enum ou text):
   ```sql
   ALTER TABLE players ADD COLUMN level text;
   ```
2. Adicionar ao contrato `PlayerProfile` e `UpsertPlayerProfileRequest`
3. Adicionar no onboarding e na tela de editar perfil um Select com os níveis
4. Adicionar filtro de `level` na busca de jogadores (times filtram jogadores por nível)

---

### BUG-04: Busca de times — jogador goleiro vê times buscando atacante

**Severidade:** Alta (relacionado ao BUG-01)
**Arquivos:**
- `apps/web/app/routes/jogador/buscar-times.tsx`

**O que acontece:** O jogador que é goleiro busca times. O frontend mostra um filtro "Vaga" (`openPosition`), que funciona no backend (a rota `/search/teams` filtra corretamente). **O problema real** é que o frontend **não sugere automaticamente** as posições do jogador como filtro padrão. O jogador vê todos os times, incluindo aqueles que não têm vaga para goleiro.

**Fix sugerido:** Quando o jogador abre a busca de times, pré-filtrar `openPosition` com as posições dele (se ele é goleiro, mostrar por padrão times com vaga de goleiro). Não bloquear, mas sugerir.

---

### BUG-05: Frontend de busca de jogadores — "SEM REGIÃO DEFINIDA" hardcoded

**Severidade:** Baixa
**Arquivos:**
- `apps/web/app/routes/time/buscar-jogadores.tsx:134-136`

**O que acontece:** No card de cada jogador, a região aparece sempre como "SEM REGIÃO DEFINIDA" porque a tabela `players` não tem coluna `region`. Mesmo quando o jogador preencher região no futuro, o `PlayerSummarySchema` precisa incluir o campo.

---

### BUG-06: Frontend de busca de times — não mostra o `openPosition` selecionado no card destacado

**Severidade:** Baixa
**Arquivos:**
- `apps/web/app/routes/jogador/buscar-times.tsx:152-158`

**O que acontece:** Quando o jogador filtra por "goleiro", os times retornados mostram TODAS as vagas abertas igualmente. Seria útil destacar visualmente qual vaga corresponde ao filtro.

---

### BUG-07: Onboarding do jogador não tem campo de nível/competitividade

**Severidade:** Média (relacionado ao BUG-03)
**Arquivos:**
- `apps/web/app/routes/onboarding.tsx:204-319` (step 1 do jogador)

**O que acontece:** O onboarding pede posição, habilidades, dados físicos, mas **não pergunta em qual nível o jogador quer atuar** (amador, recreativo, etc.). Isso é fundamental para a busca funcionar bem.

---

### BUG-08: Campo `position` no contrato de busca de jogadores — frontend envia mas backend ignora

**Severidade:** Alta (duplicado com BUG-01, mas listado separadamente para rastreamento)

**Contrato `SearchPlayersQuerySchema`:**
```typescript
position: PositionSchema.optional(), // ← existe no contrato
```

**Backend `search.ts:24`:**
```typescript
const { page = 1, pageSize = 10, skills, availability, minAge, maxAge } = request.query
// ↑ position NÃO é desestruturado, então nunca é usado!
```

Na verdade, verificando melhor, `position` **não está sendo desestruturado**. Mas o TypeScript não reclama porque o Zod valida o query string completo — `position` chega no `request.query` mas fica no objeto sem ser usado.

---

## 2. Features Faltantes — Prioridade Alta

### FEAT-01: Galeria do Jogador (fotos e vídeos de highlights)

**Status:** Não implementado
**Ver seção completa:** [Seção 5](#5-galeria-do-jogador--design-completo)

O plano de assinatura já tem a flag `videoHighlights` como feature gateada no plano CRAQUE, mas não existe implementação. Jogadores não podem postar fotos de jogos, gols, ou vídeos de highlights.

---

### FEAT-02: Pagamento Real (MercadoPago ou Stripe)

**Status:** Simulado — upgrade de plano faz update direto no DB
**Arquivos:**
- `apps/api/src/routes/subscription.ts` — `POST /upgrade` faz `db.update(subscriptions).set({ planId })` direto

**O que falta:**
1. Integração com gateway de pagamento (MercadoPago é ideal para público brasileiro)
2. Webhook para confirmação de pagamento
3. Tela de checkout no frontend
4. Lógica de período (monthly/yearly), trial, etc.
5. Tratamento de pagamento recusado, retry, etc.

**Para TCC:** Pode usar o **sandbox do MercadoPago** — funciona igual ao real mas sem cobrar de verdade.

---

### FEAT-03: Envio de Email (SES ou similar)

**Status:** `console.log` apenas
**Arquivos:**
- Backend auth: reset de senha loga no console

**O que falta:**
1. Configurar AWS SES (ou Resend, SendGrid) como provedor SMTP
2. Templates de email: reset de senha, verificação de email, boas-vindas
3. Substituir `console.log` por chamada real de envio

---

### FEAT-04: Deploy em Produção (AWS)

**Status:** Não implementado
**Ver seção completa:** [Seção 6](#6-deploy-na-aws--passo-a-passo)

Sem IaC, CI/CD, nginx, CDN, ou configs de produção.

---

### FEAT-05: Verificação de Email

**Status:** Campo existe no schema mas sem fluxo
**Arquivos:**
- `apps/api/src/db/schema/verifications.ts` — tabela existe (Better Auth)
- `apps/api/src/db/schema/users.ts` — campo `emailVerified` existe

**O que falta:** Better Auth suporta verificação de email nativamente, mas não está configurado no `lib/auth.ts`. Precisa:
1. Habilitar `emailVerification` no Better Auth config
2. Configurar envio de email (depende de FEAT-03)
3. Tela de "verifique seu email" pós-cadastro
4. Redirecionamento pós-verificação

---

## 3. Features Faltantes — Prioridade Média

### FEAT-06: Sistema de Notificações

**Status:** Não implementado

Sem notificações para: nova mensagem, novo seguidor, time interessado, reporte resolvido, etc.

**Implementação sugerida:**
- Notificações in-app (ícone de sino no header)
- Tabela `notifications` no DB
- Socket.io para push em tempo real
- Marcar como lida, contagem de não lidas

---

### FEAT-07: Testes de Upload e Pipeline de Imagens

**Status:** 18 arquivos de teste, mas nenhum para upload

**Arquivos sem cobertura:**
- `apps/api/src/lib/images/validator.ts`
- `apps/api/src/lib/images/processor.ts`
- `apps/api/src/lib/images/storage.ts`
- `apps/api/src/lib/images/service.ts`
- `apps/api/src/routes/upload.ts`

---

### FEAT-08: CI/CD Pipeline (GitHub Actions)

**Status:** Nenhum pipeline existe

**Sugerido:**
```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  test-api:
    runs-on: ubuntu-latest
    services:
      postgres: { image: postgres:18, ... }
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter api test
  deploy:
    needs: test-api
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: aws-actions/configure-aws-credentials@v4
      - run: ssh ec2-user@... "cd /var/app && ./deploy.sh"
```

---

### FEAT-09: MSW (Mock Service Worker) para Desenvolvimento Frontend

**Status:** Referenciado no README mas não implementado

O `VITE_USE_MOCK` existe no `.env.example` mas não há handlers MSW. Isso significa que para desenvolver no frontend, o backend precisa estar rodando obrigatoriamente.

---

### FEAT-10: Página de Planos Conectada

**Status:** `planos.tsx` existe mas é estático

Precisa conectar com o pagamento real (FEAT-02) e com o `subscriptionApi.upgrade()`.

---

## 4. Features Faltantes — Prioridade Baixa

### FEAT-11: OG Tags / SEO para Perfis Públicos

Perfis públicos (`/jogadores/:id`, `/times/:id`) sem meta tags para compartilhamento em redes sociais.

### FEAT-12: Feedback Visual de Rate Limiting

Frontend não mostra nenhum feedback quando a API retorna 429 (rate limited).

### FEAT-13: Filtros Avançados de Busca (gated por plano)

`advancedFilters` está no plano TITULAR/CAMPEAO mas sem UI dedicada. Poderia incluir:
- Filtro por faixa de altura/peso
- Filtro por idade exata
- Ordenação por relevância
- Filtro por disponibilidade (dias da semana)

### FEAT-14: Página de Configurações Funcional

`configuracoes.tsx` existe mas precisa de:
- Troca de senha
- Deletar conta
- Gerenciar notificações
- Exportar dados

---

## 5. Galeria do Jogador — Design Completo

### Arquitetura: Presigned URL Direct Upload

```
┌──────────┐     1. POST /api/gallery/presign     ┌──────────┐
│ Frontend  │ ──────────────────────────────────► │  Backend  │
│           │ ◄────────────────────────────────── │  (Fastify)│
│           │     { uploadUrl, key, assetId }      │           │
│           │                                      │           │
│           │     2. PUT {file} diretamente        │           │
│           │ ──────────────────────────────────► │           │
│           │              AWS S3                   │           │
│           │ ◄────────────────────────────────── │           │
│           │     200 OK                           │           │
│           │                                      │           │
│           │     3. POST /api/gallery/confirm      │           │
│           │ ──────────────────────────────────► │  Backend  │
│           │ ◄────────────────────────────────── │           │
│           │     { asset }                         │           │
└──────────┘                                       └──────────┘
```

**Vantagens:**
- Arquivo nunca passa pelo backend (economia de CPU/memória/banda)
- Upload direto para S3 usando URL assinada (TTL configurável)
- Backend só coordena metadados
- Funciona para imagens E vídeos (só muda o Content-Type)

### Schema do Banco

```sql
-- Migration 0004
CREATE TABLE gallery_media (
  id text PRIMARY KEY,
  owner_user_id text NOT NULL REFERENCES users(id),
  media_type text NOT NULL DEFAULT 'image',  -- 'image' | 'video'
  storage_key text NOT NULL,                  -- "gallery/{userId}/{uuid}"
  file_name text NOT NULL,
  mime_type text NOT NULL,
  size_bytes bigint NOT NULL DEFAULT 0,
  width integer,
  height integer,
  duration_seconds integer,                   -- apenas para vídeos
  caption text,
  is_highlight boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  thumbnail_url text,                         -- presigned URL (imagem menor)
  medium_url text,
  original_url text,
  is_deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_gallery_owner ON gallery_media(owner_user_id);
CREATE INDEX idx_gallery_owner_active ON gallery_media(owner_user_id)
  WHERE is_deleted = false;
```

### Rotas da API

```typescript
// POST /api/gallery/presign
// Body: { fileName, mediaType: "image" | "video", contentType }
// Response: { uploadUrl, key, assetId }
// Gera presigned PUT URL para o S3

// POST /api/gallery/confirm
// Body: { assetId, caption?, isHighlight? }
// Response: { asset } (GalleryMedia)
// Confirma que o upload foi concluído no S3

// GET /api/gallery/:userId
// Response: { data: GalleryMedia[] }
// Lista galeria pública (retorna presigned GET URLs)

// GET /api/gallery/me
// Response: { data: GalleryMedia[] }
// Lista galeria do próprio jogador

// DELETE /api/gallery/:assetId
// Response: { success: true }
// Remove mídia (soft delete + delete S3)

// PUT /api/gallery/:assetId
// Body: { caption?, isHighlight?, sortOrder? }
// Response: { asset }
// Atualiza metadados (caption, destaque, ordem)

// POST /api/gallery/reorder
// Body: { items: [{ id, sortOrder }] }
// Reordena galeria
```

### Contrato Compartilhado (shared/contracts/gallery.ts)

```typescript
export const GalleryMediaTypeSchema = z.enum(["image", "video"]);

export const GalleryMediaSchema = z.object({
  id: z.string(),
  mediaType: GalleryMediaTypeSchema,
  caption: z.string().optional(),
  isHighlight: z.boolean(),
  sortOrder: z.number(),
  thumbnailUrl: z.string().optional(),
  mediumUrl: z.string().optional(),
  originalUrl: z.string(),
  createdAt: z.string().datetime(),
});

export const PresignRequestSchema = z.object({
  fileName: z.string(),
  mediaType: GalleryMediaTypeSchema,
  contentType: z.string(),
});

export const PresignResponseSchema = z.object({
  uploadUrl: z.string().url(),
  key: z.string(),
  assetId: z.string(),
});

export const ConfirmUploadSchema = z.object({
  assetId: z.string(),
  caption: z.string().optional(),
  isHighlight: z.boolean().optional(),
});
```

### Componentes Frontend

1. **`<GalleryUpload />`** — Drag-and-drop, mostra progresso, valida tipo/tamanho
2. **`<GalleryGrid />`** — Grid responsivo de mídia com lazy loading
3. **`<GalleryItem />`** — Card individual com imagem/vídeo, caption, ações
4. **`<VideoPlayer />`** — Player simples para vídeos (HTML5 video)

### Gating por Plano

```typescript
// No plan context:
canUploadVideo(): boolean  // Só CRAQUE+
maxGalleryItems(): number  // FREE: 5, CRAQUE: 20, etc.
```

---

## 6. Deploy na AWS — Passo a Passo

### Arquitetura

```
Route 53 → CloudFront (CDN/HTTPS) → EC2 (Docker Compose)
                                        ├── PostgreSQL 18
                                        ├── API (Fastify :3000)
                                        └── Web (React SSR :3000)
S3 (varzeapro-media) ← upload direto do frontend
SES ← reset de senha / verificação
```

### Passo 1 — Criar Conta AWS e IAM

1. Acesse https://aws.amazon.com/ e crie uma conta (cartão de crédito necessário)
2. Vá em **IAM → Users → Create User**
3. Nome: `varzeapro-deploy`, marque **Programmatic access**
4. Anexe policies gerenciadas:
   - `AmazonEC2FullAccess`
   - `AmazonS3FullAccess`
   - `AmazonSESFullAccess`
   - `AWSCertificateManagerFullAccess` (para HTTPS)
5. Salve **Access Key ID** e **Secret Access Key**

### Passo 2 — Criar Bucket S3

```bash
# Instalar AWS CLI
pip install awscli
aws configure

# Criar bucket em São Paulo (menor latência para Brasil)
aws s3api create-bucket \
  --bucket varzeapro-media \
  --region sa-east-1 \
  --create-bucket-configuration LocationConstraint=sa-east-1

# Bloquear acesso público
aws s3api put-public-access-block \
  --bucket varzeapro-media \
  --public-access-block-configuration \
    BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

# Configurar CORS (upload direto do frontend)
aws s3api put-bucket-cors --bucket varzeapro-media --cors-configuration '{
  "CORSRules": [{
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT", "GET", "DELETE"],
    "AllowedOrigins": ["https://seudominio.com", "https://www.seudominio.com"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }]
}'
```

### Passo 3 — Provisionar EC2

1. **EC2 → Launch Instance**
   - **Name:** `varzeapro-prod`
   - **AMI:** Ubuntu 24.04 LTS (ami-0c... atual)
   - **Instance type:** `t3.medium` (2 vCPU, 4GB RAM)
   - **Key pair:** Criar novo `varzeapro-key`, salvar `.pem`
   - **Storage:** 30GB SSD gp3
   - **Security Group** (criar novo `varzeapro-sg`):

   | Tipo | Protocolo | Porta | Origem |
   |------|-----------|-------|--------|
   | SSH | TCP | 22 | Seu IP only |
   | HTTP | TCP | 80 | 0.0.0.0/0 |
   | HTTPS | TCP | 443 | 0.0.0.0/0 |

   - **Advanced → IAM role:** Criar role `varzeapro-ec2-role` com policy:
     ```json
     {
       "Effect": "Allow",
       "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject", "s3:ListBucket"],
       "Resource": ["arn:aws:s3:::varzeapro-media", "arn:aws:s3:::varzeapro-media/*"]
     }
     ```
     Isso permite que a API acesse o S3 sem credenciais hardcoded.

2. **Conectar:**
   ```bash
   chmod 400 varzeapro-key.pem
   ssh -i varzeapro-key.pem ubuntu@<EC2_PUBLIC_IP>
   ```

### Passo 4 — Configurar o Servidor

```bash
# Atualizar
sudo apt update && sudo apt upgrade -y

# Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker ubuntu

# Nginx
sudo apt install -y nginx certbot python3-certbot-nginx

# Logout e login novamente para grupo docker
exit
ssh -i varzeapro-key.pem ubuntu@<EC2_PUBLIC_IP>
```

### Passo 5 — Deploy do Código

```bash
cd /home/ubuntu

# Clonar
git clone https://github.com/seu-usuario/seu-repo.git
cd seu-repo/Projeto

# Criar .env de produção
cat > .env << 'EOF'
# Trocar TODOS os secrets!
POSTGRES_PASSWORD=gerar-com-openssl-rand-hex-16
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://varzeapro:POSTGRES_PASSWORD@postgres:5432/varzeapro
JWT_SECRET=gerar-com-openssl-rand-hex-32
BETTER_AUTH_SECRET=gerar-com-openssl-rand-hex-32
BETTER_AUTH_URL=https://api.seudominio.com
CORS_ORIGIN=https://seudominio.com

# S3 (se usando IAM Role, deixar credenciais vazias)
S3_ENDPOINT=https://s3.sa-east-1.amazonaws.com
S3_REGION=sa-east-1
S3_BUCKET=varzeapro-media
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_PUBLIC_URL=
S3_USE_PATH_STYLE=false

IMAGE_MAX_SIZE_MB=10
IMAGE_MAX_DIMENSION=4000
PRESIGNED_URL_TTL_SECONDS=3600
UPLOAD_RATE_LIMIT_MAX=10
UPLOAD_RATE_LIMIT_WINDOW_MINUTES=60
EOF

# Substituir placeholders por valores reais
sed -i "s/gerar-com-openssl-rand-hex-16/$(openssl rand -hex 16)/" .env
sed -i "s/gerar-com-openssl-rand-hex-32/$(openssl rand -hex 32)/" .env
sed -i "s/POSTGRES_PASSWORD@/$(grep POSTGRES_PASSWORD .env | cut -d= -f2)@/" .env

# .env do web
cat > apps/web/.env << 'EOF'
VITE_API_URL=https://api.seudominio.com
VITE_USE_MOCK=false
EOF

# Build e start
docker compose -f docker-compose.prod.yml up -d --build
docker compose logs -f api  # verificar se subiu
```

### Passo 6 — Docker Compose de Produção

Criar `docker-compose.prod.yml` na raiz:

```yaml
services:
  postgres:
    image: postgres:18.3
    environment:
      POSTGRES_DB: varzeapro
      POSTGRES_USER: varzeapro
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U varzeapro"]
      interval: 5s
      timeout: 5s
      retries: 5
    volumes:
      - postgres_data:/var/lib/postgresql
    restart: always
    # Sem ports expostos — acessível apenas via rede Docker

  api:
    build: ./apps/api
    depends_on:
      postgres:
        condition: service_healthy
    env_file: .env
    environment:
      DATABASE_URL: postgresql://varzeapro:${POSTGRES_PASSWORD}@postgres:5432/varzeapro
    volumes:
      - uploads_data:/app/uploads
    restart: always
    # Sem ports expostos externamente

  web:
    build:
      context: ./apps/web
      args:
        VITE_API_URL: ${VITE_API_URL:-https://api.seudominio.com}
    depends_on:
      - api
    environment:
      VITE_API_URL: ${VITE_API_URL:-https://api.seudominio.com}
    restart: always

volumes:
  postgres_data:
  uploads_data:
```

### Passo 7 — Nginx Reverse Proxy

```nginx
# /etc/nginx/sites-available/varzeapro

# Frontend (React SSR)
server {
    listen 80;
    server_name seudominio.com www.seudominio.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Backend API + WebSocket
server {
    listen 80;
    server_name api.seudominio.com;

    client_max_body_size 12M;  # Upload de imagens

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Socket.io WebSocket
    location /socket.io/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/varzeapro /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default  # remover default
sudo nginx -t && sudo systemctl reload nginx
```

> **Nota:** O docker-compose de produção precisa expor as portas internamente:
> - API: `"3000:3000"` (para nginx proxy)
> - Web: `"3001:3000"` (para nginx proxy, porta diferente)
>
> Ajuste o `docker-compose.prod.yml` com `ports` e configure nginx para proxyar web na 3001.

### Passo 8 — HTTPS com Let's Encrypt

```bash
sudo certbot --nginx \
  -d seudominio.com \
  -d www.seudominio.com \
  -d api.seudominio.com
# Escolher opção 2 (redirect HTTP → HTTPS)
```

Certbot auto-renova via cron. Verificar com:
```bash
sudo certbot renew --dry-run
```

### Passo 9 — Configurar DNS

No registrador do domínio, criar registros:

| Tipo | Nome | Valor |
|------|------|-------|
| A | @ | `<EC2_PUBLIC_IP>` |
| A | www | `<EC2_PUBLIC_IP>` |
| A | api | `<EC2_PUBLIC_IP>` |

### Passo 10 — Script de Deploy

```bash
#!/bin/bash
# /home/ubuntu/deploy.sh
set -e
cd /home/ubuntu/seu-repo/Projeto

echo "=== $(date) — Starting deploy ==="
git pull origin main

echo "=== Rebuilding ==="
docker compose -f docker-compose.prod.yml up -d --build

echo "=== Running migrations ==="
docker compose -f docker-compose.prod.yml exec api npx drizzle-kit push

echo "=== Cleaning old images ==="
docker image prune -f

echo "=== Deploy complete ==="
docker compose -f docker-compose.prod.yml ps
```

Tornar executável: `chmod +x /home/ubuntu/deploy.sh`

### Passo 11 — SES para Emails (Opcional para TCC)

```bash
# Verificar domínio
aws ses verify-domain-identity --domain seudominio.com --region sa-east-1

# Verificar email
aws ses verify-email-identity --email-address noreply@seudominio.com --region sa-east-1

# Conta nova está em sandbox — solicitar produção:
# https://console.aws.amazon.com/ses/home#sending-limit
```

---

## 7. Estimativa de Custo

| Serviço | Detalhes | Custo/mês (USD) |
|---------|----------|-----------------|
| EC2 t3.medium | 2 vCPU, 4GB RAM | ~$30 |
| EBS 30GB gp3 | Disco da instância | ~$2.40 |
| S3 | ~5GB mídia + requests | ~$0.15 |
| Route 53 | 1 hosted zone | $0.50 |
| SES | Até 3.000 emails (free tier) | $0 |
| CloudFront (opcional) | CDN para mídia | ~$1 |
| **Total mensal** | | **~$34** |

**Com Reserved Instance (1 ano):** EC2 cai para ~$18 → total ~$22/mês

**Free Tier AWS (primeiro ano):**
- EC2 t3.micro: 750h grátis (mas é muito fraco — 1GB RAM)
- S3: 5GB grátis
- SES: 3.000 emails grátis

---

## 8. Ordem Sugerida de Implementação

### Fase 1 — Bugs Críticos (1-2 dias)
1. **BUG-01:** Adicionar filtro de `position` na busca de jogadores (3 linhas)
2. **BUG-02:** Adicionar coluna `region`/`city` no player + filtro
3. **BUG-03:** Adicionar campo `level` no perfil do jogador
4. **BUG-07:** Adicionar campo de nível no onboarding

### Fase 2 — Galeria do Jogador (3-4 dias)
1. Migration + schema `gallery_media`
2. Contrato compartilhado (`shared/contracts/gallery.ts`)
3. Rota de presign URL (`POST /api/gallery/presign`)
4. Rota de confirm (`POST /api/gallery/confirm`)
5. Rotas de listagem e delete
6. Componente `<GalleryUpload />`
7. Componente `<GalleryGrid />`
8. Integrar no perfil do jogador
9. Gating por plano (limite de itens, videos só CRAQUE+)

### Fase 3 — Deploy AWS (1-2 dias)
1. Criar `docker-compose.prod.yml`
2. Provisionar EC2, S3, IAM
3. Configurar nginx
4. HTTPS com certbot
5. DNS
6. Script de deploy

### Fase 4 — Polish (2-3 dias)
1. Pagamento sandbox (MercadoPago)
2. Email com SES
3. Notificações básicas
4. Testes de upload

---

## Anexo A — Resumo Visual dos Bugs

```
┌─────────────────────────────────────────────────────────────────┐
│                     BUGS ENCONTRADOS                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  BUG-01: position filter NOT applied in search.ts               │
│          ├─ Contract has: position: PositionSchema.optional()   │
│          ├─ Frontend sends: position=goleiro                    │
│          └─ Backend: IGNORES position param (never used)        │
│                                                                 │
│  BUG-02: region filter impossible — no column in players table  │
│          ├─ Contract has: region in SearchPlayersQuerySchema     │
│          ├─ Frontend sends: region=São Paulo                    │
│          └─ Database: players table has NO region column        │
│                                                                 │
│  BUG-03: players have NO "level" field                          │
│          ├─ Teams have: level (amador/recreativo/semi/outro)    │
│          ├─ Players have: NOTHING equivalent                    │
│          └─ Result: can't match player level to team level      │
│                                                                 │
│  BUG-04: no smart default filter for player→team search         │
│          ├─ Player is goleiro                                   │
│          ├─ Searches teams → sees ALL teams (all positions)     │
│          └─ Should suggest: "teams looking for goleiro"         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Anexo B — Checklist de Deploy

- [ ] Conta AWS criada
- [ ] IAM user com credenciais salvas
- [ ] S3 bucket criado com CORS e acesso público bloqueado
- [ ] EC2 provisionada (t3.medium, Ubuntu 24.04, security group)
- [ ] IAM role para EC2 (acesso S3)
- [ ] Docker instalado na EC2
- [ ] Nginx instalado e configurado
- [ ] Repositório clonado na EC2
- [ ] `.env` de produção criado com secrets reais
- [ ] `docker-compose.prod.yml` criado
- [ ] Containers rodando (`docker compose up -d --build`)
- [ ] Migrations executadas (`drizzle-kit push`)
- [ ] HTTPS configurado (certbot)
- [ ] DNS apontando para EC2
- [ ] SES verificado (se usar email)
- [ ] Script de deploy criado e testado
- [ ] Backup automático configurado (opcional: pg_dump cron)
