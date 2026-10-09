// Motor de consulta: una medida + una agrupación + filtros. También entiende frases como «encuestas por sede en septiembre».
import { api, h, mesActual, opciones, sk } from "../shared/comun.js";
import { COLOR, barrasMes, area, barrasH, mesCorto } from "../shared/graficos.js";

const sin = (t) => String(t ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const mesTxt = (m) => `${MESES[Number(m.slice(5)) - 1]} ${m.slice(0, 4)}`;
const restar = (mes, n) => { let a = Number(mes.slice(0, 4)), m = Number(mes.slice(5)) - n; while (m < 1) { m += 12; a--; } return `${a}-${String(m).padStart(2, "0")}`; };
const EJEMPLOS = ["Encuestas por sede en septiembre", "Charlas por SIAU este mes", "Puntaje NPS por mes últimos 6 meses", "Actas pendientes por sede", "Evidencias por tipo últimos 3 meses", "Encuestas médicas por mes"];

/** Convierte una frase en los filtros de la consulta (lo que no entienda lo deja como está). */
export function interpretar(texto, cfg, actual) {
  const t = sin(texto), q = { ...actual }, hoy = mesActual();
  const tiene = (...p) => p.some((x) => t.includes(x));
  if (tiene("puntaje", "promotor", "detractor") && tiene("medic")) q.medida = "medica_puntaje";
  else if (tiene("puntaje", "promotor", "detractor") || /\bnps\b/.test(t) && tiene("puntaje")) q.medida = "nps_puntaje";
  else if (tiene("medic")) q.medida = "encuestas_medica";
  else if (tiene("satisfaccion") || /\bnps\b/.test(t)) q.medida = "encuestas_nps";
  else if (tiene("encuesta")) q.medida = "encuestas_total";
  else if (tiene("charla") && tiene("funcionario")) q.medida = "charlas_funcionarios";
  else if (tiene("charla") && tiene("usuario")) q.medida = "charlas_usuarios";
  else if (tiene("charla")) q.medida = "charlas";
  else if (tiene("actividad") && tiene("lsc", "interprete")) q.medida = "lsc_actividades";
  else if (tiene("interprete", "lsc", "senas")) q.medida = "lsc_atenciones";
  else if (tiene("acta") && tiene("pendiente", "falta", "sin entregar")) q.medida = "actas_pendientes";
  else if (tiene("acta")) q.medida = "actas_entregadas";
  else if (tiene("evidencia", "foto", "documento", "pdf")) q.medida = "evidencias";
  if (tiene("por tipo", "cada tipo")) q.por = "tipo"; else if (tiene("por siau", "cada siau", "por tecnico", "cada tecnico", "ranking")) q.por = "siau";
  else if (tiene("por sede", "cada sede", "las sedes")) q.por = "sede"; else if (tiene("por mes", "mensual", "tendencia", "evolucion", "cada mes")) q.por = "mes";
  const anio = (/\b(20\d\d)\b/.exec(t) ?? [])[1] ?? hoy.slice(0, 4);
  const mi = MESES.findIndex((m) => t.includes(m)), n = /ultimos?\s+(\d+)\s+mes/.exec(t);
  if (n) { q.hasta = hoy; q.desde = restar(hoy, Math.min(23, Number(n[1]) - 1)); }
  else if (mi >= 0) { q.desde = q.hasta = `${anio}-${String(mi + 1).padStart(2, "0")}`; }
  else if (tiene("este mes", "mes actual")) q.desde = q.hasta = hoy;
  else if (tiene("este ano", "en el ano")) { q.desde = `${hoy.slice(0, 4)}-01`; q.hasta = hoy; }
  q.sede = ""; q.siau = "";
  for (const s of cfg.sedes) if (t.includes(sin(s.nombre.replace(/^[CP]\.\s*/, "")))) { q.sede = String(s.id); break; }
  for (const x of cfg.tecnicos.filter((y) => y.rol === "tecnico")) { const [a, b] = sin(x.nombre).split(/\s+/); if (a && b && t.includes(a) && t.includes(b)) { q.siau = String(x.id); if (q.por === "siau") q.por = "mes"; break; } }
  return q;
}

const descargarCsv = (r) => {
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = "﻿" + [[r.por === "mes" ? "Mes" : r.por === "sede" ? "Sede" : r.por === "siau" ? "SIAU" : "Tipo", r.medida.etiqueta], ...r.filas.map((f) => [f.etiqueta, f.valor ?? ""]), ["Total", r.total ?? ""]].map((f) => f.map(esc).join(";")).join("\r\n");
  const a = h("a", { href: URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })), download: `consulta-${r.medida.clave}-${r.por}.csv` });
  document.body.append(a); a.click(); a.remove();
};

export async function vistaConsultas(c, S) {
  const hoy = mesActual(), q = S.consulta ??= { medida: "encuestas_total", por: "mes", desde: restar(hoy, 5), hasta: hoy, sede: "", siau: "" };
  const cfg = S.cfg;
  const texto = h("input", { type: "search", placeholder: "Escriba lo que necesita: «encuestas por sede en septiembre»", "aria-label": "Consulta en lenguaje natural", value: S.consultaTexto ?? "" });
  const medida = h("select", { "aria-label": "Medida" }), por = h("select", { "aria-label": "Agrupar por" }), desde = h("input", { type: "month", "aria-label": "Desde", value: q.desde }), hasta = h("input", { type: "month", "aria-label": "Hasta", value: q.hasta });
  const sede = h("select", { "aria-label": "Sede" }), siau = h("select", { "aria-label": "SIAU" }), salida = h("div", { "aria-live": "polite" });
  opciones(sede, cfg.sedes, "id", "nombre", "Todas las sedes"); opciones(siau, cfg.tecnicos.filter((t) => t.rol === "tecnico"), "id", "nombre", "Todos los SIAU");
  por.replaceChildren(...[["mes", "Mes"], ["sede", "Sede"], ["siau", "SIAU"], ["tipo", "Tipo de evidencia"]].map(([v, n]) => h("option", { value: v }, "Agrupar por: " + n)));
  let medidas = [];
  const leer = () => Object.assign(q, { medida: medida.value || q.medida, por: por.value, desde: desde.value, hasta: hasta.value, sede: sede.value, siau: siau.value });
  const poner = () => { medida.value = q.medida; por.value = q.por; desde.value = q.desde; hasta.value = q.hasta; sede.value = q.sede; siau.value = q.siau; };

  async function ejecutar() {
    leer(); salida.replaceChildren(h("div", { class: "cargando-centro", role: "status" }, h("span", { class: "rueda" }), "Consultando…"), sk("l-grafico"));
    const p = new URLSearchParams(Object.fromEntries(Object.entries(q).filter(([, v]) => v)));
    let r;
    try { r = await api("/api/consulta?" + p); } catch (e) { return salida.replaceChildren(h("div", { class: "msg err" }, e.message)); }
    if (!medidas.length) { medidas = r.medidas; medida.replaceChildren(...medidas.map((m) => h("option", { value: m.clave }, m.etiqueta))); poner(); }
    const sub = `${r.medida.etiqueta} · ${r.por === "mes" ? "por mes" : r.por === "sede" ? "por sede" : r.por === "siau" ? "por SIAU" : "por tipo"} · ${mesTxt(r.meses[0])}${r.meses.length > 1 ? " – " + mesTxt(r.meses.at(-1)) : ""}`;
    const miles = (v) => (v == null ? "—" : Number(v).toLocaleString("es-CO"));
    const grafico = !r.filas.length ? h("p", { class: "mut" }, "No hay datos con esos filtros.")
      : r.por === "mes" && r.filas.length > 1 ? barrasMes(r.filas.map((f) => ({ mes: f.clave, v: f.valor ?? 0 })), [{ clave: "v", etq: r.medida.etiqueta, color: COLOR.nps }], { titulo: sub })
      : barrasH(r.filas.slice(0, 15).map((f) => ({ etq: f.etiqueta, valor: f.valor })), { color: COLOR.nps });
    salida.replaceChildren(h("section", { class: "card" }, h("h3", { style: "margin:0 0 2px;color:var(--azul)" }, sub), h("p", { class: "sub mut", style: "margin:0 0 10px" }, r.filas.length ? `${r.filas.length} fila(s)` : ""), grafico),
      r.filas.length ? h("section", { class: "card scroll", style: "margin-top:14px" }, h("table", { class: "cient" },
        h("thead", {}, h("tr", {}, h("th", {}, r.por === "mes" ? "Mes" : r.por === "sede" ? "Sede" : r.por === "siau" ? "SIAU" : "Tipo"), h("th", { class: "num" }, r.medida.etiqueta))),
        h("tbody", {}, r.filas.map((f) => h("tr", {}, h("td", {}, r.por === "mes" ? mesCorto(f.clave) + " " + f.clave.slice(0, 4) : f.etiqueta), h("td", { class: "num" }, miles(f.valor))))),
        h("tfoot", {}, h("tr", {}, h("th", {}, medidas.find((m) => m.clave === r.medida.clave)?.etiqueta.includes("Puntaje") ? "Promedio" : "Total"), h("th", { class: "num" }, miles(r.total))))),
        h("p", {}, h("button", { class: "btn sec", onclick: () => descargarCsv(r) }, "Descargar CSV (Excel)"))) : "");
  }

  const preguntar = () => { Object.assign(q, interpretar(texto.value, cfg, q)); S.consultaTexto = texto.value; poner(); return ejecutar(); };
  for (const el of [medida, por, desde, hasta, sede, siau]) el.addEventListener("change", ejecutar);
  c.replaceChildren(
    h("section", { class: "card" }, h("h3", { style: "margin:0 0 6px;color:var(--azul)" }, "Consultar los datos"),
      h("form", { class: "filters", onsubmit: (e) => { e.preventDefault(); preguntar(); } }, texto, h("button", { class: "btn" }, "Consultar")),
      h("div", { class: "chips", style: "margin:8px 0" }, EJEMPLOS.map((x) => h("button", { type: "button", class: "chip-sede suave", style: "border:0;cursor:pointer", onclick: () => { texto.value = x; preguntar(); } }, x))),
      h("p", { class: "mut", style: "margin:8px 0 4px" }, "O arme la consulta con los filtros:"),
      h("div", { class: "filters" }, medida, por, desde, hasta, sede, siau)),
    h("div", { style: "height:14px" }), salida);
  await ejecutar();
}
