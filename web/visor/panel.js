// Panel de inicio: una franja de cifras y, debajo, figuras con su pie (como una lámina de cuaderno).
import { api, h, mesLegible, sk, skFigura } from "../shared/comun.js";
import { COLOR, barrasMes, area, segmentada, barrasH, avance, leyenda } from "../shared/graficos.js";

const miles = (n) => Number(n).toLocaleString("es-CO");
const tono = (p) => (p == null ? "" : p >= 100 ? "ok" : p >= 60 ? "mid" : "low");
const nombreCorto = (n) => n.split(/\s+/).filter(Boolean).map((x) => x[0] + x.slice(1).toLowerCase()).join(" ");
const pct = (v, m) => (m ? Math.min(100, Math.round((100 * v) / m)) : null);

function cifra(k, v, meta, nota, cls = "", alClic = null) {
  const cuerpo = [h("span", { class: "k" }, k), h("span", { class: "v" }, String(v), meta != null ? h("small", {}, ` / ${meta}`) : ""), nota ? h("span", { class: "n" }, nota) : ""];
  return alClic ? h("button", { class: "cifra " + cls, onclick: alClic }, ...cuerpo) : h("div", { class: "cifra " + cls }, ...cuerpo);
}
const figura = (cls, titulo, sub, ...hijos) => h("section", { class: "figura " + cls }, h("h3", {}, titulo), sub ? h("p", { class: "sub" }, sub) : "", ...hijos);

/** Lo que se ve mientras llegan los datos: la misma forma que tendrá el tablero. */
export const esqueletoPanel = () => h("div", { class: "cargando", role: "status", "aria-label": "Cargando el tablero" },
  h("div", { class: "filters" }, sk("", "height:42px;width:200px;border-radius:14px")),
  sk("l-tira", "height:92px;border-radius:22px"),
  h("div", { class: "tablero" }, skFigura("t7"), skFigura("t5"), skFigura("t7"), skFigura("t5")));

/** ir(vista, { siau }) cambia de pestaña; S.mes es el mes elegido. */
export async function vistaPanel(c, S, ir, render) {
  c.replaceChildren(esqueletoPanel());
  let p;
  try { p = await api("/api/panel?mes=" + S.mes); } catch (e) { return c.replaceChildren(h("div", { class: "msg err" }, e.message)); }
  const r = p.resumen, e = r.estados, base = r.evaluados;
  const mes = h("input", { type: "month", value: S.mes, "aria-label": "Mes", onchange: () => { S.mes = mes.value || S.mes; render(); } });
  const sinDatos = !r.encuestas.valor && !r.charlas.valor && !(r.actas?.esperadas);

  const franja = h("div", { class: "franja" },
    cifra("SIAU que cumplen", e.cumple, base, e.ausente ? `${e.ausente} ausente(s) sin evaluar` : "Todos activos", tono(base ? (100 * e.cumple) / base : null), () => ir("cumplimiento")),
    cifra("Encuestas", miles(r.encuestas.valor), r.encuestas.meta ? miles(r.encuestas.meta) : null, `NPS ${miles(r.encuestas.nps)} · médica ${miles(r.encuestas.medica)}`, tono(pct(r.encuestas.valor, r.encuestas.meta)), () => ir("cumplimiento")),
    cifra("Charlas (asistentes)", miles(r.charlas.valor), r.charlas.meta ? miles(r.charlas.meta) : null, "Suma de los SIAU activos", tono(pct(r.charlas.valor, r.charlas.meta)), () => ir("cumplimiento")),
    cifra("Actas de buzón", r.actas ? r.actas.entregadas : "—", r.actas ? r.actas.esperadas : null, "Entregadas hasta hoy", r.actas ? tono(pct(r.actas.entregadas, r.actas.esperadas)) : ""));
  const menores = h("p", { class: "menores" },
    h("span", {}, "Puntaje NPS ", h("b", { class: "num" }, r.nps ?? "—")), h("span", {}, "Evaluación médica ", h("b", { class: "num" }, r.medica ?? "—")),
    h("span", {}, "Intérprete ", h("b", { class: "num" }, r.lsc ? `${miles(r.lsc.atenciones)} atenciones` : "sin registros")),
    h("span", {}, "Sedes sin SIAU ", h("b", { class: "num" }, r.sin_cobertura)), h("button", { onclick: () => ir("fototeca") }, `${r.evidencias.total} evidencia(s) este mes`));

  const encPorMes = figura("t7", "Encuestas por mes", "Satisfacción (NPS) y evaluación médica · últimos 12 meses",
    barrasMes(p.serie, [{ clave: "nps", etq: "Satisfacción (NPS)", color: COLOR.nps }, { clave: "medica", etq: "Evaluación médica", color: COLOR.medica }], { titulo: "Encuestas por mes" }),
    leyenda([{ etq: "Satisfacción (NPS)", color: COLOR.nps }, { etq: "Evaluación médica", color: COLOR.medica }]));
  const estados = figura("t5", "Estado de los SIAU", `Cumplimiento de ${mesLegible(p.mes)}`,
    segmentada([{ etq: "Cumplen", valor: e.cumple, color: COLOR.cumple }, { etq: "En camino (60 % o más)", valor: e.camino, color: COLOR.camino }, { etq: "Requieren atención", valor: e.atencion, color: COLOR.atencion }, { etq: "Ausentes", valor: e.ausente, color: COLOR.ausente }]),
    h("p", {}, h("button", { class: "btn sec", onclick: () => ir("cumplimiento") }, "Ver cumplimiento")));
  const chaPorMes = figura("t7", "Charlas por mes", "Asistentes registrados en el consolidado de charlas",
    area(p.serie, "charlas", { color: COLOR.charlas, titulo: "Charlas por mes" }));
  const dist = figura("t5", "Calificaciones del mes", "Promotores (9–10), pasivos (7–8) y detractores (0–6)",
    h("p", { class: "mini-t" }, "Satisfacción (NPS)"), segmentada([{ etq: "Promotores", valor: p.distribucion.nps.promotores, color: COLOR.prom }, { etq: "Pasivos", valor: p.distribucion.nps.pasivos, color: COLOR.pas }, { etq: "Detractores", valor: p.distribucion.nps.detractores, color: COLOR.det }], { vacio: "Sin respuestas" }),
    h("p", { class: "mini-t" }, "Evaluación médico asistencial"), segmentada([{ etq: "Promotores", valor: p.distribucion.medica.promotores, color: COLOR.prom }, { etq: "Pasivos", valor: p.distribucion.medica.pasivos, color: COLOR.pas }, { etq: "Detractores", valor: p.distribucion.medica.detractores, color: COLOR.det }], { vacio: "Sin respuestas" }));

  const orden = [...p.siau].sort((a, b) => (a.estado === "ausente") - (b.estado === "ausente") || a.avance - b.avance);
  const matriz = figura("t7", "Avance por SIAU", "Porcentaje de la meta del mes. Pulse una fila para ver el detalle de esa persona",
    h("div", { class: "avances" }, orden.map((t) => {
      const ir_ = () => ir("cumplimiento", { siau: String(t.id) });
      return h("div", { class: "fila-siau" + (t.estado === "ausente" ? " ausente" : ""), tabindex: t.estado === "ausente" ? null : 0, role: "button", onclick: t.estado === "ausente" ? null : ir_, onkeydown: (ev) => { if (ev.key === "Enter" && t.estado !== "ausente") ir_(); } },
        h("span", { class: "nombre" }, nombreCorto(t.nombre), t.estado === "ausente" ? h("small", {}, "ausente este mes") : ""),
        t.estado === "ausente" ? h("span", {}) : h("span", { class: "barras2" }, avance("Encuestas", t.encuestas, t.meta_encuestas), avance("Charlas", t.charlas, t.meta_charlas)));
    })));

  const top = p.sedes.slice(0, 8);
  const sedes = figura("t5", "Sedes con más actividad", "Encuestas + charlas del mes",
    top.length ? barrasH(top.map((x) => ({ etq: x.sede, valor: x.encuestas + x.charlas, nota: `${miles(x.encuestas)} enc. · ${miles(x.charlas)} ch.` })), { color: COLOR.nps }) : h("p", { class: "mut" }, "Sin datos de sedes para este mes."),
    p.evidencias_tipo.length ? h("div", { style: "margin-top:22px" }, h("p", { class: "mini-t" }, "Evidencias registradas este mes"), barrasH(p.evidencias_tipo.map((x) => ({ etq: x.tipo, valor: x.n })), { color: COLOR.lsc })) : "");

  c.replaceChildren(
    h("div", { class: "filters" }, h("label", { style: "margin:0" }, "Mes"), mes, h("button", { class: "btn sec", onclick: () => ir("consultas") }, "Hacer una consulta")),
    ...(sinDatos ? [h("div", { class: "msg" }, "Este mes todavía no tiene datos. Pruebe con otro mes o actualice los consolidados desde el Administrador.")] : []),
    franja, menores, h("div", { class: "tablero" }, encPorMes, estados, chaPorMes, dist, matriz, sedes),
    h("p", { class: "leyenda" }, h("b", {}, "Nota."), " Las encuestas de cada SIAU suman NPS y evaluación médica; las charlas cuentan asistentes. Lo registrado en cada sede se reparte entre quienes la atienden."));
}
