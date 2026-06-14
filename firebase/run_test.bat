@echo off
REM ====================================================================
REM Lance les tests instrumentes (clavier + Settings) sur Firebase Test Lab,
REM sur plusieurs modeles/versions d'Android.
REM Construire d'abord les APK debug + androidTest dans Android Studio
REM (ou : gradlew assembleDebug assembleDebugAndroidTest).
REM Usage : double-clic, ou depuis cmd : firebase\run_test.bat
REM ====================================================================

REM --- Tokens serveur -------------------------------------------------
REM  AICORRECT_TOKEN_ACTIVE : compte ABONNE (ou compte de test TEST_LOGIN) -> la correction reussit.
REM  AICORRECT_TOKEN_NOSUB  : compte GRATUIT ordinaire SANS abonnement -> popup "Veuillez vous abonner".
REM  Les tests qui n'ont pas leur token sont ignores (assumeTrue), pas en echec.
set AICORRECT_TOKEN_ACTIVE=aic_xnjGDJcLNfQ5251nSmpUghwsblAKYrgZQsb6xTLnHbQ
set AICORRECT_TOKEN_NOSUB=

gcloud firebase test android run ^
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
