@echo off
REM ====================================================================
REM Lance le test instrumente du clavier AiCorrect sur Firebase Test Lab.
REM Construire d'abord les APK debug + androidTest dans Android Studio.
REM Usage : double-clic, ou depuis cmd : firebase\run_test.bat
REM ====================================================================

REM --- Mets ton vrai token serveur ici -------------------------------
set AICORRECT_TOKEN=aic_xnjGDJcLNfQ5251nSmpUghwsblAKYrgZQsb6xTLnHbQ

gcloud firebase test android run ^
  --type instrumentation ^
  --app app\build\outputs\apk\debug\app-debug.apk ^
  --test app\build\outputs\apk\androidTest\debug\app-debug-androidTest.apk ^
  --environment-variables aicorrectToken=%AICORRECT_TOKEN% ^
  --directories-to-pull /sdcard/Android/data/com.example.aicorrect/files/screenshots ^
  --timeout 6m ^
  --device model=MediumPhone.arm,version=35,locale=fr,orientation=portrait

pause
