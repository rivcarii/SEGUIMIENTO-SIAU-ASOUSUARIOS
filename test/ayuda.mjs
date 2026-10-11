// Utilidades de prueba: un núcleo completo con almacén y fotos en memoria.
import { crearAlmacenMemoria, crearFotosMemoria } from "../nucleo/almacen.mjs";
import { createHash, createHmac, randomBytes } from "node:crypto";
import { crearNucleo, inicializar, ErrorHttp } from "../nucleo/api.mjs";

/** Seguridad de prueba: mismas operaciones que Capa.gs, con node:crypto, un reloj controlable y un almacén clave-valor con vencimiento. */
export function nuevaSeguridad() {
  const m = new Map(), reloj = { t: 0 };
  return { reloj, seguridad: {
    hash: (clave, sal) => { let h = Buffer.from(clave); for (let i = 0; i < 20; i++) h = createHmac("sha256", sal).update(h).digest(); return h.toString("base64"); },
    resumen: (t) => createHash("sha256").update(t).digest("hex"), azar: (n) => randomBytes(n).toString("hex"),
    kv: { get: (k) => { const e = m.get(k); return e && e.vence > reloj.t ? e.v : null; }, put: (k, v, seg) => { m.set(k, { v, vence: reloj.t + seg * 1000 }); }, del: (k) => { m.delete(k); } } } };
}

export function nuevoNucleo({ hoy = "2026-09-30", ahora = "2026-09-30 12:00:00", rotacion = false } = {}) {
  const almacen = crearAlmacenMemoria(), fotos = crearFotosMemoria();
  inicializar(almacen, { rotacion });
  const { seguridad, reloj } = nuevaSeguridad();
  const nucleo = crearNucleo({ almacen, fotos, hoy: () => hoy, ahora: () => ahora, seguridad });
  const usuarios = { admin: { email: "admin@x.org", rol: "admin" }, visor: { email: "visor@x.org", rol: "visor" }, nadie: { email: "otro@x.org", rol: null }, anonimo: { email: "", rol: null } };
  /** api("GET", "/api/config", { rol, q, cuerpo }) */
  const api = (metodo, ruta, { rol = "admin", q, cuerpo } = {}) => nucleo.manejar({ metodo, ruta, q, cuerpo }, usuarios[rol]);
  return { almacen, fotos, nucleo, api, reloj, seguridad };
}

export async function falla(fn, estado) {
  try { await fn(); } catch (e) { if (e instanceof ErrorHttp && (estado == null || e.estado === estado)) return e; throw e; }
  throw new Error("Debía fallar y no falló");
}
