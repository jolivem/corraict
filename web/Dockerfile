# syntax=docker/dockerfile:1.7
# Build context = repo root (see buildPush.sh) so we can copy web/ as a subdir.

FROM node:22-bookworm-slim AS base
WORKDIR /app

FROM base AS deps
COPY web/package.json web/package-lock.json ./
RUN npm ci

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY web/ ./
# NEXT_PUBLIC_* env vars are inlined into the client bundle at build time.
ARG NEXT_PUBLIC_API_URL=https://api.aicorrect.app
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# --- Runtime image: standalone output is a self-contained Node server --------
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3001
ENV HOSTNAME=0.0.0.0

RUN groupadd -g 1001 -r nodejs && useradd -u 1001 -r -g nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static     ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public           ./public

USER nextjs
EXPOSE 3001
CMD ["node", "server.js"]
