// Motor de consulta y datos del panel. Puro: recibe las tablas ya leídas y devuelve datos listos para graficar.
import { mesValido } from "./lib.mjs";

const bad = (m) => Object.assign(new Error(m), { estado: 400 });
const ENC = ["encuestas", "medica_evaluaciones"], CHA = ["charlas_usuarios", "charlas_funcionarios"];
const puntaje = (p, m, d) => { const n = p + m + d; return n ? Math.round((1000 * (p - d)) / n) / 10 : null; };

/** Medidas disponibles. `ind`: indicadores de la tabla mensual que se suman; `tec`: cómo sale de la fila de un SIAU (si se puede desglosar por SIAU). */
export const MEDIDAS = {
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
export const DIMENSIONES = { mes: "Mes", sede: "Sede", siau: "SIAU", tipo: "Tipo de evidencia" };

export const mesesEntre = (desde, hasta) => {
  const r = []; let [a, m] = desde.split("-").map(Number); const [a2, m2] = hasta.split("-").map(Number);
  while ((a < a2 || (a === a2 && m <= m2)) && r.length < 60) { r.push(`${a}-${String(m).padStart(2, "0")}`); if (++m > 12) { m = 1; a++; } }
  return r;
};
const restarMeses = (mes, n) => { let a = Number(mes.slice(0, 4)), m = Number(mes.slice(5)) - n; while (m < 1) { m += 12; a--; } return `${a}-${String(m).padStart(2, "0")}`; };

/**
 * q: { medida, por, desde, hasta, sede, siau }. tablas: { mensual, actas, evidencias, sedes, tipos }. siauDe(mes) → filas de cumplimiento individual.
 * Devuelve { medida, por, meses, filas: [{ clave, etiqueta, valor }], total }.
 */
export function consultar(q, { mensual, actas, evidencias, sedes, tipos }, siauDe, hoy) {
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
export function ranking(filas) {
  const pctActas = (t) => (t.actas.esperadas ? t.actas.entregadas / t.actas.esperadas : 0);
  return filas.filter((t) => !t.ausente && t.puntaje > 0)
    .sort((a, b) => b.puntaje - a.puntaje || pctActas(b) - pctActas(a) || (b.encuestas.valor + b.charlas.valor) - (a.encuestas.valor + a.charlas.valor) || a.nombre.localeCompare(b.nombre, "es"))
    .map((t, i) => ({ puesto: i + 1, id: t.tecnico_id, nombre: t.nombre, puntaje: t.puntaje, estado: t.estado, encuestas: t.encuestas.valor, meta_encuestas: t.encuestas.meta, charlas: t.charlas.valor, meta_charlas: t.charlas.meta, actas: t.actas.esperadas ? `${t.actas.entregadas}/${t.actas.esperadas}` : null }));
}

/** Datos del panel de inicio: indicadores, series de 12 meses, distribución de calificaciones, ranking de sedes y estado de cada SIAU. */
export function panel(mes, c, { mensual, evidencias, sedes, tipos }) {
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
