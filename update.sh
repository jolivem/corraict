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

ENV_FILE=".env.hetzner"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: $ENV_FILE introuvable à la racine du projet." >&2
  echo "       Copie le fichier depuis ton poste de dev (il contient les secrets prod)." >&2
  exit 1
fi

# Export pour le shell courant (utile si on ajoute des conditions sur des vars).
set -a
# shellcheck disable=SC1091
source "$ENV_FILE"
set +a

# `docker compose --env-file` est passé partout pour que l'interpolation des
# ${VAR} dans docker-compose.yml lise bien depuis .env.hetzner (et pas le
# `.env` par défaut, qui n'existe plus dans ce setup).
DC=(docker compose --env-file "$ENV_FILE")

echo "==> git pull"
git pull --ff-only

echo "==> pull images backend + web depuis GHCR"
"${DC[@]}" pull backend web

if [[ "$FULL" -eq 1 ]]; then
  echo "==> pull image mariadb"
  "${DC[@]}" pull mariadb
fi

echo "==> restart backend (applique les migrations Prisma au démarrage)"
"${DC[@]}" up -d --no-deps backend

echo "==> restart web"
"${DC[@]}" up -d --no-deps web

if [[ "$FULL" -eq 1 ]]; then
  echo "==> restart mariadb"
  "${DC[@]}" up -d --no-deps mariadb
fi

echo "==> nettoyage des anciennes images"
docker image prune -f

echo "==> état des services"
"${DC[@]}" ps
