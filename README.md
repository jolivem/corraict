# AiCorrect

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
| [`docker-compose.yml`](docker-compose.yml) | MariaDB + Redis pour le dev local | — |

## Démarrage rapide (backend)

```bash
docker compose up -d                # MariaDB + Redis
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

## Décisions structurantes

- **Auth** : code à 6 chiffres envoyé par email (pas de mot de passe). Token long-lived révocable pour Android, transmis via QR-code depuis le dashboard.
- **Paiement** : Stripe Subscriptions. Aucune donnée de carte n'est stockée côté AiCorrect.
- **Plans** : Pro uniquement au lancement, essai gratuit 7 jours.
- **RGPD** : minimisation (jamais de stockage du texte corrigé), export et suppression de compte depuis le dashboard.

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
