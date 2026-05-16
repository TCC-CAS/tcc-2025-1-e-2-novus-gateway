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
