# SEGUIMIENTO-SIAU-ASOUSUARIOS

Plataforma de evidencias (SIAU + Asociación de Usuarios)

Dos aplicaciones conectadas por la misma base de datos, sin dependencias externas (Node ≥ 22.13):

| Plataforma | Ruta | Acceso | Función |
|---|---|---|---|
| **Visor** | `/` | abierta, o con `VISOR_PASSWORD` | Galerías de evidencias y tablero de cumplimiento (SIAU) |
| **Administrador** | `/admin/` | `ADMIN_PASSWORD` | Subir/editar/eliminar evidencias, sedes, técnicos, metas y logos |

Módulos: **SIAU** (charlas, actas de buzón, acompañamiento, encuestas NPS/pregunta trazadora, médico asistencial, actualización de datos, ludoteca, IAMI, control prenatal) y **Asociación de Usuarios** (carteleras, vallas, actividades del subcronograma). Los tipos están en `db.mjs`.

## Ejecutar

```bash
ADMIN_PASSWORD=... BOT_TOKEN=... npm start     # opcional: VISOR_PASSWORD, PORT, DATA_DIR, SESSION_SECRET
npm test
```

Datos y fotos quedan en `DATA_DIR` (por defecto `data/`): **respáldalo** o monta un volumen persistente; es lo que evita perder las evidencias.

Interfaz: estilo Liquid Glass (iOS 26/27) con estética de cuaderno de laboratorio —muestras numeradas, figuras y tablas con leyenda— y Killo, la mascota de MiRed, como guía. Respeta `prefers-reduced-motion`.

Identidad visual: sigue el «Portafolio de imagen · SIAU» (logos, paleta y tipografía en `web/shared/marca/`, ver su README). El logo de la Asociación de Usuarios se sube desde *Logos* cuando esté listo.

Primeros pasos en `/admin/`: *Logos* → *Sedes y técnicos* (pega las 40 sedes, una por línea) → *Metas* → *Nueva evidencia*.

## Cumplimiento

- Meta **Por técnico** (se exige a cada SIAU) o **Global** (suma del equipo). Iniciales: 90 encuestas y 200 charlas, **por técnico**.
- **Actas de buzón**: con el consolidado sincronizado, el calendario es el del consolidado; sin él, el tablero usa un acta por sede cada viernes a partir de las evidencias registradas.

## Enlace con los consolidados (Drive de siau@miredips.org)

Los consolidados viven en el Drive **institucional**, así que el enlace corre **dentro de esa cuenta**: un script de Google ([`apps-script/EnlaceConsolidados.gs`](apps-script/EnlaceConsolidados.gs)) los lee una vez al día y envía a la plataforma (`POST /api/bot/consolidados`, con `BOT_TOKEN`) solo lo necesario. No hay claves de Google en este repositorio ni en el servidor, y no modifica nada en Drive. Instalación en el encabezado del archivo (≈5 minutos, una sola vez).

| Archivo en Drive | Qué se toma | Qué alimenta |
|---|---|---|
| `CONS_CHARLAS_2026` | Matriz sede × mes de charlas a usuarios y a funcionarios (se omiten «INTERPRETE» y «TOTAL») | Meta de charlas |
| `CONS_BUZON_2026` | Una hoja por mes: cada acta (`DD(Bnnn)`) × sede, con ENTREGADO / PENDIENTE | Actas de buzón |
| Respuestas NPS 2026 | **Solo** fecha, sede y calificación 0–10 | Meta de encuestas y NPS |
| Evaluación médica | **Solo** fecha, sede y calificación 0–10 | NPS médico asistencial |
| Registro del intérprete (ILSC) | **Solo** conteos por sede y mes: atenciones y actividades LSC | Acompañamiento LSC |
| `Horario <Mes> <año> - SIAU` | CUADRO DE TURNO y HORARIO PASOS: nombre, cargo, sedes, rotación de «PASOS», vacaciones y licencias | Personal, sedes de cada SIAU y ausencias |

**Cumplimiento individual por SIAU.** Meta mínima mensual para **cada SIAU**: 90 encuestas y 200 charlas (editable en *Metas*).
- Las sedes de cada SIAU salen del horario (`C. Murillo - P. Palmas`; los de «PASOS» rotan por día en HORARIO PASOS). Lo que registra una sede se reparte en partes iguales entre quienes la atienden ese mes.
- **Rotación y licencias:** en *Administrador → Personal y rotación* se ajustan las sedes de cada SIAU y se registran vacaciones, licencias e incapacidades. La meta baja en proporción a los días de ausencia (meta × días presentes / días del mes). Lo cargado a mano no se borra al sincronizar el horario. Las sedes que quedan sin SIAU se listan aparte.
- Roles: los técnicos se evalúan; el **intérprete** y quienes están en «Oficina administrativa» (que recopilan la información) no. El rol se deduce del cargo y de la sede escrita en el horario.
- **Las 200 charlas** se miden con lo que trae el consolidado de charlas (usuarios + funcionarios por sede y mes). Ese archivo registra asistentes por sede; si la meta es de *sesiones* y no de personas, hay que registrar las sesiones.
- **Actas:** el calendario sale del propio consolidado (hay actas en lunes por festivos), no de «cada viernes». Se cuentan las vencidas a la fecha.
- **Ludoteca:** apartado «en construcción» (la hoja LUDOTECA del registro del intérprete es la fuente prevista).

**Privacidad (Ley 1581).** Las respuestas de los formularios y el registro del intérprete traen nombres, cédulas, correos, teléfonos y condición de discapacidad. El script toma solo las columnas de una **lista blanca** y la plataforma **rechaza** (HTTP 400) cualquier envío cuyo encabezado traiga esos datos; ambas barreras tienen pruebas. El horario no se lee la cédula. Los nombres del personal viven en la base de datos del servidor, no en este repositorio. Como el tablero muestra el desempeño de cada persona, **use `VISOR_PASSWORD`**.

- **Idempotente:** cada sincronización reemplaza lo leído de ese archivo; correcciones y filas borradas se reflejan y nada se duplica.
- **Los archivos deben ser Hojas de Google** (un `.xlsx` se abre en Drive y se guarda con *Archivo → Guardar como Hoja de cálculo de Google*; el script avisa).
- **Sedes:** 40 (12 Camino + 28 Paso). Los consolidados las escriben de ~25 maneras («P. LAS MALVINA», «CIUDADELA20DEJULIO», «PASO NIEVES»…); `sedes.mjs` las reconoce con alias y, si un nombre no coincide, **no lo adivina**: se muestra en el tablero y en *Personal y rotación* para indicar a qué sede corresponde.
- **Si la plantilla cambia de forma**, el lector avisa y omite ese bloque en lugar de leer celdas equivocadas.
- Sin uso por ahora: el libro «Plantilla de recolección» por técnico (sus lectores siguen disponibles) y el consolidado `F_SIAU_031`.

## Bot verificador de Drive (alternativa con cuenta de servicio)

`bot/verificar.mjs` lista tres carpetas de Drive (actas, encuestas, charlas), asigna cada archivo a una sede y mes **por su ruta** y reporta faltantes; el resultado aparece en el visor.

Convención de Drive: `Carpeta/<Sede>/<archivo con fecha AAAA-MM-DD>` (el nombre de la sede puede estar en la carpeta o en el archivo; sin fecha en el nombre usa la de modificación).

Configuración (secretos del repo, usados por `.github/workflows/verificar-drive.yml`):
`PLATAFORMA_URL` (debe ser accesible desde internet), `BOT_TOKEN` (igual al del servidor), `GOOGLE_SERVICE_ACCOUNT_JSON`, `DRIVE_CARPETA_ACTAS`, `DRIVE_CARPETA_ENCUESTAS`, `DRIVE_CARPETA_CHARLAS`. Comparte cada carpeta (lectura) con el correo de la cuenta de servicio.

Prueba local: `node bot/verificar.mjs 2026-10 --sin-publicar` (requiere las mismas variables).

## Pendiente

- Descarga automática de la encuesta de satisfacción/trazadora: falta saber de qué plataforma se exporta.
- Encuestas IAMI y control prenatal: ya existen como tipos de evidencia; falta definir si se cargarán sus resultados.
- Datos personales (Ley 1581): evitar rostros de pacientes o documentos con datos sensibles en las fotos; usa `VISOR_PASSWORD` si el visor no es de uso interno.
