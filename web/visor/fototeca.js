// Fototeca: dos álbumes (fotografías y documentos PDF) con vista previa. Quien administra puede adjuntar, editar y eliminar desde aquí.
import { api, h, fmtFecha, opciones, mascota, sk, skGaleria } from "../shared/comun.js";
import { formEvidencia } from "../shared/formevidencia.js";

const PAGINA = 24;
const nombreCorto = (n) => n.split(/\s+/).filter(Boolean).map((x) => x[0] + x.slice(1).toLowerCase()).join(" ");
const delay = (i) => `--d:${Math.min(i, 8) * 40}ms`;

/** Descarga o abre un archivo que viene de Drive como data URI (se convierte a Blob para que el navegador lo acepte). */
async function archivo(id, nombre, abrir) {
  const r = await api("/api/foto?id=" + encodeURIComponent(id)), blob = await (await fetch(r.data)).blob(), url = URL.createObjectURL(blob);
  if (abrir) { const w = window.open(url, "_blank", "noopener"); if (w) return; }
  const a = h("a", { href: url, download: nombre }); document.body.append(a); a.click(); a.remove();
}

export function vistaFototeca(c, S, { dlg, dlgc }) {
  const esAdmin = S.rol === "admin", f = S.filtros;
  const album = (S.album ??= "fotos");
  const tipos = S.cfg.tipos.filter((t) => t.area === S.area);
  const sel = (k, lista, etiqueta, valor, texto) => { const s = h("select", { "aria-label": etiqueta, onchange: () => { f[k] = s.value; cargar(true); } }); opciones(s, lista, valor, texto, etiqueta); s.value = f[k] ?? ""; return s; };
  const mes = h("input", { type: "month", value: f.mes ?? "", "aria-label": "Mes", onchange: () => { f.mes = mes.value; cargar(true); } });
  const buscar = h("input", { type: "search", placeholder: "Buscar por título o descripción", "aria-label": "Buscar", value: f.buscar ?? "", onchange: () => { f.buscar = buscar.value; cargar(true); } });
  const lista = h("div", { class: album === "fotos" ? "grid galeria" : "grid docs" }), pie = h("div", { style: "text-align:center;margin:18px" });
  const albumes = h("div", { class: "albumes", role: "tablist", "aria-label": "Álbumes" },
    ...[["fotos", "Fotografías", "Evidencias fotográficas de actividades"], ["documentos", "Documentos PDF", "Documentos que envían las sedes y los equipos"]].map(([k, n, d]) =>
      h("button", { role: "tab", class: "album" + (k === album ? " activo" : ""), "aria-selected": k === album, onclick: () => { if (S.album !== k) { S.album = k; S.rerender(); } } }, h("b", {}, n), h("span", {}, d))));
  const adjuntar = esAdmin ? h("button", { class: "btn", onclick: () => abrirForm(null) }, "+ Adjuntar evidencia") : "";

  function abrirForm(ev) {
    const cerrar = () => dlg.close();
    dlgc.replaceChildren(h("h2", { style: "margin:0 0 8px" }, ev ? "Editar evidencia" : "Adjuntar evidencia"), formEvidencia({ cfg: S.cfg, ev, area: S.area, alGuardar: () => { cerrar(); cargar(true); }, alCancelar: cerrar }));
    dlg.showModal();
  }

  c.append(h("div", { class: "fototeca-cab" }, albumes, adjuntar),
    h("div", { class: "filters" }, buscar, sel("tipo", tipos, "Todos los tipos", "clave", "nombre"), sel("sede", S.cfg.sedes, "Todas las sedes", "id", "nombre"),
      S.area === "siau" ? sel("tecnico", S.cfg.tecnicos.filter((t) => t.rol === "tecnico"), "Todos los SIAU", "id", "nombre") : "", mes), lista, pie);

  let offset = 0;
  async function cargar(reset) {
    if (reset) { offset = 0; lista.replaceChildren(); pie.replaceChildren(); lista.append(...skEsperando()); }
    const q = new URLSearchParams({ area: S.area, album, limit: PAGINA, offset });
    for (const [k, v] of Object.entries(f)) if (v) q.set(k, v);
    let r;
    try { r = await api("/api/evidencias?" + q); } catch (e) { return pie.replaceChildren(h("div", { class: "msg err" }, e.message)); }
    const base = offset;
    if (offset === 0) lista.replaceChildren();
    lista.append(...r.items.map((e, i) => (album === "fotos" ? tarjetaFoto : tarjetaDoc)(e, base === 0 ? i : 0)));
    offset += r.items.length;
    pie.replaceChildren(offset < r.total ? h("button", { class: "btn sec", onclick: () => cargar(false) }, `Ver más (${r.total - offset})`)
      : r.total ? h("span", { class: "leyenda" }, `${r.total} ${album === "fotos" ? "evidencia(s) con fotografías" : "evidencia(s) con documentos"}`)
        : h("div", { class: "vacio" }, mascota("manos", 130), album === "fotos" ? "No hay fotografías con estos filtros." : "No hay documentos con estos filtros.", esAdmin ? h("p", {}, h("button", { class: "btn", onclick: () => abrirForm(null) }, "+ Adjuntar evidencia")) : ""));
  }

  const skEsperando = () => (album === "fotos" ? [...skGaleria(6).children] : Array.from({ length: 4 }, () => h("div", { class: "card doc" }, sk("", "flex:0 0 64px;height:84px;border-radius:8px"), h("div", { class: "cu", style: "flex:1" }, sk("l-chip"), sk("l-titulo"), sk("l-sub")))));
  const meta = (e) => [fmtFecha(e.fecha), e.sede, e.tecnico && nombreCorto(e.tecnico)].filter(Boolean).join(" · ");
  function tarjetaFoto(e, i) {
    return h("button", { class: "card ev", style: delay(i), onclick: () => detalle(e) },
      h("div", { class: "ph" }, e.portada ? [sk(), h("img", { src: e.portada, alt: "", decoding: "async", onload: (ev) => { ev.target.classList.add("lista"); ev.target.previousSibling?.remove(); } })] : "foto en Drive", e.fotos_ids.length > 1 ? h("span", { class: "cuenta" }, "+" + (e.fotos_ids.length - 1)) : ""),
      h("div", { class: "cu" }, h("div", { class: "id" }, "Evidencia N.º " + String(e.id).padStart(4, "0")), h("span", { class: "badge" }, e.tipo_nombre), h("h3", {}, e.titulo), h("div", { class: "mut" }, meta(e))));
  }
  function tarjetaDoc(e, i) {
    return h("button", { class: "card doc", style: delay(i), onclick: () => detalle(e) },
      h("div", { class: "hoja", "aria-hidden": "true" }, h("span", { class: "pdf" }, "PDF"), h("i"), h("i"), h("i", { class: "corta" }), e.documentos.length > 1 ? h("span", { class: "cuenta" }, e.documentos.length + " archivos") : ""),
      h("div", { class: "cu" }, h("span", { class: "badge" }, e.tipo_nombre), h("h3", {}, e.titulo), h("p", { class: "resumen" }, e.descripcion || e.documentos.map((d) => d.nombre).join(" · ")), h("div", { class: "mut" }, meta(e))));
  }

  /** Desenfoque → nítida: se muestra al instante la miniatura que ya viene con el registro y se cambia por la foto completa cuando termina de bajar. */
  function foto(id, alt, previa) {
    const caja = h("div", { class: "foto-caja" }, previa ? h("img", { class: "previa", src: previa, alt: "" }) : h("div", { style: "height:200px" }), sk());
    api("/api/foto?id=" + encodeURIComponent(id)).then((r) => {
      const img = h("img", { class: "completa", alt, decoding: "async", onload: () => { img.classList.add("lista"); setTimeout(() => caja.classList.add("hecha"), 280); } });
      img.src = r.data; caja.append(h("a", { href: r.data, target: "_blank", rel: "noopener", style: "display:contents" }, img));
    }).catch((er) => caja.replaceChildren(h("p", { class: "mut", style: "padding:16px" }, "No se pudo cargar la imagen: " + er.message)));
    return caja;
  }
  function detalle(e) {
    const err = h("div");
    const accion = (fn) => async () => { try { await fn(); } catch (er) { err.replaceChildren(h("div", { class: "msg err" }, er.message)); } };
    dlgc.replaceChildren(
      h("div", { style: "display:flex;justify-content:space-between;gap:12px;align-items:flex-start" }, h("div", {}, h("div", { class: "kicker" }, "Evidencia N.º " + String(e.id).padStart(4, "0")), h("span", { class: "badge" }, e.tipo_nombre), h("h2", { style: "margin:8px 0" }, e.titulo)), h("button", { class: "btn sec", onclick: () => dlg.close() }, "Cerrar")),
      h("p", { class: "mut num" }, [meta(e), e.cantidad > 1 && `Cantidad: ${e.cantidad}`, e.asistentes != null && `Asistentes: ${e.asistentes}`].filter(Boolean).join(" · ")),
      e.descripcion ? h("p", { style: "white-space:pre-wrap" }, e.descripcion) : "",
      e.documentos.length ? h("div", { class: "lista-docs" }, h("h3", { style: "margin:8px 0" }, "Documentos"), e.documentos.map((d) => h("div", { class: "doc-fila" }, h("span", { class: "ico-pdf", "aria-hidden": "true" }, "PDF"), h("span", { class: "nombre" }, d.nombre),
        h("button", { class: "btn sec", onclick: accion(() => archivo(d.id, d.nombre, true)) }, "Abrir"), h("button", { class: "btn sec", onclick: accion(() => archivo(d.id, d.nombre, false)) }, "Descargar")))) : "",
      e.fotos_ids.length ? h("div", { class: "fotos" }, e.fotos_ids.map((id, i) => foto(id, `${e.titulo} · imagen ${i + 1}`, i === 0 ? e.portada : null))) : "",
      e.fotos_ids.length ? h("p", { class: "leyenda" }, h("b", {}, "Fig."), " Imágenes de respaldo de la actividad.") : "", err,
      esAdmin ? h("p", { class: "acciones" }, h("button", { class: "btn sec", onclick: () => abrirForm(e) }, "Editar"),
        h("button", { class: "btn del", onclick: accion(async () => { if (confirm(`¿Eliminar "${e.titulo}" y sus archivos?`)) { await api("/api/admin/evidencias/" + e.id, { method: "DELETE" }); dlg.close(); cargar(true); } }) }, "Eliminar")) : "");
    dlg.showModal();
  }
  cargar(true);
}
