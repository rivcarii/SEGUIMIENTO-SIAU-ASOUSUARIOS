/**
 * Enlace de consolidados SIAU → Plataforma de evidencias.
 *
 * Se instala UNA vez, iniciando sesión como siau@miredips.org:
 *   1. script.google.com → Nuevo proyecto → pegar este archivo.
 *   2. ⚙ Configuración del proyecto → Propiedades del script → agregar:
 *        PLATAFORMA_URL    https://… (dirección pública de la plataforma, sin «/» final)
 *        BOT_TOKEN         el mismo valor que BOT_TOKEN en el servidor
 *        ID_SOCIALIZACIONES  ID del Google Sheet «F_SIAU_031_CONSOLIDADO_SOCIALIZACIONES_MIRED_2026»
 *        CARPETA_TECNICOS  ID de la carpeta de Drive con los libros «Plantilla de recolección» de cada técnico
 *      (el ID es la parte larga de la dirección del archivo o carpeta en Drive)
 *   3. Ejecutar «probarEnlace» (pide permisos la primera vez) y luego «instalarActivadorDiario».
 *
 * Solo lee los archivos y envía a la plataforma los valores de las hojas necesarias. No modifica nada en Drive.
 * El servidor interpreta los datos (ver consolidados.mjs): aquí no hay lógica que mantener.
 */

const HOJAS_SOCIALIZACIONES = ['REGISTRO SOCIALIZACIONES'];
const HOJAS_RECOLECCION = ['CONFIG', 'SATISFACCION', 'MANIFESTACIONES USUARIOS', 'CHARLAS'];

function sincronizar() {
  const p = PropertiesService.getScriptProperties().getProperties();
  ['PLATAFORMA_URL', 'BOT_TOKEN', 'ID_SOCIALIZACIONES', 'CARPETA_TECNICOS'].forEach(function (k) {
    if (!p[k]) throw new Error('Falta la propiedad del script: ' + k);
  });
  const informe = [];

  // 1) Consolidado de socializaciones (charlas), de la líder.
  informe.push(enviarArchivo(p, DriveApp.getFileById(p.ID_SOCIALIZACIONES), 'socializaciones', HOJAS_SOCIALIZACIONES));

  // 2) Libro de recolección de cada técnico (todos los Google Sheets de la carpeta que tengan las hojas esperadas).
  const archivos = DriveApp.getFolderById(p.CARPETA_TECNICOS).getFilesByType(MimeType.GOOGLE_SHEETS);
  while (archivos.hasNext()) {
    const f = archivos.next();
    try {
      informe.push(enviarArchivo(p, f, 'recoleccion', HOJAS_RECOLECCION));
    } catch (e) {
      informe.push(f.getName() + ': ' + e.message);
    }
  }
  console.log(informe.join('\n'));
  return informe;
}

function enviarArchivo(p, archivo, tipo, nombresHojas) {
  if (archivo.getMimeType() !== MimeType.GOOGLE_SHEETS) {
    throw new Error('«' + archivo.getName() + '» es un Excel (.xlsx). Ábralo en Drive y use Archivo → Guardar como Hoja de cálculo de Google; luego use el ID de esa copia.');
  }
  const libro = SpreadsheetApp.openById(archivo.getId());
  const hojas = {};
  nombresHojas.forEach(function (n) {
    const h = libro.getSheetByName(n);
    if (h) hojas[n] = h.getDataRange().getDisplayValues();
  });
  if (!Object.keys(hojas).length) throw new Error('no tiene ninguna de las hojas esperadas (' + nombresHojas.join(', ') + ')');

  const r = UrlFetchApp.fetch(p.PLATAFORMA_URL + '/api/bot/consolidados', {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + p.BOT_TOKEN },
    payload: JSON.stringify({ tipo: tipo, archivo_id: archivo.getId(), archivo: archivo.getName(), hojas: hojas }),
    muteHttpExceptions: true,
  });
  if (r.getResponseCode() >= 300) throw new Error('la plataforma respondió ' + r.getResponseCode() + ': ' + r.getContentText().slice(0, 200));
  const resumen = JSON.parse(r.getContentText());
  const avisos = (resumen.avisos || []).length + ' aviso(s)';
  const noReconocidas = (resumen.sedes_no_reconocidas || []);
  return archivo.getName() + ': OK · ' + (resumen.charlas != null ? resumen.charlas + ' charlas' : resumen.registros + ' registros') +
    ' · ' + avisos + (noReconocidas.length ? ' · SEDES NO RECONOCIDAS: ' + noReconocidas.join(', ') : '');
}

/** Ejecútela una vez a mano para verificar permisos, propiedades y conexión. */
function probarEnlace() {
  const informe = sincronizar();
  Logger.log(informe.join('\n'));
}

/** Programa la sincronización todos los días a las 6 a. m. (hora de la cuenta). */
function instalarActivadorDiario() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'sincronizar') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('sincronizar').timeBased().everyDays(1).atHour(6).create();
}
