/** Dirección donde viven los recursos de la interfaz (la define la página que sirve Apps Script). */
export const RECURSOS = (window.PLATAFORMA?.base ?? "").replace(/\/+$/, "");
export const recurso = (ruta) => RECURSOS + ruta;
export const APP = window.PLATAFORMA?.app ?? "";

/**
 * Llama al servidor (Apps Script: google.script.run → función `llamar`). Misma forma que un fetch:
 * api("/api/evidencias?mes=2026-09"), api(ruta, { json }) para POST, { method: "PUT" | "DELETE", json }.
 */
export function api(ruta, opts = {}) {
  const [camino, qs = ""] = ruta.split("?");
  const metodo = opts.method ?? (opts.json !== undefined ? "POST" : "GET");
  const peticion = JSON.stringify({ metodo, ruta: camino, q: Object.fromEntries(new URLSearchParams(qs)), cuerpo: opts.json ?? {} });
  return new Promise((ok, fallo) => {
    const g = window.google?.script?.run;
    if (!g) return fallo(new Error("Esta página solo funciona dentro de la plataforma (Apps Script)."));
    g.withSuccessHandler((texto) => {
      let r; try { r = JSON.parse(texto); } catch { return fallo(new Error("Respuesta inválida del servidor")); }
      if (r.ok) ok(r.datos); else fallo(Object.assign(new Error(r.error), { status: r.estado }));
    }).withFailureHandler((e) => fallo(new Error(e?.message ?? String(e)))).llamar(peticion);
  });
}

/** Crea elementos sin innerHTML (evita XSS con texto de usuario). */
export function h(tag, attrs = {}, ...hijos) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else if (k === "class") e.className = v;
    else if (k in e && k !== "list") e[k] = v;
    else e.setAttribute(k, v);
  }
  e.append(...hijos.flat().filter((x) => x != null && x !== false));
  return e;
}

export const mesActual = () => new Date().toISOString().slice(0, 7);
export const fechaHoy = () => new Date().toLocaleDateString("sv");
export const fmtFecha = (f) => new Date(f + "T12:00:00").toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" });

export function opciones(sel, lista, valor = "id", texto = "nombre", vacio = "Todos") {
  sel.replaceChildren(h("option", { value: "" }, vacio), ...lista.map((x) => h("option", { value: x[valor] }, x[texto])));
}

/** Logos: MiRed IPS (pequeño) → Gestión de la Calidad (proceso) → SIAU (protagonista, el más grande). */
export function pintarMarca(marca, area = "siau") {
  const sep = () => h("span", { class: "sep" });
  document.getElementById("logos").replaceChildren(
    h("img", { class: "mired", src: recurso("/shared/marca/mired.png"), alt: "MiRed IPS" }), sep(),
    ...(area === "siau"
      ? [h("img", { class: "calidad", src: recurso("/shared/marca/calidad-azul.png"), alt: "Gestión de la Calidad" }), sep(), h("img", { class: "principal", src: recurso("/shared/marca/siau-azul.png"), alt: marca.nombre_siau })]
      : [h("img", { class: "principal aso", src: recurso("/shared/marca/asociacion.png"), alt: marca.nombre_asociacion })]));
}

/** Killo, la mascota de MiRed: pulgar, explica, atento, bienvenida, manos, celular, dardo, siau (megáfono). */
export const mascota = (pose, alto) => h("img", { class: "mascota", src: recurso(`/shared/marca/killo-${pose}.webp`), alt: "", style: alto ? `height:${alto}px` : null });

/** Título grande estilo iOS: al salir de pantalla, el título pasa a la barra superior. */
export function tituloGrande(kicker, titulo) {
  const k = h("p", { class: "kicker" }, kicker), t = h("h1", {}, titulo);
  const el = h("header", { class: "titulo-grande" }, k, t);
  const nav = document.getElementById("nav");
  nav.querySelector(".nav-titulo").textContent = titulo;
  new IntersectionObserver(([e]) => nav.classList.toggle("scrolled", !e.isIntersecting), { rootMargin: "-60px 0px 0px 0px" }).observe(el);
  return { el, kicker: k, titulo: t };
}

export const mesLegible = (m) => new Date(m + "-15T12:00:00").toLocaleDateString("es-CO", { month: "long", year: "numeric" });

