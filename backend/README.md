# @aicorrect/backend

API REST pour `aicorrect.app` — NestJS + Prisma + MariaDB.

## Démarrage local

```bash
# 1. Démarrer MariaDB + Redis depuis la racine du repo
cd ..
docker compose up -d

# 2. Installer les dépendances
cd backend
npm install

# 3. Configurer l'environnement
cp .env.example .env
# éditer .env et renseigner au minimum MISTRAL_API_KEY

# 4. Générer le client Prisma et appliquer les migrations
npm run prisma:generate
npm run prisma:migrate

# 5. Lancer en mode dev
npm run start:dev
```

L'API écoute sur `http://localhost:3000`. Vérification : `curl http://localhost:3000/health`.

## Structure

```
src/
  main.ts                  # bootstrap
  app.module.ts            # racine
  config/env.ts            # validation env (zod)
  prisma/                  # PrismaService global
  health/                  # GET /health
prisma/
  schema.prisma            # modèle BDD complet (voir plan dans MEMORY)
```

## À venir (sprint suivants)

- `src/auth/` — code par email + sessions + api tokens
- `src/correct/` — endpoint `/v1/correct` (passe-plat Mistral + usage tracking)
- `src/billing/` — Stripe (checkout, portal, webhooks)
- `src/users/` — profil, suppression compte, export RGPD
