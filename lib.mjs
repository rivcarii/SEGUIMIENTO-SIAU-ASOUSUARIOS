import { createHmac, timingSafeEqual } from "node:crypto";

/** Fechas (YYYY-MM-DD) de los viernes de un mes "YYYY-MM". */
export function viernesDelMes(mes) {
  const [y, m] = mes.split("-").map(Number);
  const out = [];
  for (let d = new Date(Date.UTC(y, m - 1, 1)); d.getUTCMonth() === m - 1; d.setUTCDate(d.getUTCDate() + 1)) {
    if (d.getUTCDay() === 5) out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

export const mesValido = (s) => /^\d{4}-(0[1-9]|1[0-2])$/.test(s ?? "");
export const fechaValida = (s) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s ?? "");
  if (!m) return false;
  const u = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return u.getUTCFullYear() === +m[1] && u.getUTCMonth() === +m[2] - 1 && u.getUTCDate() === +m[3];
};

/** Detecta el tipo de imagen por firma; null si no es jpg/png/webp. */
export function tipoImagen(buf) {
  if (buf.length > 12 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (buf.length > 12 && buf.subarray(0, 4).toString() === "RIFF" && buf.subarray(8, 12).toString() === "WEBP") return "webp";
  return null;
}

export function firmar(payload, secreto) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${createHmac("sha256", secreto).update(body).digest("base64url")}`;
}

export function verificar(token, secreto) {
  const [body, sig] = (token ?? "").split(".");
  if (!body || !sig) return null;
  const esperado = createHmac("sha256", secreto).update(body).digest("base64url");
  const a = Buffer.from(sig), b = Buffer.from(esperado);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString());
    return p.exp > Date.now() ? p : null;
  } catch { return null; }
}

export function igualesSeguro(a, b) {
  const x = createHmac("sha256", "k").update(String(a)).digest();
  const y = createHmac("sha256", "k").update(String(b)).digest();
  return timingSafeEqual(x, y);
}

/**
 * Cumplimiento mensual.
 * tipos: [{clave, area, nombre, meta, alcance}]; evs: [{tipo, tecnico_id, sede_id, fecha, cantidad}]
 */
export function calcularCumplimiento({ mes, tipos, evs, tecnicos, sedes }) {
  const siau = tipos.filter((t) => t.area === "siau");
  const porTipo = siau.map((t) => {
    const delTipo = evs.filter((e) => e.tipo === t.clave);
    const total = delTipo.reduce((s, e) => s + e.cantidad, 0);
    const porTecnico = tecnicos.map((tc) => ({
      tecnico_id: tc.id,
      nombre: tc.nombre,
      total: delTipo.filter((e) => e.tecnico_id === tc.id).reduce((s, e) => s + e.cantidad, 0),
    }));
    return { clave: t.clave, nombre: t.nombre, meta: t.meta, alcance: t.alcance, total, porTecnico };
  });

  const viernes = viernesDelMes(mes);
  const actas = sedes.map((s) => {
    const entregadas = new Set(
      evs.filter((e) => e.tipo === "acta_buzon" && e.sede_id === s.id).map((e) => e.fecha),
    );
    const faltantes = viernes.filter((v) => !entregadas.has(v));
    return { sede_id: s.id, nombre: s.nombre, esperadas: viernes.length, entregadas: viernes.length - faltantes.length, faltantes };
  });
  return { mes, tipos: porTipo, actas, viernes };
}
