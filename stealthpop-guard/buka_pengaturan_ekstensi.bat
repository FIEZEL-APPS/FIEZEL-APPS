@echo off
title Pasang StealthPop Guard ke Browser
color 0A
cls

echo =====================================================================
echo           STEALTHPOP GUARD - PEMASANGAN EKSTENSI BROWSER
echo =====================================================================
echo.
echo  Aplikasi anti pop-up iklan klik & anti-anti-adblock (Mode Siluman).
echo.
echo  Langkah mudah pemasangan (hanya 15 detik):
echo   1. Browser akan terbuka di halaman "Kelola Ekstensi".
echo   2. Aktifkan saklar "Mode Pengembang" (Developer mode) di pojok kiri/kanan.
echo   3. Klik tombol "Muat yang belum dibongkar" (Load unpacked).
echo   4. Pilih folder ini:
echo      %~dp0
echo.
echo =====================================================================
echo.
echo Membuka folder ekstensi di File Explorer...
start explorer.exe "%~dp0"

echo Membuka halaman ekstensi di Microsoft Edge / Chrome...
start msedge "edge://extensions" 2>nul || start chrome "chrome://extensions" 2>nul

echo.
echo Folder dan browser sudah dibuka!
echo Setelah dipasang, Anda bisa langsung menguji dengan membuka file:
echo "test_popunder_adblock.html"
echo.
echo =====================================================================
echo Tekan sembarang tombol untuk menutup jendela ini...
pause >nul
