// Ingreso con usuario y contraseña, y «Mi cuenta» (cambiar contraseña / salir). Para quien no tiene cuenta de Google de la organización.
import { api, h, guardarToken, mascota } from "./comun.js";

/** Pantalla de ingreso. alEntrar(sesion) se llama con { rol, nombre, usuario } cuando las credenciales son correctas. */
export function pantallaIngreso({ alEntrar, aviso = "", mensajeRol = null }) {
  const usuario = h("input", { type: "text", autocomplete: "username", autocapitalize: "none", spellcheck: false, required: true, "aria-label": "Usuario" });
  const clave = h("input", { type: "password", autocomplete: "current-password", required: true, "aria-label": "Contraseña" });
  const ver = h("button", { type: "button", class: "ver-clave", "aria-label": "Mostrar la contraseña", "aria-pressed": "false", onclick: () => { const v = clave.type === "password"; clave.type = v ? "text" : "password"; ver.setAttribute("aria-pressed", String(v)); ver.textContent = v ? "Ocultar" : "Mostrar"; } }, "Mostrar");
  const msg = h("div", { "aria-live": "polite" }), btn = h("button", { class: "btn" }, "Entrar");
  const form = h("form", { class: "ingreso card", onsubmit: async (ev) => {
    ev.preventDefault(); btn.disabled = true; btn.setAttribute("aria-busy", "true"); msg.replaceChildren();
    try {
      const s = await api("/api/login", { json: { usuario: usuario.value, clave: clave.value } });
      guardarToken(s.token); clave.value = ""; await alEntrar(s);
    } catch (e) { msg.replaceChildren(h("div", { class: "msg err" }, e.message)); clave.select?.(); }
    btn.disabled = false; btn.removeAttribute("aria-busy");
  } },
    h("h2", {}, "Ingreso a la plataforma"), h("p", { class: "mut", style: "margin:0 0 12px" }, "Evidencias y cumplimiento del SIAU · MiRed IPS"),
    aviso ? h("div", { class: "msg" }, aviso) : "", mensajeRol ? h("div", { class: "msg err" }, mensajeRol) : "",
    h("label", {}, "Usuario"), usuario, h("label", {}, "Contraseña"), h("div", { class: "campo-clave" }, clave, ver), msg, h("p", {}, btn),
    h("p", { class: "mut", style: "font-size:13px;margin:0" }, "¿No tiene usuario o olvidó la contraseña? Pídasela a quien administra la plataforma."));
  setTimeout(() => usuario.focus({ preventScroll: true }), 50);
  return h("div", { class: "login" }, mascota("bienvenida", 170), form);
}

/** Diálogo «Mi cuenta»: cambiar la contraseña. */
export function abrirCuenta(sesion) {
  const dlg = h("dialog", { class: "cuenta-dlg" });
  const actual = h("input", { type: "password", autocomplete: "current-password", required: true }), nueva = h("input", { type: "password", autocomplete: "new-password", required: true, minLength: 10 }), otra = h("input", { type: "password", autocomplete: "new-password", required: true });
  const msg = h("div", { "aria-live": "polite" }), btn = h("button", { class: "btn" }, "Cambiar contraseña");
  const form = h("form", { onsubmit: async (ev) => {
    ev.preventDefault(); msg.replaceChildren();
    if (nueva.value !== otra.value) return msg.replaceChildren(h("div", { class: "msg err" }, "Las dos contraseñas nuevas no coinciden."));
    btn.disabled = true; btn.setAttribute("aria-busy", "true");
    try { await api("/api/clave", { json: { actual: actual.value, nueva: nueva.value } }); msg.replaceChildren(h("div", { class: "msg ok" }, "Contraseña cambiada.")); actual.value = nueva.value = otra.value = ""; }
    catch (e) { msg.replaceChildren(h("div", { class: "msg err" }, e.message)); }
    btn.disabled = false; btn.removeAttribute("aria-busy");
  } }, h("h2", { style: "margin:0 0 4px" }, "Mi cuenta"), h("p", { class: "mut", style: "margin:0 0 10px" }, `${sesion.nombre || sesion.email}`),
    h("label", {}, "Contraseña actual"), actual, h("label", {}, "Contraseña nueva (mínimo 10 caracteres)"), nueva, h("label", {}, "Repita la nueva"), otra, msg,
    h("p", { class: "acciones" }, btn, h("button", { type: "button", class: "btn sec", onclick: () => dlg.close() }, "Cerrar")));
  dlg.append(h("div", { class: "in" }, form));
  dlg.addEventListener("close", () => dlg.remove()); dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
  document.body.append(dlg); dlg.showModal();
}

/** Zona de la barra superior: nombre de la persona, «Mi cuenta» y «Salir» (solo si entró con usuario y contraseña). */
export function pintarSesion(lugar, sesion, alSalir) {
  if (!lugar) return;
  lugar.replaceChildren(h("span", { class: "quien-soy" }, sesion.nombre || sesion.email),
    ...(sesion.via === "clave" ? [h("button", { class: "enlace", onclick: () => abrirCuenta(sesion) }, "Mi cuenta"), h("button", { class: "enlace", onclick: async () => { try { await api("/api/logout", { json: {} }); } catch { /* ya vencida */ } guardarToken(""); alSalir(); } }, "Salir")] : []));
  lugar.hidden = false;
}
