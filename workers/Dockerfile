# syntax=docker/dockerfile:1

FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY workers/package.json ./workers/
COPY apps/api/package.json ./apps/api/
COPY packages/config/package.json ./packages/config/
COPY packages/shared/package.json ./packages/shared/
COPY packages/financial-engine/package.json ./packages/financial-engine/
COPY packages/tax-engine/package.json ./packages/tax-engine/
RUN npm ci --workspace=@vda-ledger/workers --include-workspace-root

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/workers/node_modules ./workers/node_modules
COPY package.json package-lock.json ./
COPY workers ./workers
COPY apps/api ./apps/api
COPY packages ./packages
WORKDIR /app/workers
CMD ["node", "src/index.js"]
