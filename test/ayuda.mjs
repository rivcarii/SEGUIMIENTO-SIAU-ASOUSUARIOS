// Utilidades de prueba: un núcleo completo con almacén y fotos en memoria.
import { crearAlmacenMemoria, crearFotosMemoria } from "../nucleo/almacen.mjs";
import { crearNucleo, inicializar, ErrorHttp } from "../nucleo/api.mjs";

export function nuevoNucleo({ hoy = "2026-09-30", ahora = "2026-09-30 12:00:00", rotacion = false } = {}) {
  const almacen = crearAlmacenMemoria(), fotos = crearFotosMemoria();
  inicializar(almacen, { rotacion });
  const nucleo = crearNucleo({ almacen, fotos, hoy: () => hoy, ahora: () => ahora });
  const usuarios = { admin: { email: "admin@x.org", rol: "admin" }, visor: { email: "visor@x.org", rol: "visor" }, nadie: { email: "otro@x.org", rol: null } };
  /** api("GET", "/api/config", { rol, q, cuerpo }) */
  const api = (metodo, ruta, { rol = "admin", q, cuerpo } = {}) => nucleo.manejar({ metodo, ruta, q, cuerpo }, usuarios[rol]);
  return { almacen, fotos, nucleo, api };
}

export async function falla(fn, estado) {
  try { await fn(); } catch (e) { if (e instanceof ErrorHttp && (estado == null || e.estado === estado)) return e; throw e; }
  throw new Error("Debía fallar y no falló");
}
