/** Dirección donde viven los recursos de la interfaz (la define la página que sirve Apps Script). */
export const RECURSOS = (window.PLATAFORMA?.base ?? "").replace(/\/+$/, "");
export const recurso = (ruta) => RECURSOS + ruta;
export const APP = window.PLATAFORMA?.app ?? "";

// ---- Sesión (usuario y contraseña): el token vive en sessionStorage (si el navegador no lo permite, solo en memoria)
let tokenMem = "";
const lugar = () => { try { return window.sessionStorage; } catch { return null; } };
export const leerToken = () => { try { return lugar()?.getItem("siau_token") || tokenMem; } catch { return tokenMem; } };
export const guardarToken = (t) => { tokenMem = t || ""; try { if (t) lugar()?.setItem("siau_token", t); else lugar()?.removeItem("siau_token"); } catch { /* sin almacenamiento */ } };
let alVencer = null;
/** La pantalla registra qué hacer cuando el servidor dice «inicie sesión» (401). */
export const alSesionVencida = (fn) => { alVencer = fn; };

/**
 * Llama al servidor (Apps Script: google.script.run → función `llamar`). Misma forma que un fetch:
 * api("/api/evidencias?mes=2026-09"), api(ruta, { json }) para POST, { method: "PUT" | "DELETE", json }.
 */
export function api(ruta, opts = {}) {
  const [camino, qs = ""] = ruta.split("?");
  const metodo = opts.method ?? (opts.json !== undefined ? "POST" : "GET");
  const peticion = JSON.stringify({ metodo, ruta: camino, q: Object.fromEntries(new URLSearchParams(qs)), cuerpo: opts.json ?? {}, token: leerToken() || undefined });
  return new Promise((ok, fallo) => {
    const g = window.google?.script?.run;
    if (!g) return fallo(new Error("Esta página solo funciona dentro de la plataforma (Apps Script)."));
    g.withSuccessHandler((texto) => {
      let r; try { r = JSON.parse(texto); } catch { return fallo(new Error("Respuesta inválida del servidor")); }
      if (r.ok) return ok(r.datos);
      if (r.estado === 401 && camino !== "/api/login") { guardarToken(""); alVencer?.(); }
      fallo(Object.assign(new Error(r.error), { status: r.estado }));
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


// ---- Estados de carga: esqueletos que mantienen la forma del contenido para que nada salte al llegar los datos
export const sk = (clase = "", estilo = "") => h("div", { class: "sk " + clase, style: estilo || null, "aria-hidden": "true" });
export const cargando = (...hijos) => h("div", { class: "cargando", role: "status", "aria-live": "polite", "aria-label": "Cargando" }, ...hijos);
export const skFigura = (cls = "t6") => h("section", { class: "figura " + cls }, sk("l-titulo"), sk("l-sub"), sk("l-grafico"));
export const skTarjetas = (n = 6, alto = 190) => h("div", { class: "siau-grid" }, Array.from({ length: n }, () => h("div", { class: "siau-card" }, sk("l-titulo"), sk("l-chip"), sk("", `height:${alto - 110}px;border-radius:12px`))));
export const skGaleria = (n = 8) => h("div", { class: "grid galeria" }, Array.from({ length: n }, () => h("div", { class: "card ev sk-card" }, sk("", "aspect-ratio:4/3;border-radius:0"), h("div", { class: "cu" }, sk("l-chip"), sk("l-titulo")))));
