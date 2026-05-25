#!/usr/bin/env bash
#
# Met à jour aicorrect sur le VPS Hetzner :
#   1. git pull (récupère docker-compose.yml et migrations Prisma à jour)
#   2. pull des images backend + web depuis GHCR
#   3. restart de backend (l'entrypoint lance `prisma migrate deploy`)
#   4. restart de web
#   5. nettoyage des anciennes images
#
# Usage : ./update.sh           (update normal)
#         ./update.sh --full    (restart aussi mariadb)
#
# Note : le Caddyfile vit dans le repo clairimmo. Si tu ajoutes/modifies un
# domaine côté aicorrect, fais l'édition là-bas et relance le `update.sh` de
# clairimmo (ou `docker compose -f /path/to/clairimmo/docker-compose.yml \
# restart caddy`).

set -euo pipefail
cd "$(dirname "$0")"

FULL=0
[[ "${1:-}" == "--full" ]] && FULL=1

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

echo "==> git pull"
git pull --ff-only

echo "==> pull images backend + web depuis GHCR"
docker compose pull backend web

if [[ "$FULL" -eq 1 ]]; then
  echo "==> pull image mariadb"
  docker compose pull mariadb
fi

echo "==> restart backend (applique les migrations Prisma au démarrage)"
docker compose up -d --no-deps backend

echo "==> restart web"
docker compose up -d --no-deps web

if [[ "$FULL" -eq 1 ]]; then
  echo "==> restart mariadb"
  docker compose up -d --no-deps mariadb
fi

echo "==> nettoyage des anciennes images"
docker image prune -f

echo "==> état des services"
docker compose ps
