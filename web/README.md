# @aicorrect/web

Site public + dashboard pour `aicorrect.app` — Next.js 15 (App Router) + next-intl + Tailwind.

## Démarrage local

```bash
# 1. Démarrer le backend (depuis la racine du repo, dans un autre terminal)
cd backend && npm run start:dev

# 2. Installer et lancer le front
cd web
npm install
cp .env.example .env
npm run dev
# → http://localhost:3001
```

Le backend doit tourner sur `http://localhost:3000` (configuré dans `.env` via `NEXT_PUBLIC_API_URL`).

## Routes

| Route | Type | Description |
|---|---|---|
| `/` | redirect | Redirige vers `/fr` (locale par défaut) |
| `/[locale]` | server | Landing page (hero + 3 cartes valeur + CTA) |
| `/[locale]/login` | client | Login en 2 étapes (email → code à 6 chiffres) |
| `/[locale]/dashboard` | server | Protégé — fetch en parallèle `/me`, `/usage`, `/billing/subscription`, `/billing/invoices`, `/auth/tokens`. Sections : utilisation, abonnement, tokens API (QR-code), factures, **Mes données** (export RGPD + suppression compte) |
| `/[locale]/legal/privacy` | server | Politique de confidentialité (RGPD) |
| `/[locale]/legal/terms` | server | Conditions générales d'utilisation |
| `/[locale]/legal/imprint` | server | Mentions légales (placeholders entreprise à remplir) |

`[locale]` ∈ `{fr, en}`, prefix toujours présent (SEO).

## Structure

```
src/
  middleware.ts            # next-intl routing
  i18n/
    routing.ts             # locales, defaultLocale, navigation helpers
    request.ts             # getRequestConfig → charge messages/<locale>.json
  app/
    layout.tsx             # html/body + import globals.css (lang fixé à "fr")
    [locale]/
      layout.tsx           # NextIntlClientProvider + header (LocaleSwitcher) + footer
      page.tsx             # landing
      login/page.tsx       # client component, fetch credentials:include
      dashboard/page.tsx   # server component, forward cookie -> /v1/auth/me
  components/
    LocaleSwitcher.tsx     # select <select> client component
  app/[locale]/dashboard/
    page.tsx               # server component, fetch en parallèle
    LogoutButton.tsx       # client, POST /v1/auth/logout
    BillingActions.tsx    # client, redirige vers Stripe Checkout/Portal
    TokensSection.tsx      # client, create/revoke + ouvre NewTokenDialog
    NewTokenDialog.tsx     # client, affiche QR code (qrcode lib) + secret (1 fois)
    DataSection.tsx        # client, export JSON RGPD + delete avec confirmation
  app/[locale]/legal/
    privacy/page.tsx       # politique de confidentialité (RGPD)
    terms/page.tsx         # conditions d'utilisation
    imprint/page.tsx       # mentions légales
  lib/
    api.ts                 # apiUrl() — safe en client component
    api.server.ts          # serverGet<T>() — forward cookie via next/headers (server-only)
    types.ts               # DTOs partagés (MeDto, UsageSummary, SubscriptionPayload, ...)
messages/
  fr.json / en.json        # toutes les chaînes UI
```

## Auth flow

1. L'utilisateur saisit son email sur `/[locale]/login`.
2. POST `${NEXT_PUBLIC_API_URL}/v1/auth/request-code` (204 si OK).
3. L'écran bascule sur l'étape "code" (state local, même page).
4. POST `/v1/auth/verify-code` (200 + `Set-Cookie: aicorrect_session=...; HttpOnly; SameSite=Lax`).
5. `router.push('/dashboard')` → server component lit le cookie via `next/headers` et appelle `/v1/auth/me`.

**Cross-port + cookie httpOnly** : le navigateur considère `localhost:3001` et `localhost:3000` comme same-site (port n'est pas pris en compte pour SameSite), donc le cookie SameSite=Lax est envoyé sur les `fetch credentials: 'include'`. En prod, `web.aicorrect.app` et `api.aicorrect.app` sont aussi same-site.

## En production

- Servir `web/` derrière `https://aicorrect.app`
- Servir `backend/` derrière `https://api.aicorrect.app`
- Backend env : `PUBLIC_WEB_URL=https://aicorrect.app`, `SESSION_COOKIE_DOMAIN=.aicorrect.app`
- Web env : `NEXT_PUBLIC_API_URL=https://api.aicorrect.app`

## À venir (sprints suivants)

- Migration de l'app Android vers le backend (sprint 8) : remplacer l'appel direct à Mistral par un `Authorization: Bearer aic_…` sur `/v1/correct`, scan QR depuis le dashboard pour provisionner le token.
