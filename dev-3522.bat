@echo off
echo ========================================
echo Ferdi Ibrahim - DEV SERVER (3522)
echo ========================================
echo.
echo Dev sunucu baslatiliyor - Kod degisiklikleri aninda yansiyor...
echo.
cd /d "%~dp0"
start /B npx vite --port 3522 --host
timeout /t 5
echo.
echo ========================================
echo Tarayicida http://localhost:3522 adresini ac!
echo ========================================
pause
