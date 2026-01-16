@echo off
echo ========================================
echo Ferdi Ibrahim Insaat - Finansal Yonetim Sistemi
echo ========================================
echo.
echo Gelistirme sunucusu baslatiliyor...
echo.
cd /d "%~dp0"
node node_modules\vite\bin\vite.js --port 3000
