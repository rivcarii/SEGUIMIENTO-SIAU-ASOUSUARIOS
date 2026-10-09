// Panel de inicio tipo tablero: indicadores, tendencias, distribución de calificaciones, ranking de sedes y semáforo de cada SIAU.
import { api, h, mesLegible, mascota } from "../shared/comun.js";
import { COLOR, columnas, dona, barrasH, apilada, celdaPct, leyenda } from "../shared/graficos.js";

const miles = (n) => Number(n).toLocaleString("es-CO");
const clase = (p) => (p == null ? "" : p >= 100 ? "ok" : p >= 60 ? "mid" : "low");
const nombreCorto = (n) => n.split(/\s+/).filter(Boolean).map((x) => x[0] + x.slice(1).toLowerCase()).join(" ");
const pct = (v, m) => (m ? Math.min(100, Math.round((100 * v) / m)) : null);

function tile(k, v, meta, nota, cls = "", alClic = null) {
  const cuerpo = [h("div", { class: "k" }, k), h("div", { class: "v" }, String(v), meta != null ? h("small", {}, ` / ${meta}`) : ""), nota ? h("div", { class: "n" }, nota) : ""];
  return alClic ? h("button", { class: "tile " + cls, onclick: alClic }, ...cuerpo) : h("div", { class: "tile " + cls }, ...cuerpo);
}
const tarjeta = (cls, titulo, sub, ...hijos) => h("section", { class: "card " + cls }, h("h3", {}, titulo), sub ? h("p", { class: "sub" }, sub) : "", ...hijos);

/** ir(vista, { siau }) cambia de pestaña; S.mes es el mes elegido. */
export async function vistaPanel(c, S, ir, render) {
  c.append(h("p", { class: "mut" }, "Cargando el tablero…"));
  let p;
  try { p = await api("/api/panel?mes=" + S.mes); } catch (e) { return c.replaceChildren(h("div", { class: "msg err" }, e.message)); }
  const r = p.resumen, e = r.estados;
  const mes = h("input", { type: "month", value: S.mes, "aria-label": "Mes", onchange: () => { S.mes = mes.value || S.mes; render(); } });
  const cumplen = e.cumple, base = r.evaluados;
  const sinDatos = !r.encuestas.valor && !r.charlas.valor && !(r.actas?.esperadas);

  const tiles = h("div", { class: "tiles" },
    tile("SIAU que cumplen", cumplen, base, e.ausente ? `${e.ausente} ausente(s) sin evaluar` : "Todos activos", clase(base ? (100 * cumplen) / base : null), () => ir("cumplimiento")),
    tile("Encuestas", miles(r.encuestas.valor), r.encuestas.meta ? miles(r.encuestas.meta) : null, `NPS ${miles(r.encuestas.nps)} · Médica ${miles(r.encuestas.medica)}`, clase(pct(r.encuestas.valor, r.encuestas.meta)), () => ir("cumplimiento")),
    tile("Charlas (asistentes)", miles(r.charlas.valor), r.charlas.meta ? miles(r.charlas.meta) : null, "Suma de los SIAU activos", clase(pct(r.charlas.valor, r.charlas.meta)), () => ir("cumplimiento")),
    tile("Actas de buzón", r.actas ? r.actas.entregadas : "—", r.actas ? r.actas.esperadas : null, "Entregadas hasta hoy", r.actas ? clase(pct(r.actas.entregadas, r.actas.esperadas)) : ""),
    tile("Puntaje NPS", r.nps == null ? "—" : r.nps, null, r.medica == null ? "Satisfacción de usuarios" : `Evaluación médica: ${r.medica}`),
    tile("Atenciones con intérprete", r.lsc ? miles(r.lsc.atenciones) : "—", null, r.lsc ? `${r.lsc.actividades} actividad(es) LSC` : "Sin registros este mes"),
    tile("Evidencias del mes", r.evidencias.total, null, `${r.evidencias.fotos} con fotos · ${r.evidencias.documentos} con PDF`, "", () => ir("fototeca")),
    tile("Sedes sin SIAU", r.sin_cobertura, 40, r.sin_cobertura ? "Revise Personal y rotación" : "Las 40 sedes tienen SIAU", r.sin_cobertura ? "low" : "ok"));

  const encPorMes = tarjeta("t6", "Encuestas por mes", "NPS y evaluación médica, últimos 12 meses",
    columnas(p.serie, [{ clave: "nps", etq: "NPS", color: COLOR.nps }, { clave: "medica", etq: "Evaluación médica", color: COLOR.medica }], { titulo: "Encuestas por mes" }),
    leyenda([{ etq: "Satisfacción (NPS)", color: COLOR.nps }, { etq: "Evaluación médica", color: COLOR.medica }]));
  const chaPorMes = tarjeta("t6", "Charlas por mes", "Asistentes registrados en el consolidado de charlas",
    columnas(p.serie, [{ clave: "charlas", etq: "Charlas", color: COLOR.charlas }], { titulo: "Charlas por mes" }));

  const estados = tarjeta("t4", "Estado de los SIAU", `Cumplimiento de ${mesLegible(p.mes)}`,
    dona([{ etq: "Cumplen", valor: e.cumple, color: COLOR.cumple }, { etq: "En camino", valor: e.camino, color: COLOR.camino }, { etq: "Atención", valor: e.atencion, color: COLOR.atencion }, { etq: "Ausentes", valor: e.ausente, color: COLOR.ausente }],
      { centro: `${cumplen}/${base}`, sub: "cumplen" }),
    h("p", {}, h("button", { class: "btn sec", onclick: () => ir("cumplimiento") }, "Ver cumplimiento")));

  const dist = tarjeta("t4", "Calificaciones", "Promotores (9–10), pasivos (7–8) y detractores (0–6)",
    apilada([{ etq: "Promotores", valor: p.distribucion.nps.promotores, color: COLOR.prom }, { etq: "Pasivos", valor: p.distribucion.nps.pasivos, color: COLOR.pas }, { etq: "Detractores", valor: p.distribucion.nps.detractores, color: COLOR.det }], "Satisfacción (NPS)"),
    apilada([{ etq: "Promotores", valor: p.distribucion.medica.promotores, color: COLOR.prom }, { etq: "Pasivos", valor: p.distribucion.medica.pasivos, color: COLOR.pas }, { etq: "Detractores", valor: p.distribucion.medica.detractores, color: COLOR.det }], "Evaluación médico asistencial"));

  const evid = tarjeta("t4", "Evidencias por tipo", "Registradas en la Fototeca este mes",
    p.evidencias_tipo.length ? barrasH(p.evidencias_tipo.map((x) => ({ etq: x.tipo, valor: x.n })), { color: COLOR.lsc }) : h("p", { class: "mut" }, "Aún no hay evidencias este mes."),
    h("p", {}, h("button", { class: "btn sec", onclick: () => ir("fototeca") }, "Abrir la Fototeca")));

  const top = p.sedes.slice(0, 10);
  const sedes = tarjeta("t6", "Sedes con más actividad", "Encuestas + charlas del mes (las 10 primeras)",
    top.length ? barrasH(top.map((x) => ({ etq: x.sede, valor: x.encuestas + x.charlas, nota: `${miles(x.encuestas)} enc. · ${miles(x.charlas)} ch.` })), { color: COLOR.nps }) : h("p", { class: "mut" }, "Sin datos de sedes para este mes."));

  const matriz = tarjeta("t6", "Avance por SIAU", "% de la meta del mes. Pulse un nombre para ver su detalle",
    h("div", { class: "scroll" }, h("table", { class: "calor" }, h("thead", {}, h("tr", {}, ["SIAU", "Encuestas", "Charlas", "Actas"].map((t) => h("th", {}, t)))),
      h("tbody", {}, [...p.siau].sort((a, b) => (a.estado === "ausente") - (b.estado === "ausente") || a.avance - b.avance).map((t) => h("tr", { class: "clic", tabindex: 0, onclick: () => ir("cumplimiento", { siau: String(t.id) }), onkeydown: (ev) => { if (ev.key === "Enter") ir("cumplimiento", { siau: String(t.id) }); } },
        h("td", {}, nombreCorto(t.nombre)), t.estado === "ausente" ? h("td", { class: "cal nd", colSpan: 3 }, "ausente este mes") : [celdaPct(pct(t.encuestas, t.meta_encuestas)), celdaPct(pct(t.charlas, t.meta_charlas)), celdaPct(t.actas)]))))));

  c.replaceChildren(
    h("div", { class: "filters" }, h("label", { style: "margin:0" }, "Mes"), mes, h("button", { class: "btn sec", onclick: () => ir("consultas") }, "Hacer una consulta")),
    ...(sinDatos ? [h("div", { class: "msg" }, "Este mes todavía no tiene datos. Pruebe con otro mes o actualice los consolidados desde el Administrador.")] : []),
    tiles, h("div", { style: "height:14px" }),
    h("div", { class: "tablero" }, encPorMes, chaPorMes, estados, dist, evid, sedes, matriz),
    h("p", { class: "leyenda" }, h("b", {}, "Nota."), " Las encuestas de cada SIAU suman NPS y evaluación médica. Las charlas cuentan asistentes. Los datos salen de los consolidados de Drive; vea «Consultas» para cruzarlos."));
}
