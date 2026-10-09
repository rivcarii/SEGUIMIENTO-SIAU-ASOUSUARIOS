#!/bin/bash
# Plataforma de evidencias SIAU: doble clic en Mac (o `./iniciar.command` en Linux).
cd "$(dirname "$0")"
command -v node >/dev/null || { echo "Falta instalar Node.js (versión LTS): https://nodejs.org"; read -n1 -p "Pulse una tecla…"; exit 1; }
mkdir -p data
if [ ! -f data/clave.txt ]; then
  read -r -s -p "Primera vez: cree la contraseña de administrador (se guarda solo en este computador): " P; echo
  printf %s "$P" > data/clave.txt
fi
export ADMIN_PASSWORD="$(cat data/clave.txt)"
(sleep 2; open http://localhost:3000/admin/ 2>/dev/null || xdg-open http://localhost:3000/admin/ 2>/dev/null) &
echo "Plataforma en marcha: http://localhost:3000/  (administrador: /admin/). No cierre esta ventana mientras la use."
node --disable-warning=ExperimentalWarning iniciar.mjs
