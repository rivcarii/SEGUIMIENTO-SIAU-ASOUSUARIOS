# Instalación (≈ 10 minutos, sin instalar nada)

Todo corre dentro de Google con la cuenta **siau@miredips.org**: no hay servidor, claves ni contraseñas que crear. Es un proyecto **interno** (solo Calidad/SIAU): entra gente con correo @miredips.org que esté en `ADMINS`/`VISORES`.

## ⚠ Antes de empezar: use SOLO la cuenta de MiRed
Si el navegador tiene varias cuentas de Google abiertas, Google usa la **personal** en el editor y en la implementación, y aparecen errores como «No cuentas con el permiso necesario…» o «Sin acceso».
1. Abra una **ventana de incógnito** (Ctrl+Shift+N) e inicie sesión **solo** con siau@miredips.org.
2. Haga todo lo de abajo en esa ventana.
3. Ejecute **`verificarCuenta`**: debe decir «✔ La cuenta es institucional». Si no, cierre todo y repita el paso 1.
4. Si ya hizo una implementación con otra cuenta, archívela y cree una nueva desde siau.

## 1. Publicar la interfaz (una sola vez, la hace quien administra el repositorio)
GitHub → **Settings → Pages → Build and deployment → Source: GitHub Actions**. Luego ejecute el flujo «Publicar interfaz (GitHub Pages)» (Actions → Run workflow). Debe quedar en `https://rivcarii.github.io/SEGUIMIENTO-SIAU-ASOUSUARIOS/`.
(Allí solo van estilos, scripts y logos; **ningún dato** de la plataforma.)

## 2. Crear el proyecto de Apps Script
1. Inicie sesión como **siau@miredips.org** y abra <https://script.google.com> → **Nuevo proyecto**. Nómbrelo «Plataforma de evidencias SIAU».
2. Borre el contenido de `Código.gs` y pegue **todo** el archivo [`dist/Codigo.gs`](dist/Codigo.gs).
3. **⚙ Configuración del proyecto** → active «Mostrar el archivo de manifiesto appsscript.json» y reemplace su contenido por:
   ```json
   {
     "timeZone": "America/Bogota",
     "runtimeVersion": "V8",
     "exceptionLogging": "STACKDRIVER",
     "webapp": { "executeAs": "USER_DEPLOYING", "access": "DOMAIN" }
   }
   ```
4. Guarde. Elija la función **`configurar`** y pulse **Ejecutar**. Acepte los permisos (Hojas, Drive, correo). Crea la base de datos (una Hoja) y la carpeta de fotos, y busca por nombre los consolidados. Revise el registro de ejecución: cada `ID_…` debe decir **OK** (si dice REVISAR, verifique que es el archivo correcto).
   - Los consolidados deben ser **Hojas de Google**. Si alguno es un Excel: ábralo en Drive → *Archivo → Guardar como Hoja de cálculo de Google* y vuelva a ejecutar `configurar`.
5. Ejecute **`sincronizarDrive`** (lee los consolidados) y por último **`instalarActivadorDiario`** (se actualiza solo todos los días a las 6 a. m.).

## 3. Publicar la aplicación web
**Implementar → Nueva implementación → Aplicación web**
- Ejecutar como: **yo** (siau@miredips.org)
- Quién tiene acceso: **cualquier persona de miredips.org** (la organización)

Copie la URL `…/exec`: ese es el enlace del **visor**. El **administrador** es la misma URL con `?pagina=admin`.

## 4. Quién puede entrar
Por defecto, solo siau@miredips.org (administrador). Para agregar personas: **⚙ Configuración → Propiedades de la secuencia de comandos**:

| Propiedad | Valor |
|---|---|
| `ADMINS` | correos que administran, separados por coma |
| `VISORES` | correos que solo consultan, separados por coma |

Quien no esté en las listas ve «Sin acceso». Los cambios aplican de inmediato.

## Al actualizar el código
Pegue el nuevo `dist/Codigo.gs`, luego **Implementar → Administrar implementaciones → ✏ → Versión nueva**. La URL no cambia. Los datos no se tocan.

## Diagnóstico
Ejecute **`diagnosticar`**: lista qué está configurado, cuántos activadores hay y la URL.
Si el administrador muestra «No se pudo abrir», revise que la implementación sea «Ejecutar como yo» y que el usuario esté en `ADMINS`/`VISORES`.

## Alternativa: enlazar con GitHub (clasp), como el proyecto de PQRS
Evita copiar y pegar. Desde su computador, en la carpeta del repositorio:
```
npm install
npx clasp login                      # en incógnito, con siau@miredips.org; antes active la API en https://script.google.com/home/usersettings
cp .clasp.json.example .clasp.json   # pegue el ID de secuencia de comandos (⚙ Configuración del proyecto)
npm run push                         # construye, prueba y sube dist/ al proyecto
```
Luego, **Implementar → Administrar implementaciones → ✏ → Versión nueva**. `.clasp.json` no se sube a GitHub.
