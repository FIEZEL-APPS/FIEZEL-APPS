@echo off
setlocal
echo ===================================================
echo   Menjalankan Reset Otomatis OpenCode...
echo   (JAMINAN: File proyek Anda 100% AMAN & UTUH)
echo ===================================================
node tools/opencode-reset.js %*
pause
