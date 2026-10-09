import { api, h, fechaHoy, fmtFecha, opciones, pintarMarca, mascota, tituloGrande } from "/shared/comun.js";

const app = document.getElementById("app"), salir = document.getElementById("salir");
let cfg, seccion = "nueva", titulo;
const aviso = (el, ok, texto) => el.replaceChildren(h("div", { class: "msg " + (ok ? "ok" : "err") }, texto));

async function iniciar() {
  const s = await api("/api/sesion");
  if (s.rol !== "admin") return login();
  cfg = await api("/api/config");
  pintarMarca(cfg.marca);
  titulo = tituloGrande("Panel de administración · 2026", "Administrador de evidencias");
  salir.hidden = false;
  salir.onclick = async () => { await api("/api/logout", { json: {} }); location.reload(); };
  render();
}

function login() {
  const pw = h("input", { type: "password", autocomplete: "current-password", required: true }), msg = h("div");
  app.replaceChildren(h("div", { class: "login" }, mascota(170), h("form", { class: "card", onsubmit: async (ev) => {
    ev.preventDefault();
    try { await api("/api/login", { json: { password: pw.value } }); iniciar(); } catch (e) { aviso(msg, false, e.message); }
  } }, h("h2", {}, "Acceso administrador"), h("label", {}, "Contraseña"), pw, msg, h("p", {}, h("button", { class: "btn" }, "Entrar")))));
}

const SECCIONES = [["nueva", "Nueva evidencia"], ["lista", "Evidencias"], ["catalogos", "Sedes y técnicos"], ["metas", "Metas"], ["marca", "Logos"]];
function render() {
  const cont = h("div");
  app.replaceChildren(titulo.el, h("nav", { class: "tabs glass" }, SECCIONES.map(([k, n]) => h("button", { "aria-pressed": k === seccion, onclick: () => { seccion = k; render(); } }, n))), cont);
  ({ nueva: formEvidencia, lista: listaEvidencias, catalogos, metas, marca })[seccion](cont);
}

// ---- reducción de imagen en el navegador (fotos de celular pesan 5-10 MB)
async function reducir(file, max = 1600) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error(`"${file.name}": formato no soportado (usa JPG, PNG o WebP)`);
  const bmp = await createImageBitmap(file).catch(() => null);
  if (!bmp) return file;
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((ok) => c.toBlob((b) => ok(b ?? file), "image/jpeg", 0.85));
}
async function subir(blob) { return (await api("/api/admin/foto", { method: "POST", body: blob, headers: { "content-type": blob.type } })).archivo; }

// ---- Nueva / editar evidencia
function formEvidencia(cont, ev = null, alGuardar = null) {
  const f = { tipo: h("select", { required: true }), fecha: h("input", { type: "date", required: true, value: ev?.fecha ?? fechaHoy() }),
    sede: h("select"), tecnico: h("select"), titulo: h("input", { type: "text", required: true, maxLength: 200, value: ev?.titulo ?? "" }),
    desc: h("textarea", { maxLength: 5000 }, ev?.descripcion ?? ""), cant: h("input", { type: "number", min: 1, value: ev?.cantidad ?? 1 }),
    asist: h("input", { type: "number", min: 0, value: ev?.asistentes ?? "" }), fotos: h("input", { type: "file", multiple: true, accept: "image/jpeg,image/png,image/webp" }) };
  f.tipo.replaceChildren(...["siau", "asociacion"].map((a) => h("optgroup", { label: a === "siau" ? cfg.marca.nombre_siau : cfg.marca.nombre_asociacion }, cfg.tipos.filter((t) => t.area === a).map((t) => h("option", { value: t.clave }, t.nombre)))));
  opciones(f.sede, cfg.sedes.filter((s) => s.activa), "id", "nombre", "— sin sede —");
  opciones(f.tecnico, cfg.tecnicos.filter((t) => t.activo), "id", "nombre", "— sin técnico —");
  if (ev) { f.tipo.value = ev.tipo; f.sede.value = ev.sede_id ?? ""; f.tecnico.value = ev.tecnico_id ?? ""; }
  let fotosActuales = [...(ev?.fotos ?? [])].map((s) => s.replace("/uploads/", ""));
  const prev = h("div", { class: "thumbs" }), msg = h("div"), btn = h("button", { class: "btn" }, ev ? "Guardar cambios" : "Guardar evidencia");
  const pintarPrev = () => prev.replaceChildren(...fotosActuales.map((a, i) => h("span", {}, h("img", { src: "/uploads/" + a, alt: "" }), h("button", { type: "button", class: "btn sec", title: "Quitar", onclick: () => { fotosActuales.splice(i, 1); pintarPrev(); } }, "×"))));
  pintarPrev();

  const form = h("form", { class: "card", onsubmit: async (e) => {
    e.preventDefault(); btn.disabled = true; msg.replaceChildren(h("div", { class: "msg" }, "Subiendo…"));
    try {
      const nuevas = [];
      for (const file of f.fotos.files) nuevas.push(await subir(await reducir(file)));
      const body = { tipo: f.tipo.value, fecha: f.fecha.value, sede_id: f.sede.value, tecnico_id: f.tecnico.value, titulo: f.titulo.value, descripcion: f.desc.value, cantidad: f.cant.value, asistentes: f.asist.value, fotos: [...fotosActuales, ...nuevas] };
      if (ev) await api("/api/admin/evidencias/" + ev.id, { method: "PUT", json: body }); else await api("/api/admin/evidencias", { json: body });
      if (alGuardar) return alGuardar();
      form.reset(); fotosActuales = []; pintarPrev(); f.fecha.value = fechaHoy(); aviso(msg, true, "Evidencia guardada.");
    } catch (er) { aviso(msg, false, er.message); }
    btn.disabled = false;
  } },
    h("div", { class: "row" }, h("div", {}, h("label", {}, "Tipo de evidencia"), f.tipo), h("div", {}, h("label", {}, "Fecha"), f.fecha), h("div", {}, h("label", {}, "Sede"), f.sede), h("div", {}, h("label", {}, "Técnico (SIAU)"), f.tecnico)),
    h("label", {}, "Título"), f.titulo, h("label", {}, "Descripción (tema de la charla, actividad del subcronograma, etc.)"), f.desc,
    h("div", { class: "row" }, h("div", {}, h("label", {}, "Cantidad (cuenta para la meta)"), f.cant), h("div", {}, h("label", {}, "Asistentes (opcional)"), f.asist)),
    h("label", {}, "Fotos (se reducen automáticamente)"), f.fotos, prev, msg, h("p", {}, btn),
    h("p", { class: "mut" }, "Evite fotografiar rostros de pacientes o documentos con datos personales sin autorización."));
  cont.replaceChildren(form);
}

// ---- Lista / edición
async function listaEvidencias(cont) {
  const tipo = h("select"), sede = h("select");
  opciones(tipo, cfg.tipos, "clave", "nombre", "Todos los tipos"); opciones(sede, cfg.sedes, "id", "nombre", "Todas las sedes");
  const tabla = h("div"), recargar = () => cargar();
  async function cargar() {
    const q = new URLSearchParams({ limit: 100 });
    if (tipo.value) q.set("tipo", tipo.value); if (sede.value) q.set("sede", sede.value);
    const r = await api("/api/evidencias?" + q);
    tabla.replaceChildren(h("div", { class: "card scroll" }, h("table", {}, h("thead", {}, h("tr", {}, ["Fecha", "Tipo", "Título", "Sede", "Fotos", ""].map((t) => h("th", {}, t)))),
      h("tbody", {}, r.items.map((e) => h("tr", {}, h("td", {}, fmtFecha(e.fecha)), h("td", {}, e.tipo_nombre), h("td", {}, e.titulo), h("td", {}, e.sede ?? ""), h("td", {}, String(e.fotos.length)),
        h("td", {}, h("button", { class: "btn sec", onclick: () => formEvidencia(cont, e, () => { listaEvidencias(cont); }) }, "Editar"), " ",
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

// ---- Logos / marca
function marca(cont) {
  const msg = h("div"), n1 = h("input", { type: "text", value: cfg.marca.nombre_siau }), n2 = h("input", { type: "text", value: cfg.marca.nombre_asociacion });
  const logo = (k, etiqueta) => {
    const inp = h("input", { type: "file", accept: "image/jpeg,image/png,image/webp" });
    return h("div", { class: "card" }, h("h3", {}, etiqueta), cfg.marca["logo_" + k] ? h("img", { src: cfg.marca["logo_" + k], style: "max-height:80px;max-width:100%", alt: etiqueta }) : h("p", { class: "mut" }, "Sin logo cargado."), h("p", {}, inp),
      h("button", { class: "btn", onclick: async () => { if (!inp.files[0]) return; try { await api("/api/admin/logo/" + k, { method: "POST", body: inp.files[0], headers: { "content-type": inp.files[0].type } }); cfg = await api("/api/config"); pintarMarca(cfg.marca); marca(cont); } catch (e) { aviso(msg, false, e.message); } } }, "Subir logo"));
  };
  cont.replaceChildren(msg, h("div", { class: "row" }, logo("siau", "Logo SIAU"), logo("asociacion", "Logo Asociación de Usuarios")),
    h("div", { class: "card", style: "margin-top:14px" }, h("h3", {}, "Nombres"), h("label", {}, "Nombre del módulo SIAU"), n1, h("label", {}, "Nombre del módulo Asociación"), n2,
      h("p", {}, h("button", { class: "btn", onclick: async () => { await api("/api/admin/marca", { method: "PUT", json: { nombre_siau: n1.value, nombre_asociacion: n2.value } }); cfg = await api("/api/config"); pintarMarca(cfg.marca); aviso(msg, true, "Guardado."); } }, "Guardar nombres"))));
}

iniciar();
