# syntax=docker/dockerfile:1.7
# Build context = repo root (see buildPush.sh) so we can copy backend/ as a subdir.

FROM node:22-bookworm-slim AS base
WORKDIR /app

# --- Install all deps (prod + dev) needed for nest build -----------------------
FROM base AS builder
COPY backend/package.json backend/package-lock.json ./
RUN npm ci
COPY backend/ .
RUN npx prisma generate && npm run build

# --- Install production deps only (lean node_modules for runner) ---------------
FROM base AS prod-deps
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force \
  # @prisma/client postinstall fetches the query engine; force a generate so
  # the engine files for this platform are present in node_modules.
  && npx prisma generate || true

# --- Runtime image -------------------------------------------------------------
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# OpenSSL is required by Prisma's query engine on Debian slim.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder   /app/dist          ./dist
COPY --from=builder   /app/prisma        ./prisma
COPY --from=builder   /app/package.json  ./package.json

EXPOSE 3000

# Apply pending Prisma migrations before booting the API. On a fresh DB this
# also creates every table; on an existing DB it's a no-op when up to date.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
