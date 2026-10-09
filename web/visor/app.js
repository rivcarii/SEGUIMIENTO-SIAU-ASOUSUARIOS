import { api, h, mesActual, fmtFecha, opciones, pintarMarca, mascota, tituloGrande, mesLegible, icono } from "/shared/comun.js";

const app = document.getElementById("app"), dlg = document.getElementById("dlg"), dlgc = document.getElementById("dlgc"), tabbar = document.getElementById("tabbar");
const S = { cfg: null, area: "siau", vista: "cumplimiento", mes: mesActual(), filtros: {} };
const PAGINA = 24;
const AREAS = ["siau", "asociacion"];
const delay = (i) => `--d:${Math.min(i, 8) * 40}ms`;
let tg, seg, segThumb, cont, tabThumb;

async function iniciar() {
  try { S.cfg = await api("/api/config"); }
  catch (e) { return e.status === 401 ? login() : app.replaceChildren(h("div", { class: "msg err" }, e.message)); }
  pintarMarca(S.cfg.marca);
  montar();
  render();
}

function login() {
  const pw = h("input", { type: "password", autocomplete: "current-password", required: true }), msg = h("div");
  app.replaceChildren(h("div", { class: "login" }, mascota(170), h("form", { class: "card", onsubmit: async (ev) => {
    ev.preventDefault();
    try { await api("/api/login", { json: { password: pw.value } }); location.reload(); }
    catch (e) { msg.replaceChildren(h("div", { class: "msg err" }, e.message)); }
  } }, h("h2", {}, "Acceso al cuaderno"), h("label", {}, "Contraseña"), pw, msg, h("p", {}, h("button", { class: "btn" }, "Entrar")))));
}

// Estructura persistente: los indicadores deslizantes conservan su elemento y por eso animan entre estados.
function montar() {
  tg = tituloGrande("", "");
  segThumb = h("i", { class: "thumb" });
  seg = h("div", { class: "seg glass", role: "tablist" }, segThumb);
  cont = h("div");
  app.replaceChildren(tg.el, seg, cont, h("p", { class: "pie" }, h("img", { src: "/shared/marca/medalla.png", alt: "" }), "SIAU · Subproceso de Gestión de la Calidad · MiRed IPS"));

  tabThumb = h("i", { class: "thumb" });
  tabbar.style.setProperty("--n", AREAS.length);
  tabbar.replaceChildren(tabThumb, ...AREAS.map((a) => h("button", { role: "tab", "data-area": a, onclick: () => { if (S.area !== a) { S.area = a; S.filtros = {}; S.vista = a === "siau" ? "cumplimiento" : "evidencias"; render(); } } },
    a === "siau" ? h("img", { src: "/shared/marca/medalla.png", alt: "" }) : icono("usuarios"), S.cfg.marca[a === "siau" ? "nombre_siau" : "nombre_asociacion"])));
  tabbar.hidden = false;
}

function render() {
  tabbar.style.setProperty("--i", AREAS.indexOf(S.area));
  for (const b of tabbar.querySelectorAll("button")) b.setAttribute("aria-selected", b.dataset.area === S.area);
  tg.kicker.textContent = "Cuaderno de evidencias · 2026";
  tg.titulo.textContent = "Evidencias " + (S.area === "siau" ? S.cfg.marca.nombre_siau : S.cfg.marca.nombre_asociacion);
  document.querySelector(".nav-titulo").textContent = tg.titulo.textContent;

  const vistas = S.area === "siau" ? [["cumplimiento", "Cumplimiento"], ["evidencias", "Muestras"]] : [["evidencias", "Muestras"]];
  seg.hidden = vistas.length < 2;
  seg.style.setProperty("--n", vistas.length);
  seg.style.setProperty("--i", Math.max(0, vistas.findIndex(([v]) => v === S.vista)));
  seg.replaceChildren(segThumb, ...vistas.map(([v, n]) => h("button", { role: "tab", "aria-selected": v === S.vista, onclick: () => { if (S.vista !== v) { S.vista = v; render(); } } }, n)));
  cont.className = "entra";
  cont.replaceChildren();
  (S.vista === "cumplimiento" ? vistaCumplimiento : vistaEvidencias)(cont);
}

const sec = (n, titulo, ...extra) => h("div", { class: "sec" }, h("span", { class: "n" }, "§" + n), h("h2", {}, titulo), ...extra);

// ---------- Cumplimiento (solo SIAU)
async function vistaCumplimiento(c) {
  const mes = h("input", { type: "month", value: S.mes, "aria-label": "Mes", onchange: () => { S.mes = mes.value || mesActual(); render(); } });
  c.append(h("p", { class: "mut" }, "Cargando…"));
  let d, ver;
  try { [d, ver] = await Promise.all([api("/api/cumplimiento?mes=" + S.mes), api("/api/verificacion")]); }
  catch (e) { return c.replaceChildren(h("div", { class: "msg err" }, e.message)); }

  const clase = (p) => (p >= 100 ? "" : p >= 60 ? "mid" : "low");
  const pctDe = (t, m) => Math.min(100, Math.round((t / m) * 100));
  const gauge = (t, m) => { const p = pctDe(t, m); return h("div", { class: "gauge " + clase(p), role: "img", "aria-label": `${p}% de la meta` }, h("i", { style: `transform:scaleX(${p / 100})` })); };

  const conMeta = d.tipos.filter((t) => t.meta);
  const pcts = conMeta.map((t) => t.alcance === "tecnico" && t.porTecnico.length ? t.porTecnico.reduce((s, x) => s + pctDe(x.total, t.meta), 0) / t.porTecnico.length : pctDe(t.total, t.meta));
  const prom = pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : null;
  const alDia = d.actas.filter((a) => !a.faltantes.length).length;
  const titulo = prom == null ? "Aún no hay metas configuradas." : prom >= 100 ? "¡Metas del mes cumplidas!" : `Llevamos ${prom}% de las metas de ${mesLegible(d.mes)}.`;
  const detalle = [...conMeta.map((t) => `${t.nombre.split(" ")[0]} ${t.total}/${t.meta}`), d.actas.length && `Actas al día ${alDia}/${d.actas.length} sedes`].filter(Boolean).join(" · ");

  const hero = h("div", { class: "hero" }, mascota(), h("div", { class: "card glass globo" }, h("div", { class: "titulo" }, titulo), h("div", { class: "detalle" }, detalle)));

  const metas = h("div", { class: "grid" }, conMeta.map((t, i) => h("div", { class: "card", style: delay(i) },
    h("div", { class: "mut" }, t.nombre),
    h("div", { class: "big", style: "margin-top:6px" }, String(t.total), " ", h("small", {}, `/ ${t.meta} ${t.alcance === "tecnico" ? "por técnico" : "al mes"}`)),
    t.alcance === "global" ? [gauge(t.total, t.meta), h("div", { class: "pct" }, h("span", {}, "0"), h("span", {}, pctDe(t.total, t.meta) + "%"), h("span", {}, String(t.meta)))] : "")));

  const tecnicos = d.tipos[0]?.porTecnico ?? [];
  const tabla = tecnicos.length ? h("div", { class: "card scroll" }, h("table", { class: "cient" },
    h("thead", {}, h("tr", {}, h("th", {}, "Técnico"), d.tipos.map((t) => h("th", {}, t.nombre)))),
    h("tbody", {}, tecnicos.map((tc, i) => h("tr", {}, h("td", {}, tc.nombre), d.tipos.map((t) => {
      const v = t.porTecnico[i].total;
      return h("td", { class: "num" }, t.meta && t.alcance === "tecnico" ? [`${v}/${t.meta}`, gauge(v, t.meta)] : String(v));
    })))))) : h("p", { class: "mut" }, "Aún no hay técnicos registrados.");

  const incompletas = d.actas.filter((a) => a.faltantes.length);
  const actas = h("div", { class: "card scroll" },
    h("p", { class: "mut", style: "margin:0 0 8px" }, d.actas.length ? `${alDia} de ${d.actas.length} sedes al día. Viernes del mes: ${d.viernes.length}.` : "Sin sedes registradas."),
    incompletas.length ? h("table", { class: "cient" }, h("thead", {}, h("tr", {}, h("th", {}, "Sede"), h("th", {}, "Entregadas"), h("th", {}, "Faltan (viernes)"))),
      h("tbody", {}, incompletas.map((a) => h("tr", {}, h("td", {}, a.nombre), h("td", { class: "num" }, `${a.entregadas}/${a.esperadas}`), h("td", { class: "num" }, a.faltantes.map((f) => fmtFecha(f)).join(", "))))) ) : "");

  const bot = ver ? h("p", { class: "leyenda" }, `Verificación automática del consolidado en Drive · periodo ${ver.periodo} · ${ver.creado} UTC · `, h("b", {}, ver.resumen.hallazgos?.length ? `${ver.resumen.hallazgos.length} hallazgo(s)` : "sin hallazgos")) : "";

  c.replaceChildren(hero,
    h("div", { class: "filters" }, h("label", { style: "margin:0" }, "Periodo de observación"), mes),
    sec(1, "Metas del mes"), metas, h("p", { class: "leyenda" }, h("b", {}, "Fig. 1."), " Avance acumulado frente a la meta; las marcas del instrumento están cada 10 %."),
    sec(2, "Avance por técnico"), tabla, h("p", { class: "leyenda" }, h("b", {}, "Tabla 1."), " Actividades registradas por técnico durante el periodo."),
    sec(3, "Actas de buzón"), actas, h("p", { class: "leyenda" }, h("b", {}, "Tabla 2."), " Sedes con actas pendientes (una por viernes)."), bot);
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
      : r.total ? h("span", { class: "leyenda" }, `${r.total} muestra(s)`) : h("div", { class: "vacio" }, mascota(120), "No hay muestras con estos filtros."));
  }
  cargar(true);
}

function tarjeta(e, i) {
  return h("button", { class: "card ev", style: delay(i), onclick: () => detalle(e) },
    h("div", { class: "ph" }, e.fotos[0] ? h("img", { src: e.fotos[0], alt: "", loading: "lazy" }) : "sin imagen"),
    h("div", { class: "cu" }, h("div", { class: "id" }, "Muestra N.º " + String(e.id).padStart(4, "0")), h("span", { class: "badge" }, e.tipo_nombre), h("h3", {}, e.titulo), h("div", { class: "mut" }, [fmtFecha(e.fecha), e.sede].filter(Boolean).join(" · "))));
}

function detalle(e) {
  dlgc.replaceChildren(
    h("div", { style: "display:flex;justify-content:space-between;gap:12px;align-items:flex-start" }, h("div", {}, h("div", { class: "kicker" }, "Muestra N.º " + String(e.id).padStart(4, "0")), h("span", { class: "badge" }, e.tipo_nombre), h("h2", { style: "margin:8px 0" }, e.titulo)), h("button", { class: "btn sec", onclick: () => dlg.close() }, "Cerrar")),
    h("p", { class: "mut num" }, [fmtFecha(e.fecha), e.sede, e.tecnico && "Técnico: " + e.tecnico, e.cantidad > 1 && `Cantidad: ${e.cantidad}`, e.asistentes != null && `Asistentes: ${e.asistentes}`].filter(Boolean).join(" · ")),
    e.descripcion ? h("p", { style: "white-space:pre-wrap" }, e.descripcion) : "",
    h("div", { class: "fotos" }, e.fotos.map((src, i) => h("a", { href: src, target: "_blank", rel: "noopener" }, h("img", { src, alt: `${e.titulo} · imagen ${i + 1}`, loading: "lazy" })))),
    e.fotos.length ? h("p", { class: "leyenda" }, h("b", {}, "Fig."), " Imágenes de respaldo de la actividad.") : "");
  dlg.showModal();
}
dlg.addEventListener("click", (ev) => { if (ev.target === dlg) dlg.close(); });

iniciar();
