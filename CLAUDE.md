# CLAUDE.md · Plataforma de evidencias SIAU y Asociación de Usuarios · MiRed IPS

Aplicación web de **Google Apps Script** + interfaz en GitHub Pages. Base de datos: una Hoja de Google; fotos: carpeta de Drive; todo en la cuenta **siau@miredips.org**.

## Con quién trabajas
- **River**: Profesional de Gestión de Calidad de MiRed. No es programador de oficio pero construye y despliega. Responde **en español**, directo, sin saludos. Entrega el resultado hecho (código listo, pasos exactos de qué pegar dónde), sin preguntas si hay una interpretación razonable.

## Dos tipos de proyectos (tenerlo siempre presente)
| Tipo | Quién entra | Acceso de la implementación | Ejemplo |
|---|---|---|---|
| **Compartido** (técnicos de sede, sin cuenta de Google) | Usuario y contraseña propios de la plataforma | Ejecutar como **Yo (SIAU)** · «Cualquier persona»; portal en GitHub Pages que llama a `doPost` | Sistema de PQRS (`rivcarii/DEFINIDO`) |
| **Interno** (solo River y la líder de Calidad) | Cuenta @miredips.org | Ejecutar como **Yo (SIAU)** · «Cualquier persona de miredips.org»; lista `ADMINS`/`VISORES` | **Este proyecto** |

Este proyecto es **interno**: no abrirlo a «Cualquier persona» ni crear usuarios y contraseñas propios. Si algún día se comparte con técnicos, se hace como el de PQRS (acceso propio + portal), no ampliando `VISORES` a cuentas externas.

## Estructura
```
nucleo/            reglas y rutas (JS puro, se prueba en Node)
google/Capa.gs     Hojas, Drive, permisos, activadores, enlace con los consolidados
google/appsscript.json  manifiesto (DOMAIN, USER_DEPLOYING)
google/construir.mjs    empaqueta → dist/Codigo.gs + dist/appsscript.json (GENERADOS, se versionan)
web/               interfaz (visor y administrador) publicada en GitHub Pages; las páginas de Apps Script salen de web/*/index.html
test/              pruebas (incluye dist/Codigo.gs con Google simulado)
```

## Comandos
```
npm test            # pruebas
npm run construir   # regenera dist/ (CI exige que esté al día)
npm run push        # construir + pruebas + clasp push (requiere .clasp.json)
```
**Terminado** = `npm test` sin errores y `dist/` regenerado y commiteado.

## Reglas
1. **Privacidad (Ley 1581).** De formularios y registro del intérprete solo se leen fecha, sede y calificación (lista blanca por encabezado); la cédula del horario se descarta. Nunca datos reales en pruebas, capturas ni commits (`*.xlsx` reales no entran; los de `test/fixtures` son anonimizados).
2. **Seguridad.** Toda función global sin `_` final la puede llamar el navegador. Las de mantenimiento empiezan con `exigirAdminOEditor_()`. La interfaz entra solo por `llamar(texto)`, que aplica rol por ruta en `nucleo/api.mjs`. Una ruta nueva = su `exigir(usuario, …)` + prueba.
3. **ES5 en `Capa.gs`** (se pega tal cual); el núcleo puede usar ES2020 (V8 lo soporta). Sin `structuredClone`, `.at()` ni `toLocaleDateString("sv")` en lo que corre en Google.
4. **Despliegue.** `clasp push` solo actualiza el código; para que lo vean los usuarios: Implementar ▸ Administrar implementaciones ▸ ✏ ▸ **Versión nueva** (la URL no cambia). Siempre desde una **ventana de incógnito con solo siau@miredips.org** (con varias cuentas Google usa la personal y falla con «No cuentas con el permiso…»). `verificarCuenta` confirma con qué cuenta corre.
5. Marca: SIAU protagonista pero proporcionado, versión azul; **sin** logos de Supersalud ni de la Alcaldía (River pidió quitarlos); pie solo con el texto institucional; mascota Killo; tipografía Nunito.
