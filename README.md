# Plataforma de evidencias · SIAU y Asociación de Usuarios (MiRed IPS)

Aplicación web de **Google Apps Script** (sin servidores ni claves):

- **Visor**: panel de inicio tipo tablero (indicadores, tendencias de 12 meses, calificaciones, sedes y semáforo de cada SIAU), motor de **consultas** (por mes, sede, SIAU o tipo, también con frases), cumplimiento individual y global con **reporte** descargable por estado, **Fototeca** con dos álbumes (fotografías y documentos PDF) y cumplimiento individual de cada SIAU en las 40 sedes (90 encuestas y 200 charlas mínimas al mes, actas de buzón, acompañamiento LSC) y galería de fotos de evidencia (SIAU y Asociación de Usuarios). Ludoteca: en construcción.
- **Administrador**: cargar evidencias con fotos, personal y rotación (la rotación base de los 15 SIAU viene cargada; sedes por SIAU, vacaciones y licencias; la meta baja en proporción a los días presentes), metas, nombres de sede y la actualización de los consolidados.
- **Consolidados**: el script lee solos, desde el Drive de siau@miredips.org, charlas, buzón, NPS, evaluación médica y registro del intérprete (a diario, 6 a. m.).

Instalación: **[INSTALAR.md](INSTALAR.md)**.

## Privacidad
Los formularios y el registro del intérprete traen nombres, cédulas, teléfonos y correos. El script toma **solo** fecha, sede y calificación (lista blanca por encabezado) y la plataforma rechaza cualquier dato con encabezados personales. La cédula del horario se descarta. Todo queda en la Hoja de base de datos y en la carpeta de fotos del Drive institucional; nada se envía a terceros. La interfaz (GitHub Pages) solo aloja estilos, scripts y logos.

## Estructura
| Carpeta | Contenido |
|---|---|
| `nucleo/` | Reglas y rutas (JavaScript puro; se prueba en Node) |
| `google/Capa.gs` | Conexión con Hojas, Drive, permisos y activadores |
| `google/construir.mjs` | Empaqueta todo en **`dist/Codigo.gs`** (lo único que se pega en Apps Script) |
| `web/` | Interfaz (visor y administrador), publicada en GitHub Pages |
| `test/` | Pruebas, incluida la ejecución de `dist/Codigo.gs` con Google simulado |

## Desarrollo
```
npm test            # pruebas
npm run construir   # regenera dist/Codigo.gs (CI verifica que esté al día)
```
Requiere Node ≥ 22.13; no tiene dependencias.
