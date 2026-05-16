FROM node:24-alpine AS deps
WORKDIR /build/apps/api
COPY apps/api/package.json apps/api/package-lock.json ./
RUN npm ci --omit=dev

FROM node:24-alpine AS builder
WORKDIR /build/apps/api
COPY apps/api/package.json apps/api/package-lock.json ./
RUN npm ci
COPY apps/api/ .
COPY shared/ /build/shared/
RUN npm run build

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache tini
COPY --from=deps /build/apps/api/node_modules ./node_modules
COPY --from=builder /build/apps/api/dist ./dist
COPY --from=builder /build/apps/api/src/db/migrations ./src/db/migrations
COPY --from=builder /build/apps/api/package.json ./
COPY --from=builder /build/apps/api/drizzle.config.ts ./
RUN mkdir -p uploads
EXPOSE 3000
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/apps/api/src/server.js"]
