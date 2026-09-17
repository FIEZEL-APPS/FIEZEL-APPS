@echo off
net session >nul 2>&1
if %errorLevel% neq 0 (
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

title Mematikan Popup HP Hotkey
cls
echo ========================================================
echo   Sedang mematikan HP Hotkey Support secara permanen...
echo ========================================================
echo.
sc stop HotKeyServiceUWP
sc config HotKeyServiceUWP start=disabled
sc stop HotKeyService
sc config HotKeyService start=disabled
schtasks /change /tn "\HP\HP Hotkey Support\Start QLBController Process" /disable >nul 2>&1
taskkill /F /IM QLBController.exe /IM HPHotkeyNotification.exe /IM hpqwmiex.exe >nul 2>&1
echo.
echo ========================================================
echo   SUKSES! Layanan HP Hotkey sudah dimatikan total.
echo   Silakan tekan Fn + F5 atau Fn + F6 untuk mencoba!
echo ========================================================
echo.
pause
