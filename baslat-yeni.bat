@echo off
echo ========================================
echo Ferdi Ibrahim Insaat - Uygulama Baslatiliyor...
echo ========================================
echo.
cd /d "%~dp0"
echo Gerekli paketler yukleniyor (bu islem ilk seferde biraz surebilir)...
call npm install
echo.
echo Sunucu Port 3600 uzerinde baslatiliyor...
echo Lutfen tarayicinizda http://localhost:3600 adresine gidin.
echo.
node node_modules\vite\bin\vite.js --port 3600 --host
pause
