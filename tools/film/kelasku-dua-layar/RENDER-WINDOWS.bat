@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo  FIEZEL - "Satu Kelas, Dua Layar"  (render film 72 dtk, 1080x1920)
echo  =================================================================
where node >nul 2>nul || (echo  Node.js belum terpasang. Unduh versi LTS dari https://nodejs.org & pause & exit /b 1)
where ffmpeg >nul 2>nul || (echo  FFmpeg belum terpasang. Jalankan:  winget install Gyan.FFmpeg   lalu buka ulang jendela ini. & pause & exit /b 1)
if not exist node_modules (echo  Memasang dependensi... & call npm install --no-audit --no-fund)
echo.
if "%GEMINI_API_KEY%"=="" set /p "GEMINI_API_KEY= Tempel GEMINI API KEY (kosongkan untuk lewati VO) lalu Enter: "
if not "%GEMINI_API_KEY%"=="" (
  echo  Membuat VO dengan Gemini TTS...
  node vo-gemini-kelasku.mjs || (echo  VO gagal - lihat pesan di atas. & pause & exit /b 1)
)
echo.
echo  Merender film... (bisa dihentikan; jalankan lagi untuk melanjutkan)
node render.mjs
echo.
pause
