// Formulario para adjuntar o editar una evidencia (fotografías y documentos PDF). Lo usan el administrador y la Fototeca del visor.
import { api, h, fechaHoy, opciones } from "./comun.js";
import { selectorFecha } from "./selectores.js";

const MAX_PDF = 10 * 1024 * 1024;

async function reducir(file, max = 1600) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error(`"${file.name}": formato no soportado (use JPG, PNG o WebP)`);
  const bmp = await createImageBitmap(file).catch(() => null);
  if (!bmp) return file;
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((ok) => c.toBlob((b) => ok(b ?? file), "image/jpeg", 0.85));
}
const aBase64 = (blob) => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(",")[1]); r.onerror = () => no(new Error("No se pudo leer el archivo")); r.readAsDataURL(blob); });
async function subir(blob) { return (await api("/api/admin/foto", { json: { base64: await aBase64(blob), tipo: blob.type } })).archivo; }
/**
 * Miniatura que viaja dentro del propio registro (≤ 40 000 caracteres) para que la Fototeca la muestre al instante.
 * Se prueba del tamaño más grande al más chico (WebP si el navegador lo genera, si no JPEG) para que se vea nítida en pantallas de alta densidad.
 */
async function miniatura(blob) {
  const bmp = await createImageBitmap(blob);
  for (const lado of [560, 480, 400, 320, 240]) {
    const k = Math.min(1, lado / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas"); c.width = Math.max(1, Math.round(bmp.width * k)); c.height = Math.max(1, Math.round(bmp.height * k));
    const g = c.getContext("2d"); g.imageSmoothingQuality = "high"; g.drawImage(bmp, 0, 0, c.width, c.height);
    for (const tipo of ["image/webp", "image/jpeg"]) for (const q of [0.82, 0.72, 0.62, 0.5]) { const u = c.toDataURL(tipo, q); if (u.startsWith("data:" + tipo) && u.length <= 40000) return u; }
  }
  return null;
}
const aviso = (el, ok, texto) => el.replaceChildren(h("div", { class: "msg " + (ok ? "ok" : "err") }, texto));

/** cfg: respuesta de /api/config. ev: evidencia a editar (o null). alGuardar(): se llama tras guardar (si no se pasa, el formulario se limpia). */
export function formEvidencia({ cfg, ev = null, alGuardar = null, alCancelar = null, area = null }) {
  const f = { tipo: h("select", { required: true }), fecha: selectorFecha({ value: ev?.fecha ?? fechaHoy(), "aria-label": "Fecha" }),
    sede: h("select"), tecnico: h("select"), titulo: h("input", { type: "text", required: true, maxLength: 200, value: ev?.titulo ?? "" }),
    desc: h("textarea", { maxLength: 5000, placeholder: "Breve descripción: tema, quién lo envió, qué muestra" }, ev?.descripcion ?? ""), cant: h("input", { type: "number", min: 1, value: ev?.cantidad ?? 1 }),
    asist: h("input", { type: "number", min: 0, value: ev?.asistentes ?? "" }),
    fotos: h("input", { type: "file", multiple: true, accept: "image/jpeg,image/png,image/webp" }), docs: h("input", { type: "file", multiple: true, accept: "application/pdf,.pdf" }) };
  const areas = area ? [area] : ["siau", "asociacion"];
  f.tipo.replaceChildren(...areas.map((a) => h("optgroup", { label: a === "siau" ? cfg.marca.nombre_siau : cfg.marca.nombre_asociacion }, cfg.tipos.filter((t) => t.area === a).map((t) => h("option", { value: t.clave }, t.nombre)))));
  opciones(f.sede, cfg.sedes.filter((s) => s.activa), "id", "nombre", "— sin sede —");
  opciones(f.tecnico, cfg.tecnicos.filter((t) => t.activo && t.rol === "tecnico"), "id", "nombre", "— sin SIAU —");
  if (ev) { f.tipo.value = ev.tipo; f.sede.value = ev.sede_id ?? ""; f.tecnico.value = ev.tecnico_id ?? ""; }
  let fotosActuales = [...(ev?.fotos_ids ?? [])], docsActuales = [...(ev?.documentos ?? [])];
  const prev = h("div", { class: "thumbs" }), prevDocs = h("div", { class: "lista-docs" }), msg = h("div");
  const btn = h("button", { class: "btn" }, ev ? "Guardar cambios" : "Guardar evidencia");
  const pintarPrev = () => {
    prev.replaceChildren(...fotosActuales.map((a, i) => h("span", {}, i === 0 && ev?.portada && a === ev.fotos_ids[0] ? h("img", { src: ev.portada, alt: "" }) : h("span", { class: "mut" }, "Foto " + (i + 1)),
      h("button", { type: "button", class: "btn sec", title: "Quitar", "aria-label": "Quitar foto " + (i + 1), onclick: () => { fotosActuales.splice(i, 1); pintarPrev(); } }, "×"))));
    prevDocs.replaceChildren(...docsActuales.map((d, i) => h("div", { class: "doc-fila" }, h("span", { class: "ico-pdf", "aria-hidden": "true" }, "PDF"), h("span", {}, d.nombre),
      h("button", { type: "button", class: "btn sec", "aria-label": "Quitar " + d.nombre, onclick: () => { docsActuales.splice(i, 1); pintarPrev(); } }, "×"))));
  };
  pintarPrev();

  const form = h("form", { class: "card", onsubmit: async (e) => {
    e.preventDefault(); btn.disabled = true; btn.setAttribute("aria-busy", "true"); const total = f.fotos.files.length + f.docs.files.length; let hechos = 0;
    const barra = h("i", { style: "--p:0.04" }), texto = h("div", { class: "msg" }, total ? `Subiendo archivo 1 de ${total}…` : "Guardando…");
    const avanzar = () => { hechos++; barra.style.setProperty("--p", String(Math.max(0.04, hechos / (total + 1)))); texto.textContent = hechos < total ? `Subiendo archivo ${hechos + 1} de ${total}…` : "Guardando…"; };
    msg.replaceChildren(texto, h("div", { class: "progreso", role: "progressbar", "aria-label": "Progreso de la subida" }, barra));
    try {
      const nuevas = [], nuevosDocs = [];
      let portadaNueva = null;
      for (const file of f.fotos.files) {
        const blob = await reducir(file);
        if (!nuevas.length) portadaNueva = await miniatura(blob).catch(() => null);
        nuevas.push(await subir(blob)); avanzar();
      }
      for (const file of f.docs.files) {
        if (file.type !== "application/pdf" && !/\.pdf$/i.test(file.name)) throw new Error(`"${file.name}": solo se aceptan documentos PDF`);
        if (file.size > MAX_PDF) throw new Error(`"${file.name}" pesa más de 10 MB: comprímalo antes de adjuntarlo`);
        nuevosDocs.push({ id: await subir(new Blob([file], { type: "application/pdf" })), nombre: file.name.slice(0, 150) }); avanzar();
      }
      const ids = [...fotosActuales, ...nuevas];
      let portada = null;
      if (ids.length) {
        if (ev?.portada && ids[0] === ev.fotos_ids[0]) portada = ev.portada;
        else if (ids[0] === nuevas[0]) portada = portadaNueva;
        else { const d = await api("/api/foto?id=" + encodeURIComponent(ids[0])); portada = await miniatura(await (await fetch(d.data)).blob()).catch(() => null); }
      }
      const body = { tipo: f.tipo.value, fecha: f.fecha.value, sede_id: f.sede.value, tecnico_id: f.tecnico.value, titulo: f.titulo.value, descripcion: f.desc.value, cantidad: f.cant.value, asistentes: f.asist.value, fotos: ids, documentos: [...docsActuales, ...nuevosDocs], portada };
      if (ev) await api("/api/admin/evidencias/" + ev.id, { method: "PUT", json: body }); else await api("/api/admin/evidencias", { json: body });
      if (alGuardar) return alGuardar();
      form.reset(); fotosActuales = []; docsActuales = []; pintarPrev(); f.fecha.value = fechaHoy(); aviso(msg, true, "Evidencia guardada.");
    } catch (er) { aviso(msg, false, er.message); }
    btn.disabled = false; btn.removeAttribute("aria-busy");
  } },
    h("div", { class: "row" }, h("div", {}, h("label", {}, "Tipo de evidencia"), f.tipo), h("div", {}, h("label", {}, "Fecha"), f.fecha), h("div", {}, h("label", {}, "Sede"), f.sede), h("div", {}, h("label", {}, "SIAU responsable"), f.tecnico)),
    h("label", {}, "Título"), f.titulo, h("label", {}, "Descripción breve"), f.desc,
    h("div", { class: "row" }, h("div", {}, h("label", {}, "Cantidad (cuenta para la meta)"), f.cant), h("div", {}, h("label", {}, "Asistentes (opcional)"), f.asist)),
    h("label", {}, "Fotografías (se reducen automáticamente)"), f.fotos, prev,
    h("label", {}, "Documentos PDF (máx. 10 MB cada uno)"), f.docs, prevDocs, msg,
    h("p", { class: "acciones" }, btn, alCancelar ? h("button", { type: "button", class: "btn sec", onclick: alCancelar }, "Cancelar") : ""),
    h("p", { class: "mut" }, "Evite fotografiar rostros de pacientes o adjuntar documentos con datos personales sin autorización."));
  return form;
}
