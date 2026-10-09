// Ficha de un SIAU: puesto frente al equipo, qué le falta, aporte de cada sede, últimos 6 meses y evidencias registradas.
import { api, h, fmtFecha, mesLegible, sk } from "../shared/comun.js";
import { COLOR, barrasMes, area, leyenda } from "../shared/graficos.js";

const miles = (n) => Number(n).toLocaleString("es-CO");
const nombreCorto = (n) => n.split(/\s+/).filter(Boolean).map((x) => x[0] + x.slice(1).toLowerCase()).join(" ");
const ETQ = { cumple: "Cumple sus metas", camino: "En camino", atencion: "Requiere atención", ausente: "Ausente" };
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

const esqueleto = () => h("div", { class: "cargando", role: "status", "aria-label": "Cargando la ficha" }, sk("l-tira", "height:110px;border-radius:22px;margin-bottom:18px"), h("div", { class: "tablero", style: "margin-top:0" },
  h("section", { class: "figura t7" }, sk("l-titulo"), sk("l-grafico")), h("section", { class: "figura t5" }, sk("l-titulo"), sk("l-grafico"))));

/** Cuánto le falta y a qué ritmo; si el mes sigue abierto, también a dónde llegaría con el ritmo actual. */
function falta(r) {
  const t = r.fila, dia = r.hoy && r.hoy.startsWith(r.mes) ? Number(r.hoy.slice(8)) : null, resta = dia ? Math.max(0, r.dias_mes - dia) : 0;
  const linea = (nombre, m) => {
    if (m.meta == null) return null;
    const falta = Math.max(0, m.meta - m.valor), proy = dia && dia >= 3 ? Math.round((m.valor / dia) * r.dias_mes) : null;
    return h("li", { class: falta ? "debe" : "ok" }, h("b", {}, nombre), falta
      ? ` — faltan ${miles(falta)}${resta ? ` (≈ ${miles(Math.ceil(falta / resta))} por día en los ${resta} día(s) que quedan)` : " y el mes ya cerró"}.`
      : " — meta alcanzada.", proy != null && falta && resta ? h("small", {}, `A este ritmo cerraría en ${miles(proy)} (${Math.round((100 * proy) / m.meta)} % de la meta).`) : "");
  };
  const actas = t.actas.pendientes.length ? h("li", { class: "debe" }, h("b", {}, "Actas de buzón"), ` — ${t.actas.pendientes.length} pendiente(s): ${t.actas.pendientes.map((p) => `${p.sede} (${p.codigo})`).join(", ")}.`) : (t.actas.esperadas ? h("li", { class: "ok" }, h("b", {}, "Actas de buzón"), " — al día.") : null);
  return h("ul", { class: "falta" }, [linea("Encuestas", t.encuestas), linea("Charlas", t.charlas), actas].filter(Boolean));
}

function porSede(t) {
  if (!t.por_sede.length) return h("p", { class: "mut" }, "No tiene sedes asignadas este mes. Asígnelas en Administrador → Personal y rotación.");
  const max = Math.max(1, ...t.por_sede.map((s) => s.nps + s.medica));
  return h("div", { class: "sede-det", role: "table", "aria-label": "Aporte de cada sede" },
    h("div", { class: "sd-cab", role: "row" }, ["Sede", "Encuestas", "Charlas", "Actas"].map((x) => h("span", { role: "columnheader" }, x))),
    t.por_sede.map((s) => h("div", { class: "sd-fila", role: "row" },
      h("span", { class: "sd-n", role: "cell" }, s.sede, s.comparte ? h("small", {}, `compartida con ${s.comparte}`) : ""),
      h("span", { class: "sd-e", role: "cell" }, h("span", { class: "sd-barra", role: "img", "aria-label": `NPS ${s.nps}, médica ${s.medica}` }, h("i", { class: "n", style: `width:${(100 * s.nps) / max}%` }), h("i", { class: "m", style: `width:${(100 * s.medica) / max}%` })), h("b", { class: "num" }, s.nps + s.medica), h("small", {}, `NPS ${s.nps} · méd. ${s.medica}`)),
      h("span", { class: "sd-c num", role: "cell" }, miles(s.charlas)),
      h("span", { class: "sd-a num", role: "cell" }, s.actas_esperadas ? `${s.actas_entregadas}/${s.actas_esperadas}` : "—"))));
}

export async function cargarFicha(host, S, ir) {
  host.replaceChildren(esqueleto());
  let r;
  try { r = await api(`/api/siau?id=${encodeURIComponent(S.siau)}&mes=${S.mes}`); } catch (e) { return host.replaceChildren(h("div", { class: "msg err" }, e.message)); }
  const t = r.fila, p = r.puesto, vs = (a, b) => (a == null || b == null ? "" : a >= b ? "por encima del promedio del equipo" : "por debajo del promedio del equipo");
  const cab = h("section", { class: "ficha-cab" },
    h("div", { class: "ficha-id" }, h("span", { class: "estado " + t.estado }, ETQ[t.estado]), h("h3", {}, nombreCorto(t.nombre)),
      h("div", { class: "chips" }, t.sedes.length ? t.sedes.map((x) => h("span", { class: "chip-sede suave" }, x)) : h("span", { class: "mut" }, "Sin sedes asignadas")),
      t.ausencias.length ? h("p", { class: "mut", style: "margin:8px 0 0" }, "Ausencias: " + t.ausencias.map((a) => `${a.tipo} (${fmtFecha(a.desde)} → ${fmtFecha(a.hasta)})`).join(" · ")) : ""),
    t.ausente ? h("div", { class: "ficha-puesto" }, h("small", {}, "No se evalúa este mes")) :
      h("div", { class: "ficha-puesto" }, h("small", {}, "Puesto en el equipo"), h("b", {}, p.n ? `N.º ${p.n}` : "—", h("span", {}, ` de ${p.de}`)),
        h("small", {}, p.puntaje != null ? `Puntaje ${p.puntaje} %` : "Sin puntaje"), r.equipo.puntaje != null ? h("small", { class: "vs" }, `Promedio del equipo ${r.equipo.puntaje} % · ${vs(t.puntaje, r.equipo.puntaje)}`) : ""));

  if (t.ausente) return host.replaceChildren(cab);
  const serie = r.serie, sN = serie.reduce((a, x) => a + x.nps, 0), sM = serie.reduce((a, x) => a + x.medica, 0), sC = serie.reduce((a, x) => a + x.charlas, 0), n = serie.filter((x) => x.nps + x.medica + x.charlas > 0).length || 1;
  const evid = r.evidencias;
  host.replaceChildren(cab, h("div", { class: "tablero", style: "margin-top:22px" },
    h("section", { class: "figura t5" }, h("h3", {}, "Qué le falta"), h("p", { class: "sub" }, `Frente a sus metas de ${mesLegible(r.mes)}`), falta(r)),
    h("section", { class: "figura t7" }, h("h3", {}, "Aporte de cada sede"), h("p", { class: "sub" }, "Lo registrado en cada sede, repartido entre quienes la atienden"), porSede(t),
      h("p", { class: "pie-fig" }, "Las cifras por sede se redondean; su suma puede diferir en una unidad del total.")),
    h("section", { class: "figura t7" }, h("h3", {}, "Encuestas · últimos 6 meses"), h("p", { class: "sub" }, "Satisfacción (NPS) y evaluación médica"),
      barrasMes(serie, [{ clave: "nps", etq: "Satisfacción (NPS)", color: COLOR.nps }, { clave: "medica", etq: "Evaluación médica", color: COLOR.medica }], { alto: 200, titulo: "Encuestas por mes" }),
      leyenda([{ etq: "Satisfacción (NPS)", color: COLOR.nps }, { etq: "Evaluación médica", color: COLOR.medica }]),
      h("dl", { class: "datos" }, [["Total 6 meses", miles(sN + sM)], ["Promedio mensual", miles(Math.round((sN + sM) / n))], ["NPS / médica", `${miles(sN)} / ${miles(sM)}`]].map(([k, v]) => h("div", {}, h("dt", {}, k), h("dd", { class: "num" }, v))))),
    h("section", { class: "figura t5" }, h("h3", {}, "Charlas · últimos 6 meses"), h("p", { class: "sub" }, "Asistentes en sus sedes"), area(serie, "charlas", { color: COLOR.charlas, alto: 200, titulo: "Charlas por mes" }),
      h("dl", { class: "datos" }, [["Total 6 meses", miles(sC)], ["Promedio mensual", miles(Math.round(sC / n))]].map(([k, v]) => h("div", {}, h("dt", {}, k), h("dd", { class: "num" }, v))))),
    h("section", { class: "figura t12" }, h("h3", {}, "Evidencias registradas este mes"), h("p", { class: "sub" }, evid.total ? `${evid.total} evidencia(s) a su nombre` : "Todavía no hay evidencias a su nombre este mes"),
      evid.ultimas.length ? h("ul", { class: "ev-lista" }, evid.ultimas.map((e) => h("li", {}, e.portada ? h("img", { src: e.portada, alt: "", width: 56, height: 56 }) : h("span", { class: "sin-img" }, e.documentos ? "PDF" : "—"),
        h("span", { class: "ev-t" }, h("b", {}, e.titulo), h("small", {}, `${e.tipo} · ${fmtFecha(e.fecha)}${e.fotos ? ` · ${e.fotos} foto(s)` : ""}${e.documentos ? ` · ${e.documentos} PDF` : ""}`))))) : h("p", { class: "mut" }, "Cuando se adjunten desde la Fototeca con su nombre como responsable, aparecerán aquí."),
      h("p", {}, h("button", { class: "btn sec", onclick: () => { S.filtros = { tecnico: String(S.siau) }; ir("fototeca"); } }, "Ver todo en la Fototeca")))));
}
