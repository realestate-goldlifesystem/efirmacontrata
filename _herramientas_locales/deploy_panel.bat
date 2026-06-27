@echo off
echo =========================================
echo DESPLIEGUE A FIREBASE (PANEL DE CONTROL)
echo =========================================
cd "..\..\Biendorado - Panel de Control"
echo 1. Construyendo la aplicacion React...
call npm run build
echo 2. Subiendo a Firebase Hosting...
call npx firebase-tools deploy --only hosting
echo =========================================
echo FINALIZADO
