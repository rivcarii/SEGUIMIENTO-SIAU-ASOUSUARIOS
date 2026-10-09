// Gráficos del panel: SVG y HTML simples, sin librerías. Todos llevan texto alternativo y valores visibles (no dependen solo del color).
import { h } from "./comun.js";

const NS = "http://www.w3.org/2000/svg";
const s = (tag, attrs = {}, ...hijos) => {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null) e.setAttribute(k, v);
  e.append(...hijos.flat().filter((x) => x != null));
  return e;
};
export const COLOR = { nps: "#065d7e", medica: "#009e4d", charlas: "#b98a00", lsc: "#8455b8", cumple: "#009e4d", camino: "#e2b234", atencion: "#e20a31", ausente: "#9aa9b0", prom: "#009e4d", pas: "#e2b234", det: "#e20a31" };
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
export const mesCorto = (m) => MESES[Number(m.slice(5)) - 1] + (m.slice(5) === "01" ? " " + m.slice(2, 4) : "");
const bonito = (max) => { if (max <= 0) return 1; const e = Math.pow(10, Math.floor(Math.log10(max))), f = max / e; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * e; };
const miles = (n) => Number(n).toLocaleString("es-CO");

export function leyenda(items) {
  return h("ul", { class: "leyenda-g" }, items.map((i) => h("li", {}, h("i", { style: `background:${i.color}` }), i.etq, i.valor != null ? h("b", { class: "num" }, miles(i.valor)) : "")));
}

/** Columnas apiladas por mes. serie: [{mes, ...}], claves: [{clave, etq, color}]. */
export function columnas(serie, claves, { alto = 220, titulo = "" } = {}) {
  const W = 640, H = alto, ml = 44, mb = 26, mt = 10, w = W - ml - 8, hh = H - mb - mt;
  const tot = serie.map((p) => claves.reduce((t, c) => t + (p[c.clave] || 0), 0)), max = bonito(Math.max(1, ...tot));
  const bw = (w / serie.length) * 0.62, paso = w / serie.length;
  const g = [];
  for (let i = 0; i <= 4; i++) { const y = mt + hh - (hh * i) / 4; g.push(s("line", { x1: ml, x2: W - 8, y1: y, y2: y, stroke: "rgba(6,93,126,.14)" }), s("text", { x: ml - 6, y: y + 4, "text-anchor": "end", class: "eje" }, miles((max * i) / 4))); }
  serie.forEach((p, i) => {
    const x = ml + paso * i + (paso - bw) / 2; let y = mt + hh;
    for (const c of claves) {
      const v = p[c.clave] || 0, bh = (hh * v) / max;
      if (bh > 0) { y -= bh; g.push(s("rect", { x, y, width: bw, height: bh, fill: c.color, rx: 2 }, s("title", {}, `${mesCorto(p.mes)} · ${c.etq}: ${miles(v)}`))); }
    }
    if (tot[i]) g.push(s("text", { x: x + bw / 2, y: y - 4, "text-anchor": "middle", class: "val" }, miles(tot[i])));
    g.push(s("text", { x: x + bw / 2, y: H - 8, "text-anchor": "middle", class: "eje" }, mesCorto(p.mes)));
  });
  return s("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": titulo || "Columnas por mes", class: "grafico" }, g);
}

/** Dona con total en el centro. partes: [{etq, valor, color}]. */
export function dona(partes, { centro = "", sub = "", titulo = "" } = {}) {
  const total = partes.reduce((t, p) => t + p.valor, 0), R = 62, r = 40, C = 80;
  const g = [];
  if (!total) g.push(s("circle", { cx: C, cy: C, r: (R + r) / 2, fill: "none", stroke: "rgba(6,93,126,.12)", "stroke-width": R - r }));
  else if (partes.filter((p) => p.valor > 0).length === 1) g.push(s("circle", { cx: C, cy: C, r: (R + r) / 2, fill: "none", stroke: partes.find((p) => p.valor > 0).color, "stroke-width": R - r }, s("title", {}, `${partes.find((p) => p.valor > 0).etq}: ${partes.find((p) => p.valor > 0).valor}`)));
  else {
    let a0 = -Math.PI / 2;
    for (const p of partes) {
      if (p.valor <= 0) continue;
      const a1 = a0 + (2 * Math.PI * p.valor) / total, big = a1 - a0 > Math.PI ? 1 : 0, P = (a, rad) => [C + rad * Math.cos(a), C + rad * Math.sin(a)];
      const [x0, y0] = P(a0, R), [x1, y1] = P(a1, R), [x2, y2] = P(a1, r), [x3, y3] = P(a0, r);
      g.push(s("path", { d: `M${x0} ${y0} A${R} ${R} 0 ${big} 1 ${x1} ${y1} L${x2} ${y2} A${r} ${r} 0 ${big} 0 ${x3} ${y3}Z`, fill: p.color, stroke: "#fff", "stroke-width": 1.5 }, s("title", {}, `${p.etq}: ${p.valor} (${Math.round((100 * p.valor) / total)} %)`)));
      a0 = a1;
    }
  }
  g.push(s("text", { x: C, y: C + 2, "text-anchor": "middle", class: "centro" }, centro), s("text", { x: C, y: C + 18, "text-anchor": "middle", class: "eje" }, sub));
  return h("div", { class: "dona" }, s("svg", { viewBox: "0 0 160 160", role: "img", "aria-label": titulo || partes.map((p) => `${p.etq}: ${p.valor}`).join(", ") }, g), leyenda(partes.map((p) => ({ etq: p.etq, color: p.color, valor: p.valor }))));
}

/** Barras horizontales con valor al final. items: [{etq, valor, color?, nota?}]. */
export function barrasH(items, { max = null, color = COLOR.nps, formato = miles, alClic = null } = {}) {
  const m = max ?? Math.max(1, ...items.map((i) => i.valor ?? 0));
  return h("ul", { class: "barras-h" }, items.map((i) => h("li", alClic ? { class: "clic", tabindex: 0, onclick: () => alClic(i), onkeydown: (e) => { if (e.key === "Enter") alClic(i); } } : {},
    h("span", { class: "e" }, i.etq), h("span", { class: "b", role: "img", "aria-label": `${i.etq}: ${formato(i.valor ?? 0)}` }, h("i", { style: `width:${Math.max(i.valor ? 2 : 0, Math.min(100, (100 * (i.valor ?? 0)) / m))}%;background:${i.color ?? color}` })), h("b", { class: "num" }, i.valor == null ? "—" : formato(i.valor), i.nota ? h("small", {}, " " + i.nota) : ""))));
}

/** Barra apilada 100 % (promotores / pasivos / detractores). */
export function apilada(partes, titulo) {
  const total = partes.reduce((t, p) => t + p.valor, 0);
  return h("div", { class: "apilada" }, h("div", { class: "ap-t" }, titulo, h("b", { class: "num" }, total ? miles(total) + " respuestas" : "sin respuestas")),
    h("div", { class: "ap-b", role: "img", "aria-label": partes.map((p) => `${p.etq}: ${p.valor}`).join(", ") }, partes.map((p) => (p.valor ? h("i", { style: `flex:${p.valor};background:${p.color}`, title: `${p.etq}: ${p.valor}` }, total && p.valor / total > 0.12 ? Math.round((100 * p.valor) / total) + " %" : "") : ""))),
    leyenda(partes.map((p) => ({ etq: p.etq, color: p.color, valor: p.valor }))));
}

/** Celda coloreada con el porcentaje escrito (el color nunca va solo). */
export const celdaPct = (v) => h("td", { class: "cal " + (v == null ? "nd" : v >= 100 ? "ok" : v >= 60 ? "mid" : "low") }, v == null ? "—" : v + " %");
