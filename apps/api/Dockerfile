# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/config/package.json ./packages/config/
COPY packages/shared/package.json ./packages/shared/
COPY packages/financial-engine/package.json ./packages/financial-engine/
COPY packages/tax-engine/package.json ./packages/tax-engine/
RUN npm ci --workspace=@vda-ledger/api --include-workspace-root

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY package.json package-lock.json ./
COPY apps/api ./apps/api
COPY packages ./packages
WORKDIR /app/apps/api
RUN npx prisma generate

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S vda && adduser -S vda -G vda
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api ./apps/api
COPY --from=build /app/packages ./packages
COPY package.json ./
USER vda
EXPOSE 4000
WORKDIR /app/apps/api
CMD ["node", "src/index.js"]
