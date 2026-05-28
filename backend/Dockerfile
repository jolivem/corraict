# syntax=docker/dockerfile:1.7
# Build context = repo root (see buildPush.sh) so we can copy backend/ as a subdir.

FROM node:22-bookworm-slim AS base
WORKDIR /app
# OpenSSL est requis par Prisma à l'install (postinstall qui détecte la version
# pour choisir le bon engine) et au runtime. On l'installe dans `base` pour
# qu'il soit présent dans tous les stages dérivés.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# --- Install all deps (prod + dev) needed for nest build -----------------------
FROM base AS builder
COPY backend/package.json backend/package-lock.json ./
# Copier le schema AVANT npm ci : sinon le postinstall de @prisma/client lance
# `prisma generate` qui plante avec "schema not found".
COPY backend/prisma ./prisma
RUN npm ci
COPY backend/ .
RUN npx prisma generate && npm run build

# --- Install production deps only (lean node_modules for runner) ---------------
FROM base AS prod-deps
COPY backend/package.json backend/package-lock.json ./
COPY backend/prisma ./prisma
RUN npm ci --omit=dev && npm cache clean --force

# --- Runtime image -------------------------------------------------------------
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder   /app/dist          ./dist
COPY --from=builder   /app/prisma        ./prisma
COPY --from=builder   /app/package.json  ./package.json

EXPOSE 3000

# Apply pending Prisma migrations before booting the API. On a fresh DB this
# also creates every table; on an existing DB it's a no-op when up to date.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
