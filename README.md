# Plume-AiCorrect

Correction orthographique et grammaticale par IA, accessible depuis n'importe quel champ de saisie Android, et pilotée par un backend web sur le domaine **aicorrect.app**.

## Architecture

```
┌──────────────┐         ┌──────────────────────┐         ┌──────────────┐
│ App Android  │────────▶│  Backend aicorrect.app│────────▶│  Mistral API │
│ (clavier)    │  token  │  (API REST)           │         └──────────────┘
└──────────────┘         │                       │         ┌──────────────┐
                         │                       │────────▶│   Stripe API │
┌──────────────┐         │                       │         └──────────────┘
│ Site web     │────────▶│                       │         ┌──────────────┐
│ (Next.js)    │ session │                       │────────▶│ Email transac│
└──────────────┘         └───────────┬───────────┘         └──────────────┘
                                     ▼
                              ┌────────────┐
                              │  MariaDB   │
                              └────────────┘
```

La clé Mistral ne quitte jamais le backend. L'app Android et le site web s'authentifient auprès du backend et délèguent l'appel IA.

## Structure du monorepo

| Dossier | Rôle | Stack |
|---|---|---|
| [`app/`](app/) | Clavier IME Android (existant) | Kotlin, Android SDK |
| [`backend/`](backend/) | API REST aicorrect.app | NestJS, Prisma, MariaDB |
| [`web/`](web/) | Site public + dashboard utilisateur | Next.js 15, next-intl, Tailwind |
| [`docker-compose.dev.yml`](docker-compose.dev.yml) | MariaDB + Redis pour le dev local | — |
| [`docker-compose.yml`](docker-compose.yml) | Stack de production (VPS Hetzner) | Docker + GHCR |

## Démarrage rapide (backend)

```bash
docker compose -f docker-compose.dev.yml up -d   # MariaDB + Redis pour le dev
cd backend
cp .env.example .env                # renseigner MISTRAL_API_KEY au minimum
npm install
npm run prisma:generate
npm run prisma:migrate
npm run start:dev
# → curl http://localhost:3000/health
```

Voir [`backend/README.md`](backend/README.md) pour les détails.

## Démarrage rapide (frontend)

Le backend doit déjà tourner sur `http://localhost:3000`.

```bash
cd web
cp .env.example .env                # NEXT_PUBLIC_API_URL=http://localhost:3000 par défaut
npm install
npm run dev
# → http://localhost:3001 (FR par défaut, /en pour l'anglais)
```

Flow complet : ouvrir `http://localhost:3001`, cliquer **Se connecter**, saisir un email, le code à 6 chiffres apparaît dans la console du backend (fallback dev tant que `RESEND_API_KEY` est vide), le valider → redirige sur `/fr/dashboard`.

Voir [`web/README.md`](web/README.md) pour les détails.

## App Android (existant)

Clavier IME personnalisé qui propose un bouton **Corriger**. Aujourd'hui l'app appelle directement Mistral ; lors d'un sprint à venir elle sera reconfigurée pour appeler `https://api.aicorrect.app/v1/correct` avec un token utilisateur.

Voir [`app/`](app/) — projet Android Studio standard (`build.gradle.kts`).

## Déploiement (VPS Hetzner)

Plume-AiCorrect est déployé sur le **même VPS** que [clairimmo](https://github.com/jolivem/clairimmo). Les deux stacks Docker se partagent le reverse-proxy Caddy de clairimmo via un network Docker externe `caddy_network`.

```
                 ┌──────────────────────────────────────────────┐
   80/443 ──▶    │  caddy (image alpine, repo clairimmo)        │
                 │  - claireadresse.fr      → app:3000          │
                 │  - pro.claireadresse.fr  → app_pro:3000      │
                 │  - aicorrect.app         → aicorrect-web:3001│
                 │  - api.aicorrect.app     → aicorrect-backend │
                 └────────────────────┬─────────────────────────┘
                                      │ caddy_network (external)
                 ┌────────────────────┴─────────────────────────┐
                 │  containers aicorrect (ce repo)              │
                 │  - aicorrect-backend  (NestJS)               │
                 │  - aicorrect-web      (Next.js standalone)   │
                 │  - aicorrect-mariadb  (interne uniquement)   │
                 └──────────────────────────────────────────────┘
```

### Build et publication des images

Les images sont construites en local puis poussées sur GitHub Container Registry. Pré-requis : un PAT GitHub avec `write:packages` et `docker login ghcr.io -u jolivem`.

```bash
./buildPush.sh                                  # tag = latest
./buildPush.sh v0.2.0                           # tag custom
```

Le script construit séparément `ghcr.io/jolivem/aicorrect-backend:<tag>` et `ghcr.io/jolivem/aicorrect-web:<tag>`. L'URL publique de l'API (`NEXT_PUBLIC_API_URL`) est bakée dans le bundle Next.js au build — exportez `PUBLIC_API_URL` avant `buildPush.sh` si vous changez de domaine.

### Setup initial du VPS (one-shot)

```bash
# 1. Cloner le repo aicorrect à côté de clairimmo
cd /opt && git clone https://github.com/jolivem/aicorrect.git
cd aicorrect

# 2. Créer le network Docker partagé avec caddy
docker network create caddy_network

# 3. Renseigner les secrets de prod
cp .env.example .env
$EDITOR .env                                    # MARIADB_PASSWORD, MISTRAL_API_KEY, Stripe, Resend...

# 4. Login GHCR (PAT avec read:packages suffit côté VPS)
docker login ghcr.io -u jolivem

# 5. Mettre à jour clairimmo pour attacher Caddy au network partagé
cd /opt/clairimmo
git pull                                        # récupère le Caddyfile et docker-compose.yml mis à jour
docker compose up -d caddy                      # redémarre caddy sur le bon network

# 6. Premier démarrage d'aicorrect
cd /opt/aicorrect
docker compose pull
docker compose up -d
# Le container backend applique automatiquement les migrations Prisma au démarrage
docker compose logs -f backend | head -40       # vérifier "aicorrect backend listening on :3000"
```

### Mise à jour quotidienne

```bash
cd /opt/aicorrect
./update.sh                                     # git pull + docker pull + restart backend & web
./update.sh --full                              # idem + restart mariadb
```

Le script :
1. `git pull` (récupère `docker-compose.yml`, migrations Prisma, etc.)
2. `docker compose pull backend web` (nouvelles images depuis GHCR)
3. `docker compose up -d backend` → l'entrypoint lance `prisma migrate deploy` puis `node dist/main.js`
4. `docker compose up -d web`
5. `docker image prune -f`

### Modifier le routing Caddy

Le `Caddyfile` vit dans le repo clairimmo. Pour ajouter/modifier un domaine ou un sous-domaine aicorrect, éditer [clairimmo/Caddyfile](../clairimmo/Caddyfile) puis :

```bash
cd /opt/clairimmo && git pull && docker compose restart caddy
```

### Variables d'environnement

Voir [`.env.example`](.env.example) pour la liste complète. À retenir :
- **Obligatoires** : `MARIADB_PASSWORD`, `MARIADB_ROOT_PASSWORD`, `MISTRAL_API_KEY`
- **Recommandées en prod** : `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRO_PRICE_ID`, `RESEND_API_KEY`
- `BACKEND_IMAGE_TAG` / `WEB_IMAGE_TAG` : permet de figer des tags spécifiques (sinon `latest`)

## Décisions structurantes

- **Auth** : code à 6 chiffres envoyé par email (pas de mot de passe). Token long-lived révocable pour Android, transmis via QR-code depuis le dashboard.
- **Paiement** : Stripe Subscriptions. Aucune donnée de carte n'est stockée côté Plume-AiCorrect.
- **Plans** : Pro uniquement au lancement, essai gratuit 7 jours.
- **RGPD** : minimisation (jamais de stockage du texte corrigé), export et suppression de compte depuis le dashboard.

## Facturation & Stripe — qui fait quoi

Principe : **Stripe est le moteur d'argent** (facture, encaisse, génère les PDF, vire l'argent sur le compte bancaire). **Le backend ne fait que réagir** aux webhooks Stripe et garde une **copie locale** des données pour les afficher. L'app ne touche jamais ni l'argent ni les numéros de carte.

| Fonction | Backend aicorrect.app | Stripe |
|---|---|---|
| Facturation mensuelle (renouvellement, débit, relances) | Crée l'abonnement (Checkout), miroir local de l'état via webhooks | **Tout le cycle de vie** |
| Mail : **code de connexion** | **Envoie** (via Resend, `auth/email.service.ts`) | — |
| Mail : reçus / factures / paiement échoué | — | **Envoie** (si activé dans le dashboard, voir ci-dessous) |
| Virements vers le compte bancaire (payouts) | Rien (aucun code) | **Tout** (calendrier de payout du dashboard) |
| Génération des factures + PDF | — | **Génère et héberge** |
| Consultation des factures | **Affiche** depuis la copie locale (`Invoice`) + liens Stripe (`pdfUrl`, `hostedUrl`) | Génère/héberge les PDF |
| Stockage des cartes | Jamais (seulement les 4 derniers chiffres) | **Stocke et sécurise** |

Les factures locales sont alimentées **uniquement par les webhooks** (`invoice.created/finalized/paid/payment_failed`, voir `billing/webhook.service.ts`). Une facture dont le webhook est manqué (ex. dev local sans tunnel) n'apparaîtra pas dans le dashboard utilisateur, même si elle existe chez Stripe.

### Réglages à vérifier dans le dashboard Stripe (non gérés par le code)

Certains comportements dépendent **entièrement** de la configuration du compte Stripe et **ne sont pas lisibles depuis le repo**. À vérifier en **mode Live** (la config Test est séparée) :

- **Customer Portal** (Settings → Billing → Customer portal) : la **résiliation** doit être activée (`subscription_cancel`), sinon le bouton « Résilier mon abonnement » — qui ouvre le portail directement sur l'écran d'annulation — échoue.
  - Vérifié le 2026-06-28 en **mode Test** : résiliation ✅ activée (`at_period_end`), historique des factures ✅, mise à jour carte ✅, changement de plan ❌ (volontaire, un seul plan). **Mode Live non vérifié** (clé `sk_live` indisponible).
- **Customer emails** (Settings → Customer emails) : activer les reçus de paiement et l'envoi des factures si l'on veut que les clients reçoivent un mail à chaque échéance. **Ces toggles ne sont pas exposés par l'API** → vérification manuelle obligatoire.
- **Payouts** (Settings → Payouts) : calendrier des virements vers le compte bancaire (quotidien / hebdo / mensuel).

## Roadmap

Sprints d'une semaine, ordre indicatif :

1. ✅ Infra & skeleton backend
2. ✅ Auth email code + sessions + api tokens
3. ✅ Endpoint `/v1/correct` (passe-plat Mistral + tracking)
4. ✅ Intégration Stripe (plans, checkout, webhooks)
5. ✅ Frontend landing + login (Next.js, FR/EN)
6. ✅ Dashboard utilisateur (usage, factures, tokens)
7. ✅ RGPD + pages légales
8. Migration de l'app Android vers le backend
9. Beta fermée
10. Lancement public
