// Ejecuta dist/Codigo.gs (el archivo que se pega en Apps Script) con servicios de Google simulados.
import { test } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { construir } from "../google/construir.mjs";

const CODIGO = construir();

function entorno({ usuario = "siau@miredips.org", dueno = "siau@miredips.org", props = {}, archivos = [] } = {}) {
  const propiedades = { ...props }, logs = [], hojasPorLibro = new Map(), archivosPorId = new Map(), triggers = [];
  let seq = 0;
  const celdas = (h, f, c, nf, nc) => Array.from({ length: nf }, (_, i) => Array.from({ length: nc }, (_, j) => h.datos[f - 1 + i]?.[c - 1 + j] ?? ""));
  const nuevaHoja = (nombre, datos = []) => {
    const h = { nombre, datos: datos.map((f) => [...f]), maxFilas: Math.max(1000, datos.length) };
    h.getRange = (f, c, nf, nc) => {
      if (typeof f === "string") return { setNumberFormat() {} };
      return {
        getValues: () => celdas(h, f, c, nf, nc),
        setValues(v) { v.forEach((fila, i) => fila.forEach((x, j) => { (h.datos[f - 1 + i] ??= [])[c - 1 + j] = x; })); },
        setNumberFormat() {},
        clearContent() { for (let i = 0; i < nf; i++) for (let j = 0; j < nc; j++) if (h.datos[f - 1 + i]) h.datos[f - 1 + i][c - 1 + j] = ""; },
      };
    };
    h.getLastRow = () => { let u = 0; h.datos.forEach((f, i) => { if (f.some((x) => x !== "" && x != null)) u = i + 1; }); return u; };
    h.getMaxRows = () => h.maxFilas; h.insertRowsAfter = (_, n) => { h.maxFilas += n; }; h.setFrozenRows = () => {};
    h.getName = () => nombre;
    h.getDataRange = () => ({ getDisplayValues: () => h.datos.map((f) => f.map((x) => String(x ?? ""))) });
    return h;
  };
  const nuevoLibro = (id, hojas = {}) => {
    const l = { id, hojas: new Map(Object.entries(hojas).map(([n, d]) => [n, nuevaHoja(n, d)])) };
    l.getSheetByName = (n) => l.hojas.get(n) ?? null;
    l.insertSheet = (n) => { const h = nuevaHoja(n); l.hojas.set(n, h); return h; };
    l.getSheets = () => [...l.hojas.values()]; l.getId = () => id; l.getUrl = () => `https://docs/${id}`;
    hojasPorLibro.set(id, l);
    return l;
  };
  const archivo = (id, nombre, { mime = "application/vnd.google-apps.spreadsheet", edad = 1, padre = null, bytes = null } = {}) => {
    const f = { id, nombre, mime, edad, padre, bytes, papelera: false };
    f.getName = () => nombre; f.getId = () => id; f.getMimeType = () => mime; f.getLastUpdated = () => edad; f.isTrashed = () => f.papelera; f.setTrashed = (v) => { f.papelera = v; };
    f.getParents = () => { const q = f.padre ? [{ getId: () => f.padre.id, getName: () => f.padre.nombre }] : []; return { hasNext: () => q.length > 0, next: () => q.shift() }; };
    f.getBlob = () => ({ getContentType: () => "image/jpeg", getBytes: () => f.bytes });
    archivosPorId.set(id, f);
    return f;
  };
  const carpetas = new Map();
  const carpeta = (id, nombre) => { const c = { id, nombre, getId: () => id, getUrl: () => `https://drive/${id}`,
    createFile(blob) { const f = archivo("foto" + ++seq, blob.nombre, { mime: "image/jpeg", padre: c, bytes: blob.bytes }); return f; },
    getFilesByType() { const q = [...archivosPorId.values()].filter((f) => f.padre?.id === id); return { hasNext: () => q.length > 0, next: () => q.shift() }; } }; carpetas.set(id, c); return c; };
  for (const a of archivos) { const { hojas, ...m } = a; archivo(a.id, a.nombre, m); if (hojas) nuevoLibro(a.id, hojas); }

  const ctx = {
    console: { log: (t) => logs.push(t), error: (t) => logs.push("ERR " + t) },
    PropertiesService: { getScriptProperties: () => ({ getProperties: () => ({ ...propiedades }), getProperty: (k) => propiedades[k] ?? null, setProperty: (k, v) => { propiedades[k] = v; } }) },
    Session: { getActiveUser: () => ({ getEmail: () => usuario }), getEffectiveUser: () => ({ getEmail: () => dueno }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    SpreadsheetApp: { create: (n) => nuevoLibro("libro" + ++seq), openById: (id) => hojasPorLibro.get(id) ?? (() => { throw new Error("sin libro " + id); })(), flush() {} },
    DriveApp: {
      createFolder: () => carpeta("carpeta" + ++seq),
      getFolderById: (id) => carpetas.get(id) ?? carpeta(id),
      getFileById: (id) => archivosPorId.get(id) ?? (() => { throw new Error("sin archivo " + id); })(),
      searchFiles: () => { const q = [...archivosPorId.values()].filter((f) => f.mime === "application/vnd.google-apps.spreadsheet"); return { hasNext: () => q.length > 0, next: () => q.shift() }; },
    },
    MimeType: { GOOGLE_SHEETS: "application/vnd.google-apps.spreadsheet" },
    Utilities: {
      base64Decode: (s) => Buffer.from(s, "base64"), base64Encode: (b) => Buffer.from(b).toString("base64"),
      newBlob: (bytes, tipo, nombre) => ({ bytes, tipo, nombre }),
      formatDate: (d, _z, fmt) => (fmt === "yyyy-MM-dd" ? "2026-09-30" : "2026-09-30 12:00:00"),
    },
    HtmlService: { XFrameOptionsMode: { ALLOWALL: 1 }, createHtmlOutput: (html) => { const o = { html, titulo: "" }; o.setTitle = (t) => { o.titulo = t; return o; }; o.addMetaTag = () => o; o.setXFrameOptionsMode = () => o; return o; } },
    ScriptApp: { getService: () => ({ getUrl: () => "https://script.google.com/macros/s/ABC/exec" }), getProjectTriggers: () => triggers,
      deleteTrigger: (t) => { triggers.splice(triggers.indexOf(t), 1); },
      newTrigger: (fn) => { const t = { getHandlerFunction: () => fn }; const b = { timeBased: () => b, everyDays: () => b, atHour: () => b, create: () => { triggers.push(t); return t; } }; return b; } },
    Buffer,
  };
  vm.createContext(ctx);
  vm.runInContext(CODIGO, ctx);
  const llamar = (metodo, ruta, { q, cuerpo } = {}) => JSON.parse(ctx.llamar(JSON.stringify({ metodo, ruta, q, cuerpo })));
  return { ctx, propiedades, logs, llamar, triggers, archivosPorId, hojasPorLibro, nuevoLibro, archivo };
}

test("el paquete se carga completo y no deja datos personales en el código", () => {
  const e = entorno();
  for (const fn of ["doGet", "llamar", "configurar", "autoconfigurar", "sincronizarDrive", "instalarActivadorDiario", "diagnosticar"]) assert.equal(typeof e.ctx[fn], "function", fn);
  assert.ok(CODIGO.length < 400_000);
});

test("configurar crea base y carpeta, deja al dueño como administrador y es repetible", () => {
  const e = entorno();
  e.ctx.configurar();
  assert.ok(e.propiedades.ID_BASE && e.propiedades.ID_FOTOS);
  assert.equal(e.propiedades.ADMINS, "siau@miredips.org");
  const sedes = e.hojasPorLibro.get(e.propiedades.ID_BASE).getSheetByName("t_sedes");
  assert.equal(sedes.getLastRow(), 41); // encabezado + 40 sedes
  const base = e.propiedades.ID_BASE;
  e.ctx.configurar();
  assert.equal(e.propiedades.ID_BASE, base);
  assert.equal(e.hojasPorLibro.get(base).getSheetByName("t_sedes").getLastRow(), 41);
});

test("llamar: sin configurar responde un error claro; con rol correcto lee y escribe, y persiste en la hoja", () => {
  const e = entorno();
  assert.match(e.llamar("GET", "/api/config").error, /configurar/);
  e.ctx.configurar();
  const cfg = e.llamar("GET", "/api/config");
  assert.equal(cfg.ok, true);
  assert.equal(cfg.datos.sedes.length, 40);
  const r = e.llamar("POST", "/api/admin/tecnicos", { cuerpo: { nombre: "Ana Prueba" } });
  assert.equal(r.ok, true);
  // otra «ejecución»: el dato se leyó de la hoja
  assert.ok(e.llamar("GET", "/api/config").datos.tecnicos.some((t) => t.nombre === "Ana Prueba"));
  const mal = e.llamar("POST", "/api/admin/evidencias", { cuerpo: { tipo: "no existe" } });
  assert.deepEqual([mal.ok, mal.estado], [false, 400]);
});

test("permisos: sin correo o fuera de las listas no hay acceso; un visor no administra", () => {
  const base = entorno();
  base.ctx.configurar();
  const props = { ...base.propiedades, VISORES: "lector@miredips.org, otra@miredips.org" };
  const libros = base.hojasPorLibro;
  for (const [usuario, esperado] of [["lector@miredips.org", { cfg: true, admin: false }], ["intruso@gmail.com", { cfg: false, admin: false }], ["", { cfg: false, admin: false }]]) {
    const e = entorno({ usuario, props });
    for (const [id, l] of libros) e.hojasPorLibro.set(id, l); // misma base de datos
    for (const [id, f] of base.archivosPorId) e.archivosPorId.set(id, f);
    assert.equal(e.llamar("GET", "/api/config").ok, esperado.cfg, usuario);
    assert.equal(e.llamar("POST", "/api/admin/tecnicos", { cuerpo: { nombre: "X" } }).ok, esperado.admin, usuario);
    assert.equal(e.llamar("POST", "/api/admin/sincronizar-drive").ok, false);
    const pag = e.ctx.doGet({ parameter: {} });
    assert.equal(/Sin acceso/.test(pag.html), !esperado.cfg, usuario);
  }
});

test("doGet: sirve el visor y, solo a administradores, el administrador; sustituye las direcciones", () => {
  const e = entorno();
  e.ctx.configurar();
  const v = e.ctx.doGet({ parameter: {} });
  assert.match(v.html, /rivcarii\.github\.io\/SEGUIMIENTO-SIAU-ASOUSUARIOS\/visor\/app\.js/);
  assert.match(v.html, /https:\/\/script\.google\.com\/macros\/s\/ABC\/exec\?pagina=admin/);
  assert.ok(!v.html.includes("{{"));
  const a = e.ctx.doGet({ parameter: { pagina: "admin" } });
  assert.match(a.html, /admin\/app\.js/);
  e.propiedades.RECURSOS = "https://otro.example/x/";
  assert.match(e.ctx.doGet({ parameter: {} }).html, /https:\/\/otro\.example\/x\/shared\/estilos\.css/);
});

test("fotos: se guardan en la carpeta de Drive, solo se leen las de una evidencia y se limpian al borrar", () => {
  const e = entorno();
  e.ctx.configurar();
  const b64 = Buffer.alloc(300, 7).toString("base64");
  const { archivo } = e.llamar("POST", "/api/admin/foto", { cuerpo: { base64: b64, tipo: "image/jpeg" } }).datos;
  assert.equal(e.archivosPorId.get(archivo).padre.id, e.propiedades.ID_FOTOS);
  assert.equal(e.llamar("GET", "/api/foto", { q: { id: archivo } }).estado, 404); // aún no pertenece a una evidencia
  const portada = "data:image/jpeg;base64,/9j/AAAA";
  const ev = e.llamar("POST", "/api/admin/evidencias", { cuerpo: { tipo: "cartelera", titulo: "Cartelera", fecha: "2026-09-10", fotos: [archivo], portada } });
  assert.equal(ev.ok, true, ev.error);
  assert.match(e.llamar("GET", "/api/foto", { q: { id: archivo } }).datos.data, /^data:image\/jpeg;base64,/);
  assert.equal(e.llamar("GET", "/api/evidencias").datos.items[0].portada, portada);
  e.llamar("DELETE", "/api/admin/evidencias/" + ev.datos.id);
  assert.equal(e.archivosPorId.get(archivo).papelera, true);
  // un archivo que no está en la carpeta de fotos no se acepta como foto
  e.archivo("ajeno", "otra cosa", { mime: "image/jpeg" });
  assert.equal(e.llamar("POST", "/api/admin/evidencias", { cuerpo: { tipo: "cartelera", titulo: "x", fecha: "2026-09-10", fotos: ["ajeno"] } }).estado, 400);
});

test("un fallo a mitad de una operación no deja datos a medias (atomicidad sobre las hojas)", () => {
  const e = entorno();
  e.ctx.configurar();
  const antes = e.llamar("GET", "/api/config").datos.sedes.length;
  const r = e.llamar("POST", "/api/admin/importar", { cuerpo: { tipo: "nps", archivo: "x.xlsx", hojas: { "Respuestas de formulario 1": [["Marca temporal", "CÉDULA", "SEDE", "probabilidad"], ["01/09/2026", "1", "NUEVA VIDA", "10"]] } } });
  assert.equal(r.ok, false);
  assert.match(r.error, /personales/i);
  assert.equal(e.llamar("GET", "/api/config").datos.sedes.length, antes);
  assert.equal(e.hojasPorLibro.get(e.propiedades.ID_BASE).getSheetByName("t_mensual")?.getLastRow() ?? 1, 1);
});

// ── Enlace con Drive
const NPS = [
  ["Marca temporal", "Dirección de correo electrónico", "NOMBRES", "APELLIDOS", "CÉDULA", "SEDE QUE CONSULTÓ:", "Teléfono ", " ¿Cuál es la probabilidad de que recomiende a sus familiares y amigos a MiRed IPS?"],
  ["05/09/2026 9:20:01", "ana@ejemplo.org", "Ana", "Paz", "123456", "NUEVA VIDA", "3000000000", "10"],
  ["06/09/2026 9:20:01", "luis@ejemplo.org", "Luis", "Mar", "654321", "NUEVA VIDA", "3000000001", "6"],
];
const HORARIO = [
  ["", "", "SEPTIEMBRE 2026", "", "", "", "1", "2"],
  ["N°", "CEDULA", "NOMBRE", "CARGO", "SEDE", "", "M", "T"],
  ["1", "99887766", "PERSONA UNO", "AUXILIAR SIAU", "NUEVA VIDA", "", "C8", "C8"],
];
const archivosDrive = () => [
  { id: "nps", nombre: "SATISFACCIÓN DE LOS USUARIOS MiRed IPS NPS. 2026 (respuestas)", hojas: { "Respuestas de formulario 1": NPS }, edad: 4 },
  { id: "nps-viejo", nombre: "NPS satisfacción 2025 (respuestas)", hojas: { x: [["a"]] }, edad: 1 },
  { id: "excel", nombre: "CONS_CHARLAS_2026", mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", edad: 5 },
  { id: "hsep", nombre: "Horario Septiembre 2026 - SIAU", hojas: { "CUADRO DE TURNO": HORARIO }, edad: 7, padre: { id: "carpeta-h", nombre: "Horarios" } },
];

test("autoconfigurar: reconoce cada consolidado por su nombre y la carpeta de horarios; no pisa lo manual", () => {
  const e = entorno({ archivos: archivosDrive(), props: { ID_BUZON: "manual" } });
  const informe = e.ctx.autoconfigurar();
  assert.equal(e.propiedades.ID_NPS, "nps");
  assert.equal(e.propiedades.CARPETA_HORARIOS, "carpeta-h");
  assert.equal(e.propiedades.ID_BUZON, "manual");
  assert.ok(informe.some((l) => /ID_BUZON: ya configurado/.test(l)));
  assert.ok(informe.some((l) => /ID_MEDICA: NO ENCONTRADO/.test(l)));
});

test("sincronizarDrive: carga los consolidados SIN datos personales y avisa de lo que falla", () => {
  const e = entorno({ archivos: archivosDrive() });
  e.ctx.configurar();
  assert.throws(() => e.ctx.sincronizarDrive(), /ID_CHARLAS|ID_BUZON|ID_MEDICA|ID_ILSC|Excel/);
  const base = e.hojasPorLibro.get(e.propiedades.ID_BASE);
  const guardado = JSON.stringify(base.getSheetByName("t_mensual").datos);
  assert.ok(guardado.includes("encuestas")); // se cargó el NPS
  for (const dato of ["ana@ejemplo", "Ana", "Paz", "123456", "3000000000", "99887766"]) assert.ok(!JSON.stringify([...base.hojas.values()].map((h) => h.datos)).includes(dato), dato);
  assert.match(JSON.stringify(base.getSheetByName("t_tecnicos").datos), /PERSONA UNO/); // el nombre del personal sí se guarda (cuadro de turnos); la cédula no
  assert.ok(e.logs.join("\n").includes("ERROR · ID_CHARLAS"));
});

test("administrador: «Actualizar desde Drive» corre la sincronización y devuelve el informe", () => {
  const e = entorno({ archivos: archivosDrive() });
  e.ctx.configurar();
  const r = e.llamar("POST", "/api/admin/sincronizar-drive");
  assert.equal(r.ok, true);
  assert.ok(r.datos.informe.some((l) => /OK/.test(l)));
  assert.ok(r.datos.errores.length > 0);
  assert.ok(e.llamar("GET", "/api/admin/estado").datos.fuentes.some((f) => f.tipo === "nps"));
});

test("activador diario: se instala una sola vez", () => {
  const e = entorno();
  e.ctx.instalarActivadorDiario(); e.ctx.instalarActivadorDiario();
  assert.equal(e.triggers.length, 1);
  assert.equal(e.triggers[0].getHandlerFunction(), "sincronizarDrive");
});

test("mantenimiento: un visor no puede ejecutar funciones de administración desde el navegador; verificarCuenta informa la cuenta", () => {
  const base = entorno(); base.ctx.configurar();
  const e = entorno({ usuario: "lector@miredips.org", props: { ...base.propiedades, VISORES: "lector@miredips.org" } });
  for (const fn of ["configurar", "autoconfigurar", "sincronizarDrive", "instalarActivadorDiario", "diagnosticar"]) assert.throws(() => e.ctx[fn](), /administradores/, fn);
  const v = base.ctx.verificarCuenta();
  assert.ok(v.some((l) => /siau@miredips\.org/.test(l)) && v.some((l) => /✔ La cuenta es institucional/.test(l)));
});
