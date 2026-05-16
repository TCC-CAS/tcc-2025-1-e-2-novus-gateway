# VarzeaPro — Infraestrutura AWS com Pulumi

Infraestrutura como código para deploy do VarzeaPro na AWS. Cria EC2, S3, IAM e Security Group via Pulumi (TypeScript), com CI/CD automático via GitHub Actions.

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
- Conta AWS com permissão para criar EC2, S3, IAM
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

## Setup rápido

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

### 4. Configurar variáveis da stack

```bash
# Obrigatório: chave SSH pública para acessar a EC2
pulumi config set sshPublicKey --plaintext 'ssh-ed25519 AAAA... user@email.com'

# Opcional: customizar (valores padrão já estão em Pulumi.production.yaml)
pulumi config set domain 'seudominio.com.br'
pulumi config set ghcrOwner 'seu-usuario-github'
```

### 5. Preview (dry-run)

```bash
pulumi preview
```

Mostra exatamente o que será criado sem aplicar nenhuma mudança.

### 6. Criar infraestrutura

```bash
pulumi up
```

Confirme com `yes` quando solicitado. Ao final, o Pulumi imprime os outputs:

```
Outputs:
    instancePublicIp:   "18.228.xxx.xxx"
    mediaBucketName:    "varzeapro-media"
    securityGroupId:    "sg-xxx"
    instanceProfileName: "varzeapro-ec2-profile"
```

Anote o `instancePublicIp`.

---

## Deploy da aplicação

### Primeiro deploy (manual)

Após `pulumi up`, a EC2 já terá Docker e Nginx instalados (via user-data). Falta clonar o repo e subir os containers:

```bash
# SSH na EC2
ssh -i ~/.ssh/sua-chave ubuntu@<instancePublicIp>

# Clonar o projeto
cd /opt/varzeapro
sudo git clone https://github.com/seu-user/varzeapro.git .

# Configurar environment
sudo cp .env.production.example .env
sudo nano .env  # Preencher todos os valores reais
```

Editar o `.env` com os valores reais:

```env
POSTGRES_PASSWORD=<gerar com: openssl rand -hex 16>
JWT_SECRET=<gerar com: openssl rand -hex 32>
BETTER_AUTH_SECRET=<gerar com: openssl rand -hex 32>
BETTER_AUTH_URL=https://api.seudominio.com.br
CORS_ORIGIN=https://seudominio.com.br
S3_ACCESS_KEY_ID=<sua AWS access key>
S3_SECRET_ACCESS_KEY=<sua AWS secret key>
S3_BUCKET=varzeapro-media
S3_REGION=sa-east-1
RESEND_API_KEY=re_xxxxxxxxxxxx
EMAIL_FROM=noreply@seudominio.com.br
VITE_API_URL=https://api.seudominio.com.br
```

Subir os containers:

```bash
sudo docker compose -f docker-compose.prod.yml up -d --build
```

### Configurar Nginx + HTTPS

```bash
# Copiar config do Nginx
sudo cp nginx/varzeapro.conf /etc/nginx/sites-available/varzeapro
sudo ln -s /etc/nginx/sites-available/varzeapro /etc/nginx/sites-enabled/

# Substituir yourdomain.com pelo domínio real
sudo sed -i 's/yourdomain.com/seudominio.com.br/g' /etc/nginx/sites-available/varzeapro
sudo sed -i 's/api.yourdomain.com/api.seudominio.com.br/g' /etc/nginx/sites-available/varzeapro

# Testar e recarregar
sudo nginx -t && sudo systemctl reload nginx

# Certbot (HTTPS com Let's Encrypt)
sudo certbot --nginx -d seudominio.com.br -d www.seudominio.com.br -d api.seudominio.com.br
```

### Configurar DNS

No registrar do domínio, criar registros A apontando para o IP da EC2:

| Registro | Tipo | Valor |
|----------|------|-------|
| `@` | A | `18.228.xxx.xxx` |
| `www` | A | `18.228.xxx.xxx` |
| `api` | A | `18.228.xxx.xxx` |

---

## CI/CD — GitHub Actions

Após o primeiro deploy manual, os deploys seguintes são automáticos via GitHub Actions.

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
| `EC2_SSH_KEY` | Chave SSH privada (conteúdo do `.pem`) |
| `VITE_API_URL` | `https://api.seudominio.com.br` |

O `GITHUB_TOKEN` é automático (usado para push no GHCR).

### Imagens Docker

As imagens são publicadas no GitHub Container Registry:

```
ghcr.io/<usuario>/varzeapro-api:latest
ghcr.io/<usuario>/varzeapro-web:latest
ghcr.io/<usuario>/varzeapro-api:sha-abc1234   (tag por commit)
```

---

## Comandos úteis

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

### Na EC2

```bash
# Ver status dos containers
docker compose -f docker-compose.prod.yml ps

# Ver logs da API
docker compose -f docker-compose.prod.yml logs api -f

# Ver logs do Web
docker compose -f docker-compose.prod.yml logs web -f

# Rodar migration manual
docker compose -f docker-compose.prod.yml exec api npx drizzle-kit push

# Restartar um serviço
docker compose -f docker-compose.prod.yml restart api
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

Com 1GB RAM rodando PostgreSQL + API + Web + Nginx, é apertado mas funciona para TCC. Dicas:

- O PostgreSQL vai usar ~200MB, Nginx ~20MB, cada container Node ~150-200MB
- Se ficar lento, considere usar um banco externo (Supabase free tier) ou swap file
- Para criar swap na EC2 se necessário:
```bash
sudo fallocate -l 1G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## Estrutura de arquivos

```
infra/
├── Pulumi.yaml              # Config do projeto Pulumi
├── Pulumi.production.yaml   # Variáveis da stack production
├── package.json              # Deps (pulumi, pulumi-aws)
├── tsconfig.json
├── index.ts                  # Infra principal (S3, IAM, SG, EC2)
├── user-data.sh              # Bootstrap da EC2 (Docker, Nginx, Certbot)
└── README.md                 # Este arquivo

Projeto/
├── docker-compose.prod.yml   # Compose de produção (imagens GHCR)
├── deploy.sh                 # Deploy manual (alternativa ao CI/CD)
├── nginx/varzeapro.conf      # Config do Nginx
└── .env.production.example   # Template de variáveis de ambiente

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

### EC2: containers não sobem
```bash
docker compose -f docker-compose.prod.yml logs api
```
Verificar se o `.env` tem todos os valores preenchidos.

### EC2: Nginx 502 Bad Gateway
Os containers ainda não subiram ou estão em porta diferente. Verifique:
```bash
docker compose -f docker-compose.prod.yml ps
curl http://localhost:3000/health
curl http://localhost:3001
```

### Certbot: erro de DNS
O DNS pode levar alguns minutos para propagar. Verifique com:
```bash
dig seudominio.com.br
dig api.seudominio.com.br
```

### GitHub Actions: permission denied no GHCR
O `GITHUB_TOKEN` precisa de permissão `packages: write`. Isso já está no workflow, mas verifique se o repo não desabilitou GitHub Actions.

### Quero recriar tudo do zero
```bash
pulumi destroy    # Destroi toda a infra AWS
pulumi stack rm production  # Remove o stack local
pulumi stack init production  # Cria de novo
pulumi up         # Recria
```

> **Atenção:** `pulumi destroy` apaga o banco de dados. Faça backup antes se tiver dados importantes.
