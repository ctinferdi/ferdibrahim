@echo off
echo ========================================
echo Ferdi Ibrahim Insaat - Production Build
echo ========================================
echo.
echo 1. Build yapiliyor...
cd /d "%~dp0"
node node_modules\vite\bin\vite.js build
echo.
echo 2. Preview sunucusu baslatiliyor...
node node_modules\vite\bin\vite.js preview --port 3005
pause
