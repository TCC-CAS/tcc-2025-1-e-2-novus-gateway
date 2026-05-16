import * as pulumi from "@pulumi/pulumi"
import * as aws from "@pulumi/aws"

const config = new pulumi.Config("varzeapro-infra")
const awsRegion = config.get("awsRegion") || "sa-east-1"
const instanceType = config.get("instanceType") || "t3.micro"
const domain = config.require("domain")
const githubRepo = config.require("githubRepo")
const githubBranch = config.get("githubBranch") || "main"
const sshPublicKey = config.require("sshPublicKey")

// Secrets
const postgresPassword = config.requireSecret("postgresPassword")
const jwtSecret = config.requireSecret("jwtSecret")
const betterAuthSecret = config.requireSecret("betterAuthSecret")

// Optional
const s3AccessKeyId = config.get("s3AccessKeyId") || ""
const s3SecretAccessKey = config.getSecret("s3SecretAccessKey") || pulumi.output("")
const resendApiKey = config.getSecret("resendApiKey") || pulumi.output("")
const emailFrom = config.get("emailFrom") || `noreply@${domain}`
const mercadopagoAccessToken = config.getSecret("mercadopagoAccessToken") || pulumi.output("")

const name = "varzeapro"
const apiUrl = `https://api.${domain}`

// ─── Provider ────────────────────────────────────────────────────────
const provider = new aws.Provider("aws", { region: awsRegion })

// ─── S3 Bucket (media uploads) ──────────────────────────────────────
const mediaBucket = new aws.s3.Bucket(
  "media-bucket",
  {
    bucket: `${name}-media`,
    tags: { Name: `${name}-media`, Project: name },
  },
  { provider },
)

new aws.s3.BucketPublicAccessBlock(
  "media-bucket-public-block",
  {
    bucket: mediaBucket.id,
    blockPublicAcls: true,
    ignorePublicAcls: true,
    blockPublicPolicy: true,
    restrictPublicBuckets: true,
  },
  { provider },
)

new aws.s3.BucketCorsConfiguration(
  "media-bucket-cors",
  {
    bucket: mediaBucket.id,
    corsRules: [
      {
        allowedHeaders: ["*"],
        allowedMethods: ["PUT", "GET"],
        allowedOrigins: [`https://${domain}`],
        exposeHeaders: ["ETag"],
        maxAgeSeconds: 3600,
      },
    ],
  },
  { provider },
)

// ─── IAM Role for EC2 (S3 access) ──────────────────────────────────
const ec2Role = new aws.iam.Role(
  "ec2-role",
  {
    assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
      Service: "ec2.amazonaws.com",
    }),
    tags: { Name: `${name}-ec2-role`, Project: name },
  },
  { provider },
)

new aws.iam.RolePolicy(
  "ec2-s3-policy",
  {
    role: ec2Role.id,
    policy: pulumi.interpolate`{
      "Version": "2012-10-17",
      "Statement": [
        {
          "Effect": "Allow",
          "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject", "s3:ListBucket"],
          "Resource": [
            "${mediaBucket.arn}",
            "${mediaBucket.arn}/*"
          ]
        }
      ]
    }`,
  },
  { provider },
)

const instanceProfile = new aws.iam.InstanceProfile(
  "ec2-instance-profile",
  {
    role: ec2Role.name,
    name: `${name}-ec2-profile`,
    tags: { Name: `${name}-ec2-profile`, Project: name },
  },
  { provider },
)

// ─── SSH Key Pair ───────────────────────────────────────────────────
const keyPair = new aws.ec2.KeyPair(
  "ssh-key",
  {
    keyName: `${name}-key`,
    publicKey: sshPublicKey,
    tags: { Name: `${name}-key`, Project: name },
  },
  { provider },
)

// ─── Security Group ─────────────────────────────────────────────────
const sg = new aws.ec2.SecurityGroup(
  "security-group",
  {
    name: `${name}-sg`,
    description: `Security group for ${name}`,
    tags: { Name: `${name}-sg`, Project: name },

    ingress: [
      { protocol: "tcp", fromPort: 22, toPort: 22, cidrBlocks: ["0.0.0.0/0"] },
      { protocol: "tcp", fromPort: 80, toPort: 80, cidrBlocks: ["0.0.0.0/0"] },
      { protocol: "tcp", fromPort: 443, toPort: 443, cidrBlocks: ["0.0.0.0/0"] },
    ],

    egress: [
      { protocol: "-1", fromPort: 0, toPort: 0, cidrBlocks: ["0.0.0.0/0"] },
    ],
  },
  { provider },
)

// ─── EC2 Instance ───────────────────────────────────────────────────
const ami = aws.ec2.getAmiOutput(
  {
    owners: ["099720109477"], // Canonical
    mostRecent: true,
    filters: [
      { name: "name", values: ["ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*"] },
      { name: "virtualization-type", values: ["hvm"] },
    ],
  },
  { provider },
)

// Build user-data with all config injected
const userData = pulumi.interpolate`#!/bin/bash
set -euo pipefail
exec > >(tee /var/log/user-data.log) 2>&1

echo "=== $(date) — Starting VarzeaPro bootstrap ==="

# --- System ---
apt-get update && apt-get upgrade -y

# --- Docker ---
curl -fsSL https://get.docker.com | sh
usermod -aG docker ubuntu

# --- Nginx + Certbot ---
apt-get install -y nginx certbot python3-certbot-nginx

# --- App ---
mkdir -p /opt/varzeapro
cd /opt/varzeapro
git clone --branch ${githubBranch} ${githubRepo} .
chown -R ubuntu:ubuntu /opt/varzeapro

# --- Swap (t3.micro tem 1GB RAM) ---
fallocate -l 1G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# --- Environment ---
cat > .env << 'ENVEOF'
POSTGRES_PASSWORD=${postgresPassword}
DATABASE_URL=postgresql://varzeapro:${postgresPassword}@postgres:5432/varzeapro
NODE_ENV=production
JWT_SECRET=${jwtSecret}
BETTER_AUTH_SECRET=${betterAuthSecret}
BETTER_AUTH_URL=${apiUrl}
CORS_ORIGIN=https://${domain}
S3_ENDPOINT=https://s3.${awsRegion}.amazonaws.com
S3_REGION=${awsRegion}
S3_BUCKET=${mediaBucket.bucket}
S3_ACCESS_KEY_ID=${s3AccessKeyId}
S3_SECRET_ACCESS_KEY=${s3SecretAccessKey}
S3_PUBLIC_URL=
S3_USE_PATH_STYLE=false
IMAGE_MAX_SIZE_MB=10
IMAGE_MAX_DIMENSION=4000
PRESIGNED_URL_TTL_SECONDS=3600
UPLOAD_RATE_LIMIT_MAX=10
UPLOAD_RATE_LIMIT_WINDOW_MINUTES=60
RESEND_API_KEY=${resendApiKey}
EMAIL_FROM=${emailFrom}
MERCADOPAGO_ACCESS_TOKEN=${mercadopagoAccessToken}
MERCADOPAGO_WEBHOOK_URL=${apiUrl}/api/webhooks/mercadopago
VITE_API_URL=${apiUrl}
ENVEOF

# --- Start containers ---
cd /opt/varzeapro/Projeto
docker compose -f docker-compose.prod.yml up -d --build

# Wait for API to be healthy
echo "=== Waiting for API ==="
for i in $(seq 1 30); do
  if curl -sf http://localhost:3000/health > /dev/null 2>&1; then
    echo "API is up!"
    break
  fi
  echo "Waiting... ($i/30)"
  sleep 10
done

# --- Migrations ---
docker compose -f docker-compose.prod.yml exec -T api npx drizzle-kit push

# --- Nginx ---
cp nginx/varzeapro.conf /etc/nginx/sites-available/varzeapro
ln -sf /etc/nginx/sites-available/varzeapro /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
sed -i 's/yourdomain.com/${domain}/g' /etc/nginx/sites-available/varzeapro
sed -i 's/api.yourdomain.com/api.${domain}/g' /etc/nginx/sites-available/varzeapro
nginx -t && systemctl reload nginx

# --- HTTPS (Certbot) ---
certbot --nginx -n --agree-tos -m diogosarti13@gmail.com -d ${domain} -d www.${domain} -d api.${domain} || echo "Certbot failed — DNS may not be ready yet"

echo "=== Bootstrap complete ==="
`

const instance = new aws.ec2.Instance(
  "ec2-instance",
  {
    instanceType: instanceType,
    ami: ami.imageId,
    keyName: keyPair.keyName,
    iamInstanceProfile: instanceProfile.name,
    vpcSecurityGroupIds: [sg.id],
    rootBlockDevice: {
      volumeSize: 8,
      volumeType: "gp3",
    },
    userData: userData,
    tags: { Name: `${name}-prod`, Project: name },
  },
  { provider },
)

// ─── Outputs ────────────────────────────────────────────────────────
export const instancePublicIp = instance.publicIp
export const instancePublicDns = instance.publicDns
export const mediaBucketName = mediaBucket.bucket
export const securityGroupId = sg.id
export const instanceProfileName = instanceProfile.name
export const appUrl = pulumi.interpolate`https://${domain}`
export const apiUrlOutput = pulumi.interpolate`https://api.${domain}`
