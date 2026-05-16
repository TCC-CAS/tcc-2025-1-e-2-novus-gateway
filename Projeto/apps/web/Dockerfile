FROM node:24-alpine AS development-dependencies-env
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

FROM node:24-alpine AS production-dependencies-env
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --legacy-peer-deps

FROM node:24-alpine AS build-env
WORKDIR /app
COPY --from=development-dependencies-env /app/node_modules /app/node_modules
COPY . .
RUN npm run build

FROM node:24-alpine
WORKDIR /app
COPY --from=production-dependencies-env /app/node_modules /app/node_modules
COPY --from=build-env /app/build /app/build
COPY package.json ./
CMD ["npm", "run", "start"]
