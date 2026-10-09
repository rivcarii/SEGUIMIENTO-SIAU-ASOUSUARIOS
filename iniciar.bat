@echo off
chcp 65001 >nul
title Plataforma de evidencias SIAU
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo Falta instalar Node.js. Descarguelo de https://nodejs.org ^(version LTS^), instalelo y vuelva a abrir este archivo.
  echo.
  pause
  exit /b 1
)
if not exist data mkdir data
if not exist data\clave.txt (
  echo.
  echo Primera vez: cree la contrasena de administrador ^(se guarda solo en este computador^).
  set /p CLAVE=Contrasena: 
  > data\clave.txt (echo|set /p="%CLAVE%")
)
set /p ADMIN_PASSWORD=<data\clave.txt
start "" cmd /c "timeout /t 3 >nul & start http://localhost:3000/admin/"
echo.
echo Plataforma en marcha. NO cierre esta ventana mientras la use.
echo   Visor:         http://localhost:3000/
echo   Administrador: http://localhost:3000/admin/
echo.
node --disable-warning=ExperimentalWarning iniciar.mjs
pause
