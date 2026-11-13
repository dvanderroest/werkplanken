@echo off
title Mijn Werkplank - Lokale Server
echo ========================================================
echo   Mijn Werkplank wordt opgestart op uw computer...
echo   De browser opent zo automatisch op http://localhost:3000
echo   (Sluit dit zwarte venster pas als u klaar bent)
echo ========================================================
start "" http://localhost:3000
npm run dev
pause
