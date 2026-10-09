// Almacén en memoria con la misma interfaz que el almacén de Hojas de Google (ver google/Capa.gs). Se usa en las pruebas.
// Interfaz: tabla(nombre) → { todos(), insertar(fila), actualizar(id, parche), borrar(id), reemplazar(pred, nuevas) }; atomico(fn); guardar().
const copia = (x) => JSON.parse(JSON.stringify(x));

export function crearAlmacenMemoria() {
  let datos = {};
  const t = (n) => (datos[n] ??= { filas: [], sig: 1 });
  return {
    tabla: (nombre) => ({
      todos: () => copia(t(nombre).filas),
      insertar(fila) {
        const T = t(nombre), f = copia(fila);
        if (f.id == null) f.id = T.sig++;
        else if (typeof f.id === "number") T.sig = Math.max(T.sig, f.id + 1);
        T.filas.push(f);
        return f.id;
      },
      actualizar(id, parche) { const f = t(nombre).filas.find((x) => x.id === id); if (f) Object.assign(f, copia(parche)); },
      borrar(id) { const T = t(nombre); T.filas = T.filas.filter((x) => x.id !== id); },
      reemplazar(pred, nuevas) { const T = t(nombre); T.filas = T.filas.filter((x) => !pred(x)); for (const n of nuevas) this.insertar(n); },
    }),
    /** Ejecuta fn y, si falla, deja los datos como estaban. */
    atomico(fn) { const antes = copia(datos); try { return fn(); } catch (e) { datos = antes; throw e; } },
    guardar() {},
  };
}

/** Servicio de fotos en memoria (en Google son archivos de Drive). */
export function crearFotosMemoria() {
  const guardadas = new Map();
  let n = 0;
  return {
    guardar(base64, tipo) { const id = `foto${String(++n).padStart(8, "0")}`; guardadas.set(id, { base64, tipo }); return id; },
    existe: (id) => guardadas.has(id),
    borrar: (id) => guardadas.delete(id),
    datos: (id) => `data:${guardadas.get(id)?.tipo ?? "image/jpeg"};base64,${guardadas.get(id)?.base64 ?? ""}`,
  };
}
