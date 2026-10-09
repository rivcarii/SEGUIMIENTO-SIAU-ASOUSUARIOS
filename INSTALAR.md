# Puesta en marcha

> **Para empezar a ver datos ya:** ejecute la plataforma (`ADMIN_PASSWORD=… npm start`) y use *Administrador → Importar consolidados*. Lo de abajo es para **automatizarlo** (servidor público + script de Google), ≈30 minutos, una sola vez.

Orden: **1) publicar la plataforma → 2) secretos del repositorio → 3) script en la cuenta siau@miredips.org → 4) comprobar.**

## 1. Publicar la plataforma
Necesita un servicio que ejecute contenedores (o Node 22) con **disco persistente** y HTTPS. Use el [`Dockerfile`](Dockerfile) de este repositorio (sin dependencias; *no se ha probado en un servicio concreto*). Variables de entorno:

| Variable | Valor |
|---|---|
| `ADMIN_PASSWORD` | contraseña del administrador (larga) |
| `VISOR_PASSWORD` | contraseña para ver el tablero (**obligatoria en la práctica**: muestra el desempeño de cada persona) |
| `BOT_TOKEN` | clave compartida con el script y el monitor. Genérela: `openssl rand -hex 24` |
| `SESSION_SECRET` | otra clave larga (así no se cierran las sesiones al reiniciar) |
| `DATA_DIR` | `/data` (ya viene en el Dockerfile): **monte el disco persistente ahí** |

Compruebe que `https://SU-DIRECCION/api/salud` responde `{"ok":true}`. **Respalde el disco**: allí quedan la base de datos y las fotos.

## 2. Secretos del repositorio
*Settings → Secrets and variables → Actions → New repository secret*: `PLATAFORMA_URL` (sin «/» final) y `BOT_TOKEN` (el mismo del servidor).

## 3. Script de Google (iniciando sesión como siau@miredips.org)
1. <https://script.google.com> → **Nuevo proyecto** → pegue el contenido de [`apps-script/EnlaceConsolidados.gs`](apps-script/EnlaceConsolidados.gs).
2. ⚙ **Configuración del proyecto → Propiedades del script**: agregue solo `PLATAFORMA_URL` y `BOT_TOKEN`.
3. Ejecute **`autoconfigurar`** (pide permisos la primera vez). Busca por nombre los archivos (`CONS_CHARLAS`, `CONS_BUZON`, NPS, evaluación médica, `ILSC`) y la carpeta «Horario … - SIAU». **Lea el registro**: cada línea debe decir `OK` y el nombre correcto; si dice `REVISAR`, confirme que eligió el archivo bueno; si dice `NO ENCONTRADO`, agregue esa propiedad a mano con el ID del archivo (la parte larga de su dirección).
4. Ejecute **`probarEnlace`**: verifica la conexión (le dirá si la dirección o el `BOT_TOKEN` están mal) y sincroniza. Debe terminar sin errores.
5. Ejecute **`instalarActivadorDiario`** (sincroniza todos los días a las 6:00 a. m.).

Los archivos deben ser **Hojas de Google** (no `.xlsx`).

## 4. Comprobar y dejar listo
- *Actions → Monitor de consolidados → Run workflow*: debe quedar en verde y, si todo llegó, no abrir ningún issue.
- En el tablero, *Cumplimiento* debe mostrar a los SIAU con sus metas.
- *Administrador → Personal y rotación*: indique a qué sede corresponde cada **nombre sin reconocer**, asigne las sedes de quien el horario no trae (p. ej. quien está de vacaciones) y revise las **sedes sin SIAU**.
- Cada mes, suba el nuevo «Horario <Mes> <año> - SIAU» a la misma carpeta (Hoja de Google).
