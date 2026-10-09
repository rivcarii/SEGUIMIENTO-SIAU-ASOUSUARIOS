// Gráficos del panel (SVG/HTML sin librerías). Criterios: el dato escrito al lado de la marca, una sola escala por gráfico,
// el mes en foco con color pleno y el resto atenuado, y nada que dependa solo del color. Animan una vez al aparecer.
import { h } from "./comun.js";

const NS = "http://www.w3.org/2000/svg";
const s = (tag, attrs = {}, ...hijos) => {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null) e.setAttribute(k, v);
  e.append(...hijos.flat().filter((x) => x != null));
  return e;
};
export const COLOR = { nps: "#006081", medica: "#2fa37a", charlas: "#c98a00", lsc: "#7a4fb0", cumple: "#1f9d62", camino: "#e2b234", atencion: "#d9264a", ausente: "#9aa9b0", prom: "#1f9d62", pas: "#e2b234", det: "#d9264a" };
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
export const mesCorto = (m) => MESES[Number(m.slice(5)) - 1];
const miles = (n) => Number(n).toLocaleString("es-CO");
const bonito = (max) => { if (max <= 0) return 1; const e = Math.pow(10, Math.floor(Math.log10(max))), f = max / e; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * e; };

export function leyenda(items) {
  return h("ul", { class: "leyenda-g" }, items.map((i) => h("li", {}, h("i", { style: `background:${i.color}` }), i.etq, i.valor != null ? h("b", { class: "num" }, miles(i.valor)) : "")));
}

/** Barras por mes, apiladas. El último mes va en color pleno y los anteriores atenuados; cada barra lleva su total escrito. */
export function barrasMes(serie, claves, { alto = 230, titulo = "" } = {}) {
  const W = 640, H = alto, mb = 26, mt = 22, ml = 4, w = W - ml - 4, hh = H - mb - mt, paso = w / serie.length, bw = Math.min(34, paso * 0.66);
  const tot = serie.map((p) => claves.reduce((t, c) => t + (p[c.clave] || 0), 0)), max = bonito(Math.max(1, ...tot) * 1.08);
  const g = [s("line", { x1: ml, x2: W - 4, y1: mt + hh, y2: mt + hh, stroke: "rgba(4,58,77,.35)" })];
  for (const f of [0.5, 1]) g.push(s("line", { x1: ml, x2: W - 4, y1: mt + hh * (1 - f), y2: mt + hh * (1 - f), stroke: "rgba(6,93,126,.12)", "stroke-dasharray": "2 4" }));
  g.push(s("text", { x: ml, y: mt - 8, class: "eje" }, miles(max)));
  const ultimo = serie.length - 1;
  serie.forEach((p, i) => {
    const x = ml + paso * i + (paso - bw) / 2; let y = mt + hh;
    const grupo = s("g", { class: "bar", style: `--i:${i}`, opacity: i === ultimo ? 1 : 0.55 });
    claves.forEach((c, k) => {
      const v = p[c.clave] || 0, bh = (hh * v) / max;
      if (bh <= 0) return;
      y -= bh;
      const arriba = claves.slice(k + 1).every((d) => !(p[d.clave] > 0));
      const r = Math.min(4, bh, bw / 2);
      grupo.append(s("path", { d: arriba ? `M${x} ${y + bh}V${y + r}Q${x} ${y} ${x + r} ${y}H${x + bw - r}Q${x + bw} ${y} ${x + bw} ${y + r}V${y + bh}Z` : `M${x} ${y}H${x + bw}V${y + bh}H${x}Z`, fill: c.color }, s("title", {}, `${mesCorto(p.mes)} · ${c.etq}: ${miles(v)}`)));
    });
    if (tot[i]) grupo.append(s("text", { x: x + bw / 2, y: y - 6, "text-anchor": "middle", class: i === ultimo ? "val fuerte" : "val" }, miles(tot[i])));
    g.push(grupo, s("text", { x: x + bw / 2, y: H - 7, "text-anchor": "middle", class: i === ultimo ? "eje fuerte" : "eje" }, mesCorto(p.mes)));
  });
  return s("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": titulo || "Barras por mes", class: "grafico" }, g);
}

/** Línea con área para una serie (tendencia). Se traza de izquierda a derecha y marca el valor final. */
export function area(serie, clave, { color = COLOR.charlas, alto = 200, titulo = "" } = {}) {
  const W = 640, H = alto, mb = 26, mt = 24, ml = 8, mr = 8, w = W - ml - mr, hh = H - mb - mt;
  const vs = serie.map((p) => p[clave] || 0), max = bonito(Math.max(1, ...vs) * 1.1), X = (i) => ml + (serie.length === 1 ? w / 2 : (w * i) / (serie.length - 1)), Y = (v) => mt + hh - (hh * v) / max;
  const pts = vs.map((v, i) => [X(i), Y(v)]), linea = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join("");
  const id = "g" + Math.random().toString(36).slice(2, 7);
  const g = [s("defs", {}, s("linearGradient", { id, x1: 0, x2: 0, y1: 0, y2: 1 }, s("stop", { offset: "0%", "stop-color": color, "stop-opacity": 0.28 }), s("stop", { offset: "100%", "stop-color": color, "stop-opacity": 0 }))),
    s("line", { x1: ml, x2: W - mr, y1: mt + hh, y2: mt + hh, stroke: "rgba(4,58,77,.35)" })];
  for (const f of [0.5, 1]) g.push(s("line", { x1: ml, x2: W - mr, y1: mt + hh * (1 - f), y2: mt + hh * (1 - f), stroke: "rgba(6,93,126,.12)", "stroke-dasharray": "2 4" }));
  g.push(s("text", { x: ml, y: mt - 10, class: "eje" }, miles(max)),
    s("path", { d: `${linea}L${pts.at(-1)[0]} ${mt + hh}L${pts[0][0]} ${mt + hh}Z`, fill: `url(#${id})`, class: "area-rel" }),
    s("path", { d: linea, fill: "none", stroke: color, "stroke-width": 2.5, "stroke-linejoin": "round", "stroke-linecap": "round", pathLength: 1, class: "traza" }));
  serie.forEach((p, i) => {
    g.push(s("text", { x: X(i), y: H - 7, "text-anchor": "middle", class: i === serie.length - 1 ? "eje fuerte" : "eje" }, mesCorto(p.mes)));
    if (vs[i]) g.push(s("circle", { cx: pts[i][0], cy: pts[i][1], r: i === serie.length - 1 ? 5 : 3, fill: i === serie.length - 1 ? color : "#fff", stroke: color, "stroke-width": 2, class: "punto", style: `--i:${i}` }, s("title", {}, `${mesCorto(p.mes)}: ${miles(vs[i])}`)));
  });
  const k = vs.length - 1;
  if (vs[k]) g.push(s("text", { x: Math.min(pts[k][0], W - 24), y: pts[k][1] - 11, "text-anchor": "middle", class: "val fuerte" }, miles(vs[k])));
  return s("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": titulo || "Tendencia", class: "grafico" }, g);
}

/** Barra segmentada con cada parte rotulada (cantidad y porcentaje). partes: [{etq, valor, color}]. */
export function segmentada(partes, { vacio = "Sin datos" } = {}) {
  const total = partes.reduce((t, p) => t + p.valor, 0);
  return h("div", { class: "segmentada" },
    h("div", { class: "seg-b", role: "img", "aria-label": partes.map((p) => `${p.etq}: ${p.valor}`).join(", ") }, total ? partes.filter((p) => p.valor).map((p) => h("i", { style: `flex:${p.valor};background:${p.color}`, title: `${p.etq}: ${p.valor}` })) : h("i", { style: "flex:1;background:transparent" }, vacio)),
    h("ul", { class: "seg-l" }, partes.map((p) => h("li", {}, h("i", { style: `background:${p.color}` }), h("span", {}, p.etq), h("b", { class: "num" }, miles(p.valor)), h("small", { class: "num" }, total ? Math.round((100 * p.valor) / total) + " %" : "")))));
}

/** Barras horizontales con la cifra a la derecha. items: [{etq, valor, nota?}]. */
export function barrasH(items, { max = null, color = COLOR.nps, formato = miles, alClic = null } = {}) {
  const m = max ?? Math.max(1, ...items.map((i) => i.valor ?? 0));
  return h("ul", { class: "barras-h" }, items.map((i, n) => h("li", alClic ? { class: "clic", tabindex: 0, style: `--i:${n}`, onclick: () => alClic(i), onkeydown: (e) => { if (e.key === "Enter") alClic(i); } } : { style: `--i:${n}` },
    h("span", { class: "e" }, i.etq), h("span", { class: "b", role: "img", "aria-label": `${i.etq}: ${formato(i.valor ?? 0)}` }, h("i", { style: `--w:${Math.max(i.valor ? 2 : 0, Math.min(100, (100 * (i.valor ?? 0)) / m))}%;background:${i.color ?? color}` })), h("b", { class: "num" }, i.valor == null ? "—" : formato(i.valor), i.nota ? h("small", {}, " " + i.nota) : ""))));
}

/** Fila de avance hacia la meta: barra con marca de la meta al 100 % y el porcentaje escrito. */
export function avance(etq, valor, meta, color = COLOR.nps) {
  const p = meta ? Math.round((100 * valor) / meta) : null, ancho = p == null ? 0 : Math.min(100, p);
  const tono = p == null ? "nd" : p >= 100 ? "ok" : p >= 60 ? "mid" : "low";
  return h("div", { class: "avance " + tono }, h("span", { class: "a-e" }, etq), h("span", { class: "a-b", role: "img", "aria-label": `${etq}: ${p == null ? "sin meta" : p + " % de la meta"}` }, h("i", { style: `--w:${ancho}%` })), h("b", { class: "num a-v" }, p == null ? "—" : p + " %"));
}
