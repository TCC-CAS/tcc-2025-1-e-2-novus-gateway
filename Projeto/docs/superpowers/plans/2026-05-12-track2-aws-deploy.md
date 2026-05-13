# Track 2 — AWS Deploy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy VarzeaPro to production AWS infrastructure using Docker Compose on EC2 with Nginx reverse proxy and HTTPS.

**Architecture:** Route 53 → EC2 (Docker Compose with PostgreSQL + API + Web) + S3 for media. Nginx handles SSL termination and reverse proxy. Certbot for Let's Encrypt certificates.

**Tech Stack:** Docker Compose, Nginx, Certbot, AWS EC2, AWS S3, Route 53

**Prerequisites:** AWS account created, domain name purchased

---

## File Structure

| File | Action | Purpose |
|------|--------|---------|
| `docker-compose.prod.yml` | Create | Production Docker Compose config |
| `nginx/varzeapro.conf` | Create | Nginx site configuration |
| `deploy.sh` | Create | Deploy script |
| `.env.production.example` | Create | Template for production env vars |

---

## Task 1: Create production Docker Compose

**Files:**
- Create: `docker-compose.prod.yml`

- [ ] **Step 1: Create docker-compose.prod.yml**

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
    # No ports exposed externally — only accessible via Docker network

  api:
    build:
      context: ./apps/api
      dockerfile: Dockerfile
    depends_on:
      postgres:
        condition: service_healthy
    env_file: .env
    environment:
      DATABASE_URL: postgresql://varzeapro:${POSTGRES_PASSWORD}@postgres:5432/varzeapro
      NODE_ENV: production
    volumes:
      - uploads_data:/app/uploads
    ports:
      - "3000:3000"
    restart: always

  web:
    build:
      context: ./apps/web
      dockerfile: Dockerfile
      args:
        VITE_API_URL: ${VITE_API_URL:-https://api.yourdomain.com}
    depends_on:
      - api
    environment:
      VITE_API_URL: ${VITE_API_URL:-https://api.yourdomain.com}
    ports:
      - "3001:3000"
    restart: always

volumes:
  postgres_data:
  uploads_data:
```

- [ ] **Step 2: Commit**

```bash
git add docker-compose.prod.yml
git commit -m "infra: add production Docker Compose configuration"
```

---

## Task 2: Create Nginx configuration

**Files:**
- Create: `nginx/varzeapro.conf`

- [ ] **Step 1: Create nginx config**

```nginx
# /etc/nginx/sites-available/varzeapro

# Frontend (React SSR)
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3001;
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
    server_name api.yourdomain.com;

    client_max_body_size 12M;

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

- [ ] **Step 2: Commit**

```bash
git add nginx/varzeapro.conf
git commit -m "infra: add Nginx reverse proxy configuration"
```

---

## Task 3: Create deploy script

**Files:**
- Create: `deploy.sh`

- [ ] **Step 1: Create deploy script**

```bash
#!/bin/bash
set -euo pipefail

echo "=== $(date) — Starting deploy ==="

cd "$(dirname "$0")"

echo "=== Pulling latest code ==="
git pull origin main

echo "=== Rebuilding containers ==="
docker compose -f docker-compose.prod.yml up -d --build

echo "=== Running database migrations ==="
docker compose -f docker-compose.prod.yml exec api npx drizzle-kit push

echo "=== Cleaning old images ==="
docker image prune -f

echo "=== Deploy complete ==="
docker compose -f docker-compose.prod.yml ps
```

- [ ] **Step 2: Make executable**

Run: `chmod +x deploy.sh`

- [ ] **Step 3: Commit**

```bash
git add deploy.sh
git commit -m "infra: add deploy script"
```

---

## Task 4: Create production environment template

**Files:**
- Create: `.env.production.example`

- [ ] **Step 1: Create template**

```
# Database
POSTGRES_PASSWORD=CHANGE_ME_generate_with_openssl_rand_hex_16
DATABASE_URL=postgresql://varzeapro:POSTGRES_PASSWORD@postgres:5432/varzeapro

# Auth
NODE_ENV=production
JWT_SECRET=CHANGE_ME_generate_with_openssl_rand_hex_32
BETTER_AUTH_SECRET=CHANGE_ME_generate_with_openssl_rand_hex_32
BETTER_AUTH_URL=https://api.yourdomain.com
CORS_ORIGIN=https://yourdomain.com

# S3 Storage
S3_ENDPOINT=https://s3.sa-east-1.amazonaws.com
S3_REGION=sa-east-1
S3_BUCKET=varzeapro-media
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_PUBLIC_URL=
S3_USE_PATH_STYLE=false

# Image Upload
IMAGE_MAX_SIZE_MB=10
IMAGE_MAX_DIMENSION=4000
PRESIGNED_URL_TTL_SECONDS=3600
UPLOAD_RATE_LIMIT_MAX=10
UPLOAD_RATE_LIMIT_WINDOW_MINUTES=60

# Email (Resend)
RESEND_API_KEY=re_xxxxxxxxxxxx
EMAIL_FROM=noreply@yourdomain.com

# MercadoPago (Sandbox)
MERCADOPAGO_ACCESS_TOKEN=your-sandbox-token
MERCADOPAGO_WEBHOOK_URL=https://api.yourdomain.com/api/webhooks/mercadopago

# Frontend
VITE_API_URL=https://api.yourdomain.com
```

- [ ] **Step 2: Commit**

```bash
git add .env.production.example
git commit -m "infra: add production environment template"
```

---

## Task 5: EC2 provisioning and deployment (manual steps)

This task documents the manual steps to provision AWS infrastructure. These cannot be automated without Terraform/CDK (future improvement).

- [ ] **Step 1: Create IAM user**

1. AWS Console → IAM → Users → Create User: `varzeapro-deploy`
2. Attach policies: `AmazonEC2FullAccess`, `AmazonS3FullAccess`, `AmazonSESFullAccess`, `AWSCertificateManagerFullAccess`
3. Save Access Key ID and Secret Access Key

- [ ] **Step 2: Create S3 bucket**

```bash
aws s3api create-bucket --bucket varzeapro-media --region sa-east-1 --create-bucket-configuration LocationConstraint=sa-east-1
aws s3api put-public-access-block --bucket varzeapro-media --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
```

- [ ] **Step 3: Provision EC2**

1. EC2 → Launch Instance: `varzeapro-prod`
2. AMI: Ubuntu 24.04 LTS
3. Instance type: `t3.medium`
4. Key pair: Create new `varzeapro-key`
5. Storage: 30GB SSD gp3
6. Security Group: SSH (22), HTTP (80), HTTPS (443)
7. IAM Role: Create `varzeapro-ec2-role` with S3 access policy

- [ ] **Step 4: Configure server**

```bash
ssh -i varzeapro-key.pem ubuntu@<EC2_IP>
sudo apt update && sudo apt upgrade -y
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker ubuntu
sudo apt install -y nginx certbot python3-certbot-nginx
exit
```

- [ ] **Step 5: Deploy application**

```bash
ssh -i varzeapro-key.pem ubuntu@<EC2_IP>
cd /home/ubuntu
git clone https://github.com/your-org/your-repo.git
cd your-repo/Projeto
cp .env.production.example .env
# Edit .env with real values
docker compose -f docker-compose.prod.yml up -d --build
```

- [ ] **Step 6: Configure Nginx and HTTPS**

```bash
sudo cp nginx/varzeapro.conf /etc/nginx/sites-available/varzeapro
sudo ln -s /etc/nginx/sites-available/varzeapro /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com -d api.yourdomain.com
```

- [ ] **Step 7: Configure DNS**

At your domain registrar, create A records:
- `@` → EC2 public IP
- `www` → EC2 public IP
- `api` → EC2 public IP

- [ ] **Step 8: Verify**

- Visit `https://yourdomain.com` — should show the web app
- Visit `https://api.yourdomain.com/health` — should return 200
- Test WebSocket connection via chat
