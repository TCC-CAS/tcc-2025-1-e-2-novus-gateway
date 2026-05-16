import * as pulumi from "@pulumi/pulumi"
import * as aws from "@pulumi/aws"
import * as fs from "fs"
import * as path from "path"

const config = new pulumi.Config("varzeapro-infra")
const awsRegion = config.get("awsRegion") || "sa-east-1"
const instanceType = config.get("instanceType") || "t3.micro"
const domain = config.get("domain") || "yourdomain.com"
const ghcrOwner = config.get("ghcrOwner") || "your-github-username"
const sshPublicKey = config.require("sshPublicKey")

const name = "varzeapro"

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

// CORS for presigned URL uploads
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
const userData = fs.readFileSync(path.join(__dirname, "user-data.sh"), "utf-8")

// Look up latest Ubuntu 24.04 AMI
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
