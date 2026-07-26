# ──────────────────────────────────────────────
# RocketReality worker — pg-boss joby (fotky, e-maily, expirace, watchdog).
#
# Build z kořene repa: `docker build -f apps/worker/Dockerfile .`
# Worker běží přes tsx přímo nad TS zdrojáky (stejně jako `pnpm start`),
# image proto nese celý workspace včetně @rocket/db — díky tomu umí i
# spustit migrace: `tsx src/migrate.ts` v /app/packages/db (viz helm chart).
# Konfigurace se čte za běhu z prostředí, healthcheck: GET :3010/health.
# ──────────────────────────────────────────────
FROM node:22-alpine
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/web/package.json apps/web/
COPY apps/worker/package.json apps/worker/
COPY packages/auth/package.json packages/auth/
COPY packages/config/package.json packages/config/
COPY packages/core/package.json packages/core/
COPY packages/db/package.json packages/db/
COPY packages/emails/package.json packages/emails/
COPY packages/eslint-config/package.json packages/eslint-config/
COPY packages/shared/package.json packages/shared/
COPY packages/typescript-config/package.json packages/typescript-config/
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm config set store-dir /pnpm/store && \
    pnpm install --frozen-lockfile

COPY . .
ENV NODE_ENV=production
USER node
EXPOSE 3010
WORKDIR /app/apps/worker
CMD ["node_modules/.bin/tsx", "src/index.ts"]
