#!/usr/bin/env bash
#
# Build & push des images Docker aicorrect-backend et aicorrect-web vers GHCR.
# À exécuter sur le poste de dev (pas sur le VPS). Pré-requis :
#   docker login ghcr.io -u jolivem -p <PAT-avec-write-packages>

set -euo pipefail
cd "$(dirname "$0")"

# Charge les variables de l'env Hetzner (non commité, à la racine du projet).
# Pour buildPush.sh, seul PUBLIC_API_URL est consommé : il est baké dans le
# bundle Next.js via --build-arg NEXT_PUBLIC_API_URL. Les secrets runtime
# (MISTRAL_API_KEY, DB, Stripe, etc.) ne sont PAS lus ici — ils sont injectés
# côté VPS par update.sh dans les containers.
if [[ -f .env.hetzner ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env.hetzner
  set +a
fi

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

echo "==> Done. Update on VPS via :  ./update.sh"
