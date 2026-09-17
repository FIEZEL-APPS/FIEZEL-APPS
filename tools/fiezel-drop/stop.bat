@echo off
title Hentikan FiezelDrop
echo Menghentikan layanan FiezelDrop...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5050 ^| findstr LISTENING') do (
    taskkill /f /pid %%a >nul 2>&1
)
echo [OK] FiezelDrop telah dihentikan.
timeout /t 2 >nul
