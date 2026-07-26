# ──────────────────────────────────────────────
# RocketReality web — Next.js standalone (pnpm monorepo).
#
# Build z kořene repa: `docker build -f apps/web/Dockerfile .`
# Veškerá konfigurace (DATABASE_URL, AUTH_SECRET, S3_*, SMTP_*, …) se čte
# až za běhu z prostředí (loadEnv v @rocket/config) — image je stejná pro
# všechna prostředí. DATABASE_URL v build stage je jen placeholder pro
# validaci env při `next build`, do runtime stage se nepropisuje.
# ──────────────────────────────────────────────
FROM node:22-alpine AS base
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
WORKDIR /app

FROM base AS builder
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
ENV NEXT_TELEMETRY_DISABLED=1
RUN DATABASE_URL=postgres://build:build@localhost:5432/build \
    pnpm --filter @rocket/web build

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
COPY --from=builder --chown=node:node /app/apps/web/.next/standalone ./
COPY --from=builder --chown=node:node /app/apps/web/.next/static apps/web/.next/static
USER node
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
