@echo off
setlocal enabledelayedexpansion
title Chase APK Builder

:MENU
cls
echo =====================================
echo        Chase APK Build Menu
echo =====================================
echo.
echo 1. Build Debug APK and Run on Emulator
echo 2. Build Release APK and Run on Emulator
echo 3. Build Debug APK Only
echo 4. Build Release APK Only
echo 5. Install Existing APK on Emulator
echo 6. Start Emulator Only
echo 7. Show ADB Devices
echo 8. Open APK Output Folder
echo 9. Exit
echo.

set /p choice="Enter your choice (1-9): "

if "%choice%"=="1" goto BUILD_DEBUG_RUN
if "%choice%"=="2" goto BUILD_RELEASE_RUN
if "%choice%"=="3" goto BUILD_DEBUG_ONLY
if "%choice%"=="4" goto BUILD_RELEASE_ONLY
if "%choice%"=="5" goto INSTALL_ONLY
if "%choice%"=="6" goto START_EMULATOR
if "%choice%"=="7" goto SHOW_DEVICES
if "%choice%"=="8" goto OPEN_FOLDER
if "%choice%"=="9" goto EXIT

echo Invalid choice. Please try again.
pause
goto MENU

:BUILD_DEBUG_RUN
echo.
echo Building Debug APK and Running...
powershell -ExecutionPolicy Bypass -File "%~dp0build-and-run.ps1" -BuildType debug
pause
goto MENU

:BUILD_RELEASE_RUN
echo.
echo Building Release APK and Running...
powershell -ExecutionPolicy Bypass -File "%~dp0build-and-run.ps1" -BuildType release
pause
goto MENU

:BUILD_DEBUG_ONLY
echo.
echo Building Debug APK Only...
powershell -ExecutionPolicy Bypass -File "%~dp0build-and-run.ps1" -BuildType debug -SkipEmulatorStart
pause
goto MENU

:BUILD_RELEASE_ONLY
echo.
echo Building Release APK Only...
powershell -ExecutionPolicy Bypass -File "%~dp0build-and-run.ps1" -BuildType release -SkipEmulatorStart
pause
goto MENU

:INSTALL_ONLY
echo.
echo Installing Existing APK...
powershell -ExecutionPolicy Bypass -File "%~dp0build-and-run.ps1" -SkipBuild
pause
goto MENU

:START_EMULATOR
echo.
echo Starting Emulator...
if not defined ANDROID_HOME (
    echo ERROR: ANDROID_HOME is not set!
    pause
    goto MENU
)

echo Available emulators:
"%ANDROID_HOME%\emulator\emulator.exe" -list-avds
echo.
set /p avd_name="Enter emulator name: "

if not "!avd_name!"=="" (
    echo Starting emulator: !avd_name!
    start "" "%ANDROID_HOME%\emulator\emulator.exe" -avd !avd_name! -gpu host
    echo Emulator starting in background...
) else (
    echo No emulator name provided.
)
pause
goto MENU

:SHOW_DEVICES
echo.
echo Connected Devices:
echo.
if not defined ANDROID_HOME (
    echo ERROR: ANDROID_HOME is not set!
    pause
    goto MENU
)
"%ANDROID_HOME%\platform-tools\adb.exe" devices -l
echo.
pause
goto MENU

:OPEN_FOLDER
echo.
echo Opening APK output folder...
if exist "%~dp0build\app\outputs\flutter-apk\" (
    start "" "%~dp0build\app\outputs\flutter-apk\"
) else (
    echo APK output folder not found. Build an APK first.
)
pause
goto MENU

:EXIT
echo.
echo Goodbye!
exit /b 0