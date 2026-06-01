#!/bin/bash
set -euo pipefail

# VarzeaPro EC2 bootstrap — runs on first launch via Pulumi user-data

echo "=== Updating system ==="
apt-get update && apt-get upgrade -y

echo "=== Installing Docker ==="
curl -fsSL https://get.docker.com | sh
usermod -aG docker ubuntu

echo "=== Installing Nginx + Certbot ==="
apt-get install -y nginx certbot python3-certbot-nginx

echo "=== Installing GitHub CLI ==="
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | tee /etc/apt/sources.list.d/github-cli.list > /dev/null
apt-get update && apt-get install -y gh

echo "=== Creating app directory ==="
mkdir -p /opt/varzeapro
chown ubuntu:ubuntu /opt/varzeapro

echo "=== Setting up Nginx default ==="
rm -f /etc/nginx/sites-enabled/default

echo "=== Bootstrap complete ==="
