# Design: Deploy On-Demand com GitHub Actions + Pulumi

**Data:** 2026-05-25  
**Status:** Aprovado  
**Escopo:** Infra (`/infra`) + GitHub Actions (`.github/workflows/`)

---

## Problema

EC2 rodando 24/7 em `sa-east-1` gera custo desnecessário (~$7-8/mês). Sem forma de subir/destruir tudo com botão. DNS quebra a cada recriação por falta de IP fixo. Certbot falha silenciosamente se DNS não propagou.

---

## Solução

Dois novos workflows GitHub Actions (`provision` e `destroy`) + mudança de região para `us-east-1` + retry automático de certbot no bootstrap. Custo cai para **$0 quando destruído**, ~$0.08 no dia de uso.

---

## Arquitetura

```
GitHub Actions UI
├── provision.yml  → pulumi up  → EC2 + tudo configurado → imprime IP
├── destroy.yml    → pulumi destroy → mata tudo (EC2, S3, SG, key pair)
└── deploy.yml     → push main → build GHCR → SSH deploy (existente)

EC2 (t3.micro, us-east-1, Ubuntu 24.04)
├── Nginx (reverse proxy)
│   ├── varzeapro.online       → Web (3001)
│   └── api.varzeapro.online   → API (3000)
├── Certbot (HTTPS automático, retry em background)
└── Docker Compose (prod)
    ├── PostgreSQL 18.3
    ├── API (Fastify) — imagem GHCR
    └── Web (React Router SSR) — imagem GHCR

DNS: Hostinger (manual — atualizar A records após pulumi up)
```

---

## Seção 1 — Mudança de Região

**Arquivo:** `infra/Pulumi.production.yaml`

Alterar `awsRegion` de `sa-east-1` para `us-east-1`.

| Recurso | sa-east-1 | us-east-1 | Economia |
|---|---|---|---|
| t3.micro/hora | $0.0152 | $0.0104 | -32% |
| S3 /GB/mês | $0.030 | $0.023 | -23% |

---

## Seção 2 — Elastic IP removido / destroy total

Sem EIP persistente. `pulumi destroy` mata **tudo**: EC2, S3, security group, key pair.

Após `pulumi up`, novo IP é impresso no job summary. Usuário:
1. Atualiza 3 A records no Hostinger (`varzeapro.online`, `www`, `api`)
2. Atualiza secret `EC2_HOST` no GitHub

DNS Hostinger propaga em 5-30min. Certbot detecta automaticamente via retry.

---

## Seção 3 — GitHub Actions: provision.yml

**Trigger:** `workflow_dispatch` (botão manual no GitHub)

**Passos:**
1. Checkout do repo
2. Setup Node.js + install deps em `/infra`
3. Setup Pulumi CLI
4. `pulumi up --yes --stack production`
5. Captura `pulumi stack output instancePublicIp`
6. Posta no job summary:
   ```
   ✅ EC2 provisionada!
   IP: <ip>
   Próximos passos:
   1. Hostinger: A records → <ip>
   2. GitHub Secrets: EC2_HOST → <ip>
   3. Aguardar DNS (~5-30min) → HTTPS sobe automático
   ```

**Secrets necessários:**
| Secret | Descrição |
|---|---|
| `PULUMI_ACCESS_TOKEN` | Token do pulumi.com |
| `AWS_ACCESS_KEY_ID` | IAM user com permissão EC2+S3+IAM |
| `AWS_SECRET_ACCESS_KEY` | idem |

**Permissões IAM mínimas:** `AmazonEC2FullAccess`, `AmazonS3FullAccess`, `IAMFullAccess`

---

## Seção 4 — GitHub Actions: destroy.yml

**Trigger:** `workflow_dispatch` com input obrigatório `confirm` = `"yes"`

**Passos:**
1. Valida input (`confirm == "yes"` → prossegue, senão falha)
2. Checkout + setup igual ao provision
3. `pulumi destroy --yes --stack production`
4. Job summary: `🗑️ Tudo destruído. Custo: $0.`

---

## Seção 5 — Bootstrap: certbot retry

**Arquivo:** `infra/index.ts` (bloco certbot no `userData`)

**Mudança:** adicionar retry loop em background após tentativa inicial.

```bash
# Tentativa imediata (pode falhar se DNS não propagou)
certbot --nginx -n --agree-tos -m diogosarti13@gmail.com \
  -d ${domain} -d www.${domain} -d api.${domain} || true

# Retry em background: a cada 5min por até 2h
(
  for i in $(seq 1 24); do
    sleep 300
    certbot --nginx -n --agree-tos -m diogosarti13@gmail.com \
      -d ${domain} -d www.${domain} -d api.${domain} \
      && echo "Certbot OK na tentativa $i" \
      && break
    echo "Certbot tentativa $i falhou, aguardando..."
  done
) &
```

Site fica acessível em HTTP imediatamente. HTTPS sobe assim que DNS propagar, sem intervenção manual.

---

## Fluxo Completo — Dia de Apresentação

```
1. GitHub → Actions → provision → Run workflow
   └── ~8-12min → EC2 criada, containers up, nginx OK
   └── Job summary: IP = 3.x.x.x

2. Hostinger DNS → 3 A records apontando para 3.x.x.x
   └── ~5-30min para propagar

3. GitHub → Settings → Secrets → EC2_HOST = 3.x.x.x

4. Certbot dispara sozinho → HTTPS ativo automaticamente

5. (Opcional) push na main → deploy.yml atualiza containers

── APRESENTAÇÃO ──────────────────────────────

6. GitHub → Actions → destroy → confirm: yes → $0
```

---

## Custo

| Estado | Custo |
|---|---|
| Destruído | **$0.00** |
| Rodando 8h (dia de demo) | **~$0.08** |
| Rodando 1 mês 24/7 | ~$7.50 |

---

## Configuração Inicial (uma única vez)

Após implementação, configurar no GitHub (`Settings → Secrets → Actions`):

| Secret | Como obter |
|---|---|
| `PULUMI_ACCESS_TOKEN` | app.pulumi.com → Account → Access Tokens |
| `AWS_ACCESS_KEY_ID` | AWS IAM → Users → Security credentials |
| `AWS_SECRET_ACCESS_KEY` | idem |
| `EC2_HOST` | Atualizar após cada `pulumi up` |
| `EC2_SSH_KEY` | Já deve existir — chave privada SSH |
| `VITE_API_URL` | `https://api.varzeapro.online` (fixo) |

---

## Arquivos Modificados / Criados

| Arquivo | Ação |
|---|---|
| `infra/Pulumi.production.yaml` | Mudar `awsRegion` para `us-east-1` |
| `infra/index.ts` | Adicionar retry certbot no userData |
| `.github/workflows/provision.yml` | Criar (novo) |
| `.github/workflows/destroy.yml` | Criar (novo) |
