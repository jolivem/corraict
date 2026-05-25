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

Toutes les routes applicatives sont préfixées `/v1` (sauf `/health`).

## Structure

```
src/
  main.ts                  # bootstrap (cookie-parser, prefix /v1, CORS)
  app.module.ts            # racine
  config/env.ts            # validation env (zod)
  common/
    zod-validation.pipe.ts # pipe NestJS pour valider les bodies via zod
  prisma/                  # PrismaService global
  health/                  # GET /health
  billing/                 # Stripe Subscriptions (Pro + trial 7j)
    billing.controller.ts  # POST /v1/billing/{checkout,portal}, GET subscription
    billing.service.ts     # ensureCustomer + checkout/portal sessions
    webhook.controller.ts  # POST /v1/billing/webhook (raw body, signature)
    webhook.service.ts     # handlers customer.subscription / invoice / payment_method
    stripe.client.ts       # SDK lazy + BillingNotConfiguredException (503)
    dto/billing.dto.ts     # schemas zod (paths success/cancel/return)
  correct/                 # /v1/correct — passe-plat Mistral (Bearer ApiToken)
    correct.controller.ts  # POST /v1/correct
    correct.service.ts     # orchestre Mistral + tracking usage
    mistral.client.ts      # fetch -> api.mistral.ai (timeout, AbortController)
    prompt.ts              # system prompt FR/EN (porté de l'app Android)
    dto/correct.dto.ts     # schema zod (text, language, model)
  usage/                   # tracking RGPD — métriques sans texte
    usage.controller.ts    # GET /v1/usage (cookie) — mois en cours + 6 derniers mois
    usage.service.ts       # UsageEvent + UsageMonthly upsert atomique
  users/                   # RGPD — droits art. 17 (effacement) et art. 20 (portabilité)
    users.controller.ts    # GET /v1/users/me/export, DELETE /v1/users/me
    users.service.ts       # export complet + soft-delete + cancel Stripe sub
  auth/                    # auth par code email + sessions cookie + API tokens
    auth.controller.ts     # /v1/auth/request-code, verify-code, me, logout
    auth.service.ts        # génération/vérification du code, sessions
    tokens.controller.ts   # /v1/auth/tokens (CRUD)
    tokens.service.ts      # création (secret renvoyé 1 fois), résolution Bearer
    email.service.ts       # Resend (prod) ou console.log (dev)
    guards/
      session.guard.ts     # cookie httpOnly → req.auth
      api-token.guard.ts   # Authorization: Bearer aic_... → req.auth
    decorators/current-user.decorator.ts
    dto/auth.dto.ts        # schemas zod (RequestCode, VerifyCode, CreateToken)
prisma/
  schema.prisma            # modèle BDD complet
```

## Endpoints d'auth

| Méthode | Route | Auth | Description |
|---|---|---|---|
| POST | `/v1/auth/request-code` | — | Envoie un code par email (6 chiffres, TTL 10 min) |
| POST | `/v1/auth/verify-code` | — | Vérifie le code, upsert l'utilisateur, pose le cookie de session |
| GET | `/v1/auth/me` | cookie | Retourne `{ userId, email }` |
| POST | `/v1/auth/logout` | — | Supprime la session DB + clear le cookie |
| POST | `/v1/auth/tokens` | cookie | Crée un API token long-lived (le secret n'est renvoyé qu'à la création) |
| GET | `/v1/auth/tokens` | cookie | Liste les tokens actifs |
| DELETE | `/v1/auth/tokens/:id` | cookie | Révoque un token |

**Sessions web** : cookie `aicorrect_session` httpOnly, SameSite=Lax, Secure en prod, TTL 30j.
**App Android** : `Authorization: Bearer aic_<...>` sur `/v1/correct` (protégé par `ApiTokenGuard`).

## Endpoint correction

| Méthode | Route | Auth | Description |
|---|---|---|---|
| POST | `/v1/correct` | Bearer | Corrige `text` (fautes uniquement, pas de reformulation) via Mistral |

**Body** : `{ "text": "…", "language": "fr"|"en", "model"?: "…" }` (text max `CORRECT_MAX_INPUT_CHARS`, défaut 5000).
**Réponse 200** : `{ "corrected": "…", "model": "mistral-small-latest", "latencyMs": 1234 }`.
**Erreurs** : 401 (token absent/révoqué), 400 (validation), 502 (Mistral indisponible — `{ message: "correction_unavailable", reason: "timeout"|"upstream_xxx"|"network"|"empty_choice" }`).

### RGPD

- Le texte ne quitte le backend que vers Mistral et **n'est jamais persisté**.
- Seules les métriques (`wordsIn`, `charsIn`, `model`, `latencyMs`, `success`, `httpStatus`) sont stockées dans `UsageEvent`.
- `UsageMonthly` est upsertée atomiquement dans la même transaction pour des lectures dashboard rapides.

## Endpoints billing (Stripe)

| Méthode | Route | Auth | Description |
|---|---|---|---|
| POST | `/v1/billing/checkout` | cookie | Crée une Checkout Session (Pro + trial `STRIPE_TRIAL_DAYS` jours) → renvoie `{ url }` |
| POST | `/v1/billing/portal` | cookie | Crée une Billing Portal Session pour gérer l'abonnement → `{ url }` |
| GET | `/v1/billing/subscription` | cookie | Souscription active + cartes enregistrées |
| GET | `/v1/billing/invoices` | cookie | Liste des factures (dashboard) |
| POST | `/v1/billing/webhook` | signature Stripe | Webhook Stripe (raw body + `stripe-signature`) |
| GET | `/v1/usage` | cookie | Mois en cours + historique 6 mois (depuis `UsageMonthly`) |
| GET | `/v1/users/me/export` | cookie | Export JSON RGPD (toutes les métadonnées, jamais le texte) |
| DELETE | `/v1/users/me` | cookie | Soft-delete + révocation tokens/sessions + cancel Stripe sub à fin de période |

**Dégradation** : si `STRIPE_SECRET_KEY` / `STRIPE_PRO_PRICE_ID` / `STRIPE_WEBHOOK_SECRET` est absent, ces endpoints retournent `503 { message: "billing_not_configured", missing: "<VAR>" }`. Pratique pour développer le frontend avant que les clés Stripe soient provisionnées.

**Données stockées** (jamais le PAN/CVV — Stripe les détient) :
- `Subscription` : id Stripe, plan, statut, période en cours, trial, cancel
- `Invoice` : id Stripe, montant, URLs PDF/hosted, paid_at
- `PaymentMethod` : id Stripe, brand, last4, expiration

**Webhook** : le raw body est obligatoire pour vérifier la signature. Dans [main.ts](src/main.ts), `express.raw()` est monté **avant** `express.json()` uniquement sur `/v1/billing/webhook`. Les events traités : `customer.subscription.created|updated|deleted`, `invoice.created|finalized|paid|payment_failed`, `payment_method.attached|updated|detached`.

### Tester en local

1. Renseigner les 3 vars Stripe dans `.env` (secret key sandbox, price id Pro, webhook secret du `stripe listen`).
2. `stripe listen --forward-to localhost:3000/v1/billing/webhook` (Stripe CLI).
3. `stripe trigger customer.subscription.created` pour rejouer un event.

### Dev sans Resend

Si `RESEND_API_KEY` est vide, le code à 6 chiffres est loggé dans la console du backend (à la place de l'envoi email) — pratique pour tester localement sans compte Resend.

### Anti-abus

- `AUTH_CODE_MAX_ATTEMPTS` (défaut 5) : nombre de tentatives par code avant rejet
- `AUTH_CODE_RATE_LIMIT_MAX` / `AUTH_CODE_RATE_LIMIT_WINDOW_SECONDS` (défaut 5/15 min) : nombre de codes demandables par email sur une fenêtre glissante

## À venir (sprints suivants)

- `src/users/` — profil, suppression compte, export RGPD
- `web/` — landing + dashboard Next.js qui consomme `/v1/auth/*`, `/v1/billing/*`, agrégats d'usage
