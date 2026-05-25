# Deploy On-Demand Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir subir e destruir toda a infra com um botão no GitHub Actions, com região us-east-1 e certbot retry automático.

**Architecture:** Dois novos workflows (`provision.yml`, `destroy.yml`) com `workflow_dispatch`. Pulumi roda via GitHub Actions com credenciais AWS armazenadas como secrets. Certbot retenta em background até DNS propagar.

**Tech Stack:** Pulumi (TypeScript), GitHub Actions, AWS EC2 t3.micro (us-east-1), Docker Compose, Certbot

---

## Mapa de Arquivos

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `infra/index.ts` | Modificar linha 5 | Trocar região default para us-east-1 |
| `infra/index.ts` | Modificar linha 242 | Adicionar certbot retry loop |
| `.github/workflows/provision.yml` | Criar | Workflow para `pulumi up` com output do IP |
| `.github/workflows/destroy.yml` | Criar | Workflow para `pulumi destroy` com confirmação |

---

## Task 1: Trocar região default para us-east-1

**Files:**
- Modify: `infra/index.ts:5`

- [ ] **Step 1: Editar linha 5 do index.ts**

```typescript
// ANTES (linha 5):
const awsRegion = config.get("awsRegion") || "sa-east-1"

// DEPOIS:
const awsRegion = config.get("awsRegion") || "us-east-1"
```

- [ ] **Step 2: Verificar que só essa linha mudou**

```bash
cd /home/diogo/Projects/tcc-2025-1-e-2-novus-gateway
git diff infra/index.ts
```

Expected: só linha 5 alterada, `sa-east-1` → `us-east-1`

- [ ] **Step 3: Commit**

```bash
git add infra/index.ts
git commit -m "infra: change default region to us-east-1 (-32% compute cost)"
```

---

## Task 2: Certbot retry loop no bootstrap

**Files:**
- Modify: `infra/index.ts:242`

- [ ] **Step 1: Localizar bloco certbot atual**

```bash
grep -n "certbot\|HTTPS" infra/index.ts
```

Expected: linha ~241 com `# --- HTTPS (Certbot) ---` e linha ~242 com o comando certbot.

- [ ] **Step 2: Substituir linha 242 pelo retry loop**

Substituir este bloco exato em `infra/index.ts`:

```typescript
// ANTES (linhas 241-242):
# --- HTTPS (Certbot) ---
certbot --nginx -n --agree-tos -m diogosarti13@gmail.com -d ${domain} -d www.${domain} -d api.${domain} || echo "Certbot failed — DNS may not be ready yet"
```

Por:

```typescript
// DEPOIS:
# --- HTTPS (Certbot) ---
# Tentativa imediata (pode falhar se DNS ainda nao propagou)
certbot --nginx -n --agree-tos -m diogosarti13@gmail.com \
  -d ${domain} -d www.${domain} -d api.${domain} || true

# Retry em background: tenta a cada 5min por ate 2h
(
  for i in $(seq 1 24); do
    sleep 300
    certbot --nginx -n --agree-tos -m diogosarti13@gmail.com \
      -d ${domain} -d www.${domain} -d api.${domain} \
      && echo "Certbot OK na tentativa $i" \
      && break
    echo "Certbot tentativa $i falhou, aguardando DNS..."
  done
) &
```

> **Atenção:** esse bloco fica dentro de um template literal TypeScript (`` `...` ``). O `$` do shell (ex: `$(seq 1 24)`) é shell, não interpolação Pulumi — já está correto no contexto do template literal com Pulumi.interpolate.

- [ ] **Step 3: Verificar diff**

```bash
git diff infra/index.ts
```

Expected: bloco certbot substituído, retry loop em background adicionado.

- [ ] **Step 4: Commit**

```bash
git add infra/index.ts
git commit -m "infra: add certbot retry loop — auto HTTPS after DNS propagation"
```

---

## Task 3: Criar workflow provision.yml

**Files:**
- Create: `.github/workflows/provision.yml`

- [ ] **Step 1: Criar o arquivo**

Criar `.github/workflows/provision.yml` com o conteúdo:

```yaml
name: Provision Infrastructure

on:
  workflow_dispatch:

jobs:
  provision:
    name: pulumi up
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Install infra dependencies
        working-directory: infra
        run: npm ci

      - name: Pulumi up
        id: pulumi
        uses: pulumi/actions@v6
        with:
          command: up
          stack-name: production
          work-dir: infra
        env:
          PULUMI_ACCESS_TOKEN: ${{ secrets.PULUMI_ACCESS_TOKEN }}
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}

      - name: Get outputs
        id: outputs
        working-directory: infra
        run: |
          IP=$(pulumi stack output instancePublicIp --stack production 2>/dev/null || echo "N/A")
          echo "ip=$IP" >> $GITHUB_OUTPUT
        env:
          PULUMI_ACCESS_TOKEN: ${{ secrets.PULUMI_ACCESS_TOKEN }}
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}

      - name: Job summary
        run: |
          echo "## ✅ EC2 provisionada!" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "**IP:** \`${{ steps.outputs.outputs.ip }}\`" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "### Próximos passos" >> $GITHUB_STEP_SUMMARY
          echo "1. **Hostinger DNS** → atualizar 3 A records para \`${{ steps.outputs.outputs.ip }}\`" >> $GITHUB_STEP_SUMMARY
          echo "   - \`varzeapro.online\` → \`${{ steps.outputs.outputs.ip }}\`" >> $GITHUB_STEP_SUMMARY
          echo "   - \`www.varzeapro.online\` → \`${{ steps.outputs.outputs.ip }}\`" >> $GITHUB_STEP_SUMMARY
          echo "   - \`api.varzeapro.online\` → \`${{ steps.outputs.outputs.ip }}\`" >> $GITHUB_STEP_SUMMARY
          echo "2. **GitHub Secrets** → atualizar \`EC2_HOST\` para \`${{ steps.outputs.outputs.ip }}\`" >> $GITHUB_STEP_SUMMARY
          echo "3. **Aguardar DNS** (~5-30min) → HTTPS sobe automático via certbot retry" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "> Bootstrap leva ~8-12min para completar após criação da EC2." >> $GITHUB_STEP_SUMMARY
```

- [ ] **Step 2: Verificar YAML válido**

```bash
cd /home/diogo/Projects/tcc-2025-1-e-2-novus-gateway
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/provision.yml'))" && echo "YAML OK"
```

Expected: `YAML OK`

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/provision.yml
git commit -m "ci: add provision workflow — one-button pulumi up with IP summary"
```

---

## Task 4: Criar workflow destroy.yml

**Files:**
- Create: `.github/workflows/destroy.yml`

- [ ] **Step 1: Criar o arquivo**

Criar `.github/workflows/destroy.yml` com o conteúdo:

```yaml
name: Destroy Infrastructure

on:
  workflow_dispatch:
    inputs:
      confirm:
        description: 'Digite "yes" para confirmar destruição de TUDO'
        required: true
        default: ""

jobs:
  destroy:
    name: pulumi destroy
    runs-on: ubuntu-latest

    steps:
      - name: Validate confirmation
        run: |
          if [ "${{ github.event.inputs.confirm }}" != "yes" ]; then
            echo "❌ Confirmação inválida. Digite exatamente 'yes' no input."
            exit 1
          fi

      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Install infra dependencies
        working-directory: infra
        run: npm ci

      - name: Pulumi destroy
        uses: pulumi/actions@v6
        with:
          command: destroy
          stack-name: production
          work-dir: infra
        env:
          PULUMI_ACCESS_TOKEN: ${{ secrets.PULUMI_ACCESS_TOKEN }}
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}

      - name: Job summary
        if: always()
        run: |
          echo "## 🗑️ Infraestrutura destruída" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "EC2, S3, Security Group e Key Pair removidos." >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "**Custo atual: \$0.00**" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "Para subir novamente: execute o workflow **Provision Infrastructure**." >> $GITHUB_STEP_SUMMARY
```

- [ ] **Step 2: Verificar YAML válido**

```bash
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/destroy.yml'))" && echo "YAML OK"
```

Expected: `YAML OK`

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/destroy.yml
git commit -m "ci: add destroy workflow — one-button pulumi destroy with confirmation"
```

---

## Task 5: Verificação e Setup de Secrets

**Não há arquivos para modificar — checklist de configuração manual.**

- [ ] **Step 1: Verificar todos os arquivos foram commitados**

```bash
cd /home/diogo/Projects/tcc-2025-1-e-2-novus-gateway
git log --oneline -5
git status
```

Expected: working tree limpa, 4 commits novos visíveis.

- [ ] **Step 2: Push para o GitHub**

```bash
git push origin main
```

- [ ] **Step 3: Configurar secrets no GitHub**

Ir em: `github.com/<seu-user>/<repo> → Settings → Secrets and variables → Actions → New repository secret`

Criar os seguintes secrets (se ainda não existirem):

| Secret | Como obter |
|---|---|
| `PULUMI_ACCESS_TOKEN` | [app.pulumi.com](https://app.pulumi.com) → clique no avatar → Access Tokens → Create token |
| `AWS_ACCESS_KEY_ID` | AWS Console → IAM → Users → seu usuário → Security credentials → Create access key |
| `AWS_SECRET_ACCESS_KEY` | mesmo passo acima (aparece só uma vez na criação) |

> O usuário IAM precisa das políticas: `AmazonEC2FullAccess`, `AmazonS3FullAccess`, `IAMFullAccess`.
> `EC2_HOST`, `EC2_SSH_KEY` e `VITE_API_URL` já devem existir do setup anterior.

- [ ] **Step 4: Testar workflow provision**

Ir em: `github.com/<repo> → Actions → Provision Infrastructure → Run workflow`

Aguardar ~10-15min. Verificar job summary com o IP.

- [ ] **Step 5: Atualizar DNS no Hostinger**

Com o IP do job summary:
1. Login no Hostinger → Domains → varzeapro.online → DNS Zone
2. Atualizar/criar 3 A records:
   - `@` → `<IP>`
   - `www` → `<IP>`
   - `api` → `<IP>`
3. TTL: 300 (5min)

- [ ] **Step 6: Atualizar secret EC2_HOST**

GitHub → Settings → Secrets → `EC2_HOST` → Update → colar o novo IP.

- [ ] **Step 7: Aguardar HTTPS**

Após ~5-30min de propagação DNS, acessar `https://varzeapro.online`. Deve redirecionar para HTTPS automaticamente (certbot retry em background).

- [ ] **Step 8: Testar destroy**

Ir em: `Actions → Destroy Infrastructure → Run workflow → confirm: yes`

Verificar no AWS Console que EC2 foi terminada e S3 bucket removido.

---

## Resumo de Custos Pós-Implementação

| Estado | Custo |
|---|---|
| Destruído (entre apresentações) | **$0.00** |
| Rodando 8h (dia de demo) | **~$0.08** |
| Rodando 1 mês 24/7 | ~$7.50 |
