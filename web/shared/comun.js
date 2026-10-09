export async function api(ruta, opts = {}) {
  const o = { credentials: "same-origin", ...opts };
  if (o.json !== undefined) { o.method ??= "POST"; o.headers = { "content-type": "application/json" }; o.body = JSON.stringify(o.json); }
  const r = await fetch(ruta, o);
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(data.error ?? `Error ${r.status}`), { status: r.status });
  return data;
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
    h("img", { class: "mired", src: "/shared/marca/mired.png", alt: "MiRed IPS" }), sep(),
    ...(area === "siau"
      ? [h("img", { class: "calidad", src: "/shared/marca/calidad-azul.png", alt: "Gestión de la Calidad" }), sep(), h("img", { class: "principal", src: marca.logo_siau, alt: marca.nombre_siau })]
      : [h("img", { class: "principal aso", src: marca.logo_asociacion, alt: marca.nombre_asociacion })]));
}

/** Killo, la mascota de MiRed: pulgar, explica, atento, bienvenida, manos, celular, dardo, siau (megáfono). */
export const mascota = (pose, alto) => h("img", { class: "mascota", src: `/shared/marca/killo-${pose}.webp`, alt: "", style: alto ? `height:${alto}px` : null });

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

