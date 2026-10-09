import { api, h, mesActual, fmtFecha, opciones, pintarMarca, mascota, tituloGrande, mesLegible, recurso } from "../shared/comun.js";

const app = document.getElementById("app"), dlg = document.getElementById("dlg"), dlgc = document.getElementById("dlgc"), tabbar = document.getElementById("tabbar");
const S = { cfg: null, area: "siau", vista: "cumplimiento", mes: mesActual(), filtros: {} };
const PAGINA = 24;
const AREAS = ["siau", "asociacion"];
const delay = (i) => `--d:${Math.min(i, 8) * 40}ms`;
let tg, seg, segThumb, cont, tabThumb;

async function iniciar() {
  try { S.cfg = await api("/api/config"); }
  catch (e) { return app.replaceChildren(h("div", { class: "login" }, mascota("atento", 170), h("div", { class: "card" }, h("h2", {}, "No se pudo abrir"), h("p", {}, e.message)))); }
  pintarMarca(S.cfg.marca);
  api("/api/sesion").then((u) => { if (u.rol === "admin") document.getElementById("irAdmin").hidden = false; }).catch(() => {});
  montar();
  render();
}

// Estructura persistente: los indicadores deslizantes conservan su elemento y por eso animan entre estados.
function montar() {
  tg = tituloGrande("", "");
  segThumb = h("i", { class: "thumb" });
  seg = h("div", { class: "seg glass", role: "tablist" }, segThumb);
  cont = h("div");
  app.replaceChildren(tg.el, seg, cont);

  tabThumb = h("i", { class: "thumb" });
  tabbar.style.setProperty("--n", AREAS.length);
  tabbar.replaceChildren(tabThumb, ...AREAS.map((a) => h("button", { role: "tab", "data-area": a, onclick: () => { if (S.area !== a) { S.area = a; S.filtros = {}; S.vista = a === "siau" ? "cumplimiento" : "evidencias"; render(); } } },
    h("img", { src: recurso(a === "siau" ? "/shared/marca/medalla.png" : "/shared/marca/asociacion-icono.png"), alt: "" }), S.cfg.marca[a === "siau" ? "nombre_siau" : "nombre_asociacion"])));
  tabbar.hidden = false;
}

function render() {
  pintarMarca(S.cfg.marca, S.area);
  tabbar.style.setProperty("--i", AREAS.indexOf(S.area));
  for (const b of tabbar.querySelectorAll("button")) b.setAttribute("aria-selected", b.dataset.area === S.area);
  tg.kicker.textContent = "Cuaderno de evidencias · 2026";
  tg.titulo.textContent = "Evidencias " + (S.area === "siau" ? S.cfg.marca.nombre_siau : S.cfg.marca.nombre_asociacion);
  document.querySelector(".nav-titulo").textContent = tg.titulo.textContent;

  const vistas = S.area === "siau" ? [["cumplimiento", "Cumplimiento"], ["evidencias", "Muestras"], ["ludoteca", "Ludoteca"]] : [["evidencias", "Muestras"]];
  seg.hidden = vistas.length < 2;
  seg.style.setProperty("--n", vistas.length);
  seg.style.setProperty("--i", Math.max(0, vistas.findIndex(([v]) => v === S.vista)));
  seg.replaceChildren(segThumb, ...vistas.map(([v, n]) => h("button", { role: "tab", "aria-selected": v === S.vista, onclick: () => { if (S.vista !== v) { S.vista = v; render(); } } }, n)));
  cont.className = "entra";
  cont.replaceChildren();
  ({ cumplimiento: vistaCumplimiento, evidencias: vistaEvidencias, ludoteca: vistaLudoteca }[S.vista])(cont);
}

const sec = (n, titulo, ...extra) => h("div", { class: "encab" }, h("span", { class: "n" }, "§" + n), h("h2", {}, titulo), ...extra);

// ---------- Cumplimiento individual por SIAU
const clase = (p) => (p >= 100 ? "" : p >= 60 ? "mid" : "low");
const pctDe = (t, m) => (m > 0 ? Math.min(100, Math.round((t / m) * 100)) : 100);
const medidor = (m) => { const p = pctDe(m.valor, m.meta); return h("div", { class: "celda-meta" }, h("span", { class: "num" }, m.meta == null ? String(m.valor) : `${m.valor} / ${m.meta}`),
  m.meta ? h("div", { class: "gauge " + clase(p), role: "img", "aria-label": `${p}% de la meta` }, h("i", { style: `transform:scaleX(${p / 100})` })) : ""); };

async function vistaCumplimiento(c) {
  const mes = h("input", { type: "month", value: S.mes, "aria-label": "Mes", onchange: () => { S.mes = mes.value || mesActual(); render(); } });
  c.append(h("p", { class: "mut" }, "Cargando…"));
  let d, est;
  try { [d, est] = await Promise.all([api("/api/cumplimiento?mes=" + S.mes), api("/api/estado").catch(() => null)]); }
  catch (e) { return c.replaceChildren(h("div", { class: "msg err" }, e.message)); }

  const filas = d.siau.tecnicos, evaluados = filas.filter((t) => !t.ausente);
  const cumplen = evaluados.filter((t) => t.encuestas.cumple !== false && t.charlas.cumple !== false).length;
  const frac = evaluados.length ? cumplen / evaluados.length : null;
  const pose = frac == null ? "siau" : frac >= 1 ? "pulgar" : frac < 0.6 ? "dardo" : "siau";
  const metaEnc = filas.find((t) => t.encuestas.meta)?.encuestas.meta, metaCh = filas.find((t) => t.charlas.meta)?.charlas.meta;
  const titulo = frac == null ? "Aún no hay personal o consolidados cargados para este mes." : frac >= 1 ? `¡Los ${evaluados.length} SIAU cumplen sus metas de ${mesLegible(d.mes)}!` : `${cumplen} de ${evaluados.length} SIAU cumplen sus metas mínimas de ${mesLegible(d.mes)}.`;
  const detalle = [`Meta mensual por SIAU: ${metaEnc ?? 90} encuestas · ${metaCh ?? 200} charlas`, d.siau.sin_cobertura.length && `${d.siau.sin_cobertura.length} sede(s) sin SIAU`].filter(Boolean).join(" · ");
  const hero = h("div", { class: "hero" }, mascota(pose), h("div", { class: "card glass globo" }, h("div", { class: "titulo" }, titulo), h("div", { class: "detalle" }, detalle)));

  const nombreCorto = (n) => n.split(/\s+/).filter(Boolean).map((x) => x[0] + x.slice(1).toLowerCase()).join(" ");
  const tabla = filas.length ? h("div", { class: "card scroll" }, h("table", { class: "cient" },
    h("thead", {}, h("tr", {}, ["SIAU", "Días", "Encuestas", "Charlas", "NPS", "Actas"].map((t) => h("th", {}, t)))),
    h("tbody", {}, filas.map((t) => h("tr", { class: t.ausente ? "ausente" : "" },
      h("td", {}, h("div", { style: "font-weight:800" }, nombreCorto(t.nombre)), h("div", { class: "mut" }, t.sedes.length ? t.sedes.join(" · ") : "Sin sedes asignadas")),
      h("td", { class: "num" }, t.ausente ? h("span", { class: "badge" }, t.ausencias[0]?.tipo ?? "ausente") : `${t.dias_activos}/${t.dias_mes}`, t.ausencias.length && !t.ausente ? h("div", { class: "mut" }, t.ausencias.map((a) => a.tipo).join(", ")) : ""),
      h("td", {}, t.ausente ? "—" : medidor(t.encuestas)), h("td", {}, t.ausente ? "—" : medidor(t.charlas)),
      h("td", { class: "num" }, t.nps == null ? "—" : String(t.nps)),
      h("td", { class: "num", title: t.actas.pendientes.map((p) => `${p.sede} · ${p.codigo}`).join("\n") }, t.actas.esperadas ? `${t.actas.entregadas}/${t.actas.esperadas}` : "—", t.actas.pendientes.length ? h("div", { class: "mut" }, `${t.actas.pendientes.length} pendiente(s)`) : ""))))))
    : h("div", { class: "card vacio" }, mascota("manos", 120), "Sin personal cargado: el horario se sincroniza con el script, o agréguelo en Administrador → Personal.");

  const sinCob = d.siau.sin_cobertura.length ? h("div", { class: "card" }, h("div", { class: "mut", style: "margin-bottom:8px" }, `${d.siau.sin_cobertura.length} sede(s) este mes sin un SIAU que las atienda:`),
    h("div", { class: "chips" }, d.siau.sin_cobertura.map((x) => h("span", { class: "chip-sede", title: x.motivo }, x.sede)))) : "";

  const ac = d.actas_consolidado;
  const actas = ac ? h("div", { class: "card scroll" },
    h("p", { class: "mut", style: "margin:0 0 8px" }, `${ac.entregadas} de ${ac.esperadas} actas entregadas hasta hoy (${ac.codigos.join(", ") || "—"}). El calendario sale del propio consolidado.`),
    ac.sedes_pendientes.length ? h("table", { class: "cient" }, h("thead", {}, h("tr", {}, h("th", {}, "Sede"), h("th", {}, "Actas pendientes"))),
      h("tbody", {}, ac.sedes_pendientes.map((x) => h("tr", {}, h("td", {}, x.sede), h("td", { class: "num" }, x.pendientes.map((p) => `${p.codigo} (${fmtFecha(p.fecha)})`).join(", ")))))) : h("p", {}, "Todas las sedes están al día."))
    : h("div", { class: "card" }, h("p", { class: "mut" }, "Aún no se ha sincronizado el consolidado de buzón."));

  const l = d.lsc;
  const lsc = l ? h("div", { class: "grid" },
    h("div", { class: "card" }, h("div", { class: "mut" }, "Atenciones con intérprete"), h("div", { class: "big", style: "margin-top:6px" }, String(l.atenciones))),
    h("div", { class: "card" }, h("div", { class: "mut" }, "Actividades LSC"), h("div", { class: "big", style: "margin-top:6px" }, String(l.actividades), " ", h("small", {}, `${l.asistentes} asistentes`))),
    h("div", { class: "card" }, h("div", { class: "mut" }, "Sedes atendidas"), h("div", { class: "big", style: "margin-top:6px" }, String(l.sedes)), l.por_sede.length ? h("div", { class: "leyenda" }, l.por_sede.slice(0, 3).map((x) => `${x.sede} ${x.atenciones}`).join(" · ")) : "")) : h("div", { class: "card" }, h("p", { class: "mut" }, "Sin registros de acompañamiento LSC para este mes."));

  const avisos = [d.sin_reconocer ? h("div", { class: "msg err" }, `${d.sin_reconocer} nombre(s) de sede de los consolidados no se reconocieron; no se están contando. Corríjalos en Administrador → Personal y rotación.`) : "",
    d.sincronizado ? h("p", { class: "leyenda" }, `Consolidados sincronizados: ${d.sincronizado} UTC.`) : ""];
  const hall = (est?.hallazgos ?? []).filter((x) => x.nivel !== "info");
  const bot = hall.length ? h("div", { class: "msg err" }, h("b", {}, "Atención con los datos: "), hall.slice(0, 4).map((x) => h("div", {}, "• " + x.texto))) : "";

  c.replaceChildren(hero, h("div", { class: "filters" }, h("label", { style: "margin:0" }, "Periodo de observación"), mes), ...avisos,
    sec(1, "Cumplimiento por SIAU"), tabla, h("p", { class: "leyenda" }, h("b", {}, "Tabla 1."), " Metas mínimas por SIAU. Lo registrado en cada sede se reparte entre quienes la atienden; la meta baja en proporción a los días de vacaciones o licencia."),
    ...(sinCob ? [sec(2, "Sedes sin cobertura"), sinCob] : []),
    sec(sinCob ? 3 : 2, "Actas de buzón"), actas, h("p", { class: "leyenda" }, h("b", {}, "Tabla 2."), " Actas de apertura de buzón vencidas y no entregadas."),
    sec(sinCob ? 4 : 3, "Acompañamiento LSC (intérprete)"), lsc, bot);
}

// ---------- Ludoteca (en construcción)
function vistaLudoteca(c) {
  c.append(sec(1, "Ludoteca"), h("div", { class: "card vacio", style: "flex-direction:column;text-align:center" },
    mascota("atento", 190), h("h2", {}, "En construcción"),
    h("p", { class: "mut", style: "max-width:52ch" }, "Aquí se mostrarán las actividades de ludoteca por mes, los niños y niñas atendidos, las encuestas aplicadas y las evidencias fotográficas. La fuente prevista es la hoja LUDOTECA del registro del intérprete."),
    h("img", { src: recurso("/shared/marca/ludoteca.png"), alt: "Proyecto Ludoteca", style: "max-height:90px;max-width:80%" })));
}

// ---------- Muestras (galería)
function vistaEvidencias(c) {
  const tipos = S.cfg.tipos.filter((t) => t.area === S.area);
  const f = S.filtros;
  const sel = (k, lista, etiqueta, valor, texto) => { const s = h("select", { "aria-label": etiqueta, onchange: () => { f[k] = s.value; cargar(true); } }); opciones(s, lista, valor, texto, etiqueta); s.value = f[k] ?? ""; return s; };
  const mes = h("input", { type: "month", value: f.mes ?? "", "aria-label": "Mes", onchange: () => { f.mes = mes.value; cargar(true); } });
  const lista = h("div", { class: "grid" }), pie = h("div", { style: "text-align:center;margin:18px" });
  c.append(sec(1, "Muestras registradas"),
    h("div", { class: "filters" }, sel("tipo", tipos, "Todos los tipos", "clave", "nombre"), sel("sede", S.cfg.sedes, "Todas las sedes", "id", "nombre"),
      S.area === "siau" ? sel("tecnico", S.cfg.tecnicos, "Todos los técnicos", "id", "nombre") : "", mes), lista, pie);

  let offset = 0;
  async function cargar(reset) {
    if (reset) { offset = 0; lista.replaceChildren(); }
    const q = new URLSearchParams({ area: S.area, limit: PAGINA, offset });
    for (const [k, v] of Object.entries(f)) if (v) q.set(k, v);
    let r;
    try { r = await api("/api/evidencias?" + q); } catch (e) { return pie.replaceChildren(h("div", { class: "msg err" }, e.message)); }
    const base = offset;
    lista.append(...r.items.map((e, i) => tarjeta(e, base === 0 ? i : 0)));
    offset += r.items.length;
    pie.replaceChildren(offset < r.total ? h("button", { class: "btn sec", onclick: () => cargar(false) }, `Ver más (${r.total - offset})`)
      : r.total ? h("span", { class: "leyenda" }, `${r.total} muestra(s)`) : h("div", { class: "vacio" }, mascota("manos", 130), "No hay muestras con estos filtros."));
  }
  cargar(true);
}

function tarjeta(e, i) {
  return h("button", { class: "card ev", style: delay(i), onclick: () => detalle(e) },
    h("div", { class: "ph" }, e.portada ? h("img", { src: e.portada, alt: "", loading: "lazy" }) : e.fotos_ids.length ? "foto en Drive" : "sin imagen"),
    h("div", { class: "cu" }, h("div", { class: "id" }, "Muestra N.º " + String(e.id).padStart(4, "0")), h("span", { class: "badge" }, e.tipo_nombre), h("h3", {}, e.titulo), h("div", { class: "mut" }, [fmtFecha(e.fecha), e.sede].filter(Boolean).join(" · "))));
}

/** La foto completa se pide al abrir la muestra (viene de Drive por el servidor, no por un enlace público). */
function foto(id, alt) {
  const ph = h("div", { class: "mut", style: "padding:24px;text-align:center" }, "Cargando imagen…"), caja = h("div", {}, ph);
  api("/api/foto?id=" + encodeURIComponent(id)).then((r) => caja.replaceChildren(h("a", { href: r.data, target: "_blank", rel: "noopener" }, h("img", { src: r.data, alt })))).catch((e) => ph.replaceChildren("No se pudo cargar: " + e.message));
  return caja;
}

function detalle(e) {
  dlgc.replaceChildren(
    h("div", { style: "display:flex;justify-content:space-between;gap:12px;align-items:flex-start" }, h("div", {}, h("div", { class: "kicker" }, "Muestra N.º " + String(e.id).padStart(4, "0")), h("span", { class: "badge" }, e.tipo_nombre), h("h2", { style: "margin:8px 0" }, e.titulo)), h("button", { class: "btn sec", onclick: () => dlg.close() }, "Cerrar")),
    h("p", { class: "mut num" }, [fmtFecha(e.fecha), e.sede, e.tecnico && "Técnico: " + e.tecnico, e.cantidad > 1 && `Cantidad: ${e.cantidad}`, e.asistentes != null && `Asistentes: ${e.asistentes}`].filter(Boolean).join(" · ")),
    e.descripcion ? h("p", { style: "white-space:pre-wrap" }, e.descripcion) : "",
    h("div", { class: "fotos" }, e.fotos_ids.map((id, i) => foto(id, `${e.titulo} · imagen ${i + 1}`))),
    e.fotos_ids.length ? h("p", { class: "leyenda" }, h("b", {}, "Fig."), " Imágenes de respaldo de la actividad.") : "");
  dlg.showModal();
}
dlg.addEventListener("click", (ev) => { if (ev.target === dlg) dlg.close(); });

iniciar();
