# Build and run tests with gcloud

recuperer un token de session (repeter le flux par compte) :
 curl -c cookies.txt -X POST https://api.aicorrect.app/v1/auth/verify-code -H "Content-Type: application/json" -d "{\"email\":\"tester@aicorrect.app\",\"code\":\"MODIFIER\"}"
 curl -b cookies.txt -X POST https://api.aicorrect.app/v1/auth/tokens -H "Content-Type: application/json" -d "{\"label\":\"FirebaseTest\"}"

Deux tokens sont utiles :
 - aicorrectTokenActive : compte ABONNE (ou le compte de test TEST_LOGIN) -> la correction reussit.
 - aicorrectTokenNoSub  : compte GRATUIT ordinaire SANS abonnement (ni Pro, ni TEST_LOGIN)
   -> /v1/correct renvoie 402 billing_required -> popup "Veuillez vous abonner".
   (Meme flux curl ci-dessus, mais en se connectant avec un email de compte gratuit.)

ouvrir cmd.exe
cd AndroidStudioProjects\aicorrect\
.\gradlew.bat clean assembleDebug assembleDebugAndroidTest
firebase\run_test.bat

Voir résultats (projet plume) :
https://console.firebase.google.com/project/plume/testlab/histories
(remplacer "plume" par l'ID EXACT du projet — Firebase ajoute souvent un suffixe, ex. plume-1a2b3.)

Bascule de aicorrect2 vers le nouveau projet :
 - renseigner FIREBASE_PROJECT en haut de run_test.bat (le script passe deja --project),
   ou bien : gcloud config set project plume
 - prerequis sur le nouveau projet : facturation Blaze liee + APIs
   "Cloud Testing" et "Cloud Tool Results" activees ; compte gcloud autorise.

# Facturation Blaze (pay as you go)

gcloud config get-value project
gcloud billing accounts list
gcloud billing projects link TON_PROJET --billing-account=XXXXXX-XXXXXX-XXXXXX


# Tests Firebase Test Lab — clavier Plume-AiCorrect

Deux approches complémentaires. **Pour réellement tester la correction du clavier,
utilisez le test instrumenté** ; le script Robo ne couvre que le parcours de l'app.

## Pourquoi deux approches ?

Un clavier est un **IME** (service système), pas un écran de l'app. Un test Robo
lance `LoginActivity` et explore l'UI de l'app : il ne peut pas
(1) se connecter (code reçu par e-mail), (2) activer/choisir le clavier de façon
fiable (UI système), ni (3) faire apparaître le clavier dans un champ de saisie.
Le test instrumenté, lui, pilote le device : il active l'IME en ligne de commande,
injecte un token, ouvre un champ et appuie sur « Corriger ».

---

## 1. Tests instrumentés (recommandé — clavier + Settings)

Classes (`app/src/androidTest/.../`) :
- `KeyboardCorrectionTest` — correction de bout en bout (legacy, token `aicorrectToken`).
- `KeyboardSubscriptionFlowTest` — **abonnement OK vs absent** : compte abonné → texte corrigé ;
  compte gratuit → popup « Veuillez vous abonner » + texte inchangé.
- `KeyboardMissingTokenTest` — sans token : popup d'inscription (aucun token requis, jamais ignoré).
- `SettingsActivityTest` — écran Paramètres + **lien aicorrect.app** (bouton « Gérer l'abonnement »),
  switch complétion, spinner langue, email, bouton « Changer ». Déterministe, sans réseau.

Tous partent dans l'APK `androidTest` → ils tournent **tous sur Firebase Test Lab**, sur chaque
appareil de la matrice. (Les tests unitaires JVM dans `app/src/test` — `LanguageDefaultsTest`,
`Plume-AiCorrectErrorParsingTest`, `CorrectionActionTest` — ne tournent **pas** sur FTL : ils sont
host-side, à lancer via `./gradlew testDebugUnitTest`.)

Args d'instrumentation (token absent ⇒ test **ignoré** via `assumeTrue`, pas en échec) :
`aicorrectTokenActive` (abonné / repli sur `aicorrectToken`), `aicorrectTokenNoSub` (compte gratuit).

### Lancer sur Firebase Test Lab (matrice multi-appareils)

```bash
# Construire les APK : ./gradlew clean assembleDebug assembleDebugAndroidTest
gcloud firebase test android run \
  --type instrumentation \
  --app app/build/outputs/apk/debug/app-debug.apk \
  --test app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk \
  --environment-variables aicorrectTokenActive=aic_ABONNE,aicorrectTokenNoSub=aic_GRATUIT,aicorrectToken=aic_ABONNE \
  --directories-to-pull /sdcard/Android/data/com.aicorrect.plume/files/screenshots \
  --timeout 8m \
  --device model=MediumPhone.arm,version=35,locale=fr,orientation=portrait \
  --device model=MediumPhone.arm,version=30,locale=fr,orientation=portrait \
  --device model=MediumPhone.arm,version=28,locale=fr,orientation=portrait
```

`version=30` couvre le seuil de *package visibility* (Android 11) pertinent pour l'ouverture du
lien aicorrect.app. `minSdk` du projet = 24 ; si tu veux tester exactement l'API 24, ajoute un
appareil compatible (le virtuel `MediumPhone.arm` n'est pas toujours dispo en 24 — utilise un
modèle physique FTL ou un autre `model`). Ou utilise simplement `firebase\run_test.bat`.

### Lancer en local (sur un device/émulateur connecté)

```bash
# Réglages (déterministes, sans token) :
./gradlew connectedDebugAndroidTest --tests "com.aicorrect.plume.SettingsActivityTest"
# Token manquant (sans credential) :
./gradlew connectedDebugAndroidTest --tests "com.aicorrect.plume.KeyboardMissingTokenTest"
# Abonnement OK vs absent (avec vrais tokens) :
./gradlew connectedDebugAndroidTest --tests "com.aicorrect.plume.KeyboardSubscriptionFlowTest" \
  -Pandroid.testInstrumentationRunnerArguments.aicorrectTokenActive=aic_ABONNE \
  -Pandroid.testInstrumentationRunnerArguments.aicorrectTokenNoSub=aic_GRATUIT
```

---

## 2. Script Robo (parcours de l'app uniquement)

Fichier : `firebase/robo_script.json`. Il saisit un e-mail et clique « Envoyer le
code » ; si un token existe déjà, il tente d'ouvrir le sélecteur de clavier.
Il **ne teste pas** la correction (cf. plus haut).

```bash
gcloud firebase test android run \
  --type robo \
  --app app/build/outputs/apk/debug/app-debug.apk \
  --robo-script firebase/robo_script.json \
  --device model=MediumPhone.arm,version=34,locale=fr,orientation=portrait \
  --timeout 3m
```

> Le composant IME est `com.aicorrect.plume/.CorrectKeyboardService` ;
> les ID de ressources (`btnCorrect`, `editEmail`, …) sont préfixés par
> `com.aicorrect.plume:id/`.
