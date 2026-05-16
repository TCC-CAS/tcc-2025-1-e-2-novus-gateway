# VarzeaPro — Infraestrutura AWS com Pulumi

Infraestrutura como código para deploy do VarzeaPro na AWS. Um `pulumi up` cria tudo — EC2, S3, IAM, instala Docker/Nginx, sobe os containers, roda migrations e configura HTTPS. Zero SSH manual.

---

## Arquitetura

```
Internet → DNS (A record)
         → EC2 (t3.micro — Free Tier, Ubuntu 24.04)
           ├── Nginx (reverse proxy + SSL)
           │   ├── yourdomain.com    → Web (porta 3001)
           │   └── api.yourdomain.com → API (porta 3000) + WebSocket
           └── Docker Compose
               ├── PostgreSQL 18.3
               ├── API (Fastify)
               └── Web (React Router SSR)

S3 (varzeapro-media) ← Upload de imagens via presigned URLs
```

---

## Pré-requisitos

- [Pulumi CLI](https://www.pulumi.com/docs/install/) instalado
- [AWS CLI](https://aws.amazon.com/cli/) instalado e configurado
- Conta AWS com permissão para criar EC2, S3, IAM (Free Tier funciona)
- Um par de chaves SSH (ed25519 ou RSA)
- Domínio registrado (para HTTPS com Let's Encrypt)

---

## Recursos criados

| Recurso | Tipo | Descrição |
|---------|------|-----------|
| `varzeapro-media` | S3 Bucket | Armazenamento de mídia (privado, CORS habilitado) |
| `varzeapro-ec2-role` | IAM Role | Role assumida pela EC2 |
| `varzeapro-ec2-profile` | Instance Profile | Perfil attachado na EC2 |
| `varzeapro-ec2-policy` | IAM Policy | Acesso read/write ao S3 |
| `varzeapro-key` | Key Pair | Chave SSH para acesso à EC2 |
| `varzeapro-sg` | Security Group | Portas 22 (SSH), 80 (HTTP), 443 (HTTPS) |
| `varzeapro-prod` | EC2 Instance | t3.micro (Free Tier), Ubuntu 24.04, 8GB SSD |

---

## Setup completo (tudo automatizado)

### 1. Instalar dependências

```bash
cd infra/
npm install
```

### 2. Configurar credenciais AWS

Opção A — AWS CLI:
```bash
aws configure
# Access Key ID: xxx
# Secret Access Key: xxx
# Region: sa-east-1
```

Opção B — Variáveis de ambiente:
```bash
export AWS_ACCESS_KEY_ID=xxx
export AWS_SECRET_ACCESS_KEY=xxx
export AWS_REGION=sa-east-1
```

### 3. Criar stack

```bash
pulumi stack init production
```

### 4. Configurar variáveis obrigatórias

```bash
# Chave SSH pública (obrigatório — já configurado no stack)
pulumi config set sshPublicKey --plaintext 'ssh-ed25519 AAAA... user@email.com'

# Domínio (obrigatório — usado no Nginx, Certbot e CORS)
pulumi config set domain 'seudominio.com'

# Repo do GitHub (obrigatório — a EC2 clona automaticamente)
pulumi config set githubRepo 'https://github.com/seu-user/seu-repo.git'

# Secrets gerados automaticamente:
pulumi config set --secret postgresPassword "$(openssl rand -hex 16)"
pulumi config set --secret jwtSecret "$(openssl rand -hex 32)"
pulumi config set --secret betterAuthSecret "$(openssl rand -hex 32)"
```

### 5. Configurar variáveis opcionais

```bash
# S3 (se quiser usar credenciais específicas, senão a EC2 usa IAM Role)
pulumi config set s3AccessKeyId 'AKIA...'
pulumi config set --secret s3SecretAccessKey 'xxx'

# Email (Resend)
pulumi config set --secret resendApiKey 're_xxxxxxxxxxxx'
pulumi config set emailFrom 'noreply@seudominio.com'

# MercadoPago (Sandbox)
pulumi config set --secret mercadopagoAccessToken 'your-sandbox-token'
```

### 6. Subir tudo com um comando

```bash
pulumi up
```

Confirme com `yes`. O Pulumi cria toda a infra e a EC2 executa o bootstrap automaticamente:

1. Instala Docker, Nginx e Certbot
2. Cria swap de 1GB (t3.micro tem só 1GB RAM)
3. Clona o repo
4. Gera o `.env` com todos os valores configurados
5. Sobe os containers com Docker Compose
6. Roda as migrations (drizzle-kit push)
7. Configura Nginx com o domínio real
8. Roda Certbot para HTTPS (Let's Encrypt)

Ao final, o Pulumi imprime:

```
Outputs:
    instancePublicIp:    "18.228.xxx.xxx"
    instancePublicDns:   "ec2-xxx.sa-east-1.compute.amazonaws.com"
    mediaBucketName:     "varzeapro-media"
    securityGroupId:     "sg-xxx"
    instanceProfileName: "varzeapro-ec2-profile"
    appUrl:              "https://seudominio.com"
    apiUrlOutput:        "https://api.seudominio.com"
```

### 7. Apontar DNS

No registrar do domínio, criar registros A apontando para o IP da EC2:

| Registro | Tipo | Valor |
|----------|------|-------|
| `@` | A | `18.228.xxx.xxx` |
| `www` | A | `18.228.xxx.xxx` |
| `api` | A | `18.228.xxx.xxx` |

> O Certbot roda durante o bootstrap. Se o DNS ainda não propagou, ele falha silenciosamente. Depois que o DNS estiver pronto, rode manualmente:
> ```bash
> ssh ubuntu@<IP>
> sudo certbot --nginx -d varzeapro.online  -d www.varzeapro.online -d api.varzeapro.online
> ```

### 8. Verificar

- `https://seudominio.com` — Web app
- `https://api.seudominio.com/health` — API respondendo 200

---

## O que acontece no `pulumi up`

```
Pulumi (index.ts)
├── Cria S3 bucket (varzeapro-media) + CORS + public access block
├── Cria IAM Role + Policy (S3 read/write) + Instance Profile
├── Cria SSH Key Pair
├── Cria Security Group (22/80/443)
├── Busca AMI Ubuntu 24.04 mais recente
├── Monta user-data com todos os valores injetados
└── Cria EC2 com user-data
    │
    └── EC2 executa automaticamente:
        ├── apt update + upgrade
        ├── Instala Docker
        ├── Instala Nginx + Certbot
        ├── Cria swap (1GB)
        ├── Clona repo do GitHub
        ├── Escreve .env com secrets
        ├── docker compose up -d --build
        ├── Aguarda API ficar healthy
        ├── Roda drizzle-kit push (migrations)
        ├── Configura Nginx com domínio real
        └── Roda certbot --nginx (HTTPS)
```

---

## CI/CD — GitHub Actions

Após o primeiro deploy, os deploys seguintes são automáticos via GitHub Actions.

### Fluxo

```
Push na dev  → Build das imagens (validação, sem deploy)
Push na main → Build + Push GHCR + Deploy automático na EC2
```

| Branch | Build | Push GHCR | Deploy EC2 |
|--------|-------|-----------|------------|
| `dev`  | Sim   | Não       | Não        |
| `main` | Sim   | Sim       | Sim        |

### Secrets do GitHub

Vá em **Settings → Secrets and variables → Actions** e adicione:

| Secret | Descrição |
|--------|-----------|
| `EC2_HOST` | IP público da EC2 (output do `pulumi up`) |
| `EC2_SSH_KEY` | Chave SSH privada (conteúdo do arquivo) |
| `VITE_API_URL` | `https://api.seudominio.com` |

O `GITHUB_TOKEN` é automático (usado para push no GHCR).

### Imagens Docker

Publicadas no GitHub Container Registry:

```
ghcr.io/<usuario>/varzeapro-api:latest
ghcr.io/<usuario>/varzeapro-web:latest
ghcr.io/<usuario>/varzeapro-api:sha-abc1234   (tag por commit)
```

---

## Comandos úteis

### Pulumi

```bash
# Ver estado atual da infra
pulumi stack

# Ver outputs (IP, bucket, etc.)
pulumi stack output

# Atualizar infra (após mudar index.ts)
pulumi up

# Destruir toda a infra (CUIDADO: perde dados do banco)
pulumi destroy

# Refresh estado com o que existe na AWS
pulumi refresh

# Ver histórico de operações
pulumi stack history
```

### Na EC2 (SSH)

```bash
# Ver status dos containers
docker compose -f docker-compose.prod.yml ps

# Ver logs da API
docker compose -f docker-compose.prod.yml logs api -f

# Ver logs do Web
docker compose -f docker-compose.prod.yml logs web -f

# Ver log do bootstrap (se algo deu errado na criação)
cat /var/log/user-data.log

# Rodar migration manual
docker compose -f docker-compose.prod.yml exec api npx drizzle-kit push

# Restartar um serviço
docker compose -f docker-compose.prod.yml restart api

# Reconfigurar HTTPS (se DNS propagou depois)
sudo certbot --nginx -d seudominio.com -d www.seudominio.com -d api.seudominio.com
```

---

## Custos — 100% Free Tier (primeiros 12 meses)

Todos os recursos usam o [AWS Free Tier](https://aws.amazon.com/free/):

| Recurso | Free Tier | Limite |
|---------|-----------|--------|
| EC2 t3.micro | 750h/mês | 1 instância 24/7 |
| EBS 8GB gp3 | 30GB total | 8GB usado |
| S3 | 5GB + 20K GET + 2K PUT/mês | Suficiente para demo |
| CloudWatch | 10 métricas custom | Incluso |

**Custo total: $0/mês** (durante os primeiros 12 meses da conta AWS).

> Depois de 12 meses, EC2 t3.micro custa ~$8.50/mês. Lembre-se de rodar `pulumi destroy` se não for mais usar.

### Limitações do t3.micro (1GB RAM)

Com 1GB RAM rodando PostgreSQL + API + Web + Nginx, é apertado mas funciona para TCC:

- PostgreSQL usa ~200MB, Nginx ~20MB, cada container Node ~150-200MB
- Swap de 1GB é criado automaticamente pelo user-data
- Se ficar lento, considere banco externo (Supabase free tier)

---

## Estrutura de arquivos

```
infra/
├── Pulumi.yaml              # Config do projeto Pulumi
├── Pulumi.production.yaml   # Variáveis da stack production
├── package.json              # Deps (pulumi, pulumi-aws)
├── tsconfig.json
├── index.ts                  # Infra principal (S3, IAM, SG, EC2) + user-data inline
└── README.md                 # Este arquivo

Projeto/
├── docker-compose.prod.yml   # Compose de produção (imagens GHCR)
├── deploy.sh                 # Deploy manual (alternativa ao CI/CD)
├── nginx/varzeapro.conf      # Config do Nginx (placeholder, injetado pelo user-data)
└── .env.production.example   # Template de variáveis (referência)

.github/
└── workflows/
    └── deploy.yml            # Pipeline CI/CD (dev: build, main: deploy)
```

---

## Troubleshooting

### Pulumi: erro de credenciais AWS
```
error: 403 Forbidden
```
Verifique se `aws configure` foi executado ou se as env vars estão corretas.

### Pulumi: missing required configuration
```
error: Missing required configuration variable 'varzeapro-infra:domain'
```
Rode `pulumi config set domain 'seudominio.com'` e os outros campos obrigatórios listados no setup.

### EC2: containers não sobem
```bash
ssh ubuntu@<IP>
docker compose -f docker-compose.prod.yml logs api
```
Verificar se o `.env` tem todos os valores preenchidos:
```bash
cat /opt/varzeapro/Projeto/.env
```

### EC2: Nginx 502 Bad Gateway
Os containers ainda estão subindo (demora ~2min no t3.micro). Verifique:
```bash
docker compose -f docker-compose.prod.yml ps
curl http://localhost:3000/health
curl http://localhost:3001
```

### Certbot: erro de DNS
O DNS pode levar alguns minutos para propagar. Verifique com:
```bash
dig seudominio.com
dig api.seudominio.com
```
Depois de propagar, rode novamente:
```bash
sudo certbot --nginx -d seudominio.com -d www.seudominio.com -d api.seudominio.com
```

### Bootstrap falhou / quero ver o log
```bash
cat /var/log/user-data.log
```
Esse arquivo tem a saída completa do script de bootstrap.

### GitHub Actions: permission denied no GHCR
O `GITHUB_TOKEN` precisa de permissão `packages: write`. Isso já está no workflow, mas verifique se o repo não desabilitou GitHub Actions.

### Quero recriar tudo do zero
```bash
pulumi destroy               # Destroi toda a infra AWS
pulumi stack rm production   # Remove o stack local
pulumi stack init production # Cria de novo
# Reconfigurar variáveis (passo 4 e 5 do setup)
pulumi up                    # Recria tudo
```

> **Atenção:** `pulumi destroy` apaga o banco de dados. Faça backup antes se tiver dados importantes.
