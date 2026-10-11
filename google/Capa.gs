// ═══════════════════════════════════════════════════════════════════════════
// Capa de Google: conecta el núcleo (reglas) con Hojas de cálculo, Drive y la web app.
// No contiene reglas de negocio: eso vive en nucleo/ y se pega arriba de este archivo en dist/Codigo.gs.
// ═══════════════════════════════════════════════════════════════════════════

var ZONA = 'America/Bogota';
// Dónde están alojados los estilos, scripts e imágenes de la interfaz (GitHub Pages del repositorio).
var RECURSOS_POR_DEFECTO = 'https://rivcarii.github.io/SEGUIMIENTO-SIAU-ASOUSUARIOS';

function propiedades_() { return PropertiesService.getScriptProperties(); }
function hoyBogota_() { return Utilities.formatDate(new Date(), ZONA, 'yyyy-MM-dd'); }
function ahoraBogota_() { return Utilities.formatDate(new Date(), ZONA, 'yyyy-MM-dd HH:mm:ss'); }

// ───────────────────────── Base de datos en una Hoja de cálculo ─────────────────────────
// Cada tabla es una pestaña «t_<nombre>» con dos columnas: id y json (una fila por registro).
// Se lee completa la primera vez que se usa (en esa ejecución) y se escribe de golpe en guardar().
function crearAlmacenHojas(libro) {
  var tablas = {};

  // Caché entre ejecuciones (CacheService): leer una Hoja cuesta cientos de ms por tabla. Cada escritura cambia «gen» y deja obsoleto todo lo anterior.
  var cache = null;
  try { cache = typeof CacheService !== 'undefined' ? CacheService.getScriptCache() : null; } catch (e) { cache = null; }
  var TROZO = 30000, TTL = 900;
  function gen_() { try { return cache.get('gen') || '0'; } catch (e) { return '0'; } }
  function desdeCache_(nombre, gen) {
    try {
      var n = Number(cache.get('m:' + gen + ':' + nombre));
      if (!n) return null;
      var claves = [], i;
      for (i = 0; i < n; i++) claves.push('c:' + gen + ':' + nombre + ':' + i);
      var got = cache.getAll(claves), txt = '';
      for (i = 0; i < n; i++) { if (got[claves[i]] == null) return null; txt += got[claves[i]]; }
      return JSON.parse(txt);
    } catch (e) { return null; }
  }
  function aCache_(nombre, gen, T) {
    try {
      var txt = JSON.stringify({ filas: T.filas, sig: T.sig, escritas: T.escritas });
      if (txt.length > 800000 || gen_() !== gen) return; // muy grande, o alguien escribió mientras leíamos
      var obj = {}, n = Math.ceil(txt.length / TROZO) || 1;
      for (var i = 0; i < n; i++) obj['c:' + gen + ':' + nombre + ':' + i] = txt.slice(i * TROZO, (i + 1) * TROZO);
      obj['m:' + gen + ':' + nombre] = String(n);
      cache.putAll(obj, TTL);
    } catch (e) { /* sin caché no pasa nada */ }
  }

  function hoja_(nombre) {
    var h = libro.getSheetByName('t_' + nombre);
    if (!h) {
      h = libro.insertSheet('t_' + nombre);
      h.getRange(1, 1, 1, 2).setValues([['id', 'json']]);
      h.getRange('A:B').setNumberFormat('@');
      h.setFrozenRows(1);
    }
    return h;
  }

  function tabla_(nombre) {
    var T = tablas[nombre];
    if (T) return T;
    var gen = cache ? gen_() : null, cacheado = cache ? desdeCache_(nombre, gen) : null;
    if (cacheado) { T = tablas[nombre] = { hoja: null, filas: cacheado.filas, sig: cacheado.sig, sucia: false, escritas: cacheado.escritas }; return T; }
    var h = hoja_(nombre), filas = [], sig = 1;
    var n = h.getLastRow();
    if (n > 1) {
      var vals = h.getRange(2, 1, n - 1, 2).getValues();
      for (var i = 0; i < vals.length; i++) {
        if (vals[i][1] === '' || vals[i][1] == null) continue;
        var f = JSON.parse(vals[i][1]);
        filas.push(f);
        if (typeof f.id === 'number' && f.id >= sig) sig = f.id + 1;
      }
    }
    T = tablas[nombre] = { hoja: h, filas: filas, sig: sig, sucia: false, escritas: Math.max(0, n - 1) };
    if (cache) aCache_(nombre, gen, T);
    return T;
  }

  function copia_(x) { return JSON.parse(JSON.stringify(x)); }

  var almacen = {
    tabla: function (nombre) {
      return {
        todos: function () { return copia_(tabla_(nombre).filas); },
        insertar: function (fila) {
          var T = tabla_(nombre), f = copia_(fila);
          if (f.id == null) f.id = T.sig++;
          else if (typeof f.id === 'number' && f.id >= T.sig) T.sig = f.id + 1;
          T.filas.push(f); T.sucia = true;
          return f.id;
        },
        actualizar: function (id, parche) {
          var T = tabla_(nombre);
          for (var i = 0; i < T.filas.length; i++) if (T.filas[i].id === id) { Object.assign(T.filas[i], copia_(parche)); T.sucia = true; }
        },
        borrar: function (id) {
          var T = tabla_(nombre);
          T.filas = T.filas.filter(function (x) { return x.id !== id; }); T.sucia = true;
        },
        reemplazar: function (pred, nuevas) {
          var T = tabla_(nombre);
          T.filas = T.filas.filter(function (x) { return !pred(x); }); T.sucia = true;
          for (var i = 0; i < nuevas.length; i++) this.insertar(nuevas[i]);
        },
      };
    },
    /** Ejecuta fn y, si falla, deja los datos como estaban antes. */
    atomico: function (fn) {
      var antes = {};
      Object.keys(tablas).forEach(function (k) { antes[k] = { filas: copia_(tablas[k].filas), sig: tablas[k].sig, sucia: tablas[k].sucia }; });
      try { return fn(); }
      catch (e) {
        Object.keys(tablas).forEach(function (k) {
          if (antes[k]) { tablas[k].filas = antes[k].filas; tablas[k].sig = antes[k].sig; tablas[k].sucia = antes[k].sucia; }
          else delete tablas[k]; // tabla abierta dentro de la operación fallida: se vuelve a leer
        });
        throw e;
      }
    },
    /** Escribe en la hoja las tablas que cambiaron. */
    guardar: function () {
      var huboCambios = false;
      Object.keys(tablas).forEach(function (k) {
        var T = tablas[k];
        if (!T.sucia) return;
        huboCambios = true;
        var valores = T.filas.map(function (f) {
          var j = JSON.stringify(f);
          if (j.length > 49000) throw new Error('Un registro de «' + k + '» es demasiado grande para una celda.');
          return [String(f.id), j];
        });
        var h = T.hoja || (T.hoja = hoja_(k)), necesarias = valores.length + 1;
        if (h.getMaxRows() < necesarias) h.insertRowsAfter(h.getMaxRows(), necesarias - h.getMaxRows() + 200);
        if (valores.length) {
          h.getRange(2, 1, valores.length, 2).setNumberFormat('@');
          h.getRange(2, 1, valores.length, 2).setValues(valores);
        }
        if (T.escritas > valores.length) h.getRange(valores.length + 2, 1, T.escritas - valores.length, 2).clearContent();
        T.escritas = valores.length; T.sucia = false;
      });
      SpreadsheetApp.flush();
      if (cache && huboCambios) { try { cache.put('gen', Date.now() + '-' + Math.floor(Math.random() * 1e6), 21600); } catch (e) { /* ignorar */ } }
    },
  };
  return almacen;
}

// ───────────────────────── Fotos en una carpeta de Drive ─────────────────────────
function crearFotosDrive(carpetaId) {
  function archivo_(id) { try { return DriveApp.getFileById(id); } catch (e) { return null; } }
  return {
    guardar: function (base64, tipo) {
      var ext = tipo === 'image/png' ? 'png' : tipo === 'image/webp' ? 'webp' : tipo === 'application/pdf' ? 'pdf' : 'jpg';
      var blob = Utilities.newBlob(Utilities.base64Decode(base64), tipo, 'evidencia-' + Date.now() + '.' + ext);
      return DriveApp.getFolderById(carpetaId).createFile(blob).getId();
    },
    existe: function (id) {
      var f = archivo_(id);
      if (!f || f.isTrashed()) return false;
      var padres = f.getParents();
      while (padres.hasNext()) if (padres.next().getId() === carpetaId) return true;
      return false;
    },
    borrar: function (id) { var f = archivo_(id); if (f) f.setTrashed(true); },
    datos: function (id) {
      var f = DriveApp.getFileById(id), b = f.getBlob();
      return 'data:' + b.getContentType() + ';base64,' + Utilities.base64Encode(b.getBytes());
    },
  };
}

// ───────────────────────── Sesión y permisos ─────────────────────────
function listaCorreos_(clave) {
  // Lee ADMINS, ADMINS2, ADMINS3… (o VISORES, VISORES2…): cada propiedad puede traer uno o varios correos separados por coma.
  var props = propiedades_().getProperties(), re = new RegExp('^' + clave + '\\d*$'), r = [];
  Object.keys(props).filter(function (k) { return re.test(k); }).sort().forEach(function (k) {
    String(props[k] || '').split(/[\s,;]+/).forEach(function (c) { c = c.trim().toLowerCase(); if (c && r.indexOf(c) < 0) r.push(c); });
  });
  return r;
}

/** { email, rol } — el dueño del script siempre es administrador; ADMINS y VISORES son listas de correos separadas por coma. */
function usuario_() {
  var email = '';
  try { email = String(Session.getActiveUser().getEmail() || '').toLowerCase(); } catch (e) { email = ''; }
  if (!email) return { email: '', rol: null };
  var dueno = '';
  try { dueno = String(Session.getEffectiveUser().getEmail() || '').toLowerCase(); } catch (e) { dueno = ''; }
  if (email === dueno || listaCorreos_('ADMINS').indexOf(email) >= 0) return { email: email, rol: 'admin' };
  if (listaCorreos_('VISORES').indexOf(email) >= 0) return { email: email, rol: 'visor' };
  return { email: email, rol: null };
}

/**
 * Toda función global sin «_» al final la puede invocar desde el navegador cualquiera que abra la aplicación (que ahora es pública).
 * Las de mantenimiento solo corren desde el editor de Apps Script: allí quien ejecuta ES la cuenta dueña.
 * Desde la web esa coincidencia no existe (visitante anónimo o cuenta distinta), así que se rechazan.
 */
function exigirEditor_() {
  var activa = '', efectiva = '';
  try { activa = String(Session.getActiveUser().getEmail() || '').toLowerCase(); efectiva = String(Session.getEffectiveUser().getEmail() || '').toLowerCase(); } catch (e) { activa = ''; }
  if (!activa || activa !== efectiva) throw new Error('Esta función solo se ejecuta desde el editor de Apps Script, con la cuenta dueña del proyecto.');
}

/** Servicios de seguridad para el acceso con usuario y contraseña (sesiones e intentos viven en la caché del script). null si no hay caché. */
function seguridad_() {
  var cache = null;
  try { cache = typeof CacheService !== 'undefined' ? CacheService.getScriptCache() : null; } catch (e) { cache = null; }
  if (!cache) return null;
  return {
    hash: function (clave, sal) {
      var h = Utilities.newBlob(String(clave)).getBytes();
      for (var i = 0; i < 150; i++) h = Utilities.computeHmacSha256Signature(h, String(sal));
      return Utilities.base64Encode(h);
    },
    resumen: function (t) { return Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(t))); },
    azar: function (n) { var s = ''; while (s.length < n * 2) s += Utilities.getUuid().replace(/-/g, ''); return s.slice(0, n * 2); },
    kv: { get: function (k) { return cache.get(k); }, put: function (k, v, seg) { cache.put(k, v, Math.min(seg, 21600)); }, del: function (k) { cache.remove(k); } },
  };
}

var BLOQUEADO_ = false; // true mientras esta ejecución ya tiene el candado del script

/** Si la base viene de una versión anterior (p. ej. sin la rotación de los SIAU), la actualiza sola al primer uso. */
function asegurarVersion_(almacen) {
  var v = almacen.tabla('ajustes').todos().filter(function (a) { return a.id === 'version_datos'; })[0];
  if (v && v.valor === String(VERSION_DATOS)) return;
  var bloqueo = null;
  if (!BLOQUEADO_) { bloqueo = LockService.getScriptLock(); bloqueo.waitLock(30000); }
  try { inicializar(almacen); almacen.guardar(); }
  finally { if (bloqueo) bloqueo.releaseLock(); }
}

function nucleo_() {
  var p = propiedades_().getProperties();
  if (!p.ID_BASE || !p.ID_FOTOS) throw new ErrorHttp(500, 'La plataforma no está configurada: ejecute «configurar» en el editor de Apps Script.');
  var almacen = crearAlmacenHojas(SpreadsheetApp.openById(p.ID_BASE));
  asegurarVersion_(almacen);
  return { almacen: almacen, nucleo: crearNucleo({ almacen: almacen, fotos: crearFotosDrive(p.ID_FOTOS), hoy: hoyBogota_, ahora: ahoraBogota_, seguridad: seguridad_() }) };
}

// ───────────────────────── Páginas web ─────────────────────────
function pagina_(plantilla, titulo) {
  var recursos = String(propiedades_().getProperty('RECURSOS') || RECURSOS_POR_DEFECTO).replace(/\/+$/, '');
  var html = plantilla.split('{{R}}').join(recursos).split('{{APP}}').join(ScriptApp.getService().getUrl());
  return HtmlService.createHtmlOutput(html).setTitle(titulo).addMetaTag('viewport', 'width=device-width, initial-scale=1').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/** La página es pública (no lleva datos): quien no esté identificado ve el formulario de ingreso y los datos solo llegan tras iniciar sesión. */
function doGet(e) {
  var admin = e && e.parameter && e.parameter.pagina === 'admin';
  return pagina_(admin ? PLANTILLA_ADMIN : PLANTILLA_VISOR, admin ? 'Administrador · Evidencias SIAU' : 'Evidencias SIAU');
}

// ───────────────────────── Puente con la plataforma de PQRS (servidor a servidor) ─────────────────────────
/**
 * La plataforma de PQRS (otra cuenta de Google, otra implementación) consulta esta plataforma DESDE SU SERVIDOR con UrlFetchApp: así el
 * administrador no abre una segunda sesión ni choca con varias cuentas de Google en el navegador. Es de solo lectura: únicamente
 * inicio y cierre de sesión (usuario y contraseña de una cuenta «Consulta» creada para el puente) y las rutas de resumen de abajo.
 * Todo lo demás (administrar, escribir, fotos, sincronizar) responde 403 por esta vía.
 */
var RUTAS_PUENTE_ = { 'POST /api/login': 1, 'POST /api/logout': 1, 'GET /api/sesion': 1, 'GET /api/panel': 1, 'GET /api/cumplimiento': 1 };
function doPost(e) {
  var salida = function (texto) { return ContentService.createTextOutput(texto).setMimeType(ContentService.MimeType.JSON); };
  var req = null;
  try { req = JSON.parse((e && e.postData && e.postData.contents) || ''); } catch (err) { req = null; }
  if (!req || typeof req.ruta !== 'string' || typeof req.metodo !== 'string') return salida(JSON.stringify({ ok: false, estado: 400, error: 'Solicitud inválida' }));
  req.metodo = req.metodo.toUpperCase();
  if (!RUTAS_PUENTE_[req.metodo + ' ' + req.ruta]) return salida(JSON.stringify({ ok: false, estado: 403, error: 'Esta ruta no está disponible por el puente.' }));
  return salida(llamar(JSON.stringify({ metodo: req.metodo, ruta: req.ruta, q: req.q || {}, cuerpo: req.cuerpo || {}, token: req.token })));
}

// ───────────────────────── Punto de entrada de la interfaz ─────────────────────────
/** Recibe un texto JSON {metodo, ruta, q, cuerpo} y devuelve un texto JSON {ok, datos} | {ok:false, estado, error}. */
function llamar(texto) {
  var bloqueo = null;
  try {
    var req = JSON.parse(texto);
    if (!req || typeof req.ruta !== 'string' || typeof req.metodo !== 'string') throw new ErrorHttp(400, 'Solicitud inválida');
    var libre = req.ruta === '/api/login' || req.ruta === '/api/logout' || req.ruta === '/api/sesion'; // no escriben en la base: sin candado
    var escribe = req.metodo !== 'GET' && !libre;
    if (escribe) { bloqueo = LockService.getScriptLock(); bloqueo.waitLock(30000); BLOQUEADO_ = true; }
    var x = nucleo_();
    var u = usuario_(); // Google (listas ADMINS/VISORES) si la cuenta se identifica; si no, la sesión de usuario y contraseña
    if (!u.rol && typeof req.token === 'string') { var v = x.nucleo.identificar(req.token); if (v) u = v; }
    var datos;
    if (req.metodo === 'POST' && req.ruta === '/api/admin/sincronizar-drive') {
      if (u.rol !== 'admin') throw new ErrorHttp(403, 'Solo los administradores pueden hacer esto.');
      datos = sincronizarDriveCon_(x.nucleo);
    } else {
      datos = x.nucleo.manejar({ metodo: req.metodo, ruta: req.ruta, q: req.q || {}, cuerpo: req.cuerpo || {}, token: req.token }, u);
      if (escribe) x.almacen.guardar();
    }
    return JSON.stringify({ ok: true, datos: datos === undefined ? null : datos });
  } catch (e) {
    var estado = e && e.estado ? e.estado : 500;
    if (!(e instanceof ErrorHttp)) console.error(e && e.stack ? e.stack : e);
    return JSON.stringify({ ok: false, estado: estado, error: e instanceof ErrorHttp ? e.message : 'Error interno: ' + (e && e.message ? e.message : e) });
  } finally {
    if (bloqueo) { bloqueo.releaseLock(); BLOQUEADO_ = false; }
  }
}

// ───────────────────────── Instalación ─────────────────────────
/** Ejecútela UNA vez desde el editor: crea la base de datos y la carpeta de fotos, y prepara permisos y enlaces. */
function configurar() {
  exigirEditor_();
  var props = propiedades_(), actuales = props.getProperties(), informe = [];
  var dueno = String(Session.getEffectiveUser().getEmail() || '').toLowerCase();
  if (!actuales.ID_BASE) {
    var libro = SpreadsheetApp.create('Plataforma de evidencias SIAU · base de datos (no editar)');
    props.setProperty('ID_BASE', libro.getId());
    informe.push('Base de datos creada: ' + libro.getUrl());
  } else informe.push('Base de datos: ya existe');
  if (!actuales.ID_FOTOS) {
    var carpeta = DriveApp.createFolder('Plataforma de evidencias SIAU · fotos (no editar)');
    props.setProperty('ID_FOTOS', carpeta.getId());
    informe.push('Carpeta de fotos creada: ' + carpeta.getUrl());
  } else informe.push('Carpeta de fotos: ya existe');
  if (!actuales.ADMINS && dueno) { props.setProperty('ADMINS', dueno); informe.push('ADMINS = ' + dueno); }
  var x = nucleo_();
  inicializar(x.almacen);
  x.almacen.guardar();
  informe.push('Tablas iniciales listas (40 sedes y tipos de evidencia).');
  informe = informe.concat(autoconfigurar());
  console.log(informe.join('\n'));
  return informe;
}

// ───────────────────────── Enlace con los consolidados de Drive ─────────────────────────
function norm_(t) {
  return String(t == null ? '' : t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/** Conserva solo las columnas cuyo encabezado cumple algún criterio de la lista blanca (privacidad: nada de nombres, cédulas ni teléfonos). */
function soloColumnas_(grid, criterios) {
  var h = grid.findIndex(function (f) { return f.some(function (c) { return criterios.some(function (k) { return k(norm_(c)); }); }); });
  if (h < 0) return [];
  var keep = grid[h].map(function (c, i) { return criterios.some(function (k) { return k(norm_(c)); }) ? i : -1; }).filter(function (i) { return i >= 0; });
  return grid.slice(h).map(function (f) { return keep.map(function (i) { return f[i] == null ? '' : f[i]; }); });
}

var LISTA_BLANCA = {
  nps: [function (n) { return n === 'marca temporal'; }, function (n) { return n.indexOf('sede') === 0; }, function (n) { return n.indexOf('probabilidad') >= 0; }],
  medica: [function (n) { return n === 'marca temporal'; }, function (n) { return n.indexOf('sede') === 0; }, function (n) { return n.indexOf('escala numerica') >= 0; }],
  ilscRegistro: [function (n) { return n.indexOf('fecha de atencion') === 0; }, function (n) { return n === 'sede'; }],
  ilscActividades: [function (n) { return n.indexOf('fecha de la atencion') === 0; }, function (n) { return n === 'tematica'; }, function (n) { return n === 'sede'; }, function (n) { return n.indexOf('asistentes') >= 0; }],
};

/** Vacía la columna «CEDULA» (por si algún archivo la trae; la plataforma no la necesita y no debe guardarla). */
function sinCedula_(grid) {
  if (!grid) return grid;
  var h = grid.findIndex(function (f) { return f.some(function (c) { return norm_(c) === 'cedula'; }); });
  if (h < 0) return grid;
  var col = grid[h].findIndex(function (c) { return norm_(c) === 'cedula'; });
  return grid.map(function (f, i) { return i <= h ? f : f.map(function (c, j) { return j === col ? '' : c; }); });
}

function valores_(libro, nombre) {
  var h = libro.getSheetByName(nombre);
  return h ? h.getDataRange().getDisplayValues() : null;
}

function libroDe_(id) {
  var f = DriveApp.getFileById(id);
  if (f.getMimeType() !== MimeType.GOOGLE_SHEETS) {
    throw new Error('«' + f.getName() + '» es un Excel (.xlsx). Ábralo en Drive → Archivo → Guardar como Hoja de cálculo de Google, y configure el ID de la copia.');
  }
  return { archivo: f, libro: SpreadsheetApp.openById(id) };
}

// Cómo reconocer cada archivo por su nombre: [propiedad, búsqueda en Drive, filtro sobre el nombre normalizado]
var BUSQUEDAS = [
  ['ID_CHARLAS', "title contains 'CONS_CHARLAS'", function (n) { return n.indexOf('cons charlas') >= 0; }],
  ['ID_BUZON', "title contains 'CONS_BUZON'", function (n) { return n.indexOf('cons buzon') >= 0; }],
  ['ID_NPS', "title contains 'NPS'", function (n) { return n.indexOf('nps') >= 0 && n.indexOf('satisfac') >= 0 && n.indexOf('medic') < 0; }],
  ['ID_MEDICA', "title contains 'satisfac'", function (n) { return n.indexOf('satisfac') >= 0 && n.indexOf('medic') >= 0; }],
  ['ID_ILSC', "title contains 'ILSC'", function (n) { return n.indexOf('ilsc') >= 0; }],
];

function candidatos_(consulta, filtro) {
  var it = DriveApp.searchFiles("mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false and " + consulta);
  var r = [];
  while (it.hasNext()) { var f = it.next(); if (filtro(norm_(f.getName()))) r.push(f); }
  return r.sort(function (a, b) { return b.getLastUpdated() - a.getLastUpdated(); });
}

/**
 * Busca por nombre los consolidados y la carpeta de horarios en el Drive de la cuenta que ejecuta el script
 * (instale el script con siau@miredips.org) y guarda sus ID. No pisa lo ya configurado.
 */
function autoconfigurar() {
  exigirEditor_();
  var props = propiedades_(), actuales = props.getProperties(), informe = [];
  BUSQUEDAS.forEach(function (b) {
    if (actuales[b[0]]) { informe.push(b[0] + ': ya configurado'); return; }
    var c = candidatos_(b[1], b[2]);
    if (!c.length) { informe.push(b[0] + ': NO ENCONTRADO (¿es una Hoja de Google? ¿cambió el nombre?)'); return; }
    props.setProperty(b[0], c[0].getId());
    informe.push(b[0] + ': ' + (c.length === 1 ? 'OK' : 'REVISAR (' + c.length + ' candidatos; se eligió el más reciente)') + ' · «' + c[0].getName() + '»');
  });
  return informe;
}

/** Lee los consolidados de Drive y los carga en la base. Devuelve { informe: [...], errores: [...] }. */
function sincronizarDriveCon_(nucleo) {
  var p = propiedades_().getProperties();
  var anio = Number(hoyBogota_().slice(0, 4));
  var informe = [], errores = [];

  var tareas = [
    ['ID_CHARLAS', function (l) {
      return { tipo: 'charlas_matriz', anio: anio, hojas: { 'CHARLAS USUARIOS': valores_(l, 'CHARLAS USUARIOS'), 'CHARLAS FUNCIONARIOS': valores_(l, 'CHARLAS FUNCIONARIOS') } };
    }],
    ['ID_BUZON', function (l) {
      var hojas = {};
      l.getSheets().forEach(function (h) { if (/_\d{4}\s*$/.test(h.getName())) hojas[h.getName()] = h.getDataRange().getDisplayValues(); });
      return { tipo: 'buzon', hojas: hojas };
    }],
    ['ID_NPS', function (l) {
      return { tipo: 'nps', hojas: { 'Respuestas de formulario 1': soloColumnas_(l.getSheets()[0].getDataRange().getDisplayValues(), LISTA_BLANCA.nps) } };
    }],
    ['ID_MEDICA', function (l) {
      return { tipo: 'medica', hojas: { 'Respuestas de formulario 1': soloColumnas_(l.getSheets()[0].getDataRange().getDisplayValues(), LISTA_BLANCA.medica) } };
    }],
    ['ID_ILSC', function (l) {
      var hojas = {};
      var reg = valores_(l, 'REGISTRO ' + anio), act = valores_(l, 'ACTIVIDADES ASOCIADAS LSC ' + anio);
      if (reg) hojas['REGISTRO ' + anio] = soloColumnas_(reg, LISTA_BLANCA.ilscRegistro);
      if (act) hojas['ACTIVIDADES ASOCIADAS LSC ' + anio] = soloColumnas_(act, LISTA_BLANCA.ilscActividades);
      return { tipo: 'ilsc', hojas: hojas };
    }],
  ];

  function cargar(etiqueta, cuerpo) {
    var r = nucleo.sincronizar(cuerpo);
    var nr = r.sedes_no_reconocidas || [];
    informe.push(cuerpo.archivo + ': OK · ' + (r.registros != null ? r.registros + ' registros' : (r.personal || 0) + ' personas') +
      ' · ' + (r.avisos || []).length + ' aviso(s)' + (nr.length ? ' · SEDES NO RECONOCIDAS: ' + nr.join(', ') : ''));
  }

  tareas.forEach(function (t) {
    if (!p[t[0]]) { errores.push(t[0] + ': no está configurado (ejecute «autoconfigurar»)'); return; }
    try {
      var x = libroDe_(p[t[0]]);
      var cuerpo = t[1](x.libro);
      cuerpo.archivo = x.archivo.getName();
      cargar(t[0], cuerpo);
    } catch (e) { errores.push(t[0] + ': ' + e.message); }
  });

  return { informe: informe, errores: errores };
}

/** La ejecuta el activador diario (y también se puede ejecutar a mano). */
function sincronizarDrive() {
  exigirEditor_();
  var bloqueo = LockService.getScriptLock();
  bloqueo.waitLock(30000);
  BLOQUEADO_ = true;
  try {
    var x = nucleo_();
    var r = sincronizarDriveCon_(x.nucleo);
    x.almacen.guardar();
    console.log(r.informe.concat(r.errores.map(function (e) { return 'ERROR · ' + e; })).join('\n'));
    if (r.errores.length) throw new Error(r.errores.join('\n')); // así Google avisa por correo cuando el activador falla
    return r.informe;
  } finally { bloqueo.releaseLock(); BLOQUEADO_ = false; }
}

/** Programa la sincronización todos los días a las 6 a. m. */
/**
 * Lo ejecuta el activador diario. Es pública (los activadores no pueden identificarse), así que se limita a una vez cada 30 minutos
 * y solo lee los consolidados: no devuelve datos ni acepta parámetros.
 */
function sincronizarDriveProgramado() {
  var cache = typeof CacheService !== 'undefined' ? CacheService.getScriptCache() : null;
  if (cache) { if (cache.get('ult_sinc')) return; cache.put('ult_sinc', '1', 1800); }
  var bloqueo = LockService.getScriptLock();
  bloqueo.waitLock(30000);
  BLOQUEADO_ = true;
  try {
    var x = nucleo_();
    var r = sincronizarDriveCon_(x.nucleo);
    x.almacen.guardar();
    console.log(r.informe.concat(r.errores.map(function (e) { return 'ERROR · ' + e; })).join('\n'));
    if (r.errores.length) throw new Error(r.errores.join('\n')); // así Google avisa por correo cuando el activador falla
  } finally { bloqueo.releaseLock(); BLOQUEADO_ = false; }
}

function instalarActivadorDiario() {
  exigirEditor_();
  ScriptApp.getProjectTriggers().forEach(function (t) { var f = t.getHandlerFunction(); if (f === 'sincronizarDrive' || f === 'sincronizarDriveProgramado') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('sincronizarDriveProgramado').timeBased().everyDays(1).atHour(6).create();
}

/**
 * Crea el primer administrador con usuario y contraseña (usuario «admin»). Ejecútela una vez desde el editor y copie la contraseña del registro;
 * luego entre a la plataforma, cámbiela en «Mi cuenta» y cree desde «Accesos» a las demás personas.
 */
function crearAdministrador() {
  exigirEditor_();
  var x = nucleo_(), r = x.nucleo.crearUsuario({ nombre: 'Administrador SIAU', usuario: 'admin', rol: 'admin' });
  console.log('Usuario: ' + r.usuario + '\nContraseña: ' + r.clave + '\n(Se muestra una sola vez. Cámbiela al entrar.)');
  return { usuario: r.usuario, clave: r.clave };
}

/** Si olvida la contraseña del administrador: genera una nueva para el usuario «admin». */
function reiniciarClaveAdministrador() {
  exigirEditor_();
  var x = nucleo_(), r = x.nucleo.restablecerClave('admin');
  console.log('Usuario: admin\nContraseña nueva: ' + r.clave);
  return r;
}

/** Muestra en el registro cómo quedó la instalación (sin datos personales). */
function diagnosticar() {
  exigirEditor_();
  var p = propiedades_().getProperties(), s = [];
  ['ID_BASE', 'ID_FOTOS', 'ID_CHARLAS', 'ID_BUZON', 'ID_NPS', 'ID_MEDICA', 'ID_ILSC'].forEach(function (k) { s.push(k + ': ' + (p[k] ? 'configurado' : 'FALTA')); });
  s.push('ADMINS: ' + listaCorreos_('ADMINS').length + ' correo(s) · VISORES: ' + listaCorreos_('VISORES').length + ' correo(s)');
  s.push('Recursos de la interfaz: ' + (p.RECURSOS || RECURSOS_POR_DEFECTO));
  s.push('Activadores: ' + ScriptApp.getProjectTriggers().length);
  s.push('Dirección de la web app: ' + ScriptApp.getService().getUrl());
  console.log(s.join('\n'));
  return s;
}

/**
 * Ejecútela PRIMERO desde el editor. Dice con qué cuenta corre el código y si puede abrir la base de datos.
 * Si muestra una cuenta personal: cierre todo y repita en una ventana de incógnito con solo siau@miredips.org.
 */
function verificarCuenta() {
  exigirEditor_();
  var activa = '', efectiva = '';
  try { activa = String(Session.getActiveUser().getEmail() || ''); } catch (e) { activa = '(no disponible)'; }
  try { efectiva = String(Session.getEffectiveUser().getEmail() || ''); } catch (e) { efectiva = '(no disponible)'; }
  var s = ['Cuenta activa: ' + (activa || '(vacía)'), 'Cuenta que ejecuta el código: ' + (efectiva || '(vacía)')];
  var id = propiedades_().getProperty('ID_BASE');
  if (!id) s.push('Aún no se ha ejecutado «configurar».');
  else {
    try { SpreadsheetApp.openById(id).getName(); s.push('✔ Abre la base de datos.'); }
    catch (e) { s.push('✘ No abre la base de datos: ' + e.message + ' (probablemente se está usando otra cuenta).'); }
  }
  s.push(/@miredips\.org$/i.test(efectiva) ? '✔ La cuenta es institucional.' : '✘ La cuenta NO es de miredips.org: cree el proyecto y la implementación desde siau@miredips.org.');
  console.log(s.join('\n'));
  return s;
}
