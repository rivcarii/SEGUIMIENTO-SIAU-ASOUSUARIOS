/**
 * Enlace de consolidados SIAU → Plataforma de evidencias.
 *
 * Se instala UNA vez, iniciando sesión como siau@miredips.org:
 *   1. script.google.com → Nuevo proyecto → pegar este archivo.
 *   2. ⚙ Configuración del proyecto → Propiedades del script → agregar:
 *        PLATAFORMA_URL   https://… (dirección pública de la plataforma, sin «/» final)
 *        BOT_TOKEN        el mismo valor que BOT_TOKEN en el servidor
 *        ID_CHARLAS       Hoja de Google «CONS_CHARLAS_2026»
 *        ID_BUZON         Hoja de Google «CONS_BUZON_2026»
 *        ID_NPS           Hoja de respuestas «SATISFACCIÓN DE LOS USUARIOS … NPS 2026»
 *        ID_MEDICA        Hoja de respuestas «Evaluación de la satisfacción médica»
 *        ID_ILSC          Hoja de Google «REGISTRO DE ATENCIONES ILSC»
 *        CARPETA_HORARIOS Carpeta de Drive con los «Horario <Mes> <año> - SIAU»
 *      (el ID es la parte larga de la dirección del archivo o carpeta; cualquiera que falte se omite)
 *   3. Ejecutar «probarEnlace» (pide permisos la primera vez) y luego «instalarActivadorDiario».
 *
 * Los archivos deben ser Hojas de Google. Si alguno es un Excel (.xlsx): ábralo en Drive →
 * Archivo → Guardar como Hoja de cálculo de Google, y use el ID de esa copia.
 *
 * PRIVACIDAD (Ley 1581): las respuestas de los formularios y el registro del intérprete traen nombres,
 * cédulas, teléfonos y correos. Este script NUNCA los envía: de cada hoja toma solo las columnas de la
 * lista blanca de abajo (fecha, sede y calificación). La plataforma rechaza además cualquier envío cuyo
 * encabezado traiga datos personales. No modifica nada en Drive.
 */

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function norm(t) {
  return String(t == null ? '' : t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/** Conserva solo las columnas cuyo encabezado cumple algún criterio de la lista blanca. */
function soloColumnas(grid, criterios) {
  const h = grid.findIndex(function (f) { return f.some(function (c) { return criterios.some(function (k) { return k(norm(c)); }); }); });
  if (h < 0) return [];
  const keep = grid[h].map(function (c, i) { return criterios.some(function (k) { return k(norm(c)); }) ? i : -1; }).filter(function (i) { return i >= 0; });
  return grid.slice(h).map(function (f) { return keep.map(function (i) { return f[i] == null ? '' : f[i]; }); });
}

const LISTA_BLANCA = {
  nps: [function (n) { return n === 'marca temporal'; }, function (n) { return n.indexOf('sede') === 0; }, function (n) { return n.indexOf('probabilidad') >= 0; }],
  medica: [function (n) { return n === 'marca temporal'; }, function (n) { return n.indexOf('sede') === 0; }, function (n) { return n.indexOf('escala numerica') >= 0; }],
  ilscRegistro: [function (n) { return n.indexOf('fecha de atencion') === 0; }, function (n) { return n === 'sede'; }],
  ilscActividades: [function (n) { return n.indexOf('fecha de la atencion') === 0; }, function (n) { return n === 'tematica'; }, function (n) { return n === 'sede'; }, function (n) { return n.indexOf('asistentes') >= 0; }],
};

function valores(libro, nombre) {
  const h = libro.getSheetByName(nombre);
  return h ? h.getDataRange().getDisplayValues() : null;
}

function libroDe(id) {
  const f = DriveApp.getFileById(id);
  if (f.getMimeType() !== MimeType.GOOGLE_SHEETS) {
    throw new Error('«' + f.getName() + '» es un Excel (.xlsx). Guárdelo como Hoja de cálculo de Google y use el ID de la copia.');
  }
  return { archivo: f, libro: SpreadsheetApp.openById(id) };
}

function enviar(p, cuerpo) {
  const r = UrlFetchApp.fetch(p.PLATAFORMA_URL + '/api/bot/consolidados', {
    method: 'post', contentType: 'application/json', headers: { Authorization: 'Bearer ' + p.BOT_TOKEN },
    payload: JSON.stringify(cuerpo), muteHttpExceptions: true,
  });
  if (r.getResponseCode() >= 300) throw new Error('la plataforma respondió ' + r.getResponseCode() + ': ' + r.getContentText().slice(0, 300));
  const j = JSON.parse(r.getContentText());
  const nr = (j.sedes_no_reconocidas || []);
  return cuerpo.archivo + ': OK · ' + (j.registros != null ? j.registros + ' registros' : j.personal + ' personas') +
    ' · ' + (j.avisos || []).length + ' aviso(s)' + (nr.length ? ' · SEDES NO RECONOCIDAS: ' + nr.join(', ') : '');
}

function sincronizar() {
  const p = PropertiesService.getScriptProperties().getProperties();
  ['PLATAFORMA_URL', 'BOT_TOKEN'].forEach(function (k) { if (!p[k]) throw new Error('Falta la propiedad del script: ' + k); });
  const anio = new Date().getFullYear();
  const informe = [], errores = [];

  const tareas = [
    ['ID_CHARLAS', function (a, l) {
      return { tipo: 'charlas_matriz', anio: anio, hojas: { 'CHARLAS USUARIOS': valores(l, 'CHARLAS USUARIOS'), 'CHARLAS FUNCIONARIOS': valores(l, 'CHARLAS FUNCIONARIOS') } };
    }],
    ['ID_BUZON', function (a, l) {
      const hojas = {};
      l.getSheets().forEach(function (h) { if (/_\d{4}\s*$/.test(h.getName())) hojas[h.getName()] = h.getDataRange().getDisplayValues(); });
      return { tipo: 'buzon', hojas: hojas };
    }],
    ['ID_NPS', function (a, l) {
      return { tipo: 'nps', hojas: { 'Respuestas de formulario 1': soloColumnas(l.getSheets()[0].getDataRange().getDisplayValues(), LISTA_BLANCA.nps) } };
    }],
    ['ID_MEDICA', function (a, l) {
      return { tipo: 'medica', hojas: { 'Respuestas de formulario 1': soloColumnas(l.getSheets()[0].getDataRange().getDisplayValues(), LISTA_BLANCA.medica) } };
    }],
    ['ID_ILSC', function (a, l) {
      const hojas = {};
      const reg = valores(l, 'REGISTRO ' + anio), act = valores(l, 'ACTIVIDADES ASOCIADAS LSC ' + anio);
      if (reg) hojas['REGISTRO ' + anio] = soloColumnas(reg, LISTA_BLANCA.ilscRegistro);
      if (act) hojas['ACTIVIDADES ASOCIADAS LSC ' + anio] = soloColumnas(act, LISTA_BLANCA.ilscActividades);
      return { tipo: 'ilsc', hojas: hojas };
    }],
  ];
  tareas.forEach(function (t) {
    if (!p[t[0]]) return;
    try {
      const x = libroDe(p[t[0]]);
      const cuerpo = t[1](x.archivo, x.libro);
      cuerpo.archivo_id = x.archivo.getId(); cuerpo.archivo = x.archivo.getName();
      informe.push(enviar(p, cuerpo));
    } catch (e) { errores.push(t[0] + ': ' + e.message); }
  });

  // Horario del mes: el archivo «Horario <Mes> <año> …» más reciente de la carpeta (trae sedes, rotación, vacaciones y licencias)
  if (p.CARPETA_HORARIOS) {
    try {
      const it = DriveApp.getFolderById(p.CARPETA_HORARIOS).getFilesByType(MimeType.GOOGLE_SHEETS);
      let elegido = null;
      while (it.hasNext()) { const f = it.next(); if (/^horario/i.test(f.getName()) && (!elegido || f.getLastUpdated() > elegido.getLastUpdated())) elegido = f; }
      if (!elegido) throw new Error('no hay ningún «Horario …» en la carpeta');
      const n = norm(elegido.getName());
      const mi = MESES.findIndex(function (m) { return n.indexOf(m) >= 0; });
      const anioArchivo = (n.match(/20\d\d/) || [anio])[0];
      const l = SpreadsheetApp.openById(elegido.getId());
      informe.push(enviar(p, {
        tipo: 'horario', archivo_id: elegido.getId(), archivo: elegido.getName(),
        mes: mi >= 0 ? anioArchivo + '-' + ('0' + (mi + 1)).slice(-2) : undefined,
        hojas: { 'CUADRO DE TURNO': valores(l, 'CUADRO DE TURNO'), 'HORARIO PASOS': valores(l, 'HORARIO PASOS') },
      }));
    } catch (e) { errores.push('CARPETA_HORARIOS: ' + e.message); }
  }

  console.log(informe.concat(errores.map(function (e) { return 'ERROR · ' + e; })).join('\n'));
  if (errores.length) throw new Error(errores.join('\n')); // así Google avisa por correo de las fallas del activador
  return informe;
}

/** Ejecútela una vez a mano para verificar permisos, propiedades y conexión. */
function probarEnlace() { Logger.log(sincronizar().join('\n')); }

/** Programa la sincronización todos los días a las 6 a. m. (hora de la cuenta). */
function instalarActivadorDiario() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'sincronizar') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('sincronizar').timeBased().everyDays(1).atHour(6).create();
}
