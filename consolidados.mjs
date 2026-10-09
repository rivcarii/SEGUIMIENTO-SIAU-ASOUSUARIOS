// Lectores de los consolidados de SIAU. Reciben cuadrículas (arreglos de filas) tal como las
// entrega Google Sheets (getDisplayValues) y devuelven filas normalizadas. Sin dependencias.
import { normalizar } from "./sedes.mjs";

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const mesNum = (s) => MESES.indexOf(normalizar(s)) + 1;
const celda = (g, fila1, col0) => g?.[fila1 - 1]?.[col0] ?? "";
const texto = (v) => String(v ?? "").trim();

/** Entero desde texto de hoja ("297", "1.234", " 12 "); null si está vacío o no es número. */
export function entero(v) {
  const t = texto(v).replace(/\s/g, "");
  if (!t) return null;
  const s = /^\d{1,3}(\.\d{3})+$/.test(t) ? t.replace(/\./g, "") : t;
  return /^-?\d+$/.test(s) ? Number(s) : null;
}

/** Fecha AAAA-MM-DD desde "2026-05-12", "12/05/2026" (día/mes/año, formato colombiano) o ISO con hora. */
export function fecha(v) {
  const t = texto(v);
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(t);
  if (!m) { const d = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(t); if (d) m = [null, d[3], d[2].padStart(2, "0"), d[1].padStart(2, "0")]; }
  if (!m) return null;
  const [y, mo, d] = [+m[1], +m[2], +m[3]], u = new Date(Date.UTC(y, mo - 1, d));
  return u.getUTCFullYear() === y && u.getUTCMonth() === mo - 1 && u.getUTCDate() === d ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

/** Hoja REGISTRO SOCIALIZACIONES del consolidado F-SIAU-031 → una fila por charla. */
export function parsearSocializaciones(grid) {
  const avisos = [];
  const h = grid.findIndex((f) => { const n = f.map(normalizar); return n.includes("fecha") && n.includes("tema socializado"); });
  if (h < 0) return { charlas: [], avisos: ["No se encontró el encabezado (Fecha / Tema socializado) en REGISTRO SOCIALIZACIONES."] };
  const col = Object.fromEntries(grid[h].map((c, i) => [normalizar(c), i]));
  const get = (f, k) => texto(f[col[k]]);
  const charlas = [];
  grid.slice(h + 1).forEach((f, i) => {
    if (f.every((c) => !texto(c))) return;
    const fe = fecha(get(f, "fecha"));
    if (!fe) return avisos.push(`Fila ${h + 2 + i}: fecha ilegible «${get(f, "fecha")}»; se omite.`);
    const tipo = normalizar(get(f, "tipo charla"));
    charlas.push({
      fecha: fe, sede_texto: get(f, "codigo sede") || get(f, "sede"), sede_alterna: get(f, "sede"),
      tema: get(f, "tema socializado"), tipo: tipo.startsWith("func") ? "funcionarios" : tipo.startsWith("usu") ? "usuarios" : tipo || "otro",
      asistentes: entero(f[col["asistentes"]]) ?? 0, responsable: get(f, "responsable"), fila: h + 2 + i,
    });
  });
  return { charlas, avisos };
}

// Libro «Plantilla de recolección de datos · SIAU»: hasta 6 sedes por técnico (hoja CONFIG, C16:C21).
// Hojas SATISFACCION y MANIFESTACIONES USUARIOS: 6 bloques de 12 meses; 2 por banda de filas (izq. B..G, der. I..N).
const BLOQUES = (i) => ({ r0: 5 + 17 * Math.floor(i / 2), izq: i % 2 === 0 });
const IND_SATISFACCION = { encuestas: 0, satisfechos: 1, trazadora: 3 }; // desplazamiento desde la columna de MES
const IND_MANIFESTACIONES = { felicitaciones: 0, quejas: 1, reclamos: 2, sugerencias: 3 };

function leerBloquesMensuales(grid, sedes, indicadores, periodoDe, avisos, hoja) {
  const filas = [];
  sedes.forEach((sede, i) => {
    if (!sede) return;
    const { r0, izq } = BLOQUES(i), cMes = izq ? 1 : 8;
    for (let m = 1; m <= 12; m++) {
      const r = r0 + 1 + m;
      if (mesNum(celda(grid, r, cMes)) !== m) { avisos.push(`${hoja}: el bloque de «${sede}» no tiene el mes ${m} en la fila ${r}; se omite el bloque.`); return; }
      for (const [ind, off] of Object.entries(indicadores)) {
        const v = entero(celda(grid, r, cMes + 1 + off));
        if (v != null) filas.push({ sede_texto: sede, periodo: periodoDe(m), indicador: ind, valor: v });
      }
    }
  });
  return filas;
}

export function parsearRecoleccion(hojas) {
  const avisos = [], cfg = hojas.CONFIG ?? [];
  const tecnico = texto(celda(cfg, 6, 2));
  const anio = entero(celda(cfg, 8, 2)) ?? new Date().getFullYear();
  const sedes = Array.from({ length: 6 }, (_, i) => texto(celda(cfg, 16 + i, 2)));
  const periodoDe = (m) => `${anio}-${String(m).padStart(2, "0")}`;
  let filas = [];
  if (hojas.SATISFACCION) filas.push(...leerBloquesMensuales(hojas.SATISFACCION, sedes, IND_SATISFACCION, periodoDe, avisos, "SATISFACCION"));
  if (hojas["MANIFESTACIONES USUARIOS"]) filas.push(...leerBloquesMensuales(hojas["MANIFESTACIONES USUARIOS"], sedes, IND_MANIFESTACIONES, periodoDe, avisos, "MANIFESTACIONES USUARIOS"));
  const ch = hojas.CHARLAS;
  if (ch) {
    sedes.forEach((sede, i) => {
      if (!sede) return;
      for (let m = 1; m <= 12; m++) {
        for (const [ind, c0] of [["asistentes_usuarios", 1 + m], ["asistentes_funcionarios", 17 + m]]) {
          const v = entero(celda(ch, 7 + i, c0));
          if (v != null) filas.push({ sede_texto: sede, periodo: periodoDe(m), indicador: ind, valor: v });
        }
      }
    });
  }
  return { tecnico, anio, sedes: sedes.filter(Boolean), filas, avisos };
}
