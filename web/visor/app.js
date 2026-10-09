import { api, h, mesActual, fmtFecha, opciones, pintarMarca, mascota, tituloGrande, mesLegible, recurso, sk, skTarjetas } from "../shared/comun.js";
import { vistaPanel } from "./panel.js";
import { vistaConsultas } from "./consultas.js";
import { vistaFototeca } from "./fototeca.js";
import { cargarFicha } from "./ficha.js";
import { construirReporte, descargarReporte } from "../shared/reporte.js";

const app = document.getElementById("app"), dlg = document.getElementById("dlg"), dlgc = document.getElementById("dlgc"), tabbar = document.getElementById("tabbar");
const S = { cfg: null, area: "siau", vista: "panel", mes: mesActual(), filtros: {}, siau: "", rol: null, album: "fotos" };
const AREAS = ["siau", "asociacion"];
let tg, seg, segThumb, cont, tabThumb;

async function iniciar() {
  pintarMarca({ nombre_siau: "SIAU", nombre_asociacion: "Asociación de Usuarios" });
  app.replaceChildren(h("div", { class: "cargando", role: "status", "aria-label": "Abriendo la plataforma" },
    sk("", "height:14px;width:190px;margin:10px 0 12px"), sk("", "height:46px;width:min(420px,70%);border-radius:14px;margin-bottom:22px"), sk("", "height:46px;width:min(640px,100%);border-radius:999px;margin-bottom:22px"),
    sk("l-tira", "height:92px;border-radius:22px"), h("div", { class: "cargando-centro" }, h("span", { class: "rueda" }), "Abriendo la plataforma…")));
  try { [S.cfg, S.rol] = await Promise.all([api("/api/config"), api("/api/sesion").then((u) => u.rol).catch(() => null)]); }
  catch (e) { return app.replaceChildren(h("div", { class: "login" }, mascota("atento", 170), h("div", { class: "card" }, h("h2", {}, "No se pudo abrir"), h("p", {}, e.message)))); }
  pintarMarca(S.cfg.marca);
  if (S.rol === "admin") document.getElementById("irAdmin").hidden = false;
  S.rerender = render;
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
  tabbar.replaceChildren(tabThumb, ...AREAS.map((a) => h("button", { role: "tab", "data-area": a, onclick: () => { if (S.area !== a) { S.area = a; S.filtros = {}; S.vista = a === "siau" ? "panel" : "fototeca"; render(); } } },
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

  const vistas = S.area === "siau" ? [["panel", "Panel"], ["cumplimiento", "Cumplimiento"], ["consultas", "Consultas"], ["fototeca", "Fototeca"], ["ludoteca", "Ludoteca"]] : [["fototeca", "Fototeca"]];
  seg.hidden = vistas.length < 2;
  seg.style.setProperty("--n", vistas.length);
  seg.style.setProperty("--i", Math.max(0, vistas.findIndex(([v]) => v === S.vista)));
  seg.replaceChildren(segThumb, ...vistas.map(([v, n]) => h("button", { role: "tab", "aria-selected": v === S.vista, onclick: () => { if (S.vista !== v) { S.vista = v; render(); } } }, n)));
  cont.className = "entra";
  cont.replaceChildren();
  const ir = (vista, extra = {}) => { S.vista = vista; if ("siau" in extra) S.siau = extra.siau; render(); window.scrollTo({ top: 0 }); };
  ({ panel: () => vistaPanel(cont, S, ir, render), cumplimiento: () => vistaCumplimiento(cont), consultas: () => vistaConsultas(cont, S), fototeca: () => vistaFototeca(cont, S, { dlg, dlgc }), ludoteca: () => vistaLudoteca(cont) }[S.vista])();
}

const sec = (n, titulo, ...extra) => h("div", { class: "encab" }, h("span", { class: "n" }, "§" + n), h("h2", {}, titulo), ...extra);

// ---------- Cumplimiento individual por SIAU
const clase = (p) => (p >= 100 ? "" : p >= 60 ? "mid" : "low");
const pctDe = (t, m) => (m > 0 ? Math.min(100, Math.round((t / m) * 100)) : 100);
const medidor = (m) => { const p = pctDe(m.valor, m.meta); return h("div", { class: "celda-meta" }, h("span", { class: "num" }, m.meta == null ? String(m.valor) : `${m.valor} / ${m.meta}`),
  m.meta ? h("div", { class: "gauge " + clase(p), role: "img", "aria-label": `${p}% de la meta` }, h("i", { style: `transform:scaleX(${p / 100})` })) : ""); };

async function vistaCumplimiento(c) {
  const mes = h("input", { type: "month", value: S.mes, "aria-label": "Mes", onchange: () => { S.mes = mes.value || mesActual(); render(); } });
  c.replaceChildren(h("div", { class: "cargando" }, sk("l-tira", "height:70px;border-radius:22px;margin-bottom:14px"), skTarjetas(6)));
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
  // Resumen global (o de la persona elegida): una franja de cifras con su barra de avance
  const sum = (k, c) => evaluados.reduce((t, x) => t + (x[k][c] ?? 0), 0);
  const cifra = (etq, valor, meta, nota) => { const p = meta ? Math.min(100, Math.round((100 * valor) / meta)) : null; return h("div", { class: "cifra " + (p == null ? "" : p >= 100 ? "ok" : p >= 60 ? "mid" : "low") },
    h("span", { class: "k" }, etq), h("span", { class: "v" }, String(valor), meta ? h("small", {}, ` / ${meta}`) : ""),
    p == null ? "" : h("span", { class: "barra " + clase(p), role: "img", "aria-label": `${p}% de la meta` }, h("i", { style: `transform:scaleX(${p / 100})` })), nota ? h("span", { class: "n" }, nota) : ""); };
  const actEsp = evaluados.reduce((t, x) => t + x.actas.esperadas, 0), actEnt = evaluados.reduce((t, x) => t + x.actas.entregadas, 0);
  const una = S.siau && filas[0] ? filas[0] : null;
  const resumen = evaluados.length ? h("div", { class: "franja" },
    una ? cifra("Días activos", una.dias_activos, una.dias_mes, una.ausencias.length ? "Hay ausencias este mes" : "Sin ausencias") : cifra("SIAU que cumplen", cumplen, evaluados.length, filas.length - evaluados.length ? `${filas.length - evaluados.length} ausente(s) sin evaluar` : "Todos activos"),
    cifra("Encuestas", sum("encuestas", "valor"), sum("encuestas", "meta") || null, `NPS ${sum("encuestas", "nps")} · médica ${sum("encuestas", "medica")}`),
    cifra("Charlas (asistentes)", sum("charlas", "valor"), sum("charlas", "meta") || null, una ? "" : "Suma de los SIAU activos"),
    cifra("Actas de buzón", actEnt, actEsp || null, "Entregadas hasta hoy")) : "";
  const detalleSiau = una ? h("p", { class: "menores" }, h("span", {}, "Sedes que atiende:"), ...(una.sedes.length ? una.sedes.map((x) => h("span", { class: "chip-sede suave" }, x)) : [h("b", {}, "ninguna asignada")]),
    una.ausencias.length ? h("span", {}, "Ausencias: ", h("b", {}, una.ausencias.map((a) => `${a.tipo} (${fmtFecha(a.desde)} → ${fmtFecha(a.hasta)})`).join(" · "))) : "") : "";
  // Encuestas por tipo: cuánto aporta cada una al total que se compara con la meta
  const nNps = sum("encuestas", "nps"), nMed = sum("encuestas", "medica"), nTot = nNps + nMed;
  const TIPOS_ENC = [["Satisfacción de usuarios (NPS)", nNps, true], ["Evaluación médico asistencial", nMed, true], ["Encuesta IAMI", null, false], ["Control prenatal", null, false]];
  const porTipo = evaluados.length ? h("div", { class: "card" }, h("h3", { style: "margin:0 0 4px" }, "Encuestas por tipo"),
    h("p", { class: "mut", style: "margin:0 0 10px" }, "Las encuestas de cada SIAU son la suma de los tipos con fuente en Drive."),
    ...TIPOS_ENC.map(([nombre, n, hay]) => h("div", { class: "tipo-enc" + (hay ? "" : " sin-fuente") }, h("span", { class: "t" }, nombre),
      h("span", { class: "n num" }, hay ? String(n) : "sin fuente aún"),
      hay ? h("span", { class: "barra", role: "img", "aria-label": `${nTot ? Math.round((100 * n) / nTot) : 0}% del total` }, h("i", { style: `transform:scaleX(${nTot ? n / nTot : 0})` })) : ""))) : "";

  // Una tarjeta por SIAU: lo más atrasado primero; quien está ausente al final
  const avance = (t) => t.avance;
  const estadoDe = (t) => [t.estado, t.estado === "ausente" ? (t.ausencias[0]?.tipo ?? "Ausente") : { cumple: "Cumple", camino: "En camino", atencion: "Atención" }[t.estado]];
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
  /** Panel de actas de buzón: cuánto va entregado, cada acta del calendario y las sedes en pastillas (las pendientes primero, con su cuenta). */
  const panelActas = (esperadas, entregadas, porCodigo, pendientes, alDia, vacioTxt) => {
    const p = esperadas ? Math.round((100 * entregadas) / esperadas) : 0, detalle = h("p", { class: "acta-detalle", "aria-live": "polite" }, "Pulse una sede para ver qué actas debe.");
    const pill = (x, al) => h("button", { type: "button", class: "pill-sede " + (al ? "ok" : "debe"), onclick: () => { detalle.textContent = al ? `${x.sede}: al día con todas las actas.` : `${x.sede} debe: ${x.pendientes.map((q) => `${q.codigo} (${fmtFecha(q.fecha)})`).join(" · ")}`; } },
      h("span", { class: "pt" }, al ? "✓" : String(x.pendientes.length)), x.sede);
    return h("div", { class: "card actas" },
      h("div", { class: "actas-cab" }, h("div", { class: "actas-pct", "aria-hidden": "true", style: `--p:${p}` }, h("b", {}, p), h("small", {}, "%")),
        h("div", {}, h("div", { class: "big" }, entregadas, h("small", {}, ` de ${esperadas} actas entregadas`)), h("div", { class: "barra " + clase(p), role: "img", "aria-label": `${p}% entregado` }, h("i", { style: `transform:scaleX(${p / 100})` })), h("p", { class: "mut", style: "margin:6px 0 0;font-size:13px" }, "Solo cuentan las actas cuya fecha ya pasó."))),
      porCodigo.length ? h("div", { class: "por-codigo" }, porCodigo.map((c) => { const q = c.esperadas ? Math.round((100 * c.entregadas) / c.esperadas) : 0; return h("div", { class: "cod" }, h("span", { class: "c-n" }, c.codigo, h("small", {}, fmtFecha(c.fecha))), h("span", { class: "barra " + clase(q), role: "img", "aria-label": `${c.codigo}: ${q}%` }, h("i", { style: `transform:scaleX(${q / 100})` })), h("b", { class: "num" }, `${c.entregadas}/${c.esperadas}`)); })) : "",
      pendientes.length ? h("div", {}, h("h3", { class: "mini-t" }, `Sedes con actas pendientes (${pendientes.length})`), h("div", { class: "pills" }, pendientes.map((x) => pill(x, false)))) : h("div", { class: "msg ok" }, vacioTxt),
      alDia.length ? h("details", { class: "al-dia" }, h("summary", {}, `Sedes al día (${alDia.length})`), h("div", { class: "pills" }, alDia.map((n) => pill({ sede: n }, true)))) : "",
      detalle);
  };
  const actas = mias ? panelActas(mias.esperadas, mias.entregadas, [], [...new Map(mias.pendientes.map((x) => [x.sede, { sede: x.sede, pendientes: mias.pendientes.filter((y) => y.sede === x.sede) }])).values()], [], "¡Está al día con sus actas!")
    : ac ? panelActas(ac.esperadas, ac.entregadas, ac.por_codigo ?? [], [...ac.sedes_pendientes].sort((x, y) => y.pendientes.length - x.pendientes.length || x.sede.localeCompare(y.sede, "es")), ac.al_dia ?? [], "Todas las sedes están al día.")
    : h("div", { class: "card" }, h("p", { class: "mut" }, "Aún no se ha sincronizado el consolidado de buzón."));

  const l = d.lsc;
  const lsc = l ? h("div", { class: "grid" },
    h("div", { class: "card" }, h("div", { class: "mut" }, "Atenciones con intérprete"), h("div", { class: "big", style: "margin-top:6px" }, String(l.atenciones))),
    h("div", { class: "card" }, h("div", { class: "mut" }, "Actividades LSC"), h("div", { class: "big", style: "margin-top:6px" }, String(l.actividades), " ", h("small", {}, `${l.asistentes} asistentes`))),
    h("div", { class: "card" }, h("div", { class: "mut" }, "Sedes atendidas"), h("div", { class: "big", style: "margin-top:6px" }, String(l.sedes)), l.por_sede.length ? h("div", { class: "leyenda" }, l.por_sede.slice(0, 3).map((x) => `${x.sede} ${x.atenciones}`).join(" · ")) : "")) : h("div", { class: "card vacio-info" }, h("b", {}, "Sin registros de acompañamiento con intérprete en este mes."), h("p", { class: "mut" }, "Aparecen aquí cuando el consolidado del intérprete (hojas «REGISTRO» y «ACTIVIDADES ASOCIADAS LSC») tiene atenciones con fecha en el mes elegido. Pruebe con otro mes o actualice los consolidados desde el Administrador."));

  const avisos = [d.sin_reconocer ? h("div", { class: "msg err" }, `${d.sin_reconocer} nombre(s) de sede de los consolidados no se reconocieron; no se están contando. Corríjalos en Administrador → Personal y rotación.`) : "",
    d.sincronizado ? h("p", { class: "leyenda" }, `Consolidados sincronizados: ${d.sincronizado} UTC.`) : ""];
  const hall = (est?.hallazgos ?? []).filter((x) => x.nivel !== "info");
  const bot = hall.length ? h("div", { class: "msg err" }, h("b", {}, "Atención con los datos: "), hall.slice(0, 4).map((x) => h("div", {}, "• " + x.texto))) : "";

  const fichaHost = S.siau ? h("div", {}) : null;
  if (fichaHost) cargarFicha(fichaHost, S, (v, x = {}) => { S.vista = v; if ("siau" in x) S.siau = x.siau; S.rerender(); window.scrollTo({ top: 0 }); });
  c.replaceChildren(hero, h("div", { class: "filters" }, h("label", { style: "margin:0" }, "Periodo de observación"), mes, filtroSiau,
      h("button", { class: "btn", onclick: () => descargarReporte(construirReporte(d, S.siau)) }, S.siau ? "Reporte de esta persona" : "Descargar reporte"),
      h("button", { class: "btn sec", onclick: async (ev) => { try { await navigator.clipboard.writeText(construirReporte(d, S.siau).texto); ev.target.textContent = "¡Copiado!"; } catch { ev.target.textContent = "No se pudo copiar"; } setTimeout(() => { ev.target.textContent = "Copiar resumen"; }, 2000); } }, "Copiar resumen")), ...avisos,
    sec(1, S.siau ? "Cumplimiento de " + quien : "Cumplimiento global"), resumen, ...(S.siau ? [h("div", { style: "height:18px" }), fichaHost] : [h("div", { style: "height:14px" }), porTipo]),
    ...(S.siau ? [] : [h("div", { style: "height:14px" }), sec(2, "Cumplimiento por SIAU"), tabla]), ...(S.siau ? [] : [h("p", { class: "leyenda" }, h("b", {}, "Fig. 1."), " Metas mínimas por SIAU. Lo registrado en cada sede se reparte entre quienes la atienden; la meta baja en proporción a los días de vacaciones o licencia.")]),
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

dlg.addEventListener("click", (ev) => { if (ev.target === dlg) dlg.close(); });

iniciar();
