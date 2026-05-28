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
ssh michel@178.104.51.131
cd vibenu
./update.sh             # git pull + pull images + migrations + restart app/app_pro
```

### Update manuel

```bash
ssh michel@178.104.51.131
cd vibenu
docker compose pull app app_pro
docker compose up -d