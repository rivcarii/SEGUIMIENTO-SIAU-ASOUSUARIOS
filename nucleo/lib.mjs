/** Fechas (YYYY-MM-DD) de los viernes de un mes "YYYY-MM". */
export function viernesDelMes(mes) {
  const [y, m] = mes.split("-").map(Number);
  const out = [];
  for (let d = new Date(Date.UTC(y, m - 1, 1)); d.getUTCMonth() === m - 1; d.setUTCDate(d.getUTCDate() + 1)) {
    if (d.getUTCDay() === 5) out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

export const mesValido = (s) => /^\d{4}-(0[1-9]|1[0-2])$/.test(s ?? "");
export const fechaValida = (s) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s ?? "");
  if (!m) return false;
  const u = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return u.getUTCFullYear() === +m[1] && u.getUTCMonth() === +m[2] - 1 && u.getUTCDate() === +m[3];
};

/**
 * Cumplimiento mensual.
 * tipos: [{clave, area, nombre, meta, alcance}]; evs: [{tipo, tecnico_id, sede_id, fecha, cantidad}]
 */
export function calcularCumplimiento({ mes, tipos, evs, tecnicos, sedes }) {
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
export function calcularPorTecnico({ mes, hoy, tecnicos, asignaciones, ausencias, sedes, mensual, actas, metas }) {
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
    const pend = [];
    let esperadas = 0, entregadas = 0;
    for (const sid of mis) for (const a of actas.filter((x) => x.sede_id === sid && x.fecha.startsWith(mes) && x.fecha <= hoy)) {
      esperadas++;
      if (a.estado === "entregado") entregadas++; else pend.push({ sede: nombreSede.get(sid), codigo: a.codigo, fecha: a.fecha, estado: a.estado });
    }
    const ausenciasMes = ausencias.filter((a) => a.tecnico_id === t.id && a.desde <= fin && a.hasta >= inicio);
    return {
      tecnico_id: t.id, nombre: t.nombre, sedes: mis.map((id) => nombreSede.get(id)).filter(Boolean).sort(),
      dias_activos: Math.round(f * D), dias_mes: D, ausente: f === 0, ausencias: ausenciasMes,
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
