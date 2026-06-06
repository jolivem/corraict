# Déploiement Hetzner

### Prérequis (une fois)

1. **DNS** : enregistrement A `pro.claireadresse.fr` → IP du VPS.
2. **`.env`** du VPS (à côté de `docker-compose.yml`) doit contenir au moins :
   ```env
   DOMAIN=claireadresse.fr
   SITE_URL=https://claireadresse.fr
   SITE_URL_PRO=https://pro.claireadresse.fr
   POSTGRES_USER=...
   POSTGRES_PASSWORD=...
   POSTGRES_DB=cadb
   ATMO_USERNAME=...
   ATMO_PASSWORD=...
   MISTRAL_API_KEY=...
   ```

Caddy demande automatiquement le cert Let's Encrypt au premier accès HTTPS.

### Update classique

```bash
scp ./.env.hetzner michel@91.99.173.178:/home/michel/aicorrect
ssh michel@91.99.173.178
cd aicorrect
./update.sh             # git pull + pull images + migrations + restart app/app_pro
```

### Update manuel

```bash
ssh michel@91.99.173.178
cd vibenu
docker compose pull app app_pro
docker compose up -d
```

---

## Rétention des données (AiCorrect)

### `UsageEvent` (rows bruts, 1 par appel `/v1/correct`)

- **Purge automatique** : tous les jours à **03:00 UTC** via cron interne
  (`UsageRetentionService` dans le backend, basé sur `@nestjs/schedule`).
- **Fenêtre par défaut** : **180 jours**, configurable via env
  `USAGE_EVENT_RETENTION_DAYS` dans `.env.hetzner`.
- **Pourquoi 180j** : couvre l'audit/support sur 6 mois sans laisser la table
  grossir indéfiniment. Au-delà, les rows individuels ne servent plus à rien
  (les agrégats `UsageMonthly` couvrent les besoins dashboard/quota/admin).

### `UsageMonthly` (1 row par user × mois)

- **Jamais purgée.** Compact, micro-volume, conservée pour toujours. C'est
  ce que voit l'utilisateur dans son dashboard et l'admin dans `/admin`.

### Visibilité opérationnelle

- Page `/admin` → bandeau du haut : nombre d'events bruts, plus ancien row,
  fenêtre de rétention, date + count de la dernière purge.
- Endpoint backend : `GET /v1/admin/usage/stats` (session admin requise).

### Changer la rétention

```bash
# Sur ton poste, édite .env.hetzner
USAGE_EVENT_RETENTION_DAYS=90   # ou autre

# scp + restart
scp .env.hetzner USER@VPS:~/aicorrect/.env.hetzner
ssh USER@VPS "cd ~/aicorrect && ./update.sh"
```

### Forcer une purge à la main (debug)

Pas d'endpoint dédié. Le plus simple : SQL direct.
```bash
docker compose --env-file .env.hetzner exec mariadb \
  mysql -uaicorrect -p"$MARIADB_PASSWORD" aicorrect \
  -e "DELETE FROM UsageEvent WHERE ts < DATE_SUB(NOW(), INTERVAL 180 DAY);"
```

### Notes RGPD

L'export utilisateur (`GET /v1/users/me/export`) inclut les `UsageEvent`
disponibles (≤ rétention) et le `UsageMonthly` complet. Les textes corrigés
ne sont **jamais** stockés (cf. `correct.service.ts`, `mistral.client.ts`).