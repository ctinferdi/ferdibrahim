@echo off
echo ========================================
echo Ferdi Ibrahim Insaat - DEV MODE (Port 3522)
echo ========================================
echo.
echo Gelistirme sunucusu baslatiliyor...
echo.
cd /d "%~dp0"
npx vite --port 3522 --host
