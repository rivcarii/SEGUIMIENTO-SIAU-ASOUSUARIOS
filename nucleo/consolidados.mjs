// Lectores de los consolidados de SIAU. Reciben cuadrículas (arreglos de filas) tal como las
// entrega Google Sheets (getDisplayValues) y devuelven filas normalizadas. Sin dependencias.
import { normalizar } from "./sedes.mjs";

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const mesNum = (s) => MESES.indexOf(normalizar(s)) + 1;
const celda = (g, fila1, col0) => g?.[fila1 - 1]?.[col0] ?? "";
const texto = (v) => String(v ?? "").trim();

/** Entero desde texto de hoja ("297", "1.234", " 12 "); null si está vacío o no es número. */
export function entero(v) {
  const t = texto(v).replace(/\s/g, "");
  if (!t) return null;
  const s = /^\d{1,3}([.,]\d{3})+$/.test(t) ? t.replace(/[.,]/g, "") : t;
  return /^-?\d+$/.test(s) ? Number(s) : null;
}

/** Fecha AAAA-MM-DD desde "2026-05-12", "12/05/2026" (día/mes/año, formato colombiano) o ISO con hora. */
export function fecha(v) {
  const t = texto(v);
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(t);
  if (!m) { const d = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})(?:\D.*)?$/.exec(t); if (d) m = [null, d[3], d[2].padStart(2, "0"), d[1].padStart(2, "0")]; }
  if (!m) return null;
  const [y, mo, d] = [+m[1], +m[2], +m[3]], u = new Date(Date.UTC(y, mo - 1, d));
  return u.getUTCFullYear() === y && u.getUTCMonth() === mo - 1 && u.getUTCDate() === d ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

// ───────────────────────── Consolidados reales de SIAU ─────────────────────────

const PERSONALES = ["cedula", "documento", "identificacion", "nombre", "nombres", "apellidos", "telefono", "correo", "email", "celular", "direccion de correo"];
/** Barrera de privacidad: si el encabezado trae columnas con datos personales, se rechaza todo el envío. */
export function rechazarPersonales(grid, donde = "") {
  for (const fila of grid.slice(0, 8)) {
    for (const c of fila) {
      const n = normalizar(c);
      if (n && PERSONALES.some((p) => n === p || n.startsWith(p + " ") || n.endsWith(" " + p) || n.includes(" " + p + " ") || n.includes("numero de " + p) || n.includes("numero de telefono"))) {
        throw Object.assign(new Error(`${donde || "La hoja"} trae la columna «${String(c).trim()}» con datos personales. Envíe solo fecha, sede y calificación (el script debe filtrar las columnas).`), { privacidad: true });
      }
    }
  }
}

const mesDeTitulo = (t) => {
  const [tok, ...resto] = normalizar(t).split(" ");
  const m = MESES.findIndex((x) => x.startsWith(tok) || tok.startsWith(x.slice(0, 5)));
  const anio = resto.map(Number).find((n) => n > 2000);
  return { mes: m + 1, anio };
};
const estadoActa = (v) => { const n = normalizar(v); return n.startsWith("entregad") ? "entregado" : n.startsWith("pendient") ? "pendiente" : n ? n : "sin_dato"; };

/** CONS_BUZON: una hoja por mes; fila 2 = «DD(Bnnn)» por acta; filas de sedes hasta «ENTREGADAS». */
export function parsearBuzon(hojas) {
  const actas = [], avisos = [];
  for (const [titulo, grid] of Object.entries(hojas)) {
    const { mes, anio } = mesDeTitulo(titulo);
    if (!mes || !anio) continue; // INDICADORES, Calc_Data, Dashboard…
    const cols = (grid[1] ?? []).map((c, i) => [i, /^\s*(\d{1,2})\s*\(\s*(B\d+)\s*\)\s*$/i.exec(String(c))]).filter(([, m]) => m);
    if (!cols.length) { avisos.push(`${titulo.trim()}: no se encontraron las actas (DD(Bnnn)) en la fila 2.`); continue; }
    for (const f of grid.slice(2)) {
      const nombre = texto(f[0]);
      if (!nombre) continue;
      if (["entregadas", "pendientes"].includes(normalizar(nombre))) break;
      for (const [i, m] of cols) actas.push({ codigo: m[2].toUpperCase(), fecha: `${anio}-${String(mes).padStart(2, "0")}-${m[1].padStart(2, "0")}`, sede_texto: nombre, estado: estadoActa(f[i]) });
    }
  }
  return { actas, avisos };
}

/** CONS_CHARLAS: matriz sede × mes (usuarios y funcionarios). Se omiten INTERPRETE y TOTAL. */
export function parsearCharlasMatriz(hojas, anio) {
  const filas = [], avisos = [];
  for (const [hoja, ind] of [["CHARLAS USUARIOS", "charlas_usuarios"], ["CHARLAS FUNCIONARIOS", "charlas_funcionarios"]]) {
    const g = hojas[hoja];
    if (!g) continue;
    const h = g.findIndex((f) => normalizar(f[0]) === "sedes");
    if (h < 0) { avisos.push(`${hoja}: no se encontró la fila de encabezado (SEDES).`); continue; }
    const meses = g[h].map((c, i) => [i, mesNum(c)]).filter(([, m]) => m);
    for (const f of g.slice(h + 1)) {
      const nombre = texto(f[0]), n = normalizar(nombre);
      if (!nombre) continue;
      if (n === "total") break;
      if (n === "interprete") continue;
      for (const [i, m] of meses) { const v = entero(f[i]); if (v != null) filas.push({ sede_texto: nombre, periodo: `${anio}-${String(m).padStart(2, "0")}`, indicador: ind, valor: v }); }
    }
  }
  return { filas, avisos };
}

/** Respuestas de formularios (NPS usuarios / evaluación médica): solo fecha, sede y calificación 0–10, agregadas por sede y mes. */
export function parsearEncuestas(grid, tipo) {
  rechazarPersonales(grid, tipo === "nps" ? "La hoja de NPS" : "La hoja de evaluación médica");
  const avisos = [], h = grid.findIndex((f) => f.some((c) => normalizar(c) === "marca temporal"));
  if (h < 0) return { filas: [], avisos: ["No se encontró la columna «Marca temporal»."] };
  const enc = grid[h].map(normalizar);
  const iTs = enc.indexOf("marca temporal"), iSede = enc.findIndex((c) => c.startsWith("sede"));
  const iNota = enc.findIndex((c) => (tipo === "nps" ? c.includes("probabilidad") : c.includes("escala numerica")));
  if (iSede < 0 || iNota < 0) return { filas: [], avisos: ["Faltan las columnas de sede o de calificación."] };
  const pre = tipo === "nps" ? { total: "encuestas", p: "nps_promotores", m: "nps_pasivos", d: "nps_detractores" } : { total: "medica_evaluaciones", p: "medica_promotores", m: "medica_pasivos", d: "medica_detractores" };
  const acc = new Map();
  let sinFecha = 0;
  for (const f of grid.slice(h + 1)) {
    const fe = fecha(f[iTs]);
    if (!fe) { if (f.some((c) => texto(c))) sinFecha++; continue; }
    const sede = texto(f[iSede]), k = `${sede}|${fe.slice(0, 7)}`;
    const a = acc.get(k) ?? acc.set(k, { sede, periodo: fe.slice(0, 7), total: 0, p: 0, m: 0, d: 0 }).get(k);
    a.total++;
    const nota = Number(String(f[iNota]).replace(",", "."));
    if (texto(f[iNota]) && nota >= 0 && nota <= 10) a[nota >= 9 ? "p" : nota >= 7 ? "m" : "d"]++;
  }
  if (sinFecha) avisos.push(`${sinFecha} fila(s) sin fecha legible omitidas.`);
  const filas = [];
  for (const a of acc.values()) for (const [k, ind] of Object.entries(pre)) filas.push({ sede_texto: a.sede || "(sin sede)", periodo: a.periodo, indicador: ind, valor: a[k] });
  return { filas, avisos };
}

/** Intérprete de LSC: atenciones (solo conteo por sede y mes) y actividades asociadas. Sin datos de personas. */
export function parsearIlsc(hojas) {
  const avisos = [], acc = new Map();
  const sumar = (sede, periodo, ind, v) => { const k = `${sede}|${periodo}|${ind}`; acc.set(k, { sede_texto: sede, periodo, indicador: ind, valor: (acc.get(k)?.valor ?? 0) + v }); };
  for (const [hoja, g] of Object.entries(hojas)) {
    const n = normalizar(hoja);
    const registro = /^registro \d{4}$/.test(n), actividades = n.startsWith("actividades asociadas");
    if (!registro && !actividades) continue;
    rechazarPersonales(g, hoja);
    const h = g.findIndex((f) => f.some((c) => normalizar(c).startsWith("fecha de ")));
    if (h < 0) { avisos.push(`${hoja.trim()}: no se encontró la columna de fecha.`); continue; }
    const enc = g[h].map(normalizar);
    const iF = enc.findIndex((c) => c.startsWith("fecha de ")), iS = enc.indexOf("sede"), iA = enc.findIndex((c) => c.includes("asistentes"));
    for (const f of g.slice(h + 1)) {
      const fe = fecha(f[iF]);
      if (!fe) continue;
      const sede = texto(f[iS]) || "(sin sede)", periodo = fe.slice(0, 7);
      if (registro) sumar(sede, periodo, "lsc_atenciones", 1);
      else { sumar(sede, periodo, "lsc_actividades", 1); const a = entero((texto(f[iA]).match(/\d+/) ?? [""])[0]); if (a != null) sumar(sede, periodo, "lsc_actividades_asistentes", a); }
    }
  }
  return { filas: [...acc.values()], avisos };
}

// ───────────────────────── Horario del personal (cuadro de turnos) ─────────────────────────
const TURNO = /^[a-z]{1,3}\d{0,2}$/i; // C8, C7, C3, M, T, CD, ND… (cualquier otro texto en un día es una ausencia)
const iso = (anio, mes, dia) => `${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
const tipoAusencia = (t) => (/vacac/i.test(t) ? "vacaciones" : /incap/i.test(t) ? "incapacidad" : /licenc|materni|paterni/i.test(t) ? "licencia" : "otro");

/**
 * Hojas «CUADRO DE TURNO» y «HORARIO PASOS» → personal con sus sedes, rol y ausencias del mes.
 * No lee la cédula. El rol sale del cargo y de la sede escrita en el horario (no de nombres propios).
 */
export function parsearHorario(hojas, mesParam) {
  const avisos = [], g = hojas["CUADRO DE TURNO"] ?? [];
  const h = g.findIndex((f) => { const n = f.map(normalizar); return n.includes("nombre") && n.includes("cargo") && n.includes("sede"); });
  if (h < 0) return { mes: null, personal: [], avisos: ["No se encontró el encabezado NOMBRE / CARGO / SEDE en CUADRO DE TURNO."] };
  const enc = g[h].map(normalizar), iN = enc.indexOf("nombre"), iC = enc.indexOf("cargo"), iS = enc.indexOf("sede");
  const filaDias = g[h - 1] ?? [];
  const dias = filaDias.map((c, i) => [i, entero(c)]).filter(([i, d]) => d >= 1 && d <= 31 && i > iS);
  let { mes, anio } = /^\d{4}-\d{2}$/.test(mesParam ?? "") ? { anio: +mesParam.slice(0, 4), mes: +mesParam.slice(5) } : { mes: 0, anio: 0 };
  if (!mes) { const t = g.slice(0, h).flat().map((c) => mesNum(c)).find(Boolean); mes = t ?? new Date().getMonth() + 1; anio = anio || new Date().getFullYear(); }

  // Rotación semanal de los técnicos de «PASOS»
  const rot = [];
  const hp = hojas["HORARIO PASOS"] ?? [];
  let actual = null;
  for (const f of hp) {
    if (texto(f[0]) && normalizar(f[0]) !== "ludoteca" && texto(f[1])) { actual = { nombre: texto(f[0]), sedes: [] }; rot.push(actual); }
    const sede = texto(f[2]);
    if (actual && sede && normalizar(sede) !== "ludoteca" && !actual.sedes.includes(sede)) actual.sedes.push(sede);
  }

  const personal = [];
  for (const f of g.slice(h + 1)) {
    const nombre = texto(f[iN]);
    if (!nombre) continue;
    const cargo = texto(f[iC]), sedeTxt = texto(f[iS]);
    const rol = /interprete/i.test(normalizar(cargo)) ? "interprete" : /oficina administrativa/i.test(sedeTxt) ? "administrativo" : "tecnico";
    let sedes = [];
    if (rol === "tecnico") {
      if (normalizar(sedeTxt) === "pasos") {
        const toks = normalizar(nombre).split(" ");
        const r = rot.find((x) => normalizar(x.nombre).split(" ").every((t) => toks.includes(t)));
        if (r) sedes = r.sedes; else avisos.push(`«PASOS»: no se encontró la rotación de ${nombre} en HORARIO PASOS.`);
      } else if (!/vacac|licenc|incap/i.test(sedeTxt)) sedes = sedeTxt.split(/\s+-\s+|;|,/).map((x) => x.trim()).filter(Boolean);
    }
    // Ausencias: un texto que no es código de turno abre una ausencia hasta el siguiente turno o el fin del mes
    const ausencias = [];
    for (let k = 0; k < dias.length; k++) {
      const v = texto(f[dias[k][0]]);
      if (!v || TURNO.test(v)) continue;
      let fin = k;
      while (fin + 1 < dias.length && !texto(f[dias[fin + 1][0]])) fin++;
      ausencias.push({ tipo: tipoAusencia(v), nota: v, desde: iso(anio, mes, dias[k][1]), hasta: iso(anio, mes, dias[fin][1]) });
      k = fin;
    }
    if (!ausencias.length && /vacac|licenc|incap/i.test(sedeTxt)) ausencias.push({ tipo: tipoAusencia(sedeTxt), nota: sedeTxt, desde: iso(anio, mes, 1), hasta: iso(anio, mes, new Date(anio, mes, 0).getDate()) });
    personal.push({ nombre, cargo, rol, sedes_texto: sedes, ausencias, estado_texto: sedeTxt });
  }
  return { mes: `${anio}-${String(mes).padStart(2, "0")}`, personal, avisos };
}
