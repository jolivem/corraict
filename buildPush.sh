#!/usr/bin/env bash
#
# Build & push des images Docker aicorrect-backend et aicorrect-web vers GHCR.
# À exécuter sur le poste de dev (pas sur le VPS). Pré-requis :
#   docker login ghcr.io -u jolivem -p <PAT-avec-write-packages>

set -euo pipefail
cd "$(dirname "$0")"

BACKEND_IMAGE="ghcr.io/jolivem/aicorrect-backend"
WEB_IMAGE="ghcr.io/jolivem/aicorrect-web"
TAG="${1:-latest}"

# URL publique de l'API — bakée dans le bundle Next.js au build (NEXT_PUBLIC_*).
PUBLIC_API_URL="${PUBLIC_API_URL:-https://api.aicorrect.app}"

echo "==> Build backend ($BACKEND_IMAGE:$TAG)"
docker build \
  -f backend/Dockerfile \
  -t "$BACKEND_IMAGE:$TAG" \
  .

echo "==> Push backend"
docker push "$BACKEND_IMAGE:$TAG"

echo "==> Build web ($WEB_IMAGE:$TAG) — NEXT_PUBLIC_API_URL=$PUBLIC_API_URL"
docker build \
  -f web/Dockerfile \
  --build-arg "NEXT_PUBLIC_API_URL=$PUBLIC_API_URL" \
  -t "$WEB_IMAGE:$TAG" \
  .

echo "==> Push web"
docker push "$WEB_IMAGE:$TAG"

echo "==> Done. Pull on VPS via : docker compose pull && ./update.sh"
