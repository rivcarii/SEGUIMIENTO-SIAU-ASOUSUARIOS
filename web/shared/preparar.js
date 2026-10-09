// Prepara un libro de Excel para enviarlo a la plataforma: reconoce de qué consolidado se trata y
// conserva SOLO las columnas permitidas (fecha, sede y calificación). Se ejecuta en el navegador:
// los datos personales de los formularios nunca salen del computador. (Mismas reglas que apps-script/EnlaceConsolidados.gs.)
export const norm = (t) => String(t ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const MES = "(enero|febrer\\w*|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)";
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

export const LISTA_BLANCA = {
  nps: [(n) => n === "marca temporal", (n) => n.startsWith("sede"), (n) => n.includes("probabilidad")],
  medica: [(n) => n === "marca temporal", (n) => n.startsWith("sede"), (n) => n.includes("escala numerica")],
  ilscRegistro: [(n) => n.startsWith("fecha de atencion"), (n) => n === "sede"],
  ilscActividades: [(n) => n.startsWith("fecha de la atencion"), (n) => n === "tematica", (n) => n === "sede", (n) => n.includes("asistentes")],
};

/** Conserva solo las columnas permitidas. Devuelve la cuadrícula filtrada y los encabezados descartados. */
export function soloColumnas(grid, criterios) {
  const h = grid.findIndex((f) => f.some((c) => criterios.some((k) => k(norm(c)))));
  if (h < 0) return { grid: [], descartadas: [] };
  const mantener = grid[h].map((c, i) => (criterios.some((k) => k(norm(c))) ? i : -1)).filter((i) => i >= 0);
  return {
    grid: grid.slice(h).map((f) => mantener.map((i) => f[i] ?? "")),
    descartadas: grid[h].filter((c, i) => c && !mantener.includes(i)).map((c) => String(c).trim()),
  };
}

/** Vacía las celdas de las columnas cuyo encabezado cumple el criterio (la cédula del personal en el horario). */
export function sinColumna(grid, pred) {
  const h = grid.findIndex((f) => f.some((c) => pred(norm(c))));
  if (h < 0) return grid;
  const cols = grid[h].map((c, i) => (pred(norm(c)) ? i : -1)).filter((i) => i >= 0);
  return grid.map((f, i) => (i <= h ? f : f.map((c, j) => (cols.includes(j) ? "" : c))));
}

export function detectar(nombres) {
  const n = nombres.map(norm);
  if (n.includes("charlas usuarios")) return "charlas_matriz";
  if (n.some((x) => new RegExp(`^${MES} \\d{4}$`).test(x))) return "buzon";
  if (n.includes("cuadro de turno")) return "horario";
  if (n.some((x) => /^registro \d{4}$/.test(x) || x.startsWith("actividades asociadas"))) return "ilsc";
  if (n.includes("respuestas de formulario 1")) return "formulario";
  return null;
}

export const ETIQUETAS = { charlas_matriz: "Consolidado de charlas", buzon: "Consolidado de buzón", horario: "Horario del personal", ilsc: "Registro del intérprete (LSC)", nps: "Encuestas NPS", medica: "Evaluación médica" };

/**
 * libro = resultado de abrirLibro(). Devuelve { tipo, cuerpo, descartadas, nota } o lanza un Error con una explicación clara.
 * `cuerpo` es lo único que se envía a la plataforma.
 */
export async function prepararLibro(libro, nombreArchivo, ahora = new Date()) {
  let tipo = detectar(libro.nombres);
  const nombre = nombreArchivo.replace(/\.xlsx$/i, ""), anioArchivo = Number(/20\d\d/.exec(nombre)?.[0]) || ahora.getFullYear();
  const hojaPorNorm = (pred) => libro.nombres.find((x) => pred(norm(x)));
  const hojas = {};
  let descartadas = [], nota = "", extra = {};

  if (tipo === "charlas_matriz") {
    for (const n of ["charlas usuarios", "charlas funcionarios"]) { const real = hojaPorNorm((x) => x === n); if (real) hojas[real] = await libro.hoja(real); }
    extra = { anio: anioArchivo };
  } else if (tipo === "buzon") {
    for (const real of libro.nombres.filter((x) => new RegExp(`^${MES} \\d{4}$`).test(norm(x)))) hojas[real] = await libro.hoja(real);
    nota = `${Object.keys(hojas).length} hojas mensuales`;
  } else if (tipo === "horario") {
    for (const n of ["cuadro de turno", "horario pasos"]) { const real = hojaPorNorm((x) => x === n); if (real) hojas[real] = sinColumna(await libro.hoja(real), (c) => c === "cedula" || c.startsWith("cedula ")); }
    descartadas.push("CÉDULA");
    const mi = MESES.findIndex((m) => norm(nombre).includes(m));
    if (mi >= 0) extra = { mes: `${anioArchivo}-${String(mi + 1).padStart(2, "0")}` };
    else nota = "El nombre del archivo no dice el mes; se tomará el de la hoja y el año actual.";
  } else if (tipo === "ilsc") {
    const anio = ahora.getFullYear();
    const reg = hojaPorNorm((x) => x === `registro ${anio}`), act = hojaPorNorm((x) => x.startsWith("actividades asociadas") && x.includes(String(anio)));
    if (reg) { const r = soloColumnas(await libro.hoja(reg), LISTA_BLANCA.ilscRegistro); hojas[reg] = r.grid; descartadas.push(...r.descartadas); }
    if (act) { const r = soloColumnas(await libro.hoja(act), LISTA_BLANCA.ilscActividades); hojas[act] = r.grid; descartadas.push(...r.descartadas); }
    if (!reg && !act) throw new Error(`No hay hojas «REGISTRO ${anio}» ni «ACTIVIDADES ASOCIADAS LSC ${anio}» en este archivo.`);
    nota = `Solo se leen las hojas de ${anio}`;
  } else if (tipo === "formulario") {
    const real = hojaPorNorm((x) => x === "respuestas de formulario 1"), g = await libro.hoja(real);
    const enc = (g.find((f) => f.some((c) => norm(c) === "marca temporal")) ?? []).map(norm);
    tipo = enc.some((c) => c.includes("probabilidad")) ? "nps" : enc.some((c) => c.includes("escala numerica")) ? "medica" : null;
    if (!tipo) throw new Error("Es un formulario de respuestas, pero no es el de NPS ni el de evaluación médica.");
    const r = soloColumnas(g, LISTA_BLANCA[tipo]);
    hojas[real] = r.grid; descartadas = r.descartadas; nota = `${Math.max(0, r.grid.length - 1)} respuestas`;
  } else throw new Error("No se reconoce este archivo como uno de los consolidados de SIAU.");

  if (!Object.keys(hojas).length) throw new Error("No se encontró ninguna de las hojas esperadas.");
  return { tipo, cuerpo: { tipo, archivo: nombreArchivo, archivo_id: tipo, hojas, ...extra }, descartadas, nota };
}
