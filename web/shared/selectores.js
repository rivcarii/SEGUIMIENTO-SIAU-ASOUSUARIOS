// Selectores de mes y de fecha con la misma apariencia que el resto de la plataforma (en lugar de los cuadros nativos del navegador).
// Uso: selectorMes({ value: "2026-09", onchange: () => …, opcional: true, vacio: "Todos los meses" }) → elemento con .value ("YYYY-MM" o "")
//      selectorFecha({ value: "2026-09-10", onchange, opcional }) → elemento con .value ("YYYY-MM-DD" o "")
import { h } from "./comun.js";

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const p2 = (n) => String(n).padStart(2, "0");
const hoyISO = () => { const d = new Date(); return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`; };
const cap = (t) => t[0].toUpperCase() + t.slice(1);
let abierto = null; // solo un selector abierto a la vez

function crear({ value = "", onchange, opcional = false, vacio, "aria-label": etiqueta, tipo, texto, panel }) {
  const boton = h("button", { type: "button", class: "sel-btn", "aria-haspopup": "dialog", "aria-expanded": "false", "aria-label": etiqueta ? `${etiqueta}: ${texto(value) || vacio || ""}` : null });
  const el = h("div", { class: "selector" }, boton);
  let v = value, pop = null;
  const pintarBoton = () => { boton.textContent = ""; boton.append(h("span", { class: v ? "" : "ph" }, texto(v) || vacio || "Elegir"), h("i", { class: "flecha", "aria-hidden": "true" })); if (etiqueta) boton.setAttribute("aria-label", `${etiqueta}: ${texto(v) || vacio || "sin elegir"}`); };
  const poner = (nuevo, avisar = true) => { v = nuevo; pintarBoton(); if (avisar) { onchange?.(v); el.dispatchEvent(new Event("change")); } };
  Object.defineProperty(el, "value", { get: () => v, set: (x) => poner(x || "", false) });
  const cerrar = (devolverFoco = true) => {
    if (!pop) return;
    const p = pop; pop = null; abierto = null; boton.setAttribute("aria-expanded", "false");
    document.removeEventListener("pointerdown", fuera, true); document.removeEventListener("keydown", tecla, true);
    p.classList.remove("abierto"); setTimeout(() => p.remove(), 140); if (devolverFoco) boton.focus();
  };
  const fuera = (e) => { if (!el.contains(e.target)) cerrar(false); };
  const tecla = (e) => { if (e.key === "Escape") { e.stopPropagation(); cerrar(); } };
  const abrir = () => {
    abierto?.(); abierto = () => cerrar(false);
    pop = h("div", { class: "sel-pop", role: "dialog", "aria-label": etiqueta || "Elegir" });
    pop.append(panel({ valor: v, opcional, elegir: (x) => { poner(x); cerrar(); }, borrar: () => { poner(""); cerrar(); } }));
    el.append(pop); boton.setAttribute("aria-expanded", "true");
    const r = boton.getBoundingClientRect(); if (r.left + 300 > window.innerWidth) pop.classList.add("der"); if (window.innerHeight - r.bottom < 340 && r.top > 340) pop.classList.add("arriba");
    requestAnimationFrame(() => { pop.classList.add("abierto"); (pop.querySelector("[aria-pressed=true]") ?? pop.querySelector("button"))?.focus({ preventScroll: true }); });
    document.addEventListener("pointerdown", fuera, true); document.addEventListener("keydown", tecla, true);
  };
  boton.addEventListener("click", () => (pop ? cerrar() : abrir()));
  pintarBoton();
  return el;
}

const flecha = (txt, etiqueta, fn) => h("button", { type: "button", class: "sel-nav", "aria-label": etiqueta, onclick: fn }, txt);

export function selectorMes(attrs = {}) {
  return crear({ ...attrs, texto: (v) => (v ? `${cap(MESES[+v.slice(5) - 1])} ${v.slice(0, 4)}` : ""), panel: ({ valor, opcional, elegir, borrar }) => {
    let anio = valor ? +valor.slice(0, 4) : new Date().getFullYear();
    const cab = h("div", { class: "sel-cab" }), grid = h("div", { class: "sel-meses" });
    const hoy = hoyISO().slice(0, 7);
    const pintar = () => {
      cab.replaceChildren(flecha("‹", "Año anterior", () => { anio--; pintar(); }), h("b", {}, String(anio)), flecha("›", "Año siguiente", () => { anio++; pintar(); }));
      grid.replaceChildren(...CORTOS.map((c, i) => { const m = `${anio}-${p2(i + 1)}`; return h("button", { type: "button", class: "sel-celda" + (m === hoy ? " hoy" : ""), "aria-pressed": String(m === valor), "aria-label": `${cap(MESES[i])} ${anio}`, onclick: () => elegir(m) }, c); }));
    };
    pintar();
    return h("div", {}, cab, grid, h("div", { class: "sel-pie" }, opcional ? h("button", { type: "button", class: "sel-link", onclick: borrar }, "Todos") : h("span"), h("button", { type: "button", class: "sel-link", onclick: () => elegir(hoy) }, "Este mes")));
  } });
}

export function selectorFecha(attrs = {}) {
  return crear({ ...attrs, texto: (v) => (v ? `${+v.slice(8)} de ${CORTOS[+v.slice(5, 7) - 1]} de ${v.slice(0, 4)}` : ""), panel: ({ valor, opcional, elegir, borrar }) => {
    const base = valor || hoyISO();
    let anio = +base.slice(0, 4), mes = +base.slice(5, 7) - 1;
    const cab = h("div", { class: "sel-cab" }), sem = h("div", { class: "sel-sem" }, ["L", "M", "M", "J", "V", "S", "D"].map((d) => h("span", {}, d))), grid = h("div", { class: "sel-dias" });
    const hoy = hoyISO();
    const mover = (n) => { mes += n; if (mes < 0) { mes = 11; anio--; } if (mes > 11) { mes = 0; anio++; } pintar(); };
    const pintar = () => {
      cab.replaceChildren(flecha("‹", "Mes anterior", () => mover(-1)), h("b", {}, `${cap(MESES[mes])} ${anio}`), flecha("›", "Mes siguiente", () => mover(1)));
      const primero = (new Date(anio, mes, 1).getDay() + 6) % 7, n = new Date(anio, mes + 1, 0).getDate();
      grid.replaceChildren(...Array.from({ length: primero }, () => h("span")), ...Array.from({ length: n }, (_, i) => { const f = `${anio}-${p2(mes + 1)}-${p2(i + 1)}`; return h("button", { type: "button", class: "sel-celda dia" + (f === hoy ? " hoy" : ""), "aria-pressed": String(f === valor), "aria-label": `${i + 1} de ${MESES[mes]} de ${anio}`, onclick: () => elegir(f) }, String(i + 1)); }));
    };
    pintar();
    return h("div", {}, cab, sem, grid, h("div", { class: "sel-pie" }, opcional ? h("button", { type: "button", class: "sel-link", onclick: borrar }, "Borrar") : h("span"), h("button", { type: "button", class: "sel-link", onclick: () => elegir(hoy) }, "Hoy")));
  } });
}
