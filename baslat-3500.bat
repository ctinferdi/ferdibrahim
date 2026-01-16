@echo off
echo ========================================
echo Ferdi Ibrahim Insaat - Uygulama Baslatiliyor...
echo ========================================
echo.
cd /d "%~dp0"
echo Gerekli paketler kontrol ediliyor...
call npm install
echo.
echo Sunucu Port 3500 uzerinde baslatiliyor...
echo Lutfen tarayicinizda http://localhost:3500 adresine gidin.
echo.
node node_modules\vite\bin\vite.js --port 3500 --host
pause
