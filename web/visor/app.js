import { api, h, mesActual, fmtFecha, opciones, pintarMarca, mascota, tituloGrande, mesLegible, recurso } from "../shared/comun.js";

const app = document.getElementById("app"), dlg = document.getElementById("dlg"), dlgc = document.getElementById("dlgc"), tabbar = document.getElementById("tabbar");
const S = { cfg: null, area: "siau", vista: "cumplimiento", mes: mesActual(), filtros: {}, siau: "" };
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

  const todas = d.siau.tecnicos;
  if (S.siau && !todas.some((t) => String(t.tecnico_id) === S.siau)) S.siau = "";
  const filas = S.siau ? todas.filter((t) => String(t.tecnico_id) === S.siau) : todas, evaluados = filas.filter((t) => !t.ausente);
  const cumplen = evaluados.filter((t) => t.encuestas.cumple !== false && t.charlas.cumple !== false).length;
  const frac = evaluados.length ? cumplen / evaluados.length : null;
  const pose = frac == null ? "siau" : frac >= 1 ? "pulgar" : frac < 0.6 ? "dardo" : "siau";
  const metaEnc = filas.find((t) => t.encuestas.meta)?.encuestas.meta, metaCh = filas.find((t) => t.charlas.meta)?.charlas.meta;
  const nombreCorto = (n) => n.split(/\s+/).filter(Boolean).map((x) => x[0] + x.slice(1).toLowerCase()).join(" ");
  const quien = S.siau ? nombreCorto(filas[0].nombre) : null;
  const titulo = S.siau ? (filas[0].ausente ? `${quien} no está activo/a este mes (${filas[0].ausencias[0]?.tipo ?? "ausente"}).` : frac >= 1 ? `¡${quien} cumple sus metas de ${mesLegible(d.mes)}!` : `${quien} aún no cumple todas sus metas de ${mesLegible(d.mes)}.`) : frac == null ? "Aún no hay personal o consolidados cargados para este mes." : frac >= 1 ? `¡Los ${evaluados.length} SIAU cumplen sus metas de ${mesLegible(d.mes)}!` : `${cumplen} de ${evaluados.length} SIAU cumplen sus metas mínimas de ${mesLegible(d.mes)}.`;
  const detalle = [`Meta mensual por SIAU: ${metaEnc ?? 90} encuestas · ${metaCh ?? 200} charlas`, d.siau.sin_cobertura.length && `${d.siau.sin_cobertura.length} sede(s) sin SIAU`].filter(Boolean).join(" · ");
  const hero = h("div", { class: "hero" }, mascota(pose), h("div", { class: "card glass globo" }, h("div", { class: "titulo" }, titulo), h("div", { class: "detalle" }, detalle)));

  const filtroSiau = h("select", { "aria-label": "SIAU", onchange: () => { S.siau = filtroSiau.value; render(); } }, h("option", { value: "" }, `Todos los SIAU (${todas.length})`),
    ...todas.map((t) => h("option", { value: String(t.tecnico_id) }, nombreCorto(t.nombre))));
  filtroSiau.value = S.siau;
  // Resumen global (o de la persona elegida): suma lo logrado y las metas de quienes están activos
  const sum = (k, c) => evaluados.reduce((t, x) => t + (x[k][c] ?? 0), 0);
  const kpi = (etq, valor, meta, nota) => { const p = meta ? Math.min(100, Math.round((100 * valor) / meta)) : null; return h("div", { class: "card" }, h("div", { class: "mut" }, etq),
    h("div", { class: "big", style: "margin-top:6px" }, String(valor), meta ? h("small", {}, ` / ${meta}`) : ""),
    p == null ? "" : h("div", { class: "gauge " + clase(p), role: "img", "aria-label": `${p}% de la meta` }, h("i", { style: `transform:scaleX(${p / 100})` })), nota ? h("div", { class: "leyenda" }, nota) : ""); };
  const actEsp = evaluados.reduce((t, x) => t + x.actas.esperadas, 0), actEnt = evaluados.reduce((t, x) => t + x.actas.entregadas, 0);
  const resumen = evaluados.length ? h("div", { class: "grid" },
    S.siau ? "" : kpi("SIAU que cumplen", cumplen, evaluados.length, `${filas.length - evaluados.length ? filas.length - evaluados.length + " ausente(s) sin evaluar" : "Todos activos"}`),
    kpi("Encuestas", sum("encuestas", "valor"), sum("encuestas", "meta") || null, S.siau ? "" : "Suma de todos los SIAU activos"),
    kpi("Charlas", sum("charlas", "valor"), sum("charlas", "meta") || null, S.siau ? "" : "Suma de todos los SIAU activos"),
    kpi("Actas de buzón", actEnt, actEsp || null, "Entregadas hasta hoy")) : "";
  const detalleSiau = S.siau && filas[0] ? h("div", { class: "card" }, h("div", { class: "mut" }, "Sedes que atiende este mes"),
    h("div", { class: "chips", style: "margin-top:8px" }, filas[0].sedes.length ? filas[0].sedes.map((x) => h("span", { class: "chip-sede", style: "background:rgba(6,93,126,.12);color:var(--azul)" }, x)) : h("span", { class: "mut" }, "Sin sedes asignadas")),
    filas[0].ausencias.length ? h("p", { class: "mut" }, "Ausencias: " + filas[0].ausencias.map((a) => `${a.tipo} (${fmtFecha(a.desde)} → ${fmtFecha(a.hasta)})`).join(" · ")) : "") : "";
  // Encuestas por tipo: cuánto aporta cada una al total que se compara con la meta
  const nNps = sum("encuestas", "nps"), nMed = sum("encuestas", "medica"), nTot = nNps + nMed;
  const TIPOS_ENC = [["Satisfacción de usuarios (NPS)", nNps, true], ["Evaluación médico asistencial", nMed, true], ["Encuesta IAMI", null, false], ["Control prenatal", null, false]];
  const porTipo = evaluados.length ? h("div", { class: "card" }, h("h3", { style: "margin:0 0 4px" }, "Encuestas por tipo"),
    h("p", { class: "mut", style: "margin:0 0 10px" }, "Las encuestas de cada SIAU son la suma de los tipos con fuente en Drive."),
    ...TIPOS_ENC.map(([nombre, n, hay]) => h("div", { class: "tipo-enc" + (hay ? "" : " sin-fuente") }, h("span", { class: "t" }, nombre),
      h("span", { class: "n num" }, hay ? String(n) : "sin fuente aún"),
      hay ? h("span", { class: "barra", role: "img", "aria-label": `${nTot ? Math.round((100 * n) / nTot) : 0}% del total` }, h("i", { style: `transform:scaleX(${nTot ? n / nTot : 0})` })) : ""))) : "";

  // Una tarjeta por SIAU: lo más atrasado primero; quien está ausente al final
  const avance = (t) => Math.min(pctDe(t.encuestas.valor, t.encuestas.meta), pctDe(t.charlas.valor, t.charlas.meta));
  const estadoDe = (t) => t.ausente ? ["ausente", t.ausencias[0]?.tipo ?? "Ausente"] : t.encuestas.cumple !== false && t.charlas.cumple !== false ? ["cumple", "Cumple"] : avance(t) >= 60 ? ["camino", "En camino"] : ["atencion", "Atención"];
  const barra = (etq, m, detalle) => { const p = pctDe(m.valor, m.meta); return h("div", { class: "fila-meta" },
    h("div", { class: "et" }, h("span", {}, etq), h("b", { class: "num" }, m.meta == null ? String(m.valor) : `${m.valor} / ${m.meta}`)),
    m.meta ? h("div", { class: "barra " + clase(p), role: "img", "aria-label": `${etq}: ${p}% de la meta` }, h("i", { style: `transform:scaleX(${p / 100})` })) : "",
    detalle ? h("div", { class: "sub" }, detalle) : ""); };
  const ordenadas = [...filas].sort((x, y) => (x.ausente - y.ausente) || (avance(x) - avance(y)) || x.nombre.localeCompare(y.nombre, "es"));
  const tarjetaSiau = (t) => { const [cls, txt] = estadoDe(t); return h("article", { class: "siau-card " + cls },
    h("header", {}, h("h3", {}, nombreCorto(t.nombre)), h("span", { class: "estado " + cls }, txt)),
    h("div", { class: "chips" }, t.sedes.length ? t.sedes.map((x) => h("span", { class: "chip-sede suave" }, x)) : h("span", { class: "mut" }, "Sin sedes asignadas")),
    t.ausente ? h("p", { class: "mut" }, t.ausencias.map((a) => `${a.tipo}: ${fmtFecha(a.desde)} → ${fmtFecha(a.hasta)}`).join(" · ")) : [
      barra("Encuestas", t.encuestas, `NPS ${t.encuestas.nps} · Médica ${t.encuestas.medica}`),
      barra("Charlas", t.charlas, t.charlas.meta == null ? "" : t.charlas.valor >= t.charlas.meta ? "Meta alcanzada" : `Faltan ${t.charlas.meta - t.charlas.valor}`),
      h("dl", { class: "mini" },
        h("div", {}, h("dt", {}, "Días"), h("dd", { class: "num" }, `${t.dias_activos}/${t.dias_mes}`)),
        h("div", {}, h("dt", {}, "NPS"), h("dd", { class: "num" }, t.nps == null ? "—" : String(t.nps))),
        h("div", { title: t.actas.pendientes.map((p) => `${p.sede} · ${p.codigo}`).join("\n") }, h("dt", {}, "Actas"), h("dd", { class: "num" }, t.actas.esperadas ? `${t.actas.entregadas}/${t.actas.esperadas}` : "—")))]); };
  const tabla = filas.length ? h("div", { class: "siau-grid" }, ordenadas.map(tarjetaSiau))
    : h("div", { class: "card vacio" }, mascota("manos", 120), "Sin personal cargado todavía.")

  const sinCob = d.siau.sin_cobertura.length ? h("div", { class: "card" }, h("div", { class: "mut", style: "margin-bottom:8px" }, `${d.siau.sin_cobertura.length} sede(s) este mes sin un SIAU que las atienda:`),
    h("div", { class: "chips" }, d.siau.sin_cobertura.map((x) => h("span", { class: "chip-sede", title: x.motivo }, x.sede)))) : "";

  const ac = d.actas_consolidado;
  const mias = S.siau && filas[0] ? filas[0].actas : null;
  const actas = mias ? h("div", { class: "card scroll" }, h("p", { class: "mut", style: "margin:0 0 8px" }, `${mias.entregadas} de ${mias.esperadas} actas entregadas hasta hoy en sus sedes.`),
    mias.pendientes.length ? h("table", { class: "cient" }, h("thead", {}, h("tr", {}, h("th", {}, "Sede"), h("th", {}, "Acta pendiente"))),
      h("tbody", {}, mias.pendientes.map((p) => h("tr", {}, h("td", {}, p.sede), h("td", { class: "num" }, `${p.codigo} (${fmtFecha(p.fecha)})`))))) : h("p", {}, "Está al día con sus actas.")) : ac ? h("div", { class: "card scroll" },
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

  c.replaceChildren(hero, h("div", { class: "filters" }, h("label", { style: "margin:0" }, "Periodo de observación"), mes, filtroSiau), ...avisos,
    sec(1, S.siau ? "Cumplimiento de " + quien : "Cumplimiento global"), resumen, ...(S.siau ? [] : [h("div", { style: "height:14px" }), porTipo]), detalleSiau,
    h("div", { style: "height:14px" }), sec(2, S.siau ? "Detalle" : "Cumplimiento por SIAU"), tabla, h("p", { class: "leyenda" }, h("b", {}, "Fig. 1."), " Metas mínimas por SIAU. Lo registrado en cada sede se reparte entre quienes la atienden; la meta baja en proporción a los días de vacaciones o licencia."),
    ...(sinCob && !S.siau ? [sec(3, "Sedes sin cobertura"), sinCob] : []),
    sec(sinCob && !S.siau ? 4 : 3, "Actas de buzón"), actas, h("p", { class: "leyenda" }, h("b", {}, "Tabla 2."), " Actas de apertura de buzón vencidas y no entregadas."),
    sec(sinCob && !S.siau ? 5 : 4, "Acompañamiento LSC (intérprete)"), lsc, bot);
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
