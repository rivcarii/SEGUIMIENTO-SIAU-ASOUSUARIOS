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

- Meta **Global**: suma de todo el equipo en el mes. **Por técnico**: se exige a cada uno. Iniciales: charlas 200 y encuestas satisfacción/trazadora 90, ambas globales — **confirma si son por técnico** y cámbialo en *Metas*.
- **Actas de buzón**: se espera un acta por sede cada viernes del mes; el visor lista las faltantes. Registra cada acta con tipo «Acta de apertura de buzón», la sede y la fecha del viernes.

## Bot verificador de Drive

`bot/verificar.mjs` lista tres carpetas de Drive (actas, encuestas, charlas), asigna cada archivo a una sede y mes **por su ruta** y reporta faltantes; el resultado aparece en el visor.

Convención de Drive: `Carpeta/<Sede>/<archivo con fecha AAAA-MM-DD>` (el nombre de la sede puede estar en la carpeta o en el archivo; sin fecha en el nombre usa la de modificación).

Configuración (secretos del repo, usados por `.github/workflows/verificar-drive.yml`):
`PLATAFORMA_URL` (debe ser accesible desde internet), `BOT_TOKEN` (igual al del servidor), `GOOGLE_SERVICE_ACCOUNT_JSON`, `DRIVE_CARPETA_ACTAS`, `DRIVE_CARPETA_ENCUESTAS`, `DRIVE_CARPETA_CHARLAS`. Comparte cada carpeta (lectura) con el correo de la cuenta de servicio.

Prueba local: `node bot/verificar.mjs 2026-10 --sin-publicar` (requiere las mismas variables).

## Pendiente

- Descarga automática de la encuesta de satisfacción/trazadora: falta saber de qué plataforma se exporta.
- Encuestas IAMI y control prenatal: ya existen como tipos de evidencia; falta definir si se cargarán sus resultados.
- Datos personales (Ley 1581): evitar rostros de pacientes o documentos con datos sensibles en las fotos; usa `VISOR_PASSWORD` si el visor no es de uso interno.
