# Instalación (≈ 10 minutos, sin instalar nada)

Todo corre dentro de Google con la cuenta **siau@miredips.org**: no hay servidor que mantener. La plataforma admite **dos formas de entrar**, que conviven:
- **Con usuario y contraseña** (para quien no tiene cuenta institucional): las crea el administrador en la pestaña **Accesos**.
- **Con cuenta de Google @miredips.org** que esté en `ADMINS`/`VISORES` (ver §4), si la implementación se abre a la organización.

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
     "webapp": { "executeAs": "USER_DEPLOYING", "access": "ANYONE_ANONYMOUS" }
   }
   ```
4. Guarde. Elija la función **`configurar`** y pulse **Ejecutar**. Acepte los permisos (Hojas, Drive, correo). Crea la base de datos (una Hoja) y la carpeta de fotos, y busca por nombre los consolidados. Revise el registro de ejecución: cada `ID_…` debe decir **OK** (si dice REVISAR, verifique que es el archivo correcto).
   - Los consolidados deben ser **Hojas de Google**. Si alguno es un Excel: ábralo en Drive → *Archivo → Guardar como Hoja de cálculo de Google* y vuelva a ejecutar `configurar`.
5. Ejecute **`sincronizarDrive`** (lee los consolidados) y por último **`instalarActivadorDiario`** (se actualiza solo todos los días a las 6 a. m.).

## 3. Publicar la aplicación web
**Implementar → Nueva implementación → Aplicación web**
- Ejecutar como: **yo** (siau@miredips.org)
- Quién tiene acceso: **Cualquier persona** (la plataforma pide usuario y contraseña; sin ellas no se ve ningún dato)

Si la opción «Cualquier persona» no aparece, el administrador de Google Workspace debe permitir compartir fuera de la organización (Admin → Apps → Google Workspace → Drive y Docs → Uso compartido). Si ya existía una implementación «solo la organización», cree una **nueva** (la URL cambia) y use la nueva.

Copie la URL `…/exec`: ese es el enlace del **visor**. El **administrador** es la misma URL con `?pagina=admin`.

## 4. Quién puede entrar
**Con usuario y contraseña**
1. En el editor (incógnito, siau@miredips.org) ejecute **`crearAdministrador`** una sola vez: en el registro de ejecución aparece el usuario `admin` y su contraseña. **Cópiela en ese momento**: no se vuelve a mostrar. Si la pierde, ejecute `reiniciarClaveAdministrador`.
2. Entre al enlace con ese usuario → **Administrar → Accesos** → escriba el nombre de la persona y el rol (**Consulta** solo ve; **Administración** ve y edita) → **Crear acceso**. Copie la invitación (enlace, usuario y contraseña) y envíela por un canal privado.
3. Cada persona puede cambiar su contraseña en **Mi cuenta**. Desde Accesos puede reiniciarla, desactivar o eliminar a alguien.
4. Seguridad: 5 intentos fallidos bloquean al usuario 15 minutos; la sesión dura 6 horas; las contraseñas se guardan con sal y hash, nunca en texto.

**Con cuenta de Google @miredips.org** (opcional): **⚙ Configuración → Propiedades de la secuencia de comandos**:

| Propiedad | Valor |
|---|---|
| `ADMINS` | correos que administran, separados por coma |
| `VISORES` | correos que solo consultan, separados por coma |

Las funciones de mantenimiento (`configurar`, `sincronizarDrive`, `crearAdministrador`…) solo corren desde el editor, nunca desde el navegador.

## Al actualizar el código
Pegue el nuevo `dist/Codigo.gs`, luego **Implementar → Administrar implementaciones → ✏ → Versión nueva**. La URL no cambia. Los datos no se tocan.

## Diagnóstico
Ejecute **`diagnosticar`**: lista qué está configurado, cuántos activadores hay y la URL.
Si el administrador muestra «No se pudo abrir», revise que la implementación sea «Ejecutar como yo» y «Cualquier persona».

## Alternativa: enlazar con GitHub (clasp), como el proyecto de PQRS
Evita copiar y pegar. Desde su computador, en la carpeta del repositorio:
```
npm install
npx clasp login                      # en incógnito, con siau@miredips.org; antes active la API en https://script.google.com/home/usersettings
cp .clasp.json.example .clasp.json   # pegue el ID de secuencia de comandos (⚙ Configuración del proyecto)
npm run push                         # construye, prueba y sube dist/ al proyecto
```
Luego, **Implementar → Administrar implementaciones → ✏ → Versión nueva**. `.clasp.json` no se sube a GitHub.
