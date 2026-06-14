# Tests — application Android Plume

Comment lancer les tests, et où ils s'exécutent.

## Vue d'ensemble : qui tourne où ?

| Type | Source set | Où ça tourne | Commande |
|------|-----------|--------------|----------|
| **Unitaires JVM** (rapides) | `app/src/test` | Ta machine / CI (**pas** Firebase) | `./gradlew testDebugUnitTest` |
| **Instrumentés** (Espresso + UIAutomator) | `app/src/androidTest` | Émulateur/appareil **ou Firebase Test Lab** | `connectedDebugAndroidTest` / `run_test.bat` |

> Firebase Test Lab exécute **l'APK `androidTest` entier** : **tous** les tests Espresso/UIAutomator
> y tournent automatiquement, sur chaque appareil de la matrice. Les tests unitaires JVM sont
> host-side et ne partent jamais sur Firebase — lance-les en local/CI avant de construire les APK.

**En local (Windows) : [`firebase\run_tests_local.bat`](firebase/run_tests_local.bat)** — lance unitaires + instrumentés (voir « Raccourci » ci-dessous).
**Sur Firebase : [`firebase\run_test.bat`](firebase/run_test.bat)** — matrice multi-appareils.

---

## Raccourci : tout lancer en local build inclus (Windows)

```bat
cd aicorrect
firebase\run_tests_local.bat            REM unitaires PUIS instrumentes
firebase\run_tests_local.bat unit       REM unitaires JVM seulement
firebase\run_tests_local.bat instr      REM instrumentes seulement (appareil/emulateur requis)
```
Renseigne `AICORRECT_TOKEN_ACTIVE` / `AICORRECT_TOKEN_NOSUB` en haut du script pour les tests
clavier (sinon ils sont ignorés). Détail des commandes ci-dessous.

## 1. Tests unitaires JVM (rapides, sans device)

```bash
./gradlew testDebugUnitTest
```

Couvrent :
- `LanguageDefaultsTest` — `deviceDefaultLanguage()` (fr si l'appareil est en français, en sinon).
- `AiCorrectErrorParsingTest` — mapping des erreurs backend (`billing_required`, `quota_exceeded`,
  `account_suspended`, messages Nest, JSON malformé) dans `AiCorrectClient`.
- `CorrectionActionTest` — routage `correctionAction(code)` → popup abonnement / toast quota / échec générique.

Rapport HTML : `app/build/reports/tests/testDebugUnitTest/index.html`.
Un seul fichier : `./gradlew testDebugUnitTest --tests "com.aicorrect.plume.LanguageDefaultsTest"`.

---

## 2. Tests instrumentés (Espresso + UIAutomator)

Classes (`app/src/androidTest/.../`) :
- **`SettingsActivityTest`** (Espresso) — écran Paramètres + **lien aicorrect.app** (bouton
  « Gérer l'abonnement » → ouvre `https://aicorrect.app`), email affiché/caché, switch complétion,
  spinner langue, bouton « Changer ». **Déterministe, sans réseau** (token vidé → voie de repli).
- **`KeyboardSubscriptionFlowTest`** (UIAutomator) — **abonnement OK vs absent** :
  compte abonné → texte corrigé ; compte gratuit → popup « Veuillez vous abonner », texte inchangé.
- **`KeyboardMissingTokenTest`** (UIAutomator) — sans token → popup d'inscription. Aucun credential, jamais ignoré.
- `KeyboardCorrectionTest` (UIAutomator) — correction E2E historique.

### Tokens (arguments d'instrumentation)
- `aicorrectTokenActive` — compte **abonné** (ou compte de test `TEST_LOGIN`) → la correction réussit.
  Repli sur `aicorrectToken` s'il est absent.
- `aicorrectTokenNoSub` — compte **gratuit ordinaire** (ni abonné, ni Pro, ni `TEST_LOGIN`)
  → backend `402 billing_required` → popup d'abonnement.

> Un test dont le token est absent est **ignoré** (`assumeTrue`), pas en échec.
> Création des tokens : voir `firebase/README.md` (flux `curl` verify-code → tokens, un par compte).

### En local (émulateur/appareil connecté)
```bash
# Réglages + lien aicorrect.app (sans token) :
./gradlew connectedDebugAndroidTest --tests "com.aicorrect.plume.SettingsActivityTest"

# Token manquant (sans credential) :
./gradlew connectedDebugAndroidTest --tests "com.aicorrect.plume.KeyboardMissingTokenTest"

# Abonnement OK vs absent (vrais tokens) :
./gradlew connectedDebugAndroidTest --tests "com.aicorrect.plume.KeyboardSubscriptionFlowTest" \
  -Pandroid.testInstrumentationRunnerArguments.aicorrectTokenActive=aic_ABONNE \
  -Pandroid.testInstrumentationRunnerArguments.aicorrectTokenNoSub=aic_GRATUIT
```

### Sur Firebase Test Lab
créer le projet plume1 sans AI
puis ajouter une application:
plume1: Paramètres du projet: Paramètres généraux: Application Android
puis nom du package: com.aicorrect.plume
puis récupérer le google-service.json
puis mettre le nom du prjet dans run_test.bat, variable FIREBASE_PROJECT=plume1
puis :
gcloud projects list pour avoir l ID, par exemple plume1-86d0e
gcloud config set project plume1-86d0e
gcloud billing accounts list
gcloud billing projects link plume1-86d0e --billing-account=XXXXXX-XXXXXX-XXXXXX
si ne fonctionne pas, dans les paramètres plume1, remplacer le forfait Spark par le forfait Blaze

### Sur Firebase Test Lab (matrice multi-appareils)
```bash
./gradlew clean assembleDebug assembleDebugAndroidTest
# Puis : firebase\run_test.bat  (renseigner les tokens en haut du script)
```
Ou la commande `gcloud` directe (plusieurs `--device` couvrant min → récent + le seuil
*package visibility* API 30 pour le lien) — voir `firebase/README.md`.

La matrice par défaut (`run_test.bat`) : Android **35**, **30**, **28** sur `MediumPhone.arm`,
locale `fr`. `minSdk` du projet = 24 ; pour tester exactement l'API 24, ajoute un appareil
compatible (le virtuel ARM n'est pas toujours dispo en 24).

Les captures d'écran (popups, avant/après correction) sont récupérées depuis
`/sdcard/Android/data/com.aicorrect.plume/files/screenshots` via `--directories-to-pull`.

---

## Notes
- Le lien aicorrect.app est vérifié de façon **déterministe** sur toute la matrice via espresso-intents
  (l'intent `ACTION_VIEW` + l'URL sont contrôlés sans lancer de navigateur réel) ; un test « smoke »
  complémentaire exécute le vrai `startActivity` pour détecter un souci de résolution propre à un appareil.
- Dépendances de test ajoutées : `espresso-intents` (androidTest), `org.json:json` (unitaires JVM,
  pour parser du JSON hors device).
