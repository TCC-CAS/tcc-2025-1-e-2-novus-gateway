FROM node:24-alpine AS development-dependencies-env
WORKDIR /build/apps/web
COPY apps/web/package.json apps/web/package-lock.json ./
RUN npm ci --legacy-peer-deps

FROM node:24-alpine AS production-dependencies-env
WORKDIR /build/apps/web
COPY apps/web/package.json apps/web/package-lock.json ./
RUN npm ci --omit=dev --legacy-peer-deps

FROM node:24-alpine AS build-env
WORKDIR /build/apps/web
COPY --from=development-dependencies-env /build/apps/web/node_modules ./node_modules
COPY apps/web/ .
COPY shared/ /build/shared/
RUN ln -sf /build/apps/web/node_modules /build/shared/node_modules
RUN npm run build

FROM node:24-alpine
WORKDIR /app
COPY --from=production-dependencies-env /build/apps/web/node_modules ./node_modules
COPY --from=build-env /build/apps/web/build ./build
COPY apps/web/package.json ./
CMD ["npm", "run", "start"]
