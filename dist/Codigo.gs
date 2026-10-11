// ARCHIVO GENERADO por google/construir.mjs — no lo edite aquí: edite nucleo/ o google/Capa.gs y vuelva a construir.

const M_sedes = (() => {
// Catálogo de sedes de MiRed IPS: 40 sedes (nombre corto del libro de los técnicos, hoja LISTAS)
// con el nombre largo y el código del consolidado de la líder (MAESTRO SEDES) como alias.
// [nombre técnicos, tipo, código MAESTRO, nombre MAESTRO]. Código/alias null = no figura en el MAESTRO de 37 sedes.
const CATALOGO = [
  ["C. ADELITA DE CHAR", "CAMINO", "CAM011", "Camino Universitario Distrital Adelita de Char"],
  ["C. BOSQUES DE MARIA", "CAMINO", "CAM001", "Camino Bosque de María"],
  ["C. CIUDADELA", "CAMINO", "CAM002", "Camino Ciudadela 20 de Julio"],
  ["C. LA MANGA", "CAMINO", "CAM004", "Camino La Manga"],
  ["C. LA PLAYA", "CAMINO", null, null],
  ["C. LUZ CHINITA", "CAMINO", "CAM003", "Camino La Luz Chinita"],
  ["C. MURILLO", "CAMINO", "CAM006", "Camino Murillo"],
  ["C. NAZARETH", "CAMINO", "CAM007", "Camino Nazareth"],
  ["C. NUEVO BARRANQUILLA", "CAMINO", "CAM008", "Camino Nuevo Barranquilla"],
  ["C. SALUD METROPOLITANA", "CAMINO", "CAM005", "Camino Metropolitano"],
  ["C. SIMON BOLIVAR", "CAMINO", "CAM009", "Camino Simón Bolívar"],
  ["C. SUROCCIDENTE", "CAMINO", "CAM010", "Camino Sur Occidente"],
  ["P. BARLOVENTO", "PASO", "PAS001", "Paso Barlovento"],
  ["P. BUENA ESPERANZA", "PASO", "PAS002", "Paso Buena Esperanza"],
  ["P. CARLOS MEISEL", "PASO", "PAS003", "Paso Carlos Meisel II"],
  ["P. CARRIZAL", "PASO", "PAS004", "Paso Carrizal"],
  ["P. ESMERALDA LIPAYA", "PASO", "PAS006", "Paso Esmeralda - Lipaya"],
  ["P. FERRY", "PASO", "PAS005", "Paso El Ferry 1° de Mayo"],
  ["P. GALAN", "PASO", "PAS007", "Paso Galán"],
  ["P. JUAN MINA", "PASO", "PAS008", "Paso Juan Mina"],
  ["P. JULIO MONTES", "PASO", "PAS009", "Paso Julio Montes"],
  ["P. LA 21", "PASO", "PAS010", "Paso La 21"],
  ["P. LA PRADERA", "PASO", "PAS011", "Paso La Pradera"],
  ["P. LA VILLA", "PASO", "PAS013", "Paso La Villa"],
  ["P. LAS FLORES", "PASO", "PAS014", "Paso Las Flores"],
  ["P. LAS MALVINAS", "PASO", "PAS015", "Paso Las Malvinas"],
  ["P. LAS NIEVES", "PASO", "PAS016", "Paso Las Nieves"],
  ["P. LAS PALMAS", "PASO", "PAS017", "Paso Las Palmas"],
  ["P. NUEVA ERA", "PASO", "PAS018", "Paso Nueva Era"],
  ["P. NUEVA VIDA", "PASO", "PAS019", "Paso Nueva Vida"],
  ["P. REBOLO", "PASO", "PAS020", "Paso Rebolo"],
  ["P. ROSOUR", "PASO", null, null],
  ["P. SAN CAMILO", "PASO", "PAS021", "Paso San Camilo"],
  ["P. SAN JOSE", "PASO", "PAS022", "Paso San José"],
  ["P. SAN SALVADOR", "PASO", "PAS023", "Paso San Salvador"],
  ["P. SANTO DOMINGO", "PASO", "PAS024", "Paso Santo Domingo"],
  ["P. SIERRITA", "PASO", "PAS012", "Paso La Sierrita"],
  ["P. UNIVERSAL", "PASO", "PAS025", "Paso Universal"],
  ["P. VILLA NUEVA", "PASO", null, null],
  ["P. VILLA SAN PABLO", "PASO", "PAS026", "Paso Villas de San Pablo"],
];

// Variantes de escritura vistas en los consolidados, el horario y los formularios (solo errores de digitación y abreviaturas).
const ALIAS_EXTRA = {
  "C. CIUDADELA": ["C. CUIDADELA 20 DE JULIO", "C. CIUDADELA 20 DE JULIO"],
  "C. LA PLAYA": ["C. PLAYA", "CAMINO PLAYA"],
  "C. SALUD METROPOLITANA": ["C. SALUDMETROPOLITANA", "C. SALUDMETROPOLITANO", "CAMINO SALUD METROPOLITANO"],
  "C. NUEVO BARRANQUILLA": ["C. NUEVO DE BARRANQUILLA", "CAMINO NUEVO BQUILLA"],
  "P. LAS MALVINAS": ["P. LAS MALVINA", "PASO MALVINAS", "MALVINAS"],
  "P. FERRY": ["P. EL FERRY", "PASO EL FERRY"],
  "P. LA PRADERA": ["P. PRADERA", "PRADERA"],
  "P. VILLA NUEVA": ["P. VILLANUEVA"],
  "P. LAS NIEVES": ["P. NIEVES", "PASO NIEVES"],
  "P. VILLA SAN PABLO": ["P. VILLA DE SAN PABLO", "PASO VILLAS DE SANPABLO"],
  "P. LAS PALMAS": ["P. PALMAS", "PASO PALMAS"],
  "P. LAS FLORES": ["PASO FLORES"],
  "P. BUENA ESPERANZA": ["B. ESPERANZA"],
  "P. ESMERALDA LIPAYA": ["LA ESMERALDA LIPAYA", "ESMERALDA"],
  "P. LA 21": ["P. LA 21 MICHELLE"],
  "P. SAN JOSE": ["LA UNION SAN JOSE", "LA UNION"],
  "P. ROSOUR": ["CENTRO DE RECUPERACION ROSOUR 7", "CENTRO NUTRICIONAL ROSOUR", "ROSOUR 7", "CENTRO NUTRICIONAL"],
  "P. CARRIZAL": ["CARRIZAL I", "CARRIZAL 1"],
  "P. SANTO DOMINGO": ["SANTO DOMINGO DE AMERICA", "SANTO DOMINGO DE AMÉRICA"],
};

/** Alias de una sede del catálogo: nombre largo del MAESTRO + variantes conocidas. */
const aliasDe = (nombre, largo) => [largo, ...(ALIAS_EXTRA[nombre] ?? [])].filter(Boolean);

const normalizar = (s) =>
  String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const sinPrefijo = (n) => n.replace(/^(c|p|camino|paso) /, "");
const sinArticulos = (n) => n.replace(/\b(el|la|las|los|de|del)\b/g, " ").replace(/\s+/g, " ").trim();
const pegado = (n) => n.replace(/ /g, "");

/**
 * resolver(texto) → fila de sede o null. Prueba, en orden: nombre/alias/código exacto, sin prefijo (C./P./Camino/Paso),
 * sin artículos, escrito sin espacios («CIUDADELA20DEJULIO») y, por último, texto truncado (≥14 letras, si es único).
 * Un nombre ambiguo no se resuelve: es mejor listarlo como «sin reconocer» que asignarlo a la sede equivocada.
 */
function crearResolver(sedes) {
  const niveles = [new Map(), new Map(), new Map(), new Map()], largos = [];
  const poner = (m, k, s) => { if (k) m.set(k, m.has(k) && m.get(k) !== s ? null : s); };
  for (const s of sedes) {
    const nombres = [s.nombre, s.codigo, ...(s.alias ? JSON.parse(s.alias) : [])];
    for (const n0 of nombres) {
      const n = normalizar(n0), core = sinPrefijo(n);
      poner(niveles[0], n, s); poner(niveles[1], core, s); poner(niveles[2], sinArticulos(core), s);
      poner(niveles[3], pegado(n), s); poner(niveles[3], pegado(core), s);
      if (n) largos.push([pegado(n), s]);
    }
  }
  return (texto) => {
    const n = normalizar(texto);
    if (!n) return null;
    const core = sinPrefijo(n);
    for (const [i, k] of [[0, n], [1, core], [2, sinArticulos(core)], [3, pegado(n)], [3, pegado(core)]]) {
      if (niveles[i].has(k)) return niveles[i].get(k);
    }
    const q = pegado(n);
    if (q.length >= 14) {
      const c = new Set(largos.filter(([k]) => k.startsWith(q)).map(([, s]) => s));
      if (c.size === 1) return [...c][0];
    }
    return null;
  };
}

return { CATALOGO, ALIAS_EXTRA, aliasDe, normalizar, crearResolver };
})();

const M_lib = (() => {
/** Fechas (YYYY-MM-DD) de los viernes de un mes "YYYY-MM". */
function viernesDelMes(mes) {
  const [y, m] = mes.split("-").map(Number);
  const out = [];
  for (let d = new Date(Date.UTC(y, m - 1, 1)); d.getUTCMonth() === m - 1; d.setUTCDate(d.getUTCDate() + 1)) {
    if (d.getUTCDay() === 5) out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

const mesValido = (s) => /^\d{4}-(0[1-9]|1[0-2])$/.test(s ?? "");
const fechaValida = (s) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s ?? "");
  if (!m) return false;
  const u = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return u.getUTCFullYear() === +m[1] && u.getUTCMonth() === +m[2] - 1 && u.getUTCDate() === +m[3];
};

/**
 * Cumplimiento mensual.
 * tipos: [{clave, area, nombre, meta, alcance}]; evs: [{tipo, tecnico_id, sede_id, fecha, cantidad}]
 */
function calcularCumplimiento({ mes, tipos, evs, tecnicos, sedes }) {
  const siau = tipos.filter((t) => t.area === "siau");
  const porTipo = siau.map((t) => {
    const delTipo = evs.filter((e) => e.tipo === t.clave);
    const total = delTipo.reduce((s, e) => s + e.cantidad, 0);
    const porTecnico = tecnicos.map((tc) => ({
      tecnico_id: tc.id,
      nombre: tc.nombre,
      total: delTipo.filter((e) => e.tecnico_id === tc.id).reduce((s, e) => s + e.cantidad, 0),
    }));
    return { clave: t.clave, nombre: t.nombre, meta: t.meta, alcance: t.alcance, total, porTecnico };
  });

  const viernes = viernesDelMes(mes);
  const actas = sedes.map((s) => {
    const entregadas = new Set(
      evs.filter((e) => e.tipo === "acta_buzon" && e.sede_id === s.id).map((e) => e.fecha),
    );
    const faltantes = viernes.filter((v) => !entregadas.has(v));
    return { sede_id: s.id, nombre: s.nombre, esperadas: viernes.length, entregadas: viernes.length - faltantes.length, faltantes };
  });
  return { mes, tipos: porTipo, actas, viernes };
}

const ultimoDia = (mes) => new Date(Number(mes.slice(0, 4)), Number(mes.slice(5)), 0).getDate();

/**
 * Cumplimiento individual de cada SIAU en un mes.
 * - Las sedes de cada SIAU salen de sus asignaciones vigentes en el mes.
 * - Lo que registra una sede se reparte en partes iguales entre los SIAU que la atienden ese mes y no están ausentes todo el mes.
 * - Las encuestas son la suma de las de satisfacción (NPS) y las de evaluación médico asistencial; el desglose va en encuestas.nps / encuestas.medica.
 * - La meta mínima se ajusta por los días de vacaciones/licencia dentro del mes (meta × días presentes / días del mes).
 */
function calcularPorTecnico({ mes, hoy, tecnicos, asignaciones, ausencias, sedes, mensual, actas, metas }) {
  const D = ultimoDia(mes), inicio = `${mes}-01`, fin = `${mes}-${String(D).padStart(2, "0")}`;
  const diasAusente = (id) => {
    const set = new Set();
    for (const a of ausencias.filter((x) => x.tecnico_id === id)) {
      for (let d = 1; d <= D; d++) { const f = `${mes}-${String(d).padStart(2, "0")}`; if (f >= a.desde && f <= a.hasta) set.add(d); }
    }
    return set.size;
  };
  const activos = tecnicos.filter((t) => t.activo && t.rol === "tecnico");
  const factor = new Map(activos.map((t) => [t.id, (D - diasAusente(t.id)) / D]));
  const vigentes = asignaciones.filter((a) => a.desde <= fin && (!a.hasta || a.hasta >= inicio));
  const sedesDe = (id) => [...new Set(vigentes.filter((a) => a.tecnico_id === id).map((a) => a.sede_id))];
  const responsables = new Map(); // sede → técnicos presentes
  for (const s of sedes) responsables.set(s.id, activos.filter((t) => factor.get(t.id) > 0 && sedesDe(t.id).includes(s.id)).map((t) => t.id));
  const valor = (sedeId, ind) => mensual.filter((m) => m.sede_id === sedeId && m.periodo === mes && m.indicador === ind).reduce((s, m) => s + m.valor, 0);
  const nombreSede = new Map(sedes.map((s) => [s.id, s.nombre]));

  const filas = activos.map((t) => {
    const f = factor.get(t.id), mis = sedesDe(t.id);
    const acc = { nps: 0, medica: 0, charlas: 0, p: 0, m: 0, d: 0 };
    if (f > 0) {
      for (const sid of mis) {
        const w = 1 / (responsables.get(sid)?.length || 1);
        acc.nps += w * valor(sid, "encuestas"); acc.medica += w * valor(sid, "medica_evaluaciones");
        acc.charlas += w * (valor(sid, "charlas_usuarios") + valor(sid, "charlas_funcionarios"));
        acc.p += w * valor(sid, "nps_promotores"); acc.m += w * valor(sid, "nps_pasivos"); acc.d += w * valor(sid, "nps_detractores");
      }
    }
    const metaEnc = metas.encuestas == null ? null : Math.round(metas.encuestas * f), metaCh = metas.charlas == null ? null : Math.round(metas.charlas * f);
    const encNps = Math.round(acc.nps), encMed = Math.round(acc.medica), enc = encNps + encMed, ch = Math.round(acc.charlas), n = acc.p + acc.m + acc.d;
    // Desglose por sede: lo que aporta cada una (ya repartido entre quienes la atienden)
    const porSede = mis.map((sid) => {
      const w = 1 / (responsables.get(sid)?.length || 1), propias = actas.filter((x) => x.sede_id === sid && x.fecha.startsWith(mes) && x.fecha <= hoy);
      return { sede_id: sid, sede: nombreSede.get(sid), comparte: Math.max(0, (responsables.get(sid)?.length || 1) - 1),
        nps: Math.round(w * valor(sid, "encuestas")), medica: Math.round(w * valor(sid, "medica_evaluaciones")), charlas: Math.round(w * (valor(sid, "charlas_usuarios") + valor(sid, "charlas_funcionarios"))),
        actas_esperadas: propias.length, actas_entregadas: propias.filter((x) => x.estado === "entregado").length };
    }).sort((a, b) => (b.nps + b.medica + b.charlas) - (a.nps + a.medica + a.charlas) || a.sede.localeCompare(b.sede, "es"));
    const pend = [];
    let esperadas = 0, entregadas = 0;
    for (const sid of mis) for (const a of actas.filter((x) => x.sede_id === sid && x.fecha.startsWith(mes) && x.fecha <= hoy)) {
      esperadas++;
      if (a.estado === "entregado") entregadas++; else pend.push({ sede: nombreSede.get(sid), codigo: a.codigo, fecha: a.fecha, estado: a.estado });
    }
    const ausenciasMes = ausencias.filter((a) => a.tecnico_id === t.id && a.desde <= fin && a.hasta >= inicio);
    const pct = (v, m) => (m > 0 ? Math.min(100, Math.round((100 * v) / m)) : 100);
    const avance = Math.min(pct(enc, metaEnc), pct(ch, metaCh));
    // Puntaje para el ranking: promedio del % de encuestas y del % de charlas, cada uno topado en 100 (pasarse de la meta no suma extra)
    const partes = [[enc, metaEnc], [ch, metaCh]].filter(([, m]) => m > 0).map(([v, m]) => Math.min(100, (100 * v) / m));
    const puntaje = f === 0 || !partes.length ? null : Math.round((10 * partes.reduce((a, b) => a + b, 0)) / partes.length) / 10;
    const cumple = (metaEnc == null || enc >= metaEnc) && (metaCh == null || ch >= metaCh);
    return {
      estado: f === 0 ? "ausente" : cumple ? "cumple" : avance >= 60 ? "camino" : "atencion", avance, puntaje,
      tecnico_id: t.id, nombre: t.nombre, sedes: mis.map((id) => nombreSede.get(id)).filter(Boolean).sort(),
      dias_activos: Math.round(f * D), dias_mes: D, ausente: f === 0, ausencias: ausenciasMes,
      por_sede: porSede,
      encuestas: { valor: enc, meta: metaEnc, cumple: metaEnc == null ? null : enc >= metaEnc, nps: encNps, medica: encMed },
      charlas: { valor: ch, meta: metaCh, cumple: metaCh == null ? null : ch >= metaCh },
      nps: n ? Math.round((1000 * (acc.p - acc.d)) / n) / 10 : null,
      actas: { esperadas, entregadas, pendientes: pend },
    };
  });
  const sinCobertura = sedes.filter((s) => !(responsables.get(s.id)?.length)).map((s) => ({
    sede: s.nombre, motivo: activos.some((t) => sedesDe(t.id).includes(s.id)) ? "El SIAU asignado está ausente todo el mes" : "Sin SIAU asignado",
  }));
  return { dias: D, tecnicos: filas.sort((a, b) => a.nombre.localeCompare(b.nombre, "es")), sin_cobertura: sinCobertura };
}

return { viernesDelMes, mesValido, fechaValida, calcularCumplimiento, calcularPorTecnico };
})();

const M_consolidados = (() => {
// Lectores de los consolidados de SIAU. Reciben cuadrículas (arreglos de filas) tal como las
// entrega Google Sheets (getDisplayValues) y devuelven filas normalizadas. Sin dependencias.
const { normalizar } = M_sedes;

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const mesNum = (s) => MESES.indexOf(normalizar(s)) + 1;
const celda = (g, fila1, col0) => g?.[fila1 - 1]?.[col0] ?? "";
const texto = (v) => String(v ?? "").trim();

/** Entero desde texto de hoja ("297", "1.234", " 12 "); null si está vacío o no es número. */
function entero(v) {
  const t = texto(v).replace(/\s/g, "");
  if (!t) return null;
  const s = /^\d{1,3}([.,]\d{3})+$/.test(t) ? t.replace(/[.,]/g, "") : t;
  return /^-?\d+$/.test(s) ? Number(s) : null;
}

/** Fecha AAAA-MM-DD desde "2026-05-12", "12/05/2026" (día/mes/año, formato colombiano) o ISO con hora. */
function fecha(v) {
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
function rechazarPersonales(grid, donde = "") {
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
function parsearBuzon(hojas) {
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
function parsearCharlasMatriz(hojas, anio) {
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
function parsearEncuestas(grid, tipo) {
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
function parsearIlsc(hojas) {
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
function parsearHorario(hojas, mesParam) {
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

return { entero, fecha, rechazarPersonales, parsearBuzon, parsearCharlasMatriz, parsearEncuestas, parsearIlsc, parsearHorario };
})();

const M_analisis = (() => {
// Reglas del monitor. Puras (sin red) para poder probarlas. Nada de lo que produce incluye nombres de personas.
const REQUERIDAS = {
  charlas_matriz: "Consolidado de charlas",
  buzon: "Consolidado de buzón",
  nps: "Encuestas NPS",
  medica: "Evaluación médica",
  ilsc: "Registro del intérprete (LSC)",
};
const HORAS_MAX = 36; // el script de Drive corre a diario; más de 36 h sin novedades es una falla
const NIVEL = { alto: 0, medio: 1, info: 2 };
const lista = (xs, n = 8) => xs.slice(0, n).join(", ") + (xs.length > n ? ` y ${xs.length - n} más` : "");

function analizar(e, ahora = Date.now()) {
  const h = [];
  const agregar = (nivel, texto) => h.push({ nivel, texto });

  for (const [tipo, nombre] of Object.entries(REQUERIDAS)) {
    const f = e.fuentes.find((x) => x.tipo === tipo);
    if (!f) { agregar("alto", `${nombre}: nunca se ha sincronizado. Revise el script de Drive (propiedades del script y permisos).`); continue; }
    const horas = (ahora - Date.parse(f.creado.replace(" ", "T") + "Z")) / 36e5;
    if (horas > HORAS_MAX) agregar("alto", `${nombre}: lleva ${Math.round(horas)} h sin sincronizar (máximo ${HORAS_MAX} h).`);
    if (f.sedes_no_reconocidas.length) agregar("medio", `${nombre}: ${f.sedes_no_reconocidas.length} nombre(s) de sede sin reconocer (${lista(f.sedes_no_reconocidas)}). Indíquelos en Administrador → Personal y rotación.`);
    if (f.registros === 0) agregar("medio", `${nombre}: la última sincronización no trajo registros.`);
  }
  if (e.personal.sin_cobertura.length) agregar("medio", `${e.personal.sin_cobertura.length} sede(s) sin SIAU este mes: ${lista(e.personal.sin_cobertura)}.`);

  // Ritmo: a mitad de mes un SIAU debería llevar ~la mitad de la meta. Solo cuentas, sin nombres.
  const esperado = (100 * e.dia) / e.dias_mes, evaluados = e.progreso.filter((p) => p.encuestas_pct != null || p.charlas_pct != null);
  const atrasados = evaluados.filter((p) => Math.min(p.encuestas_pct ?? 999, p.charlas_pct ?? 999) < esperado - 25).length;
  if (e.dia >= 10 && atrasados) agregar("medio", `${atrasados} de ${evaluados.length} SIAU van por debajo del ritmo de sus metas mínimas (esperado hoy ≈ ${Math.round(esperado)} %).`);

  if (e.actas && e.actas.esperadas > e.actas.entregadas) agregar("info", `${e.actas.esperadas - e.actas.entregadas} acta(s) de buzón vencidas sin entregar en ${e.actas.sedes_pendientes} sede(s).`);
  for (const f of e.fuentes) if (f.avisos) agregar("info", `${REQUERIDAS[f.tipo] ?? f.tipo}: ${f.avisos} aviso(s) al leer el archivo (revise el resumen de la sincronización).`);
  return h.sort((a, b) => NIVEL[a.nivel] - NIVEL[b.nivel]);
}

const ICONO = { alto: "🔴", medio: "🟠", info: "🔵" };
function informeMarkdown(e, hallazgos, ahora = new Date()) {
  const filas = Object.entries(REQUERIDAS).map(([t, n]) => { const f = e.fuentes.find((x) => x.tipo === t); return `| ${n} | ${f ? f.creado + " UTC" : "—"} | ${f ? f.registros : "—"} |`; });
  return [
    `# Estado de los consolidados · ${e.mes}`, "",
    hallazgos.length ? hallazgos.map((x) => `- ${ICONO[x.nivel]} ${x.texto}`).join("\n") : "✅ Todo en orden: las fuentes están al día y no hay pendientes.", "",
    "| Fuente | Última sincronización | Registros |", "|---|---|---|", ...filas, "",
    `SIAU evaluados: ${e.personal.evaluados} (ausentes este mes: ${e.personal.ausentes}). Generado ${ahora.toISOString()}.`,
    "_Este informe no incluye nombres de personas ni datos de usuarios._",
  ].join("\n");
}

return { REQUERIDAS, HORAS_MAX, analizar, informeMarkdown };
})();

const M_rotacion = (() => {
// Rotación base de los SIAU: quién atiende qué sedes (definida por la líder de Calidad). El horario mensual aporta vacaciones y licencias;
// las sedes de estas personas salen de aquí y se ajustan en Administrador → Personal y rotación.
// [nombre, sedes (nombre del catálogo)]. La última persona atiende «las restantes» (null).
const ROTACION = [
  ["LILIANA SUAREZ", ["C. ADELITA DE CHAR", "P. LA 21"]],
  ["HORACIO AMARIS", ["C. MURILLO", "P. LAS PALMAS"]],
  ["JEIMIS LARA", ["C. NUEVO BARRANQUILLA", "P. REBOLO"]],
  ["ANYI MORALES", ["C. CIUDADELA", "P. LA VILLA"]], // cubre la licencia de maternidad de Sindi Buelvas
  ["NIRA LARA", ["C. LA MANGA", "P. VILLA SAN PABLO"]],
  ["GREYS CARDENAS", ["C. LA PLAYA", "P. LAS FLORES"]],
  ["SHIRLY MESA", ["C. SIMON BOLIVAR", "P. NUEVA VIDA"]],
  ["ANDREA DE LEON", ["C. LUZ CHINITA", "P. LAS NIEVES"]],
  ["KARLA CATAÑO", ["C. SUROCCIDENTE", "P. SAN JOSE"]],
  ["LUIS ROMERO", ["C. SALUD METROPOLITANA", "P. CARLOS MEISEL"]],
  ["LINDA DE LA CRUZ", ["C. BOSQUES DE MARIA", "P. SAN SALVADOR"]],
  ["YUIRIS MEDINA", ["C. NAZARETH", "P. GALAN"]],
  ["JULENIS ROJANO", ["P. JULIO MONTES", "P. LAS MALVINAS", "P. SIERRITA", "P. UNIVERSAL", "P. SANTO DOMINGO"]],
  ["MARCOS FONTALVO", ["P. ESMERALDA LIPAYA", "P. JUAN MINA", "P. BUENA ESPERANZA", "P. NUEVA ERA", "P. LA PRADERA"]],
  ["MICHEL VARGAS", null], // «en las restantes»
];

/** Compara nombres sin tildes ni mayúsculas; «y» e «i» se tratan igual (Jeimis/Jeimys) y basta que estén todas las palabras del nombre de la rotación. */
const palabras = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/y/g, "i").split(/[^a-z0-9]+/).filter(Boolean);
const mismaPersona = (nombreRotacion, nombreHorario) => { const h = new Set(palabras(nombreHorario)), r = palabras(nombreRotacion); return r.length >= 2 && r.every((w) => h.has(w)); };

/** Sedes de cada persona de la rotación; a la última («las restantes») le tocan las que nadie más tiene. */
function sedesPorPersona(catalogo) {
  const nombres = catalogo.map((c) => c[0]), usadas = new Set(ROTACION.flatMap((r) => r[1] ?? []));
  return ROTACION.map(([nombre, sedes]) => [nombre, sedes ?? nombres.filter((n) => !usadas.has(n))]);
}

return { ROTACION, mismaPersona, sedesPorPersona };
})();

const M_analitica = (() => {
// Motor de consulta y datos del panel. Puro: recibe las tablas ya leídas y devuelve datos listos para graficar.
const { mesValido } = M_lib;

const bad = (m) => Object.assign(new Error(m), { estado: 400 });
const ENC = ["encuestas", "medica_evaluaciones"], CHA = ["charlas_usuarios", "charlas_funcionarios"];
const puntaje = (p, m, d) => { const n = p + m + d; return n ? Math.round((1000 * (p - d)) / n) / 10 : null; };

/** Medidas disponibles. `ind`: indicadores de la tabla mensual que se suman; `tec`: cómo sale de la fila de un SIAU (si se puede desglosar por SIAU). */
const MEDIDAS = {
  encuestas_total: { etq: "Encuestas (NPS + médica)", ind: ENC, tec: (t) => t.encuestas.valor },
  encuestas_nps: { etq: "Encuestas de satisfacción (NPS)", ind: ["encuestas"], tec: (t) => t.encuestas.nps },
  encuestas_medica: { etq: "Evaluación médico asistencial", ind: ["medica_evaluaciones"], tec: (t) => t.encuestas.medica },
  charlas: { etq: "Charlas (asistentes)", ind: CHA, tec: (t) => t.charlas.valor },
  charlas_usuarios: { etq: "Charlas a usuarios", ind: ["charlas_usuarios"] },
  charlas_funcionarios: { etq: "Charlas a funcionarios", ind: ["charlas_funcionarios"] },
  nps_puntaje: { etq: "Puntaje NPS (promotores − detractores, %)", nps: "nps", tec: (t) => t.nps, promedio: true },
  medica_puntaje: { etq: "Puntaje de la evaluación médica (%)", nps: "medica", promedio: true },
  lsc_atenciones: { etq: "Atenciones con intérprete (LSC)", ind: ["lsc_atenciones"] },
  lsc_actividades: { etq: "Actividades LSC", ind: ["lsc_actividades"] },
  actas_entregadas: { etq: "Actas de buzón entregadas", actas: true, tec: (t) => t.actas.entregadas },
  actas_pendientes: { etq: "Actas de buzón pendientes", actas: false, tec: (t) => t.actas.pendientes.length },
  evidencias: { etq: "Evidencias registradas", evid: true },
};
const DIMENSIONES = { mes: "Mes", sede: "Sede", siau: "SIAU", tipo: "Tipo de evidencia" };

const mesesEntre = (desde, hasta) => {
  const r = []; let [a, m] = desde.split("-").map(Number); const [a2, m2] = hasta.split("-").map(Number);
  while ((a < a2 || (a === a2 && m <= m2)) && r.length < 60) { r.push(`${a}-${String(m).padStart(2, "0")}`); if (++m > 12) { m = 1; a++; } }
  return r;
};
const restarMeses = (mes, n) => { let a = Number(mes.slice(0, 4)), m = Number(mes.slice(5)) - n; while (m < 1) { m += 12; a--; } return `${a}-${String(m).padStart(2, "0")}`; };

/**
 * q: { medida, por, desde, hasta, sede, siau }. tablas: { mensual, actas, evidencias, sedes, tipos }. siauDe(mes) → filas de cumplimiento individual.
 * Devuelve { medida, por, meses, filas: [{ clave, etiqueta, valor }], total }.
 */
function consultar(q, { mensual, actas, evidencias, sedes, tipos }, siauDe, hoy) {
  const med = MEDIDAS[q.medida];
  if (!med) throw bad("Medida no válida");
  const por = q.por || "mes";
  if (!DIMENSIONES[por]) throw bad("Agrupación no válida");
  const hasta = q.hasta || hoy.slice(0, 7), desde = q.desde || restarMeses(hasta, 5);
  if (!mesValido(desde) || !mesValido(hasta) || desde > hasta) throw bad("Periodo inválido");
  const meses = mesesEntre(desde, hasta);
  if (meses.length > 24) throw bad("Elija un periodo de máximo 24 meses");
  const nSede = new Map(sedes.map((s) => [s.id, s.nombre])), sedeFiltro = q.sede ? Number(q.sede) : null;
  const filas = new Map(); // clave → { etiqueta, valor, p, m, d, n, orden }
  const acc = (clave, etiqueta, orden = etiqueta) => { if (!filas.has(clave)) filas.set(clave, { clave, etiqueta, valor: 0, p: 0, m: 0, d: 0, n: 0, orden }); return filas.get(clave); };

  if (por === "tipo" && !med.evid) throw bad("«Tipo de evidencia» solo sirve con la medida «Evidencias registradas»");
  if (por === "siau" || q.siau) {
    if (!med.tec) throw bad("Esta medida no se puede desglosar por SIAU");
    if (por === "sede" || por === "tipo") throw bad("Con un SIAU elegido, agrupe por mes");
    for (const mes of meses) {
      for (const t of siauDe(mes)) {
        if (q.siau && String(t.tecnico_id) !== String(q.siau)) continue;
        const v = med.tec(t);
        const a = por === "siau" ? acc(String(t.tecnico_id), t.nombre) : acc(mes, mes);
        if (v == null) continue;
        a.valor += v; a.n++;
      }
    }
    if (med.promedio) for (const a of filas.values()) a.valor = a.n ? Math.round((10 * a.valor) / a.n) / 10 : null;
  } else if (med.evid) {
    for (const e of evidencias) {
      const mes = String(e.fecha).slice(0, 7);
      if (!meses.includes(mes) || (sedeFiltro && e.sede_id !== sedeFiltro)) continue;
      const a = por === "mes" ? acc(mes, mes) : por === "sede" ? acc(String(e.sede_id ?? 0), nSede.get(e.sede_id) ?? "(sin sede)") : acc(e.tipo, tipos.find((t) => t.clave === e.tipo)?.nombre ?? e.tipo);
      a.valor += Number(e.cantidad) || 1;
    }
  } else if (med.actas !== undefined) {
    for (const x of actas) {
      const mes = String(x.fecha).slice(0, 7);
      if (!meses.includes(mes) || (sedeFiltro && x.sede_id !== sedeFiltro) || x.fecha > hoy) continue;
      if ((x.estado === "entregado") !== med.actas) continue;
      const a = por === "mes" ? acc(mes, mes) : acc(String(x.sede_id ?? x.sede_texto), nSede.get(x.sede_id) ?? x.sede_texto);
      a.valor++;
    }
  } else {
    const ind = med.nps ? [`${med.nps === "nps" ? "nps" : "medica"}_promotores`, `${med.nps === "nps" ? "nps" : "medica"}_pasivos`, `${med.nps === "nps" ? "nps" : "medica"}_detractores`] : med.ind;
    for (const r of mensual) {
      if (!meses.includes(r.periodo) || !ind.includes(r.indicador) || (sedeFiltro && r.sede_id !== sedeFiltro)) continue;
      const a = por === "mes" ? acc(r.periodo, r.periodo) : acc(String(r.sede_id ?? r.sede_texto), nSede.get(r.sede_id) ?? r.sede_texto);
      if (med.nps) a[r.indicador.endsWith("promotores") ? "p" : r.indicador.endsWith("pasivos") ? "m" : "d"] += r.valor; else a.valor += r.valor;
    }
    if (med.nps) for (const a of filas.values()) a.valor = puntaje(a.p, a.m, a.d);
  }
  if (por === "mes") for (const mes of meses) acc(mes, mes); // los meses sin datos aparecen en cero
  const lista = [...filas.values()].map(({ clave, etiqueta, valor }) => ({ clave, etiqueta, valor }));
  lista.sort(por === "mes" ? (a, b) => a.clave.localeCompare(b.clave) : (a, b) => (b.valor ?? -1) - (a.valor ?? -1) || a.etiqueta.localeCompare(b.etiqueta, "es"));
  const valores = lista.map((f) => f.valor).filter((v) => v != null);
  return { medida: { clave: q.medida, etiqueta: med.etq }, por, meses, filas: lista, total: med.promedio ? (valores.length ? Math.round((10 * valores.reduce((a, b) => a + b, 0)) / valores.length) / 10 : null) : valores.reduce((a, b) => a + b, 0) };
}

/** Ranking de cumplimiento: por puntaje (promedio de % de encuestas y charlas), luego actas entregadas y luego volumen. Solo quien ya suma avance. */
function ranking(filas) {
  const pctActas = (t) => (t.actas.esperadas ? t.actas.entregadas / t.actas.esperadas : 0);
  return filas.filter((t) => !t.ausente && t.puntaje > 0)
    .sort((a, b) => b.puntaje - a.puntaje || pctActas(b) - pctActas(a) || (b.encuestas.valor + b.charlas.valor) - (a.encuestas.valor + a.charlas.valor) || a.nombre.localeCompare(b.nombre, "es"))
    .map((t, i) => ({ puesto: i + 1, id: t.tecnico_id, nombre: t.nombre, puntaje: t.puntaje, estado: t.estado, encuestas: t.encuestas.valor, meta_encuestas: t.encuestas.meta, charlas: t.charlas.valor, meta_charlas: t.charlas.meta, actas: t.actas.esperadas ? `${t.actas.entregadas}/${t.actas.esperadas}` : null }));
}

/** Datos del panel de inicio: indicadores, series de 12 meses, distribución de calificaciones, ranking de sedes y estado de cada SIAU. */
function panel(mes, c, { mensual, evidencias, sedes, tipos }) {
  const filas = c.siau.tecnicos, evaluados = filas.filter((t) => !t.ausente);
  const suma = (m, ind, sedeId) => mensual.filter((r) => r.periodo === m && ind.includes(r.indicador) && (sedeId == null || r.sede_id === sedeId)).reduce((t, r) => t + r.valor, 0);
  const meses = mesesEntre(restarMeses(mes, 11), mes);
  const dist = (pre) => ({ promotores: suma(mes, [`${pre}_promotores`]), pasivos: suma(mes, [`${pre}_pasivos`]), detractores: suma(mes, [`${pre}_detractores`]) });
  const nps = dist("nps"), med = dist("medica");
  const evMes = evidencias.filter((e) => String(e.fecha).startsWith(mes));
  const lista = (v) => { try { return v ? JSON.parse(v) : []; } catch { return []; } };
  const estados = { cumple: 0, camino: 0, atencion: 0, ausente: 0 };
  for (const t of filas) estados[t.estado]++;
  const sum = (f) => evaluados.reduce((t, x) => t + f(x), 0), metaSum = (f) => evaluados.reduce((t, x) => t + (f(x) ?? 0), 0);
  return {
    mes, hoy: c.hoy,
    resumen: {
      siau: filas.length, evaluados: evaluados.length, estados,
      encuestas: { valor: sum((t) => t.encuestas.valor), meta: metaSum((t) => t.encuestas.meta) || null, nps: sum((t) => t.encuestas.nps), medica: sum((t) => t.encuestas.medica) },
      charlas: { valor: sum((t) => t.charlas.valor), meta: metaSum((t) => t.charlas.meta) || null },
      actas: c.actas_consolidado ? { esperadas: c.actas_consolidado.esperadas, entregadas: c.actas_consolidado.entregadas } : null,
      nps: puntaje(nps.promotores, nps.pasivos, nps.detractores), medica: puntaje(med.promotores, med.pasivos, med.detractores),
      lsc: c.lsc ? { atenciones: c.lsc.atenciones, actividades: c.lsc.actividades } : null,
      evidencias: { fotos: evMes.filter((e) => lista(e.fotos).length).length, documentos: evMes.filter((e) => lista(e.documentos).length).length, total: evMes.length },
      sin_cobertura: c.siau.sin_cobertura.length,
    },
    serie: meses.map((m) => ({ mes: m, nps: suma(m, ["encuestas"]), medica: suma(m, ["medica_evaluaciones"]), charlas: suma(m, CHA), lsc: suma(m, ["lsc_atenciones"]) })),
    distribucion: { nps, medica: med },
    sedes: sedes.map((s) => ({ sede: s.nombre, encuestas: suma(mes, ENC, s.id), charlas: suma(mes, CHA, s.id) })).filter((s) => s.encuestas || s.charlas).sort((a, b) => b.charlas + b.encuestas - a.charlas - a.encuestas),
    top: ranking(filas).slice(0, 5),
    siau: filas.map((t) => ({ id: t.tecnico_id, nombre: t.nombre, estado: t.estado, avance: t.avance, puntaje: t.puntaje, encuestas: t.encuestas.valor, meta_encuestas: t.encuestas.meta, charlas: t.charlas.valor, meta_charlas: t.charlas.meta, actas: t.actas.esperadas ? Math.round((100 * t.actas.entregadas) / t.actas.esperadas) : null })),
    evidencias_tipo: tipos.map((t) => ({ tipo: t.nombre, area: t.area, n: evMes.filter((e) => e.tipo === t.clave).length })).filter((x) => x.n),
  };
}

return { MEDIDAS, DIMENSIONES, mesesEntre, consultar, ranking, panel };
})();

const M_api = (() => {
// Núcleo de la plataforma: todas las reglas y rutas, sin depender de dónde corre (Apps Script o Node).
// Recibe un «almacén» (tablas), un servicio de fotos y relojes; ver almacen.mjs (memoria) y google/Capa.gs (Hojas de Google).
const { CATALOGO, aliasDe, crearResolver, normalizar } = M_sedes;
const { parsearBuzon, parsearCharlasMatriz, parsearEncuestas, parsearHorario, parsearIlsc } = M_consolidados;
const { calcularCumplimiento, calcularPorTecnico, fechaValida, mesValido } = M_lib;
const { analizar } = M_analisis;
const { mismaPersona, sedesPorPersona } = M_rotacion;
const { consultar, panel: armarPanel, ranking, mesesEntre, MEDIDAS, DIMENSIONES } = M_analitica;

const VERSION_DATOS = 3;
class ErrorHttp extends Error { constructor(estado, mensaje) { super(mensaje); this.estado = estado; } }
const bad = (m) => new ErrorHttp(400, m);

const TIPOS_INICIALES = [
  ["charla", "siau", "Charlas (consolidado de charlas)", 200, "tecnico"],
  ["acta_buzon", "siau", "Acta de apertura de buzón", null, "global"],
  ["acompanamiento", "siau", "Acompañamiento a usuarios", null, "global"],
  ["encuesta_sg", "siau", "Encuestas de satisfacción (NPS)", 90, "tecnico"],
  ["encuesta_ma", "siau", "Encuesta médico asistencial", null, "global"],
  ["actualizacion_datos", "siau", "Actualización de datos", null, "global"],
  ["ludoteca", "siau", "Actividad de ludoteca", null, "global"],
  ["iami", "siau", "Encuesta IAMI", null, "global"],
  ["control_prenatal", "siau", "Encuesta control prenatal", null, "global"],
  ["cartelera", "asociacion", "Cartelera informativa", null, "global"],
  ["valla", "asociacion", "Valla informativa", null, "global"],
  ["actividad", "asociacion", "Actividad del subcronograma", null, "global"],
];
const ROLES_PERSONAL = ["tecnico", "interprete", "administrativo"];
const TIPOS_AUSENCIA = ["vacaciones", "licencia", "incapacidad", "otro"];

const txt = (v, max, req = false) => {
  const s = String(v ?? "").trim();
  if (req && !s) throw bad("Falta un campo obligatorio");
  if (s.length > max) throw bad("Texto demasiado largo");
  return s;
};
const enteroEn = (v, min, max, def) => {
  if (v == null || v === "") return def;
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max) throw bad("Número inválido");
  return n;
};
const ultimoDiaMes = (mes) => new Date(Number(mes.slice(0, 4)), Number(mes.slice(5)), 0).getDate();
const enOrden = (a, b) => String(a).localeCompare(String(b), "es");
const lista = (v) => { try { return v ? JSON.parse(v) : []; } catch { return []; } };
const idsDe = (e) => [...lista(e.fotos), ...lista(e.documentos).map((d) => d.id)];
const porId = (filas) => new Map(filas.map((f) => [f.id, f]));

/** Crea las tablas base (40 sedes con alias, tipos de evidencia). Idempotente; fusiona alias agregados a mano. */
function inicializar(almacen, { rotacion = true } = {}) {
  return almacen.atomico(() => {
    const ajustes = almacen.tabla("ajustes");
    if (ajustes.todos().find((a) => a.id === "version_datos")?.valor === String(VERSION_DATOS)) return false;
    const sedes = almacen.tabla("sedes"), actuales = sedes.todos();
    for (const [nombre, tipo, codigo, largo] of CATALOGO) {
      const f = actuales.find((s) => s.nombre === nombre), nuevos = aliasDe(nombre, largo);
      if (!f) sedes.insertar({ nombre, codigo, tipo, alias: JSON.stringify(nuevos), activa: 1 });
      else sedes.actualizar(f.id, { codigo, tipo, alias: JSON.stringify([...new Set([...lista(f.alias), ...nuevos])]) });
    }
    const tipos = almacen.tabla("tipos"), existentes = new Set(tipos.todos().map((t) => t.id));
    for (const [clave, area, nombre, meta, alcance] of TIPOS_INICIALES) if (!existentes.has(clave)) tipos.insertar({ id: clave, clave, area, nombre, meta, alcance });
    if (rotacion) sembrarRotacion(almacen);
    const v = ajustes.todos().find((a) => a.id === "version_datos");
    if (v) ajustes.actualizar("version_datos", { valor: String(VERSION_DATOS) }); else ajustes.insertar({ id: "version_datos", valor: String(VERSION_DATOS) });
    return true;
  });
}

/** Crea (o reutiliza, aunque el horario escriba el nombre completo) a cada SIAU de la rotación base y le asigna sus sedes. Repetible. */
function sembrarRotacion(almacen) {
  const tecnicos = almacen.tabla("tecnicos"), asign = almacen.tabla("asignaciones"), sedes = almacen.tabla("sedes").todos();
  for (const [nombre, nombresSedes] of sedesPorPersona(CATALOGO)) {
    let t = tecnicos.todos().find((x) => mismaPersona(nombre, x.nombre));
    const id = t ? t.id : tecnicos.insertar({ nombre, sede_id: null, activo: 1, rol: "tecnico", clave: normalizar(nombre) });
    if (t) tecnicos.actualizar(id, { rol: "tecnico", activo: 1 });
    asign.reemplazar((a) => a.tecnico_id === id && a.origen === "base", []);
    for (const n of nombresSedes) { const s = sedes.find((x) => x.nombre === n); if (s) asign.insertar({ tecnico_id: id, sede_id: s.id, desde: "2026-01-01", hasta: null, origen: "base" }); }
  }
}

/**
 * seguridad (opcional; sin ella no hay acceso con usuario y contraseña):
 *   hash(clave, sal) → texto (derivación lenta) · resumen(texto) → texto (rápido) · azar(bytes) → hex · kv: { get(k), put(k, v, segundos), del(k) } (sesiones e intentos)
 */
function crearNucleo({ almacen, fotos, hoy = () => new Date().toLocaleDateString("sv"), ahora = () => new Date().toISOString().replace("T", " ").slice(0, 19), seguridad = null }) {
  const T = (n) => almacen.tabla(n);
  const ajuste = (k, d = "") => T("ajustes").todos().find((a) => a.id === k)?.valor ?? d;
  const setAjuste = (k, v) => { const t = T("ajustes"); if (t.todos().some((a) => a.id === k)) t.actualizar(k, { valor: String(v) }); else t.insertar({ id: k, valor: String(v) }); };
  const resolverSedes = () => crearResolver(T("sedes").todos());

  // ───────── Lectura
  function config() {
    return {
      marca: { nombre_siau: ajuste("nombre_siau", "SIAU"), nombre_asociacion: ajuste("nombre_asociacion", "Asociación de Usuarios") },
      tipos: T("tipos").todos(),
      sedes: T("sedes").todos().sort((a, b) => enOrden(a.nombre, b.nombre)).map(({ alias, ...s }) => ({ ...s, activa: Number(s.activa) })),
      tecnicos: T("tecnicos").todos().sort((a, b) => enOrden(a.nombre, b.nombre)).map((t) => ({ ...t, activo: Number(t.activo) })),
    };
  }

  function listarEvidencias(q) {
    if (q.mes && !mesValido(q.mes)) throw bad("Mes inválido");
    const limit = enteroEn(q.limit, 1, 100, 24), offset = enteroEn(q.offset, 0, 1e6, 0);
    const sedes = porId(T("sedes").todos()), tecnicos = porId(T("tecnicos").todos()), tipos = porId(T("tipos").todos());
    const filas = T("evidencias").todos().filter((e) => (!q.area || e.area === q.area) && (!q.tipo || e.tipo === q.tipo) && (!q.sede || String(e.sede_id) === String(q.sede))
      && (!q.tecnico || String(e.tecnico_id) === String(q.tecnico)) && (!q.mes || e.fecha.startsWith(q.mes))
      && (!q.buscar || `${e.titulo} ${e.descripcion ?? ""} ${lista(e.documentos).map((d) => d.nombre).join(" ")}`.toLowerCase().includes(String(q.buscar).toLowerCase()))
      && (q.album !== "fotos" || lista(e.fotos).length > 0) && (q.album !== "documentos" || lista(e.documentos).length > 0))
      .sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : b.id - a.id));
    return {
      total: filas.length,
      items: filas.slice(offset, offset + limit).map((e) => {
        const ids = lista(e.fotos);
        return { ...e, descripcion: e.descripcion ?? "", sede: sedes.get(e.sede_id)?.nombre ?? null, tecnico: tecnicos.get(e.tecnico_id)?.nombre ?? null,
          tipo_nombre: tipos.get(e.tipo)?.nombre ?? e.tipo, fotos: undefined, fotos_ids: ids, documentos: lista(e.documentos), portada: e.portada ?? null };
      }),
    };
  }

  function cumplimiento(mes, dia = hoy()) {
    if (!mesValido(mes)) throw bad("Mes inválido");
    if (!fechaValida(dia)) throw bad("Fecha inválida");
    const tipos = T("tipos").todos();
    const evs = T("evidencias").todos().filter((e) => e.fecha.startsWith(mes));
    const todos = T("tecnicos").todos().map((t) => ({ ...t, activo: Number(t.activo) })).sort((a, b) => enOrden(a.nombre, b.nombre));
    const tecnicos = todos.filter((t) => t.activo && t.rol === "tecnico").map(({ id, nombre }) => ({ id, nombre }));
    const sedes = T("sedes").todos().filter((s) => Number(s.activa)).sort((a, b) => enOrden(a.nombre, b.nombre)).map(({ id, nombre }) => ({ id, nombre }));
    const r = calcularCumplimiento({ mes, tipos, evs, tecnicos, sedes });

    const mensual = T("mensual").todos().filter((m) => m.periodo === mes);
    const actas = T("actas").todos().filter((a) => a.fecha.startsWith(mes));
    const meta = (c) => tipos.find((t) => t.clave === c)?.meta ?? null;
    r.hoy = dia;
    r.siau = calcularPorTecnico({
      mes, hoy: dia, tecnicos: todos, sedes, metas: { encuestas: meta("encuesta_sg"), charlas: meta("charla") },
      asignaciones: T("asignaciones").todos(), ausencias: T("ausencias").todos(),
      mensual: mensual.filter((m) => m.sede_id), actas: actas.filter((a) => a.sede_id),
    });
    const suma = (ind) => mensual.filter((m) => ind.includes(m.indicador)).reduce((t, m) => t + m.valor, 0);
    const hay = (ind) => mensual.some((m) => ind.includes(m.indicador));
    r.consolidado = { charla: hay(["charlas_usuarios", "charlas_funcionarios"]) ? suma(["charlas_usuarios", "charlas_funcionarios"]) : null, encuesta_sg: hay(["encuestas"]) ? suma(["encuestas"]) : null, encuesta_ma: hay(["medica_evaluaciones"]) ? suma(["medica_evaluaciones"]) : null };

    const nombre = new Map(sedes.map((x) => [x.id, x.nombre]));
    const vencidas = actas.filter((a) => a.fecha <= dia);
    r.actas_consolidado = actas.length ? {
      codigos: [...new Set(vencidas.map((a) => a.codigo))].sort(),
      entregadas: vencidas.filter((a) => a.estado === "entregado").length, esperadas: vencidas.length,
      sedes_pendientes: [...new Set(vencidas.filter((a) => a.estado !== "entregado").map((a) => a.sede_id ?? a.sede_texto))]
        .map((k) => ({ sede: nombre.get(k) ?? String(k), pendientes: vencidas.filter((a) => (a.sede_id ?? a.sede_texto) === k && a.estado !== "entregado").map((a) => ({ codigo: a.codigo, fecha: a.fecha, estado: a.estado })) }))
        .sort((x, y) => enOrden(x.sede, y.sede)),
      // Cada acta del calendario (código + fecha): cuántas sedes la entregaron
      por_codigo: [...new Set(vencidas.map((a) => `${a.fecha}|${a.codigo}`))].sort().map((k) => { const [fecha, codigo] = k.split("|"), l = vencidas.filter((a) => a.fecha === fecha && a.codigo === codigo); return { codigo, fecha, esperadas: l.length, entregadas: l.filter((a) => a.estado === "entregado").length }; }),
      // Sedes que no deben nada de lo vencido
      al_dia: [...new Set(vencidas.map((a) => a.sede_id ?? a.sede_texto))].filter((k) => !vencidas.some((a) => (a.sede_id ?? a.sede_texto) === k && a.estado !== "entregado")).map((k) => nombre.get(k) ?? String(k)).sort(enOrden),
    } : null;

    const lsc = mensual.filter((m) => m.indicador.startsWith("lsc_")), porSede = new Map();
    for (const m of lsc.filter((x) => x.indicador === "lsc_atenciones")) { const k = nombre.get(m.sede_id) ?? m.sede_texto; porSede.set(k, (porSede.get(k) ?? 0) + m.valor); }
    r.lsc = lsc.length ? {
      atenciones: lsc.filter((m) => m.indicador === "lsc_atenciones").reduce((t, m) => t + m.valor, 0),
      actividades: lsc.filter((m) => m.indicador === "lsc_actividades").reduce((t, m) => t + m.valor, 0),
      asistentes: lsc.filter((m) => m.indicador === "lsc_actividades_asistentes").reduce((t, m) => t + m.valor, 0),
      sedes: porSede.size, por_sede: [...porSede].map(([sede, n]) => ({ sede, atenciones: n })).sort((x, y) => y.atenciones - x.atenciones).slice(0, 8),
    } : null;
    r.sin_reconocer = new Set([...mensual, ...actas].filter((x) => !x.sede_id).map((x) => x.sede_texto)).size;
    r.sincronizado = T("sincronizaciones").todos().sort((a, b) => b.id - a.id)[0]?.creado ?? null;
    return r;
  }

  /** Qué tan al día están las fuentes. Sin nombres de personas. */
  function estado(dia = hoy()) {
    if (!fechaValida(dia)) throw bad("Fecha inválida");
    const mes = dia.slice(0, 7), c = cumplimiento(mes, dia), filas = c.siau.tecnicos, evaluados = filas.filter((t) => !t.ausente);
    const pct = (x) => (x.meta ? Math.round((100 * x.valor) / x.meta) : null);
    const ultimas = new Map();
    for (const s of T("sincronizaciones").todos().sort((a, b) => a.id - b.id)) ultimas.set(s.fuente, s);
    const fuentes = [...ultimas.values()].map((f) => {
      const r = JSON.parse(f.resumen);
      return { tipo: f.fuente, archivo: f.archivo, creado: f.creado, registros: r.registros ?? r.personal ?? 0, avisos: (r.avisos ?? []).length, sedes_no_reconocidas: r.sedes_no_reconocidas ?? [], mes: r.mes ?? null };
    });
    const e = {
      hoy: dia, mes, dia: Number(dia.slice(8)), dias_mes: ultimoDiaMes(mes), fuentes,
      personal: { evaluados: evaluados.length, ausentes: filas.length - evaluados.length, sin_cobertura: c.siau.sin_cobertura.map((x) => x.sede) },
      progreso: evaluados.map((t) => ({ encuestas_pct: pct(t.encuestas), charlas_pct: pct(t.charlas) })),
      actas: c.actas_consolidado ? { esperadas: c.actas_consolidado.esperadas, entregadas: c.actas_consolidado.entregadas, sedes_pendientes: c.actas_consolidado.sedes_pendientes.length } : null,
      sin_reconocer: c.sin_reconocer,
    };
    return { ...e, hallazgos: analizar(e, Date.parse(ahora().replace(" ", "T") + "Z")) };
  }

  function panelDe(mes) {
    if (!mesValido(mes)) throw bad("Mes inválido");
    return armarPanel(mes, cumplimiento(mes), { mensual: T("mensual").todos(), evidencias: T("evidencias").todos(), sedes: T("sedes").todos().filter((s) => Number(s.activa)), tipos: T("tipos").todos() });
  }

  /** Ficha completa de un SIAU: su fila del mes, puesto frente al equipo, aporte por sede, últimos 6 meses y evidencias registradas. */
  function detalleSiau(id, mes) {
    if (!mesValido(mes)) throw bad("Mes inválido");
    const idn = enteroEn(id, 1, 1e9);
    const c = cumplimiento(mes), filas = c.siau.tecnicos, t = filas.find((x) => x.tecnico_id === idn);
    if (!t) throw new ErrorHttp(404, "Ese SIAU no se evalúa este mes");
    const evaluados = filas.filter((x) => !x.ausente), rk = ranking(filas), pos = rk.findIndex((x) => x.id === idn);
    const prom = (f) => (evaluados.length ? Math.round((10 * evaluados.reduce((a, x) => a + f(x), 0)) / evaluados.length) / 10 : null);
    const [a, m] = mes.split("-").map(Number), desde = new Date(a, m - 6, 1), ini = `${desde.getFullYear()}-${String(desde.getMonth() + 1).padStart(2, "0")}`;
    const serie = mesesEntre(ini, mes).map((mm) => { const f = cumplimiento(mm).siau.tecnicos.find((x) => x.tecnico_id === idn); return { mes: mm, nps: f?.encuestas.nps ?? 0, medica: f?.encuestas.medica ?? 0, charlas: f?.charlas.valor ?? 0, puntaje: f?.puntaje ?? null, ausente: f?.ausente ?? false }; });
    const tipos = porId(T("tipos").todos()), evs = T("evidencias").todos().filter((e) => e.tecnico_id === idn && e.fecha.startsWith(mes)).sort((x, y) => (x.fecha < y.fecha ? 1 : -1));
    return { mes, hoy: c.hoy, dias_mes: c.siau.dias, fila: t,
      puesto: pos >= 0 ? { n: pos + 1, de: evaluados.length, puntaje: rk[pos].puntaje } : { n: null, de: evaluados.length, puntaje: t.puntaje },
      equipo: { puntaje: prom((x) => x.puntaje ?? 0), encuestas: prom((x) => x.encuestas.valor), charlas: prom((x) => x.charlas.valor) },
      serie, evidencias: { total: evs.length, por_tipo: [...new Set(evs.map((e) => e.tipo))].map((k) => ({ tipo: tipos.get(k)?.nombre ?? k, n: evs.filter((e) => e.tipo === k).length })),
        ultimas: evs.slice(0, 5).map((e) => ({ id: e.id, titulo: e.titulo, fecha: e.fecha, tipo: tipos.get(e.tipo)?.nombre ?? e.tipo, portada: e.portada ?? null, fotos: lista(e.fotos).length, documentos: lista(e.documentos).length })) } };
  }

  /** Motor de consulta: una medida, agrupada por mes, sede, SIAU o tipo, con filtros de periodo, sede y SIAU. */
  function consulta(q) {
    try {
      return { ...consultar(q, { mensual: T("mensual").todos(), actas: T("actas").todos(), evidencias: T("evidencias").todos(), sedes: T("sedes").todos(), tipos: T("tipos").todos() }, (mes) => cumplimiento(mes).siau.tecnicos, hoy()),
        medidas: Object.entries(MEDIDAS).map(([clave, m]) => ({ clave, etiqueta: m.etq, por_siau: Boolean(m.tec) })), dimensiones: DIMENSIONES };
    } catch (e) { if (e.estado === 400 && !(e instanceof ErrorHttp)) throw bad(e.message); throw e; }
  }

  // ───────── Escritura
  function validarEvidencia(b) {
    const tipo = T("tipos").todos().find((t) => t.clave === b.tipo);
    if (!tipo) throw bad("Tipo inválido");
    if (!fechaValida(b.fecha)) throw bad("Fecha inválida");
    const sede = b.sede_id ? enteroEn(b.sede_id, 1, 1e9) : null, tec = b.tecnico_id ? enteroEn(b.tecnico_id, 1, 1e9) : null;
    if (sede && !T("sedes").todos().some((s) => s.id === sede)) throw bad("Sede inexistente");
    if (tec && !T("tecnicos").todos().some((t) => t.id === tec)) throw bad("Técnico inexistente");
    const ids = Array.isArray(b.fotos) ? b.fotos : [];
    if (ids.length > 30) throw bad("Máximo 30 fotos por evidencia");
    for (const f of ids) if (typeof f !== "string" || !fotos.existe(f)) throw bad("Foto no encontrada: súbela de nuevo");
    // La portada es una miniatura (JPEG o WebP diminuto) guardada en el propio registro: se ve al instante y no depende de que el navegador pueda abrir Drive.
    const docs = Array.isArray(b.documentos) ? b.documentos : [];
    if (docs.length > 20) throw bad("Máximo 20 documentos por evidencia");
    const documentos = docs.map((d) => { if (!d || typeof d.id !== "string" || !fotos.existe(d.id)) throw bad("Documento no encontrado: súbelo de nuevo"); return { id: d.id, nombre: txt(d.nombre, 150) || "Documento.pdf" }; });
    const portada = ids.length && typeof b.portada === "string" && /^data:image\/(jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(b.portada) && b.portada.length <= 40000 ? b.portada : null;
    return { area: tipo.area, tipo: tipo.clave, titulo: txt(b.titulo, 200, true), descripcion: txt(b.descripcion, 5000), fecha: b.fecha, sede_id: sede, tecnico_id: tec,
      cantidad: enteroEn(b.cantidad, 1, 100000, 1), asistentes: enteroEn(b.asistentes, 0, 100000, null), fotos: JSON.stringify(ids), documentos: JSON.stringify(documentos), portada };
  }

  /** Reemplaza lo que ya se había leído de ese consolidado (correcciones y filas borradas se reflejan; nada se duplica). */
  function sincronizar(b) {
    const tipo = b.tipo, archivo = txt(b.archivo, 300), hojas = b.hojas ?? {};
    if (!["charlas_matriz", "buzon", "nps", "medica", "ilsc", "horario"].includes(tipo)) throw bad("Tipo de consolidado no válido");
    return almacen.atomico(() => {
      const resolver = resolverSedes(), noReconocidas = new Set(), resumen = { tipo, archivo };
      const sedeId = (t) => { const x = resolver(t); if (!x) noReconocidas.add(t || "(vacía)"); return x?.id ?? null; };
      const guardarMensual = (filas) => { T("mensual").reemplazar((m) => m.fuente === tipo, filas.map((f) => ({ fuente: tipo, sede_id: sedeId(f.sede_texto), sede_texto: f.sede_texto, periodo: f.periodo, indicador: f.indicador, valor: f.valor }))); resumen.registros = filas.length; };
      try {
        if (tipo === "charlas_matriz") {
          const anio = Number(b.anio) || Number(/20\d\d/.exec(archivo)?.[0]) || Number(hoy().slice(0, 4));
          const r = parsearCharlasMatriz(hojas, anio); guardarMensual(r.filas); Object.assign(resumen, { anio, avisos: r.avisos });
        } else if (tipo === "nps" || tipo === "medica") {
          const r = parsearEncuestas(hojas["Respuestas de formulario 1"] ?? Object.values(hojas)[0] ?? [], tipo); guardarMensual(r.filas); resumen.avisos = r.avisos;
        } else if (tipo === "ilsc") {
          const r = parsearIlsc(hojas); guardarMensual(r.filas); resumen.avisos = r.avisos;
        } else if (tipo === "buzon") {
          const r = parsearBuzon(hojas);
          T("actas").reemplazar((a) => a.fuente === tipo, r.actas.map((a) => ({ fuente: tipo, sede_id: sedeId(a.sede_texto), sede_texto: a.sede_texto, codigo: a.codigo, fecha: a.fecha, estado: a.estado })));
          Object.assign(resumen, { registros: r.actas.length, avisos: r.avisos });
        } else Object.assign(resumen, aplicarHorario(parsearHorario(hojas, b.mes), sedeId));
      } catch (e) { if (e.privacidad) throw bad(e.message); throw e; }
      resumen.sedes_no_reconocidas = [...noReconocidas];
      T("sincronizaciones").insertar({ fuente: tipo, archivo, creado: ahora(), resumen: JSON.stringify(resumen) });
      return resumen;
    });
  }

  /** El horario manda sobre las asignaciones y ausencias «de horario» de ese mes; lo cargado a mano no se toca. */
  function aplicarHorario(r, sedeId) {
    if (!r.mes) return { mes: null, personal: 0, avisos: r.avisos };
    const desde = `${r.mes}-01`, hasta = `${r.mes}-${String(ultimoDiaMes(r.mes)).padStart(2, "0")}`;
    T("asignaciones").reemplazar((a) => a.origen === "horario" && a.desde === desde, []);
    T("ausencias").reemplazar((a) => a.origen === "horario" && a.desde >= desde && a.desde <= hasta, []);
    const tecnicos = T("tecnicos"), existentes = tecnicos.todos();
    let nAsig = 0, nAus = 0;
    for (const p of r.personal) {
      const clave = normalizar(p.nombre);
      let id = existentes.find((t) => t.clave === clave)?.id ?? existentes.find((t) => mismaPersona(t.nombre, p.nombre))?.id;
      if (id) tecnicos.actualizar(id, { rol: p.rol }); else { id = tecnicos.insertar({ nombre: p.nombre.replace(/\s+/g, " ").trim(), sede_id: null, activo: 1, rol: p.rol, clave }); existentes.push({ id, clave, nombre: p.nombre }); }
      const conBase = T("asignaciones").todos().some((a) => a.tecnico_id === id && a.origen === "base");
      for (const t of conBase ? [] : p.sedes_texto) { const sid = sedeId(t); if (sid) { T("asignaciones").insertar({ tecnico_id: id, sede_id: sid, desde, hasta, origen: "horario" }); nAsig++; } }
      for (const a of p.ausencias) { T("ausencias").insertar({ tecnico_id: id, tipo: a.tipo, desde: a.desde, hasta: a.hasta, nota: a.nota, origen: "horario" }); nAus++; }
    }
    return { mes: r.mes, personal: r.personal.length, asignaciones: nAsig, ausencias: nAus, avisos: r.avisos };
  }

  /** Tras agregar un alias, las filas que no se habían podido asignar a una sede se vuelven a resolver. */
  function reasignarSedes() {
    const resolver = resolverSedes();
    let n = 0;
    for (const nombre of ["mensual", "actas"]) {
      const t = T(nombre);
      for (const f of t.todos().filter((x) => !x.sede_id)) { const s = resolver(f.sede_texto); if (s) { t.actualizar(f.id, { sede_id: s.id }); n++; } }
    }
    return n;
  }

  function personal(mes) {
    if (!mesValido(mes)) throw bad("Mes inválido");
    const inicio = `${mes}-01`, fin = `${mes}-${String(ultimoDiaMes(mes)).padStart(2, "0")}`;
    const sedes = porId(T("sedes").todos()), asig = T("asignaciones").todos(), aus = T("ausencias").todos();
    const tecnicos = T("tecnicos").todos().map((t) => ({ ...t, activo: Number(t.activo) })).sort((a, b) => enOrden(a.rol, b.rol) || enOrden(a.nombre, b.nombre)).map((t) => ({
      id: t.id, nombre: t.nombre, rol: t.rol, activo: t.activo,
      asignaciones: asig.filter((a) => a.tecnico_id === t.id && a.desde <= fin && (!a.hasta || a.hasta >= inicio)).map((a) => ({ id: a.id, sede_id: a.sede_id, sede: sedes.get(a.sede_id)?.nombre, desde: a.desde, hasta: a.hasta ?? null, origen: a.origen })).sort((x, y) => enOrden(x.sede, y.sede)),
      ausencias: aus.filter((a) => a.tecnico_id === t.id && a.desde <= fin && a.hasta >= inicio).map(({ id, tipo, desde, hasta, nota, origen }) => ({ id, tipo, desde, hasta, nota: nota ?? "", origen })).sort((x, y) => enOrden(x.desde, y.desde)),
    }));
    const conteo = new Map();
    for (const f of [...T("mensual").todos(), ...T("actas").todos()].filter((x) => !x.sede_id)) conteo.set(f.sede_texto, (conteo.get(f.sede_texto) ?? 0) + 1);
    return { mes, tecnicos, sin_cobertura: cumplimiento(mes).siau.sin_cobertura, sin_reconocer: [...conteo].map(([t, n]) => ({ t, n })).sort((a, b) => b.n - a.n) };
  }

  // ───────── Acceso con usuario y contraseña (para quien no tiene cuenta de Google de la organización)
  const ALFABETO = "abcdefghjkmnpqrstuvwxyz23456789", MSG_LOGIN = "Usuario o contraseña incorrectos.", SESION_SEG = 6 * 3600, MAX_INTENTOS = 5, BLOQUEO_SEG = 900;
  const ROLES_ACCESO = ["visor", "admin"];
  const normUsuario = (s) => String(s ?? "").trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");
  const iguales = (a, b) => { a = String(a); b = String(b); if (a.length !== b.length) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; };
  const seg = () => { if (!seguridad) throw new ErrorHttp(501, "El acceso con usuario y contraseña no está disponible."); return seguridad; };
  const claveNueva = () => { const h = seg().azar(16); let c = ""; for (let i = 0; i < 14; i++) c += ALFABETO[parseInt(h.slice(2 * i, 2 * i + 2), 16) % ALFABETO.length]; return c; };
  const publico = (u) => ({ id: u.id, usuario: u.usuario, nombre: u.nombre, rol: u.rol, activo: Number(u.activo), creado: u.creado });
  const usuarioDe = (u) => ({ email: u.usuario, nombre: u.nombre, rol: u.rol, via: "clave", id: u.id });

  /** Crea una persona con acceso por contraseña. Devuelve la contraseña generada (única vez que se ve). */
  function crearUsuario({ nombre, usuario, rol = "visor" }) {
    const S = seg(), nom = txt(nombre, 120, true);
    if (!ROLES_ACCESO.includes(rol)) throw bad("Rol inválido");
    const tabla = T("usuarios"), usados = new Set(tabla.todos().map((u) => u.usuario));
    let id_ = normUsuario(usuario);
    if (!id_) { const p = normalizar(nom).split(" ").filter(Boolean); id_ = normUsuario(p.length > 1 ? `${p[0]}.${p[1]}` : p[0]) || "usuario"; }
    if (id_.length < 3 || id_.length > 40) throw bad("El usuario debe tener entre 3 y 40 caracteres (letras, números, punto, guion).");
    if (usados.has(id_)) { if (usuario) throw bad("Ese usuario ya existe"); let n = 2; while (usados.has(`${id_}${n}`)) n++; id_ = `${id_}${n}`; }
    const clave = claveNueva(), sal = S.azar(16);
    const id = tabla.insertar({ usuario: id_, nombre: nom, rol, activo: 1, sal, hash: S.hash(clave, sal), creado: ahora() });
    return { id, usuario: id_, nombre: nom, rol, clave };
  }

  function iniciarSesion(b) {
    const S = seg(), usuario = normUsuario(b.usuario), clave = String(b.clave ?? "");
    if (!usuario || !clave || clave.length > 200) throw new ErrorHttp(401, MSG_LOGIN);
    const kInt = "i:" + usuario, intentos = Number(S.kv.get(kInt) ?? 0);
    if (intentos >= MAX_INTENTOS) throw new ErrorHttp(429, "Demasiados intentos fallidos. Espere 15 minutos o pida que restablezcan su contraseña.");
    const u = T("usuarios").todos().find((x) => x.usuario === usuario);
    const h = S.hash(clave, u ? u.sal : "sal-ficticia-para-igualar-el-tiempo"); // se calcula siempre: tarda lo mismo exista o no el usuario
    if (!u || !Number(u.activo) || !iguales(h, u.hash)) { S.kv.put(kInt, String(intentos + 1), BLOQUEO_SEG); throw new ErrorHttp(401, MSG_LOGIN); }
    S.kv.del(kInt);
    const token = S.azar(24);
    S.kv.put("s:" + S.resumen(token), JSON.stringify({ id: u.id }), SESION_SEG);
    return { token, rol: u.rol, nombre: u.nombre, usuario: u.usuario };
  }

  /** Token de sesión → { email, nombre, rol, via } o null (vencido, cerrado o usuario desactivado). */
  function identificar(token) {
    if (!seguridad || typeof token !== "string" || token.length < 20 || token.length > 200) return null;
    const v = seguridad.kv.get("s:" + seguridad.resumen(token));
    if (!v) return null;
    const u = T("usuarios").todos().find((x) => x.id === JSON.parse(v).id);
    return u && Number(u.activo) ? usuarioDe(u) : null;
  }

  function cambiarClave(usuario, b) {
    const S = seg();
    if (usuario?.via !== "clave") throw bad("Su cuenta entra con Google: la contraseña no aplica.");
    const u = T("usuarios").todos().find((x) => x.id === usuario.id), nueva = String(b.nueva ?? "");
    if (!u || !iguales(S.hash(String(b.actual ?? ""), u.sal), u.hash)) throw new ErrorHttp(401, "La contraseña actual no es correcta.");
    if (nueva.length < 10 || nueva.length > 100) throw bad("La contraseña nueva debe tener al menos 10 caracteres.");
    const sal = S.azar(16);
    almacen.atomico(() => T("usuarios").actualizar(u.id, { sal, hash: S.hash(nueva, sal) }));
    almacen.guardar();
    return { ok: true };
  }

  // ───────── Enrutador
  function exigir(usuario, nivel) {
    const rol = usuario?.rol;
    if (!usuario?.email) throw new ErrorHttp(401, "Inicie sesión para continuar.");
    if (nivel === "admin" ? rol !== "admin" : !["admin", "visor"].includes(rol)) throw new ErrorHttp(403, nivel === "admin" ? "Solo los administradores pueden hacer esto." : "No tiene acceso a esta plataforma. Pida que agreguen su correo.");
  }

  /** req: { metodo, ruta, q?, cuerpo? }; usuario: { email, rol }. Devuelve los datos o lanza ErrorHttp. */
  function manejar(req, usuario) {
    const m = req.metodo, p = req.ruta, q = req.q ?? {}, b = req.cuerpo ?? {};
    let r;
    if (m === "GET" && p === "/api/sesion") return { rol: usuario?.rol ?? null, email: usuario?.email ?? "", nombre: usuario?.nombre ?? "", via: usuario?.via ?? (usuario?.email ? "google" : null), clave_disponible: Boolean(seguridad) };
    if (m === "POST" && p === "/api/login") return iniciarSesion(b);
    if (m === "POST" && p === "/api/logout") { if (seguridad && typeof req.token === "string") seguridad.kv.del("s:" + seguridad.resumen(req.token)); return { ok: true }; }
    if (m === "POST" && p === "/api/clave") { exigir(usuario, "visor"); return cambiarClave(usuario, b); }

    if (m === "GET" && p === "/api/config") { exigir(usuario, "visor"); return config(); }
    if (m === "GET" && p === "/api/evidencias") { exigir(usuario, "visor"); return listarEvidencias(q); }
    if (m === "GET" && p === "/api/cumplimiento") { exigir(usuario, "visor"); return cumplimiento(q.mes ?? hoy().slice(0, 7), q.hoy || undefined); }
    if (m === "GET" && p === "/api/panel") { exigir(usuario, "visor"); return panelDe(q.mes ?? hoy().slice(0, 7)); }
    if (m === "GET" && p === "/api/siau") { exigir(usuario, "visor"); return detalleSiau(q.id, q.mes ?? hoy().slice(0, 7)); }
    if (m === "GET" && p === "/api/consulta") { exigir(usuario, "visor"); return consulta(q); }
    if (m === "GET" && p === "/api/estado") { exigir(usuario, "visor"); const { hallazgos, fuentes } = estado(q.hoy || undefined); return { hallazgos, fuentes: fuentes.map(({ tipo, creado }) => ({ tipo, creado })) }; }

    if (m === "GET" && p === "/api/foto") {
      exigir(usuario, "visor");
      const id = String(q.id ?? "");
      if (!T("evidencias").todos().some((e) => idsDe(e).includes(id))) throw new ErrorHttp(404, "Foto no encontrada");
      return { data: fotos.datos(id) };
    }

    if (!p.startsWith("/api/admin/")) throw new ErrorHttp(404, "No encontrado");
    exigir(usuario, "admin");
    const escribir = (fn) => { const x = almacen.atomico(fn); almacen.guardar(); return x; };

    if (m === "GET" && p === "/api/admin/personal") return personal(q.mes ?? hoy().slice(0, 7));
    if (m === "GET" && p === "/api/admin/estado") return estado(q.hoy || undefined);

    if (m === "POST" && p === "/api/admin/foto") {
      if (!/^(image\/(jpeg|png|webp)|application\/pdf)$/.test(b.tipo ?? "")) throw bad("Solo se aceptan imágenes JPG, PNG o WebP y documentos PDF");
      if (b.tipo === "application/pdf" && !String(b.base64).startsWith("JVBER")) throw bad("El archivo no es un PDF válido");
      if (typeof b.base64 !== "string" || b.base64.length < 100 || b.base64.length > 16e6) throw bad("Imagen vacía o demasiado grande");
      return { archivo: fotos.guardar(b.base64, b.tipo) };
    }
    if (m === "POST" && p === "/api/admin/evidencias") return escribir(() => { const v = validarEvidencia(b); return { id: T("evidencias").insertar({ ...v, creado: ahora() }) }; });
    if ((r = /^\/api\/admin\/evidencias\/(\d+)$/.exec(p))) {
      const id = Number(r[1]), actual = T("evidencias").todos().find((e) => e.id === id);
      if (!actual) throw new ErrorHttp(404, "No existe");
      if (m === "PUT") return escribir(() => { const v = validarEvidencia(b), nuevas = idsDe(v); for (const f of idsDe(actual)) if (!nuevas.includes(f)) fotos.borrar(f); T("evidencias").actualizar(id, v); return { ok: true }; });
      if (m === "DELETE") return escribir(() => { for (const f of idsDe(actual)) fotos.borrar(f); T("evidencias").borrar(id); return { ok: true }; });
    }
    if (m === "POST" && p === "/api/admin/sedes") return escribir(() => {
      const nombres = (Array.isArray(b.nombres) ? b.nombres : []).map((n) => txt(n, 120)).filter(Boolean).slice(0, 200), t = T("sedes"), ya = new Set(t.todos().map((s) => s.nombre));
      let nuevas = 0;
      for (const n of nombres) if (!ya.has(n)) { t.insertar({ nombre: n, codigo: null, tipo: null, alias: null, activa: 1 }); ya.add(n); nuevas++; }
      return { nuevas };
    });
    if ((r = /^\/api\/admin\/sedes\/(\d+)$/.exec(p)) && m === "PUT") return escribir(() => { const parche = {}; if (b.nombre) parche.nombre = txt(b.nombre, 120); if (b.activa != null) parche.activa = Number(Boolean(b.activa)); T("sedes").actualizar(Number(r[1]), parche); return { ok: true }; });
    if ((r = /^\/api\/admin\/sedes\/(\d+)\/alias$/.exec(p)) && m === "POST") return escribir(() => {
      const sede = T("sedes").todos().find((s) => s.id === Number(r[1]));
      if (!sede) throw new ErrorHttp(404, "No existe");
      T("sedes").actualizar(sede.id, { alias: JSON.stringify([...new Set([...lista(sede.alias), txt(b.texto, 150, true)])]) });
      return { ok: true, reasignadas: reasignarSedes() };
    });
    if (m === "POST" && p === "/api/admin/tecnicos") return escribir(() => { const nombre = txt(b.nombre, 120, true); return { id: T("tecnicos").insertar({ nombre, sede_id: b.sede_id ? enteroEn(b.sede_id, 1, 1e9) : null, activo: 1, rol: "tecnico", clave: normalizar(nombre) }) }; });
    if ((r = /^\/api\/admin\/tecnicos\/(\d+)$/.exec(p)) && m === "PUT") return escribir(() => {
      const parche = {};
      if (b.nombre) { parche.nombre = txt(b.nombre, 120); parche.clave = normalizar(parche.nombre); }
      if (b.activo != null) parche.activo = Number(Boolean(b.activo));
      if (ROLES_PERSONAL.includes(b.rol)) parche.rol = b.rol;
      T("tecnicos").actualizar(Number(r[1]), parche); return { ok: true };
    });
    if ((r = /^\/api\/admin\/tipos\/([a-z_]+)$/.exec(p)) && m === "PUT") return escribir(() => { T("tipos").actualizar(r[1], { meta: b.meta == null || b.meta === "" ? null : enteroEn(b.meta, 0, 1e6), alcance: b.alcance === "tecnico" ? "tecnico" : "global" }); return { ok: true }; });
    if (m === "PUT" && p === "/api/admin/marca") return escribir(() => { if (b.nombre_siau != null) setAjuste("nombre_siau", txt(b.nombre_siau, 100, true)); if (b.nombre_asociacion != null) setAjuste("nombre_asociacion", txt(b.nombre_asociacion, 100, true)); return { ok: true }; });

    if (m === "POST" && p === "/api/admin/asignaciones") return escribir(() => {
      const t = enteroEn(b.tecnico_id, 1, 1e9), sd = enteroEn(b.sede_id, 1, 1e9);
      if (!fechaValida(b.desde) || (b.hasta && !fechaValida(b.hasta)) || (b.hasta && b.hasta < b.desde)) throw bad("Fechas inválidas");
      if (!T("tecnicos").todos().some((x) => x.id === t) || !T("sedes").todos().some((x) => x.id === sd)) throw bad("Técnico o sede inexistente");
      return { id: T("asignaciones").insertar({ tecnico_id: t, sede_id: sd, desde: b.desde, hasta: b.hasta || null, origen: "manual" }) };
    });
    if ((r = /^\/api\/admin\/asignaciones\/(\d+)$/.exec(p)) && m === "DELETE") return escribir(() => { T("asignaciones").borrar(Number(r[1])); return { ok: true }; });
    if (m === "POST" && p === "/api/admin/ausencias") return escribir(() => {
      const t = enteroEn(b.tecnico_id, 1, 1e9);
      if (!TIPOS_AUSENCIA.includes(b.tipo)) throw bad("Tipo de ausencia inválido");
      if (!fechaValida(b.desde) || !fechaValida(b.hasta) || b.hasta < b.desde) throw bad("Fechas inválidas");
      if (!T("tecnicos").todos().some((x) => x.id === t)) throw bad("Técnico inexistente");
      return { id: T("ausencias").insertar({ tecnico_id: t, tipo: b.tipo, desde: b.desde, hasta: b.hasta, nota: txt(b.nota, 200), origen: "manual" }) };
    });
    if ((r = /^\/api\/admin\/ausencias\/(\d+)$/.exec(p)) && m === "DELETE") return escribir(() => { T("ausencias").borrar(Number(r[1])); return { ok: true }; });
    if (m === "POST" && p === "/api/admin/importar") return escribir(() => sincronizar(b));

    if (m === "GET" && p === "/api/admin/usuarios") return T("usuarios").todos().map(publico).sort((a, c) => enOrden(a.nombre, c.nombre));
    if (m === "POST" && p === "/api/admin/usuarios") return escribir(() => crearUsuario(b));
    if ((r = /^\/api\/admin\/usuarios\/(\d+)$/.exec(p))) {
      const id = Number(r[1]), u = T("usuarios").todos().find((x) => x.id === id);
      if (!u) throw new ErrorHttp(404, "No existe");
      const yo = usuario.via === "clave" && usuario.id === id;
      if (m === "PUT") return escribir(() => {
        const parche = {}, salida = { ok: true };
        if (b.nombre) parche.nombre = txt(b.nombre, 120);
        if (b.rol != null) { if (!ROLES_ACCESO.includes(b.rol)) throw bad("Rol inválido"); if (yo && b.rol !== "admin") throw bad("No puede quitarse a sí mismo el rol de administrador."); parche.rol = b.rol; }
        if (b.activo != null) { if (yo && !b.activo) throw bad("No puede desactivar su propia cuenta."); parche.activo = Number(Boolean(b.activo)); }
        if (b.reiniciar) { const S = seg(), clave = claveNueva(), sal = S.azar(16); parche.sal = sal; parche.hash = S.hash(clave, sal); salida.clave = clave; }
        T("usuarios").actualizar(id, parche);
        return salida;
      });
      if (m === "DELETE") return escribir(() => { if (yo) throw bad("No puede eliminar su propia cuenta."); T("usuarios").borrar(id); return { ok: true }; });
    }
    throw new ErrorHttp(404, "No encontrado");
  }

  /** Uso interno (editor de Apps Script): nueva contraseña para una persona. */
  function restablecerClave(usuario) {
    const S = seg(), u = T("usuarios").todos().find((x) => x.usuario === normUsuario(usuario));
    if (!u) throw new ErrorHttp(404, "No existe ese usuario");
    const clave = claveNueva(), sal = S.azar(16);
    almacen.atomico(() => T("usuarios").actualizar(u.id, { sal, hash: S.hash(clave, sal), activo: 1 }));
    almacen.guardar();
    return { usuario: u.usuario, clave };
  }

  return { manejar, identificar, restablecerClave, crearUsuario: (d) => { const x = almacen.atomico(() => crearUsuario(d)); almacen.guardar(); return x; }, sincronizar: (b) => { const x = sincronizar(b); almacen.guardar(); return x; }, estado, cumplimiento };
}

return { VERSION_DATOS, ErrorHttp, inicializar, crearNucleo };
})();

const { ErrorHttp, crearNucleo, inicializar, VERSION_DATOS } = M_api;

const PLANTILLA_VISOR = "<!doctype html>\n<html lang=\"es\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1,viewport-fit=cover\">\n<title>Evidencias SIAU</title><base target=\"_top\"><link rel=\"icon\" href=\"{{R}}/shared/marca/medalla.png\"><link rel=\"stylesheet\" href=\"{{R}}/shared/estilos.css\"></head>\n<body class=\"tiene-tabbar\">\n<script>window.PLATAFORMA = { base: \"{{R}}\", app: \"{{APP}}\" };</script>\n<div class=\"fondo\" aria-hidden=\"true\"></div>\n<header class=\"nav glass\" id=\"nav\"><div class=\"logos\" id=\"logos\"></div><span class=\"nav-titulo\"></span><span id=\"sesionInfo\" class=\"sesion-zona\" hidden></span><a id=\"irAdmin\" href=\"{{APP}}?pagina=admin\" target=\"_top\" hidden>Administrar</a></header>\n<main id=\"app\"></main>\n<nav class=\"tabbar glass\" id=\"tabbar\" aria-label=\"Módulos\" hidden></nav>\n<dialog id=\"dlg\"><div class=\"in\" id=\"dlgc\"></div></dialog>\n<script type=\"module\" src=\"{{R}}/visor/app.js\"></script>\n</body></html>\n";
const PLANTILLA_ADMIN = "<!doctype html>\n<html lang=\"es\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1,viewport-fit=cover\">\n<title>Administrador de evidencias</title><base target=\"_top\"><link rel=\"icon\" href=\"{{R}}/shared/marca/medalla.png\"><link rel=\"stylesheet\" href=\"{{R}}/shared/estilos.css\"></head>\n<body>\n<script>window.PLATAFORMA = { base: \"{{R}}\", app: \"{{APP}}\" };</script>\n<div class=\"fondo\" aria-hidden=\"true\"></div>\n<header class=\"nav glass\" id=\"nav\"><div class=\"logos\" id=\"logos\"></div><span class=\"nav-titulo\"></span><span id=\"sesionInfo\" class=\"sesion-zona\" hidden></span><a href=\"{{APP}}\" target=\"_top\">Ver visor</a></header>\n<main id=\"app\"></main>\n<script type=\"module\" src=\"{{R}}/admin/app.js\"></script>\n</body></html>\n";

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
