@echo off
net session >nul 2>&1
if %errorLevel% neq 0 (
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

title Aktifkan Tombol Kecerahan Fn+F5 dan Fn+F6
cls
echo ========================================================
echo   Mengaktifkan kembali fungsi tombol Fn+F5 dan Fn+F6...
echo ========================================================
echo.
sc config HotKeyServiceUWP start=auto
sc start HotKeyServiceUWP
echo.
echo ========================================================
echo   SUKSES! Layanan tombol Fn sudah diaktifkan kembali.
echo   Silakan tes tekan Fn + F5 atau Fn + F6 sekarang!
echo ========================================================
echo.
pause
