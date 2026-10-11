import { abrirLibro } from "../shared/xlsx.js";
import { prepararLibro, ETIQUETAS } from "../shared/preparar.js";
import { selectorMes, selectorFecha } from "../shared/selectores.js";
import { formEvidencia } from "../shared/formevidencia.js";
import { pantallaIngreso, pintarSesion } from "../shared/ingreso.js";
import { api, h, alSesionVencida, fechaHoy, fmtFecha, mesActual, opciones, pintarMarca, mascota, tituloGrande } from "../shared/comun.js";

const app = document.getElementById("app");
let cfg, seccion = "nueva", titulo;
const aviso = (el, ok, texto) => el.replaceChildren(h("div", { class: "msg " + (ok ? "ok" : "err") }, texto));

function pedirIngreso(aviso = "", mensajeRol = null) {
  document.getElementById("sesionInfo").hidden = true;
  app.replaceChildren(pantallaIngreso({ aviso, mensajeRol, alEntrar: () => iniciar() }));
}
alSesionVencida(() => pedirIngreso("Su sesión terminó. Ingrese de nuevo."));

async function iniciar() {
  app.replaceChildren(h("div", { class: "cargando-centro", role: "status" }, h("span", { class: "rueda" }), "Abriendo el administrador…"));
  let s;
  try { s = await api("/api/sesion"); cfg = s.rol === "admin" ? await api("/api/config") : null; }
  catch (e) { return app.replaceChildren(h("div", { class: "login" }, mascota("celular", 170), h("div", { class: "card" }, h("h2", {}, "No se pudo abrir"), h("p", {}, e.message)))); }
  if (!s.rol) return pedirIngreso();
  if (s.rol !== "admin") return app.replaceChildren(h("div", { class: "login" }, mascota("atento", 170), h("div", { class: "card" }, h("h2", {}, "Solo para administradores"), h("p", {}, "Su usuario puede consultar la plataforma pero no administrarla."),
    h("p", {}, h("a", { class: "btn", href: window.PLATAFORMA.app, target: "_top" }, "Ir al visor")))));
  pintarMarca(cfg.marca);
  pintarSesion(document.getElementById("sesionInfo"), s, () => pedirIngreso());
  titulo = tituloGrande("Panel de administración · 2026", "Administrador de evidencias");
  render();
}

const SECCIONES = [["nueva", "Nueva evidencia"], ["lista", "Evidencias"], ["importar", "Consolidados"], ["personal", "Personal y rotación"], ["catalogos", "Sedes y técnicos"], ["metas", "Metas"], ["accesos", "Accesos"], ["marca", "Nombres"]];
function render() {
  const cont = h("div");
  app.replaceChildren(titulo.el, h("nav", { class: "tabs glass" }, SECCIONES.map(([k, n]) => h("button", { "aria-pressed": k === seccion, onclick: () => { seccion = k; render(); } }, n))), cont);
  ({ nueva: nuevaEvidencia, lista: listaEvidencias, importar, personal, catalogos, metas, accesos, marca })[seccion](cont);
}

// ---- Nueva / editar evidencia (el formulario es el mismo de la Fototeca del visor)
function nuevaEvidencia(cont, ev = null, alGuardar = null) { cont.replaceChildren(formEvidencia({ cfg, ev, alGuardar, alCancelar: ev ? alGuardar : null })); }

// ---- Lista / edición
async function listaEvidencias(cont) {
  const tipo = h("select"), sede = h("select");
  opciones(tipo, cfg.tipos, "clave", "nombre", "Todos los tipos"); opciones(sede, cfg.sedes, "id", "nombre", "Todas las sedes");
  const tabla = h("div"), recargar = () => cargar();
  async function cargar() {
    const q = new URLSearchParams({ limit: 100 });
    if (tipo.value) q.set("tipo", tipo.value); if (sede.value) q.set("sede", sede.value);
    const r = await api("/api/evidencias?" + q);
    tabla.replaceChildren(h("div", { class: "card scroll" }, h("table", {}, h("thead", {}, h("tr", {}, ["Fecha", "Tipo", "Título", "Sede", "Archivos", ""].map((t) => h("th", {}, t)))),
      h("tbody", {}, r.items.map((e) => h("tr", {}, h("td", {}, fmtFecha(e.fecha)), h("td", {}, e.tipo_nombre), h("td", {}, e.titulo), h("td", {}, e.sede ?? ""), h("td", {}, `${e.fotos_ids.length} foto(s) · ${e.documentos.length} PDF`),
        h("td", {}, h("button", { class: "btn sec", onclick: () => nuevaEvidencia(cont, e, () => { listaEvidencias(cont); }) }, "Editar"), " ",
          h("button", { class: "btn del", onclick: async () => { if (confirm(`¿Eliminar "${e.titulo}" y sus fotos?`)) { await api("/api/admin/evidencias/" + e.id, { method: "DELETE" }); recargar(); } } }, "Eliminar"))))))));
  }
  tipo.onchange = sede.onchange = cargar;
  cont.replaceChildren(h("div", { class: "filters" }, tipo, sede), tabla);
  cargar();
}

// ---- Sedes y técnicos
async function catalogos(cont) {
  const msg = h("div"), sedesTxt = h("textarea", { placeholder: "Una sede por línea (pega aquí las 40)" });
  const nuevoTec = h("input", { type: "text", placeholder: "Nombre del técnico" });
  const recargar = async () => { cfg = await api("/api/config"); catalogos(cont); };
  const toggle = (url, campo, valor) => async () => { await api(url, { method: "PUT", json: { [campo]: valor } }); recargar(); };
  cont.replaceChildren(msg, h("div", { class: "row" },
    h("div", { class: "card" }, h("h3", {}, `Sedes (${cfg.sedes.length})`), sedesTxt,
      h("p", {}, h("button", { class: "btn", onclick: async () => { const r = await api("/api/admin/sedes", { json: { nombres: sedesTxt.value.split("\n") } }); aviso(msg, true, `${r.nuevas} sede(s) nueva(s).`); recargar(); } }, "Agregar")),
      h("div", { class: "scroll", style: "max-height:360px" }, h("table", {}, h("tbody", {}, cfg.sedes.map((s) => h("tr", {}, h("td", {}, s.nombre), h("td", {}, h("button", { class: "btn sec", onclick: toggle("/api/admin/sedes/" + s.id, "activa", !s.activa) }, s.activa ? "Desactivar" : "Activar")))))))),
    h("div", { class: "card" }, h("h3", {}, "Técnicos SIAU"), nuevoTec,
      h("p", {}, h("button", { class: "btn", onclick: async () => { if (!nuevoTec.value.trim()) return; await api("/api/admin/tecnicos", { json: { nombre: nuevoTec.value } }); recargar(); } }, "Agregar")),
      h("table", {}, h("tbody", {}, cfg.tecnicos.map((t) => h("tr", {}, h("td", {}, t.nombre), h("td", {}, h("button", { class: "btn sec", onclick: toggle("/api/admin/tecnicos/" + t.id, "activo", !t.activo) }, t.activo ? "Desactivar" : "Activar")))))))));
}

// ---- Metas
function metas(cont) {
  const msg = h("div");
  cont.replaceChildren(msg, h("div", { class: "card scroll" }, h("p", { class: "mut" }, "Meta mensual por tipo. «Global» suma a todo el equipo; «Por técnico» exige la meta a cada técnico. Vacío = sin meta."),
    h("table", {}, h("tbody", {}, cfg.tipos.filter((t) => t.area === "siau").map((t) => {
      const m = h("input", { type: "number", min: 0, value: t.meta ?? "", style: "width:90px" }), a = h("select", {}, h("option", { value: "global" }, "Global"), h("option", { value: "tecnico" }, "Por técnico"));
      a.value = t.alcance;
      return h("tr", {}, h("td", {}, t.nombre), h("td", {}, m), h("td", {}, a), h("td", {}, h("button", { class: "btn sec", onclick: async () => { try { await api("/api/admin/tipos/" + t.clave, { method: "PUT", json: { meta: m.value, alcance: a.value } }); aviso(msg, true, "Meta guardada."); } catch (e) { aviso(msg, false, e.message); } } }, "Guardar")));
    })))));
}

// ---- Nombres de los módulos (los logos son los de la identidad de imagen y no se cambian aquí)
function marca(cont) {
  const msg = h("div"), n1 = h("input", { type: "text", value: cfg.marca.nombre_siau }), n2 = h("input", { type: "text", value: cfg.marca.nombre_asociacion });
  cont.replaceChildren(msg, h("div", { class: "card" }, h("h3", {}, "Nombres"), h("label", {}, "Nombre del módulo SIAU"), n1, h("label", {}, "Nombre del módulo Asociación"), n2,
    h("p", {}, h("button", { class: "btn", onclick: async () => { try { await api("/api/admin/marca", { method: "PUT", json: { nombre_siau: n1.value, nombre_asociacion: n2.value } }); cfg = await api("/api/config"); pintarMarca(cfg.marca); aviso(msg, true, "Guardado."); } catch (e) { aviso(msg, false, e.message); } } }, "Guardar nombres"))));
}

// ---- Sincronización con los consolidados de Drive (los lee el servidor con la cuenta que instaló el script)
function panelDrive() {
  const salida = h("div"), btn = h("button", { class: "btn" }, "Actualizar desde Drive"), estadoEl = h("div");
  const pintarEstado = async () => {
    try {
      const e = await api("/api/admin/estado");
      const hall = e.hallazgos.filter((x) => x.nivel !== "info");
      estadoEl.replaceChildren(
        h("p", { class: "mut" }, e.fuentes.length ? "Última lectura: " + e.fuentes.map((f) => `${ETIQUETAS[f.tipo] ?? f.tipo} (${f.creado})`).join(" · ") : "Todavía no se ha leído ningún consolidado."),
        ...(hall.length ? hall.map((x) => h("div", { class: "msg " + (x.nivel === "alto" ? "err" : "") }, x.texto)) : [h("div", { class: "msg ok" }, "Sin hallazgos: las fuentes están al día.")]));
    } catch (er) { estadoEl.replaceChildren(h("div", { class: "msg err" }, er.message)); }
  };
  btn.onclick = async () => {
    btn.disabled = true; salida.replaceChildren(h("div", { class: "msg" }, "Leyendo los consolidados de Drive… puede tardar un minuto."));
    try {
      const r = await api("/api/admin/sincronizar-drive", { method: "POST", json: {} });
      salida.replaceChildren(...r.informe.map((l) => h("div", { class: "msg ok" }, l)), ...r.errores.map((l) => h("div", { class: "msg err" }, l)));
    } catch (er) { salida.replaceChildren(h("div", { class: "msg err" }, er.message)); }
    btn.disabled = false; pintarEstado();
  };
  pintarEstado();
  return h("div", { class: "card" }, h("h3", {}, "Consolidados de Drive"),
    h("p", { class: "mut" }, "La plataforma lee sola, todos los días a las 6 a. m., los consolidados de la cuenta institucional del SIAU. Use este botón para actualizar en el momento. Solo se leen fecha, sede y calificación; nunca nombres, cédulas, teléfonos ni correos de los usuarios."),
    p0(btn), salida, estadoEl);
}
const p0 = (...x) => h("p", {}, ...x);

// ---- Importar consolidados: se leen los .xlsx en este navegador y solo se envían las columnas permitidas
function importar(cont) {
  const drive = panelDrive();
  const archivos = h("input", { type: "file", multiple: true, accept: ".xlsx" }), lista = h("div");
  const btn = h("button", { class: "btn", onclick: async () => {
    if (!archivos.files.length) return lista.replaceChildren(h("div", { class: "msg err" }, "Elija uno o más archivos .xlsx."));
    lista.replaceChildren(); btn.disabled = true;
    for (const f of archivos.files) {
      const fila = h("div", { class: "card", style: "margin-top:12px" }, h("strong", {}, f.name), h("div", { class: "mut" }, "Leyendo…"));
      lista.append(fila);
      const poner = (...x) => fila.replaceChildren(h("strong", {}, f.name), ...x);
      try {
        const r = await prepararLibro(await abrirLibro(await f.arrayBuffer()), f.name);
        poner(h("div", { class: "mut" }, `${ETIQUETAS[r.tipo]} · enviando…`));
        const j = await api("/api/admin/importar", { json: r.cuerpo });
        const nr = j.sedes_no_reconocidas ?? [], av = j.avisos ?? [];
        poner(h("div", { class: "msg ok" }, `${ETIQUETAS[r.tipo]}: ${j.registros ?? j.personal} ${j.personal != null ? "personas" : "registros"}${j.asignaciones != null ? ` · ${j.asignaciones} sedes asignadas · ${j.ausencias} ausencias` : ""}${r.nota ? ` · ${r.nota}` : ""}`),
          r.descartadas.length ? h("details", { class: "mut" }, h("summary", {}, `${r.descartadas.length} columna(s) NO se enviaron (datos personales u otros); se quedaron en este computador`), r.descartadas.join(" · ")) : "",
          av.length ? h("div", { class: "msg err" }, `${av.length} aviso(s): ${av.slice(0, 3).join(" · ")}`) : "",
          nr.length ? h("div", { class: "msg err" }, `${nr.length} nombre(s) de sede sin reconocer: ${nr.join(", ")}. Indique a qué sede corresponde cada uno en «Personal y rotación».`) : "");
      } catch (e) { poner(h("div", { class: "msg err" }, e.message)); }
    }
    btn.disabled = false;
  } }, "Leer y enviar");
  cont.replaceChildren(drive, h("div", { class: "card", style: "margin-top:14px" }, h("h3", {}, "Importar a mano (alternativa)"),
    h("p", { class: "mut" }, "Descargue los consolidados de Drive como Excel (Archivo → Descargar → Microsoft Excel .xlsx) y súbalos aquí; puede elegir varios a la vez: charlas, buzón, NPS, evaluación médica, registro del intérprete y el horario del mes. La plataforma los reconoce sola."),
    h("p", { class: "mut" }, "Privacidad: los archivos se leen en este navegador. De los formularios y del registro del intérprete solo se envían la fecha, la sede y la calificación; nombres, cédulas, teléfonos y correos no salen de su computador. Volver a importar un consolidado reemplaza la versión anterior."),
    archivos, h("p", {}, btn)), lista);
}

// ---- Personal y rotación: sedes de cada SIAU por mes, vacaciones/licencias y nombres de sede sin reconocer
let mesPersonal = mesActual();
const ROLES = [["tecnico", "SIAU (se evalúa)"], ["interprete", "Intérprete LSC"], ["administrativo", "Administrativo (recopila)"]];
const TIPOS_AUS = [["vacaciones", "Vacaciones"], ["licencia", "Licencia"], ["incapacidad", "Incapacidad"], ["otro", "Otro"]];

async function personal(cont) {
  const mes = selectorMes({ value: mesPersonal, "aria-label": "Mes", onchange: (v) => { mesPersonal = v || mesActual(); personal(cont); } });
  let d;
  try { d = await api("/api/admin/personal?mes=" + mesPersonal); } catch (e) { return cont.replaceChildren(h("div", { class: "msg err" }, e.message)); }
  const msg = h("div"), recargar = () => personal(cont);
  const llamar = (f) => async () => { try { await f(); recargar(); } catch (e) { aviso(msg, false, e.message); } };
  const primero = `${mesPersonal}-01`;

  const sinCob = d.sin_cobertura.length ? h("div", { class: "card" }, h("h3", {}, `Sedes sin SIAU este mes (${d.sin_cobertura.length})`), h("div", { class: "chips" }, d.sin_cobertura.map((x) => h("span", { class: "chip-sede", title: x.motivo }, x.sede))),
    h("p", { class: "mut" }, "Asígnelas a un SIAU abajo (por ejemplo, para cubrir a quien está de vacaciones o licencia).")) : h("div", { class: "msg ok" }, "Todas las sedes tienen un SIAU asignado este mes.");

  const sinRec = d.sin_reconocer.length ? h("div", { class: "card" }, h("h3", {}, "Nombres de sede sin reconocer"), h("p", { class: "mut" }, "Aparecen en los consolidados pero no coinciden con ninguna sede; no se están contando. Indique a qué sede corresponde cada uno (si no es una sede, déjelo)."),
    ...d.sin_reconocer.map((x) => { const sel = h("select"); opciones(sel, cfg.sedes, "id", "nombre", "— elegir sede —"); return h("div", { class: "filters" }, h("strong", {}, x.t), h("span", { class: "mut" }, `${x.n} registro(s)`), sel,
      h("button", { class: "btn sec", onclick: llamar(async () => { if (!sel.value) throw new Error("Elija una sede"); await api(`/api/admin/sedes/${sel.value}/alias`, { json: { texto: x.t } }); }) }, "Es esta sede")); })) : "";

  const tarjeta = (t) => {
    const rol = h("select", { onchange: llamar(() => api("/api/admin/tecnicos/" + t.id, { method: "PUT", json: { rol: rol.value } })) }, ROLES.map(([v, n]) => h("option", { value: v }, n))); rol.value = t.rol;
    const sede = h("select"), desde = selectorFecha({ value: primero, "aria-label": "Desde" }), hasta = selectorFecha({ "aria-label": "Hasta", opcional: true, vacio: "Sin fecha de fin" });
    opciones(sede, cfg.sedes.filter((x) => x.activa), "id", "nombre", "— sede —");
    const tipo = h("select", {}, TIPOS_AUS.map(([v, n]) => h("option", { value: v }, n))), ad = selectorFecha({ value: primero, "aria-label": "Desde" }), ah = selectorFecha({ value: `${mesPersonal}-${String(new Date(+mesPersonal.slice(0, 4), +mesPersonal.slice(5), 0).getDate()).padStart(2, "0")}`, "aria-label": "Hasta" }), nota = h("input", { type: "text", placeholder: "Nota (opcional)" });
    return h("div", { class: "card", style: "margin-top:14px" + (t.activo ? "" : ";opacity:.6") },
      h("div", { class: "filters" }, h("h3", { style: "margin:0;flex:1" }, t.nombre), rol,
        h("button", { class: "btn sec", onclick: llamar(() => api("/api/admin/tecnicos/" + t.id, { method: "PUT", json: { activo: !t.activo } })) }, t.activo ? "Desactivar" : "Activar")),
      t.rol === "tecnico" ? [
        h("label", {}, `Sedes que atiende en ${mesPersonal}`),
        h("div", { class: "chips" }, t.asignaciones.length ? t.asignaciones.map((a) => h("span", { class: "chip-sede", style: "background:rgba(6,93,126,.12);color:var(--azul)", title: `${a.desde} → ${a.hasta ?? "sin fecha de fin"} · ${a.origen}` }, h("span", {}, a.sede),
          h("button", { class: "btn sec", style: "padding:0 8px;box-shadow:none", title: "Quitar", "aria-label": "Quitar " + a.sede, onclick: llamar(() => api("/api/admin/asignaciones/" + a.id, { method: "DELETE" })) }, "×"))) : h("span", { class: "mut" }, "Ninguna")),
        h("div", { class: "filters", style: "margin-top:8px" }, sede, h("label", { style: "margin:0" }, "Desde"), desde, h("label", { style: "margin:0" }, "Hasta"), hasta,
          h("button", { class: "btn", onclick: llamar(async () => { if (!sede.value) throw new Error("Elija una sede"); await api("/api/admin/asignaciones", { json: { tecnico_id: t.id, sede_id: sede.value, desde: desde.value, hasta: hasta.value } }); }) }, "Asignar sede")),
        h("label", {}, "Vacaciones, licencias e incapacidades"),
        t.ausencias.length ? h("table", {}, h("tbody", {}, t.ausencias.map((a) => h("tr", {}, h("td", {}, TIPOS_AUS.find(([v]) => v === a.tipo)?.[1] ?? a.tipo), h("td", {}, `${fmtFecha(a.desde)} → ${fmtFecha(a.hasta)}`), h("td", { class: "mut" }, a.nota), h("td", {},
          h("button", { class: "btn sec", onclick: llamar(() => api("/api/admin/ausencias/" + a.id, { method: "DELETE" })) }, "Quitar"))))) ) : h("p", { class: "mut" }, "Sin ausencias este mes."),
        h("div", { class: "filters", style: "margin-top:8px" }, tipo, ad, ah, nota,
          h("button", { class: "btn", onclick: llamar(async () => { await api("/api/admin/ausencias", { json: { tecnico_id: t.id, tipo: tipo.value, desde: ad.value, hasta: ah.value, nota: nota.value } }); }) }, "Registrar ausencia")),
      ] : h("p", { class: "mut" }, t.rol === "interprete" ? "El intérprete atiende todas las sedes; se muestra en «Acompañamiento LSC», no en el cumplimiento por SIAU." : "No se evalúa: recopila la información de los SIAU."));
  };
  cont.replaceChildren(msg, h("div", { class: "filters" }, h("label", { style: "margin:0" }, "Mes"), mes), h("p", { class: "mut" }, "Las sedes de cada SIAU salen de la rotación base. Aquí registra vacaciones, licencias y coberturas del mes (la meta baja por los días ausentes). Úselo para corregir rotaciones, coberturas, vacaciones y licencias. La meta de cada SIAU baja en proporción a sus días de ausencia."),
    sinCob, sinRec, ...(d.tecnicos.length ? d.tecnicos.map(tarjeta) : [h("div", { class: "card vacio", style: "margin-top:14px" }, mascota("manos", 120), "Aún no hay personal. Se carga con el horario (script) o desde «Sedes y técnicos».")]));
}

iniciar();

// ---- Accesos: personas que entran con usuario y contraseña (sin cuenta de Google de la organización)
async function accesos(cont) {
  const msg = h("div"), lista = h("div"), nombre = h("input", { type: "text", placeholder: "Nombre completo", autocomplete: "off" }), usuario = h("input", { type: "text", placeholder: "Usuario (opcional)", autocomplete: "off", autocapitalize: "none" });
  const rol = h("select", {}, h("option", { value: "visor" }, "Consulta (solo ve)"), h("option", { value: "admin" }, "Administración (ve y edita)"));
  const invitacion = (u, clave) => `Plataforma de evidencias SIAU · MiRed IPS\nEnlace: ${window.PLATAFORMA.app}\nUsuario: ${u}\nContraseña: ${clave}\nPuede cambiarla en «Mi cuenta» después de entrar.`;
  const mostrarCredencial = (u, clave, titulo) => {
    const copiar = h("button", { class: "btn sec", onclick: async () => { try { await navigator.clipboard.writeText(invitacion(u, clave)); copiar.textContent = "¡Copiado!"; } catch { copiar.textContent = "No se pudo copiar"; } setTimeout(() => { copiar.textContent = "Copiar invitación"; }, 2000); } }, "Copiar invitación");
    msg.replaceChildren(h("div", { class: "credencial", role: "status" }, h("b", {}, titulo), h("dl", {}, h("dt", {}, "Usuario"), h("dd", {}, u), h("dt", {}, "Contraseña"), h("dd", {}, clave)),
      h("p", { class: "mut", style: "margin:8px 0" }, "Anótela ahora: por seguridad no se vuelve a mostrar. Si se pierde, reinicie la contraseña."), copiar));
  };
  async function cargar() {
    let us;
    try { us = await api("/api/admin/usuarios"); } catch (e) { return lista.replaceChildren(h("div", { class: "msg err" }, e.message)); }
    const accion = (u, etq, fn, clase = "btn sec") => h("button", { class: clase, onclick: async () => { try { await fn(); } catch (e) { aviso(msg, false, e.message); } } }, etq);
    lista.replaceChildren(us.length ? h("div", { class: "card scroll" }, h("table", {}, h("thead", {}, h("tr", {}, ["Nombre", "Usuario", "Rol", "Estado", ""].map((t) => h("th", {}, t)))),
      h("tbody", {}, us.map((u) => h("tr", {}, h("td", {}, u.nombre), h("td", {}, u.usuario), h("td", {}, u.rol === "admin" ? "Administración" : "Consulta"), h("td", {}, u.activo ? "Activo" : "Desactivado"),
        h("td", {}, accion(u, "Reiniciar contraseña", async () => { if (!confirm(`¿Generar una contraseña nueva para ${u.nombre}? La anterior dejará de servir.`)) return; const r = await api("/api/admin/usuarios/" + u.id, { method: "PUT", json: { reiniciar: true } }); mostrarCredencial(u.usuario, r.clave, "Contraseña nueva de " + u.nombre); }), " ",
          accion(u, u.activo ? "Desactivar" : "Activar", async () => { await api("/api/admin/usuarios/" + u.id, { method: "PUT", json: { activo: !u.activo } }); cargar(); }), " ",
          accion(u, "Eliminar", async () => { if (!confirm(`¿Eliminar a ${u.nombre}? Ya no podrá entrar.`)) return; await api("/api/admin/usuarios/" + u.id, { method: "DELETE" }); cargar(); }, "btn del"))))))) : h("div", { class: "card vacio" }, "Aún no hay personas con acceso por contraseña."));
  }
  const crear = h("button", { class: "btn", onclick: async () => {
    if (!nombre.value.trim()) return aviso(msg, false, "Escriba el nombre de la persona.");
    crear.disabled = true;
    try { const r = await api("/api/admin/usuarios", { json: { nombre: nombre.value, usuario: usuario.value, rol: rol.value } }); mostrarCredencial(r.usuario, r.clave, "Acceso creado para " + r.nombre); nombre.value = usuario.value = ""; cargar(); }
    catch (e) { aviso(msg, false, e.message); }
    crear.disabled = false;
  } }, "Crear acceso");
  cont.replaceChildren(msg, h("div", { class: "card" }, h("h3", {}, "Dar acceso a una persona"),
    h("p", { class: "mut" }, "Se genera una contraseña de 14 caracteres que usted entrega a la persona. Quien tenga rol «Consulta» solo ve la plataforma; no puede cambiar nada."),
    h("div", { class: "row" }, h("div", {}, h("label", {}, "Nombre"), nombre), h("div", {}, h("label", {}, "Usuario"), usuario), h("div", {}, h("label", {}, "Rol"), rol)), h("p", {}, crear)), lista);
  cargar();
}
