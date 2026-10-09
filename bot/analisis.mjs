import { viernesDelMes } from "../lib.mjs";

export const normalizar = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** Extrae YYYY-MM-DD o YYYY-MM de una ruta; si no hay, usa modificado (ISO). */
export function extraerFecha(ruta, modificado) {
  const m = /(\d{4})[-_.](\d{2})(?:[-_.](\d{2}))?/.exec(ruta);
  if (m && +m[2] >= 1 && +m[2] <= 12) return { mes: `${m[1]}-${m[2]}`, dia: m[3] ? `${m[1]}-${m[2]}-${m[3]}` : null, origen: "nombre" };
  if (modificado) return { mes: modificado.slice(0, 7), dia: modificado.slice(0, 10), origen: "modificado" };
  return null;
}

/** Sede cuyo nombre aparece en la ruta; gana el nombre más largo (evita "Sede Norte" vs "Sede Norte 2"). */
export function detectarSede(ruta, sedes) {
  const r = ` ${normalizar(ruta)} `;
  return sedes.filter((s) => r.includes(` ${normalizar(s.nombre)} `)).sort((a, b) => b.nombre.length - a.nombre.length)[0] ?? null;
}

/**
 * archivos: {ruta, modificado}[] de UNA carpeta de Drive (recursiva, ruta = "Sede/archivo.pdf").
 * Devuelve por sede los archivos hallados del mes y los que no se pudieron asignar.
 */
export function clasificar(archivos, sedes, mes) {
  const porSede = new Map(sedes.map((s) => [s.id, { sede: s.nombre, archivos: [], dias: new Set() }]));
  const sinSede = [], sinFecha = [];
  for (const a of archivos) {
    const f = extraerFecha(a.ruta, a.modificado);
    if (!f) { sinFecha.push(a.ruta); continue; }
    if (f.mes !== mes) continue;
    const s = detectarSede(a.ruta, sedes);
    if (!s) { sinSede.push(a.ruta); continue; }
    const e = porSede.get(s.id);
    e.archivos.push(a.ruta);
    if (f.dia) e.dias.add(f.dia);
  }
  return { porSede, sinSede, sinFecha };
}

/**
 * Reporte de consolidación del mes.
 * carpetas: { actas: archivos[], encuestas: archivos[], charlas: archivos[] }
 */
export function analizar({ mes, sedes, carpetas, metas = {} }) {
  const hallazgos = [];
  const viernes = viernesDelMes(mes);
  const resumen = { mes, sedes: sedes.length, actas: {}, encuestas: {}, charlas: {} };

  const actas = clasificar(carpetas.actas ?? [], sedes, mes);
  const faltantes = [];
  for (const [, e] of actas.porSede) {
    const falta = viernes.filter((v) => !e.dias.has(v));
    if (falta.length) { faltantes.push({ sede: e.sede, faltan: falta }); hallazgos.push(`Actas de buzón: ${e.sede} sin acta del ${falta.join(", ")}`); }
  }
  resumen.actas = { viernes, sedesIncompletas: faltantes.length, faltantes };

  for (const [clave, etiqueta, meta] of [["encuestas", "Encuestas", metas.encuestas], ["charlas", "Charlas", metas.charlas]]) {
    const c = clasificar(carpetas[clave] ?? [], sedes, mes);
    const total = [...c.porSede.values()].reduce((s, e) => s + e.archivos.length, 0);
    const sinArchivos = [...c.porSede.values()].filter((e) => !e.archivos.length).map((e) => e.sede);
    resumen[clave] = { archivos: total, meta: meta ?? null, sinArchivos };
    if (sinArchivos.length) hallazgos.push(`${etiqueta}: ${sinArchivos.length} sede(s) sin archivos en ${mes}: ${sinArchivos.join(", ")}`);
    if (meta && total < meta) hallazgos.push(`${etiqueta}: ${total} archivo(s) vs meta ${meta}`);
    resumen[clave].sinClasificar = [...c.sinSede, ...c.sinFecha];
  }
  for (const [n, c] of [["actas", actas]]) {
    for (const r of [...c.sinSede, ...c.sinFecha]) hallazgos.push(`Actas: no se pudo asignar sede/fecha a "${r}"`);
  }
  return { ...resumen, hallazgos };
}
