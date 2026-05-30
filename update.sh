#!/usr/bin/env bash
#
# Met à jour aicorrect sur le VPS Hetzner :
#   1. git pull (récupère docker-compose.yml, Caddyfile et migrations Prisma)
#   2. pull des images backend + web depuis GHCR
#   3. `docker compose up -d` — recrée ce qui a changé, démarre les manquants
#      (backend applique `prisma migrate deploy` à son démarrage)
#   4. nettoyage des anciennes images
#
# Usage : ./update.sh           (update normal)
#         ./update.sh --full    (pull aussi mariadb + caddy)
#
# Note : Caddy fait partie du stack docker-compose principal. Toute modif du
# Caddyfile prend effet au prochain `./update.sh` (Caddy est recréé si le
# fichier monté change). Recharge à chaud sans restart :
#   docker exec aicorrect-caddy caddy reload --config /etc/caddy/Caddyfile

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

echo "==> pull des images applicatives (backend + web) depuis GHCR"
"${DC[@]}" pull backend web

if [[ "$FULL" -eq 1 ]]; then
  echo "==> pull des images d'infra (mariadb, caddy)"
  "${DC[@]}" pull mariadb caddy
fi

# `up -d` recrée uniquement les services dont l'image ou la config a changé,
# et démarre ceux qui ne tournent pas encore (utile au premier déploiement).
# Le backend applique `prisma migrate deploy` à son démarrage.
echo "==> up -d (recréation des services modifiés, démarrage des manquants)"
"${DC[@]}" up -d

echo "==> nettoyage des anciennes images"
docker image prune -f

echo "==> état des services"
"${DC[@]}" ps
