@echo off
rem ===========================================================================
rem  FIEZEL Android APK Builder & Packager Wrapper for Windows
rem  Target: id.my.fiezel.app
rem ===========================================================================

setlocal enabledelayedexpansion

set "SCRIPT_DIR=%~dp0"
set "PS_SCRIPT=%SCRIPT_DIR%build-android-apk.ps1"

if not exist "%PS_SCRIPT%" (
    echo [ERROR] Could not find "%PS_SCRIPT%"
    exit /b 1
)

rem Forward all command-line arguments to PowerShell with bypass policy
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PS_SCRIPT%" %*
set "EXIT_CODE=%ERRORLEVEL%"

exit /b %EXIT_CODE%
