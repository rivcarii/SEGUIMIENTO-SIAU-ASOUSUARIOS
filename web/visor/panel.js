// Panel de inicio: una franja de cifras y, debajo, figuras con su pie (como una lámina de cuaderno).
import { api, h, mesLegible, sk, skFigura } from "../shared/comun.js";
import { selectorMes } from "../shared/selectores.js";
import { COLOR, barrasMes, area, segmentada, barrasH, avance, leyenda } from "../shared/graficos.js";

const miles = (n) => Number(n).toLocaleString("es-CO");
const tono = (p) => (p == null ? "" : p >= 100 ? "ok" : p >= 60 ? "mid" : "low");
const nombreCorto = (n) => n.split(/\s+/).filter(Boolean).map((x) => x[0] + x.slice(1).toLowerCase()).join(" ");
const pct = (v, m) => (m ? Math.min(100, Math.round((100 * v) / m)) : null);

function cifra(k, v, meta, nota, cls = "", alClic = null) {
  const cuerpo = [h("span", { class: "k" }, k), h("span", { class: "v" }, String(v), meta != null ? h("small", {}, ` / ${meta}`) : ""), nota ? h("span", { class: "n" }, nota) : ""];
  return alClic ? h("button", { class: "cifra " + cls, onclick: alClic }, ...cuerpo) : h("div", { class: "cifra " + cls }, ...cuerpo);
}
/** Fila de datos de apoyo bajo una figura (para que ninguna quede con aire vacío y sin lectura). */
const datos = (...pares) => h("dl", { class: "datos" }, pares.filter(Boolean).map(([k, v]) => h("div", {}, h("dt", {}, k), h("dd", { class: "num" }, v))));
const mejorMes = (serie, f) => serie.reduce((m, x) => (f(x) > f(m) ? x : m), serie[0]);
const MESES_C = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const figura = (cls, titulo, sub, ...hijos) => h("section", { class: "figura " + cls }, h("h3", {}, titulo), sub ? h("p", { class: "sub" }, sub) : "", ...hijos);

/** Lo que se ve mientras llegan los datos: la misma forma que tendrá el tablero. */
export const esqueletoPanel = () => h("div", { class: "cargando", role: "status", "aria-label": "Cargando el tablero" },
  h("div", { class: "filters" }, sk("", "height:42px;width:200px;border-radius:14px")),
  sk("l-tira", "height:92px;border-radius:22px"),
  h("div", { class: "tablero" }, skFigura("t7"), skFigura("t5"), skFigura("t7"), skFigura("t5")));

/** ir(vista, { siau }) cambia de pestaña; S.mes es el mes elegido. */
export async function vistaPanel(c, S, ir, render) {
  c.replaceChildren(esqueletoPanel());
  let p, est = null;
  try { [p, est] = await Promise.all([api("/api/panel?mes=" + S.mes), api("/api/estado").catch(() => null)]); } catch (e) { return c.replaceChildren(h("div", { class: "msg err" }, e.message)); }
  const r = p.resumen, e = r.estados, base = r.evaluados;
  const mes = selectorMes({ value: S.mes, "aria-label": "Mes", onchange: (v) => { S.mes = v || S.mes; render(); } });
  const sinDatos = !r.encuestas.valor && !r.charlas.valor && !(r.actas?.esperadas);

  const t5Pie = (p) => (p.top.length ? `${p.top.filter((t) => t.puntaje >= 100).length} de los ${p.top.length} ya cumplen sus dos metas` : "");
  const franja = h("div", { class: "franja" },
    cifra("SIAU que cumplen", e.cumple, base, e.ausente ? `${e.ausente} ausente(s) sin evaluar` : "Todos activos", tono(base ? (100 * e.cumple) / base : null), () => ir("cumplimiento")),
    cifra("Encuestas", miles(r.encuestas.valor), r.encuestas.meta ? miles(r.encuestas.meta) : null, `NPS ${miles(r.encuestas.nps)} · médica ${miles(r.encuestas.medica)}`, tono(pct(r.encuestas.valor, r.encuestas.meta)), () => ir("cumplimiento")),
    cifra("Charlas (asistentes)", miles(r.charlas.valor), r.charlas.meta ? miles(r.charlas.meta) : null, "Suma de los SIAU activos", tono(pct(r.charlas.valor, r.charlas.meta)), () => ir("cumplimiento")),
    cifra("Actas de buzón", r.actas ? r.actas.entregadas : "—", r.actas ? r.actas.esperadas : null, "Entregadas hasta hoy", r.actas ? tono(pct(r.actas.entregadas, r.actas.esperadas)) : ""));
  const menores = h("p", { class: "menores" },
    h("span", {}, "Puntaje NPS ", h("b", { class: "num" }, r.nps ?? "—")), h("span", {}, "Evaluación médica ", h("b", { class: "num" }, r.medica ?? "—")),
    h("span", {}, "Intérprete ", h("b", { class: "num" }, r.lsc ? `${miles(r.lsc.atenciones)} atenciones` : "sin registros")),
    h("span", {}, "Sedes sin SIAU ", h("b", { class: "num" }, r.sin_cobertura)), h("button", { onclick: () => ir("fototeca") }, `${r.evidencias.total} evidencia(s) este mes`));

  // «Lo importante»: lo que hay que saber del mes, en frases
  const restantes = p.hoy && p.hoy.startsWith(p.mes) ? new Date(+p.mes.slice(0, 4), +p.mes.slice(5), 0).getDate() - Number(p.hoy.slice(8)) : 0;
  const atencion = p.siau.filter((t) => t.estado === "atencion").sort((a, b) => a.avance - b.avance);
  const faltaEnc = r.encuestas.meta ? Math.max(0, r.encuestas.meta - r.encuestas.valor) : 0, faltaCha = r.charlas.meta ? Math.max(0, r.charlas.meta - r.charlas.valor) : 0;
  const fuentes = est?.fuentes ?? [], ult = fuentes.map((f) => f.creado).sort().at(-1);
  const frases = [
    [h("b", {}, `${e.cumple} de ${base}`), ` SIAU cumplen sus metas; ${e.camino} van en camino y `, h("b", {}, String(e.atencion)), " requieren atención" + (atencion.length ? `: ${atencion.slice(0, 4).map((t) => nombreCorto(t.nombre).split(" ")[0]).join(", ")}${atencion.length > 4 ? ` y ${atencion.length - 4} más` : ""}.` : ".")],
    (faltaEnc || faltaCha) ? ["Para completar las metas del equipo faltan ", h("b", {}, `${miles(faltaEnc)} encuestas`), " y ", h("b", {}, `${miles(faltaCha)} charlas`), restantes ? ` en los ${restantes} día(s) que quedan del mes (≈ ${miles(Math.ceil(faltaEnc / restantes))} encuestas y ${miles(Math.ceil(faltaCha / restantes))} asistentes por día).` : " (el mes ya cerró)."] : ["El equipo ya completó las metas de encuestas y charlas del mes."],
    r.actas ? [h("b", {}, `${r.actas.esperadas - r.actas.entregadas} acta(s)`), ` de buzón sin entregar de ${r.actas.esperadas} esperadas hasta hoy.`] : ["Todavía no se ha cargado el consolidado de buzón."],
    r.sin_cobertura ? [h("b", {}, `${r.sin_cobertura} sede(s)`), " no tienen SIAU asignado este mes."] : null,
    r.lsc ? [`El intérprete registró `, h("b", {}, `${miles(r.lsc.atenciones)} atenciones`), ` y ${r.lsc.actividades} actividad(es) con LSC.`] : null,
    ult ? [`Últimos datos de Drive: ${ult}.`] : null].filter(Boolean);
  const claves = h("section", { class: "figura t12 claves-f" }, h("h3", {}, `Lo importante de ${mesLegible(p.mes)}`), h("ul", { class: "claves" }, frases.map((f) => h("li", {}, ...f))));

  const sNps = p.serie.reduce((t, x) => t + x.nps, 0), sMed = p.serie.reduce((t, x) => t + x.medica, 0), sCha = p.serie.reduce((t, x) => t + x.charlas, 0), activos = p.serie.filter((x) => x.nps + x.medica > 0).length || 1, activosC = p.serie.filter((x) => x.charlas > 0).length || 1;
  const mEnc = mejorMes(p.serie, (x) => x.nps + x.medica), mCha = mejorMes(p.serie, (x) => x.charlas), nm = (x) => MESES_C[+x.mes.slice(5) - 1];
  const encPorMes = figura("t7", "Encuestas por mes", "Satisfacción (NPS) y evaluación médica · últimos 12 meses",
    barrasMes(p.serie, [{ clave: "nps", etq: "Satisfacción (NPS)", color: COLOR.nps }, { clave: "medica", etq: "Evaluación médica", color: COLOR.medica }], { titulo: "Encuestas por mes" }),
    leyenda([{ etq: "Satisfacción (NPS)", color: COLOR.nps }, { etq: "Evaluación médica", color: COLOR.medica }]),
    datos(["Total 12 meses", miles(sNps + sMed)], ["Promedio mensual", miles(Math.round((sNps + sMed) / activos))], ["Mejor mes", mEnc.nps + mEnc.medica ? `${nm(mEnc)} · ${miles(mEnc.nps + mEnc.medica)}` : "—"], ["NPS / médica", `${miles(sNps)} / ${miles(sMed)}`]));
  const estados = figura("t5", "Estado de los SIAU", `Cumplimiento de ${mesLegible(p.mes)}`,
    segmentada([{ etq: "Cumplen", valor: e.cumple, color: COLOR.cumple }, { etq: "En camino (60 % o más)", valor: e.camino, color: COLOR.camino }, { etq: "Requieren atención", valor: e.atencion, color: COLOR.atencion }, { etq: "Ausentes", valor: e.ausente, color: COLOR.ausente }]),
    atencion.length ? h("div", {}, h("p", { class: "mini-t" }, "Requieren atención"), barrasH(atencion.slice(0, 6).map((t) => ({ etq: nombreCorto(t.nombre), valor: t.avance, color: COLOR.atencion })), { max: 100, formato: (v) => v + " %", alClic: (i) => { const t = atencion.find((x) => nombreCorto(x.nombre) === i.etq); if (t) ir("cumplimiento", { siau: String(t.id) }); } })) : h("p", { class: "mut" }, "Ningún SIAU en zona de atención."),
    h("p", {}, h("button", { class: "btn sec", onclick: () => ir("cumplimiento") }, "Ver cumplimiento")));
  const chaPorMes = figura("t7", "Charlas por mes", "Asistentes registrados en el consolidado de charlas",
    area(p.serie, "charlas", { color: COLOR.charlas, titulo: "Charlas por mes" }),
    datos(["Total 12 meses", miles(sCha)], ["Promedio mensual", miles(Math.round(sCha / activosC))], ["Mejor mes", mCha.charlas ? `${nm(mCha)} · ${miles(mCha.charlas)}` : "—"], ["Meta del mes", r.charlas.meta ? miles(r.charlas.meta) : "—"]));
  const dist = figura("t5", "Calificaciones del mes", "Promotores (9–10), pasivos (7–8) y detractores (0–6)",
    h("p", { class: "mini-t" }, "Satisfacción (NPS)"), segmentada([{ etq: "Promotores", valor: p.distribucion.nps.promotores, color: COLOR.prom }, { etq: "Pasivos", valor: p.distribucion.nps.pasivos, color: COLOR.pas }, { etq: "Detractores", valor: p.distribucion.nps.detractores, color: COLOR.det }], { vacio: "Sin respuestas" }),
    h("p", { class: "mini-t" }, "Evaluación médico asistencial"), segmentada([{ etq: "Promotores", valor: p.distribucion.medica.promotores, color: COLOR.prom }, { etq: "Pasivos", valor: p.distribucion.medica.pasivos, color: COLOR.pas }, { etq: "Detractores", valor: p.distribucion.medica.detractores, color: COLOR.det }], { vacio: "Sin respuestas" }));

  const top5 = figura("t5", "Top 5 del mes", "Mayor cumplimiento: promedio del % de encuestas y de charlas (tope 100 %)",
    p.top.length ? h("ol", { class: "top5" }, p.top.map((t, i) => h("li", { class: "clic", style: `--i:${i}`, tabindex: 0, onclick: () => ir("cumplimiento", { siau: String(t.id) }), onkeydown: (ev) => { if (ev.key === "Enter") ir("cumplimiento", { siau: String(t.id) }); } },
      h("span", { class: "puesto p" + t.puesto, "aria-label": "Puesto " + t.puesto }, t.puesto),
      h("span", { class: "quien" }, h("b", {}, nombreCorto(t.nombre)), h("small", {}, `Enc. ${t.encuestas}${t.meta_encuestas ? "/" + t.meta_encuestas : ""} · Charlas ${t.charlas}${t.meta_charlas ? "/" + t.meta_charlas : ""}${t.actas ? " · Actas " + t.actas : ""}`),
        h("span", { class: "a-b", role: "img", "aria-label": `Puntaje ${t.puntaje} %` }, h("i", { style: `--w:${Math.min(100, t.puntaje)}%` }))),
      h("b", { class: "num pts" }, t.puntaje, h("small", {}, " %"))))) : h("p", { class: "mut" }, "Todavía nadie suma avance en este mes."),
    h("p", { class: "pie-fig" }, t5Pie(p)));
  const orden = [...p.siau].sort((a, b) => (a.estado === "ausente") - (b.estado === "ausente") || a.avance - b.avance);
  const barra2 = (valor, meta) => { const p = meta ? Math.round((100 * valor) / meta) : null, t = p == null ? "nd" : p >= 100 ? "ok" : p >= 60 ? "mid" : "low";
    return h("span", { class: "av2 " + t, role: "img", "aria-label": p == null ? "sin meta" : p + " % de la meta" }, h("span", { class: "a-b" }, h("i", { style: `--w:${p == null ? 0 : Math.min(100, p)}%` })), h("b", { class: "num" }, p == null ? "—" : p + " %")); };
  const matriz = figura("t7", "Avance por SIAU", "Porcentaje de la meta del mes · deslice la lista · pulse una fila para ver a esa persona",
    h("div", { class: "lista-av", tabindex: 0, "aria-label": "Avance de cada SIAU (lista desplazable)" },
      h("div", { class: "fila-siau cab" }, h("span", {}, "SIAU"), h("span", {}, "Encuestas"), h("span", {}, "Charlas")),
      orden.map((t) => {
        const ir_ = () => ir("cumplimiento", { siau: String(t.id) }), aus = t.estado === "ausente";
        return h("div", { class: "fila-siau" + (aus ? " ausente" : ""), tabindex: aus ? null : 0, role: "button", onclick: aus ? null : ir_, onkeydown: (ev) => { if (ev.key === "Enter" && !aus) ir_(); } },
          h("span", { class: "nombre" }, nombreCorto(t.nombre)), aus ? h("span", { class: "mut", style: "grid-column:2/4;font-size:12px" }, "ausente este mes") : [barra2(t.encuestas, t.meta_encuestas), barra2(t.charlas, t.meta_charlas)]);
      })),
    h("p", { class: "pie-fig" }, `${orden.length} SIAU · los más atrasados primero`));

  const top = p.sedes.slice(0, 8);
  const sedes = figura("t7", "Sedes con más actividad", "Encuestas + charlas del mes (las 8 primeras)",
    top.length ? barrasH(top.map((x) => ({ etq: x.sede, valor: x.encuestas + x.charlas, nota: `${miles(x.encuestas)} enc. · ${miles(x.charlas)} ch.` })), { color: COLOR.nps }) : h("p", { class: "mut" }, "Sin datos de sedes para este mes."),
    datos(["Sedes con datos", String(p.sedes.length)], ["De 40 sedes", `${Math.round((100 * p.sedes.length) / 40)} %`]));
  const evid = figura("t5", "Evidencias del mes", "Lo que se ha registrado en la Fototeca",
    datos(["Evidencias", String(r.evidencias.total)], ["Con fotografías", String(r.evidencias.fotos)], ["Con documentos PDF", String(r.evidencias.documentos)]),
    p.evidencias_tipo.length ? barrasH(p.evidencias_tipo.map((x) => ({ etq: x.tipo, valor: x.n })), { color: COLOR.lsc }) : h("p", { class: "mut" }, "Aún no se han registrado evidencias este mes. Quien administra puede adjuntarlas desde la Fototeca."),
    h("p", {}, h("button", { class: "btn sec", onclick: () => ir("fototeca") }, "Abrir la Fototeca")));

  c.replaceChildren(
    h("div", { class: "filters" }, h("label", { style: "margin:0" }, "Mes"), mes, h("button", { class: "btn sec", onclick: () => ir("consultas") }, "Hacer una consulta")),
    ...(sinDatos ? [h("div", { class: "msg" }, "Este mes todavía no tiene datos. Pruebe con otro mes o actualice los consolidados desde el Administrador.")] : []),
    franja, menores, h("div", { style: "height:22px" }), h("div", { class: "tablero", style: "margin-top:0" }, claves, encPorMes, top5, chaPorMes, estados, matriz, dist, sedes, evid),
    h("p", { class: "leyenda" }, h("b", {}, "Nota."), " Las encuestas de cada SIAU suman NPS y evaluación médica; las charlas cuentan asistentes. Lo registrado en cada sede se reparte entre quienes la atienden."));
}
