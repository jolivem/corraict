# Build and run tests with gcloud

recuperer un token des session:
 curl -c cookies.txt -X POST https://api.aicorrect.app/v1/auth/verify-code -H "Content-Type: application/json" -d "{\"email\":\"tester@aicorrect.app\",\"code\":\"MODIFIER\"}"
 curl -b cookies.txt -X POST https://api.aicorrect.app/v1/auth/tokens -H "Content-Type: application/json" -d "{\"label\":\"FirebaseTest\"}"

ouvrir cmd.exe
cd AndroidStudioProjects\aicorrect\
.\gradlew.bat clean assembleDebug assembleDebugAndroidTest
firebase\run_test.bat

Voir résultats dans aicorrect2:
https://console.firebase.google.com/u/0/project/aicorrect2/testlab/histories/bh.740deafcb288724b

# Facturation Blaze (pay as you go)

gcloud config get-value project
gcloud billing accounts list
gcloud billing projects link TON_PROJET --billing-account=XXXXXX-XXXXXX-XXXXXX


# Tests Firebase Test Lab — clavier AiCorrect

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

## 1. Test instrumenté (recommandé — teste la correction)

Fichiers : `app/src/androidTest/.../KeyboardCorrectionTest.kt`,
`EditorTestActivity.kt`, `app/src/androidTest/AndroidManifest.xml`.

Ce qu'il fait : `ime enable` + `ime set` sur `com.example.aicorrect/.CorrectKeyboardService`,
injecte le token serveur, ouvre un champ texte, pré-remplit une phrase fautive,
clique `btnCorrect`, attend le backend et vérifie que le texte a changé.

Le token (vrai backend) se passe en variable `aicorrectToken`.

### Lancer sur Firebase Test Lab

```bash
# Construire les APK dans Android Studio (Build > Build APK) ou via Gradle.
gcloud firebase test android run \
  --type instrumentation \
  --app app/build/outputs/apk/debug/app-debug.apk \
  --test app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk \
  --device model=MediumPhone.arm,version=34,locale=fr,orientation=portrait \
  --environment-variables aicorrectToken=aic_VOTRE_TOKEN_DE_TEST \
  --timeout 6m
```

### Lancer en local (sur un device/émulateur connecté)

```bash
./gradlew connectedDebugAndroidTest \
  -Pandroid.testInstrumentationRunnerArguments.aicorrectToken=aic_VOTRE_TOKEN_DE_TEST
```

> Sans `aicorrectToken`, le test est **ignoré** (pas en échec).

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

> Le composant IME est `com.example.aicorrect/.CorrectKeyboardService` ;
> les ID de ressources (`btnCorrect`, `editEmail`, …) sont préfixés par
> `com.example.aicorrect:id/`.
