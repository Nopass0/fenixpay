@echo off
REM Batch file wrapper for PowerShell script
REM This makes it easier to run by double-clicking

echo === Chase APK Build and Run ===
echo.

REM Check if PowerShell execution policy allows scripts
powershell -Command "Get-ExecutionPolicy" | findstr /i "Restricted" >nul
if %errorlevel% == 0 (
    echo PowerShell execution policy is Restricted. Attempting to bypass...
    echo.
    powershell -ExecutionPolicy Bypass -File "%~dp0build-and-run.ps1" %*
) else (
    powershell -File "%~dp0build-and-run.ps1" %*
)

echo.
echo Press any key to exit...
pause >nul