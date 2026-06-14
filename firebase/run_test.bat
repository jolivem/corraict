@echo off
REM ====================================================================
REM Lance les tests instrumentes (clavier + Settings) sur Firebase Test Lab,
REM sur plusieurs modeles/versions d'Android.
REM Construire d'abord les APK debug + androidTest dans Android Studio
REM (ou : gradlew assembleDebug assembleDebugAndroidTest).
REM Usage : double-clic, ou depuis cmd : firebase\run_test.bat
REM ====================================================================

REM --- Projet Firebase / Google Cloud --------------------------------
REM  ID EXACT du projet (Firebase ajoute souvent un suffixe, ex. plume-1a2b3).
REM  Verifie avec : gcloud projects list   ou la console Firebase.
REM  Prerequis sur ce projet : facturation Blaze + APIs "Cloud Testing" et
REM  "Cloud Tool Results" activees.
set FIREBASE_PROJECT=plume1-86d0e

REM --- Tokens serveur (secrets LOCAUX, non commites) -----------------
REM  Copier firebase\secrets.local.bat.example en firebase\secrets.local.bat
REM  et y mettre les vrais tokens (ce fichier est gitignore).
REM  Les tests qui n'ont pas leur token sont ignores (assumeTrue), pas en echec.
set AICORRECT_TOKEN_ACTIVE=
set AICORRECT_TOKEN_NOSUB=
if exist "%~dp0secrets.local.bat" call "%~dp0secrets.local.bat"

REM Derniere ligne --device = TABLETTE (grand ecran) : valide la mise en page
REM clavier + popups. gts4lvwifi = Samsung Galaxy Tab S5e (appareil PHYSIQUE ->
REM plus couteux/lent). Verifie la dispo / change le modele si besoin :
REM   gcloud firebase test android models list   (colonne FORM = TABLET)
gcloud firebase test android run ^
  --project %FIREBASE_PROJECT% ^
  --type instrumentation ^
  --app app\build\outputs\apk\debug\app-debug.apk ^
  --test app\build\outputs\apk\androidTest\debug\app-debug-androidTest.apk ^
  --environment-variables aicorrectTokenActive=%AICORRECT_TOKEN_ACTIVE%,aicorrectTokenNoSub=%AICORRECT_TOKEN_NOSUB%,aicorrectToken=%AICORRECT_TOKEN_ACTIVE% ^
  --directories-to-pull /sdcard/Android/data/com.aicorrect.plume/files/screenshots ^
  --timeout 8m ^
  --device model=MediumPhone.arm,version=35,locale=fr,orientation=portrait ^
  --device model=MediumPhone.arm,version=30,locale=fr,orientation=portrait ^
  --device model=MediumPhone.arm,version=28,locale=fr,orientation=portrait 
  
pause
