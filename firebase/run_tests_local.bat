@echo off
setlocal
REM ====================================================================
REM Lance les tests Plume EN LOCAL (sur ta machine + un appareil/emulateur).
REM
REM Usage (depuis n'importe ou, double-clic possible) :
REM   firebase\run_tests_local.bat            -> unitaires PUIS instrumentes
REM   firebase\run_tests_local.bat unit       -> seulement les unitaires JVM
REM   firebase\run_tests_local.bat instr      -> seulement les instrumentes
REM
REM Les tests instrumentes necessitent un appareil/emulateur connecte (adb).
REM ====================================================================

REM --- Tokens (secrets LOCAUX, non commites) -------------------------
REM  Copier firebase\secrets.local.bat.example en firebase\secrets.local.bat
REM  et y mettre les vrais tokens (ce fichier est gitignore).
REM  Laisser vide => les tests qui en dependent sont IGNORES (pas en echec).
set AICORRECT_TOKEN_ACTIVE=
set AICORRECT_TOKEN_NOSUB=
if exist "%~dp0secrets.local.bat" call "%~dp0secrets.local.bat"

REM --- Se placer a la racine du projet (ce script est dans firebase\) -
pushd "%~dp0.."

set MODE=%~1
if "%MODE%"=="" set MODE=all

if /I "%MODE%"=="instr" goto instrumented
if /I "%MODE%"=="instrumented" goto instrumented

echo ============================================================
echo  1/2  Tests unitaires JVM  (testDebugUnitTest)
echo ============================================================
call gradlew.bat testDebugUnitTest
if errorlevel 1 goto fail
if /I "%MODE%"=="unit" goto done

:instrumented
echo.
echo ============================================================
echo  2/2  Tests instrumentes  (connectedDebugAndroidTest)
echo       Necessite un appareil / emulateur connecte :
echo ============================================================
REM Liste les appareils si adb est sur le PATH (sinon Gradle utilise son propre adb).
where adb >nul 2>nul && adb devices
echo.
call gradlew.bat connectedDebugAndroidTest ^
  -Pandroid.testInstrumentationRunnerArguments.aicorrectTokenActive=%AICORRECT_TOKEN_ACTIVE% ^
  -Pandroid.testInstrumentationRunnerArguments.aicorrectTokenNoSub=%AICORRECT_TOKEN_NOSUB% ^
  -Pandroid.testInstrumentationRunnerArguments.aicorrectToken=%AICORRECT_TOKEN_ACTIVE%
if errorlevel 1 goto fail

:done
echo.
echo === TESTS OK ===
echo Rapports HTML :
echo   Unitaires    : app\build\reports\tests\testDebugUnitTest\index.html
echo   Instrumentes : app\build\reports\androidTests\connected\debug\index.html
popd
endlocal
exit /b 0

:fail
echo.
echo *** ECHEC DES TESTS (voir la sortie ci-dessus) ***
popd
endlocal
exit /b 1
