import { createServer } from "node:http";
import { readFile, writeFile, unlink, stat } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { join, extname, normalize, sep } from "node:path";
import { db, UPLOADS, ajuste, setAjuste } from "./db.mjs";
import { crearResolver } from "./sedes.mjs";
import { parsearRecoleccion, parsearSocializaciones } from "./consolidados.mjs";
import { calcularCumplimiento, fechaValida, firmar, igualesSeguro, mesValido, tipoImagen, verificar } from "./lib.mjs";

const PORT = Number(process.env.PORT ?? 3000);
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const VISOR_PASSWORD = process.env.VISOR_PASSWORD; // opcional: protege el visor
const BOT_TOKEN = process.env.BOT_TOKEN; // opcional: habilita /api/bot/*
const SECRETO = process.env.SESSION_SECRET ?? randomBytes(32).toString("hex");
if (!ADMIN_PASSWORD) { console.error("Define ADMIN_PASSWORD."); process.exit(1); }

const WEB = join(import.meta.dirname, "web");
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".svg": "image/svg+xml" };
const SEGURIDAD = { "x-content-type-options": "nosniff", "referrer-policy": "same-origin", "content-security-policy": "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'" };

class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }
const bad = (m) => new HttpError(400, m);

const send = (res, status, body, headers = {}) => { res.writeHead(status, { ...SEGURIDAD, ...headers }); res.end(body); };
const json = (res, data, status = 200) => send(res, status, JSON.stringify(data), { "content-type": "application/json" });

async function leer(req, max) {
  const chunks = []; let n = 0;
  for await (const c of req) { n += c.length; if (n > max) throw new HttpError(413, "Archivo demasiado grande"); chunks.push(c); }
  return Buffer.concat(chunks);
}
const leerJson = async (req, max = 1e6) => { try { return JSON.parse((await leer(req, max)).toString() || "{}"); } catch (e) { if (e instanceof HttpError) throw e; throw bad("JSON inválido"); } };

function sesion(req) {
  const m = /(?:^|; )sess=([^;]+)/.exec(req.headers.cookie ?? "");
  return m ? verificar(m[1], SECRETO) : null;
}
const exigirVisor = (req) => { if (VISOR_PASSWORD && !sesion(req)) throw new HttpError(401, "Inicia sesión"); };
const exigirAdmin = (req) => { if (sesion(req)?.rol !== "admin") throw new HttpError(401, "Solo administradores"); };
const exigirBot = (req) => {
  const t = /^Bearer (.+)$/.exec(req.headers.authorization ?? "")?.[1];
  if (!BOT_TOKEN || !t || !igualesSeguro(t, BOT_TOKEN)) throw new HttpError(401, "Token inválido");
};

const intentos = new Map();
function limitarLogin(ip) {
  const ahora = Date.now(), r = (intentos.get(ip) ?? []).filter((t) => ahora - t < 15 * 60e3);
  if (r.length >= 10) throw new HttpError(429, "Demasiados intentos; espera 15 minutos");
  r.push(ahora); intentos.set(ip, r);
}

const txt = (v, max, req = false) => {
  const s = String(v ?? "").trim();
  if (req && !s) throw bad("Falta un campo obligatorio");
  if (s.length > max) throw bad("Texto demasiado largo");
  return s;
};
const entero = (v, min, max, def) => {
  if (v == null || v === "") return def;
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max) throw bad("Número inválido");
  return n;
};

function fotosDe(ids) {
  if (!ids.length) return new Map();
  const rows = db.prepare(`SELECT evidencia_id, archivo FROM fotos WHERE evidencia_id IN (${ids.map(() => "?").join(",")}) ORDER BY orden`).all(...ids);
  const m = new Map();
  for (const r of rows) (m.get(r.evidencia_id) ?? m.set(r.evidencia_id, []).get(r.evidencia_id)).push(`/uploads/${r.archivo}`);
  return m;
}

function listarEvidencias(q) {
  const w = [], p = [];
  for (const [k, col] of [["area", "e.area"], ["tipo", "e.tipo"], ["sede", "e.sede_id"], ["tecnico", "e.tecnico_id"]]) {
    if (q.get(k)) { w.push(`${col} = ?`); p.push(q.get(k)); }
  }
  if (q.get("mes")) { if (!mesValido(q.get("mes"))) throw bad("Mes inválido"); w.push("substr(e.fecha,1,7) = ?"); p.push(q.get("mes")); }
  const limit = entero(q.get("limit"), 1, 100, 24), offset = entero(q.get("offset"), 0, 1e6, 0);
  const where = w.length ? "WHERE " + w.join(" AND ") : "";
  const total = db.prepare(`SELECT COUNT(*) n FROM evidencias e ${where}`).get(...p).n;
  const rows = db.prepare(`SELECT e.*, s.nombre sede, t.nombre tecnico, ti.nombre tipo_nombre FROM evidencias e
    LEFT JOIN sedes s ON s.id=e.sede_id LEFT JOIN tecnicos t ON t.id=e.tecnico_id JOIN tipos ti ON ti.clave=e.tipo
    ${where} ORDER BY e.fecha DESC, e.id DESC LIMIT ? OFFSET ?`).all(...p, limit, offset);
  const fotos = fotosDe(rows.map((r) => r.id));
  return { total, items: rows.map((r) => ({ ...r, fotos: fotos.get(r.id) ?? [] })) };
}

function validarEvidencia(b) {
  const tipo = db.prepare("SELECT * FROM tipos WHERE clave=?").get(b.tipo);
  if (!tipo) throw bad("Tipo inválido");
  if (!fechaValida(b.fecha)) throw bad("Fecha inválida");
  const sede = b.sede_id ? entero(b.sede_id, 1, 1e9) : null;
  const tec = b.tecnico_id ? entero(b.tecnico_id, 1, 1e9) : null;
  if (sede && !db.prepare("SELECT 1 FROM sedes WHERE id=?").get(sede)) throw bad("Sede inexistente");
  if (tec && !db.prepare("SELECT 1 FROM tecnicos WHERE id=?").get(tec)) throw bad("Técnico inexistente");
  const fotos = Array.isArray(b.fotos) ? b.fotos : [];
  if (fotos.length > 30) throw bad("Máximo 30 fotos por evidencia");
  return {
    area: tipo.area, tipo: tipo.clave, titulo: txt(b.titulo, 200, true), descripcion: txt(b.descripcion, 5000),
    fecha: b.fecha, sede_id: sede, tecnico_id: tec, cantidad: entero(b.cantidad, 1, 100000, 1), asistentes: entero(b.asistentes, 0, 100000, null),
    fotos,
  };
}

async function archivosExisten(fotos) {
  for (const f of fotos) {
    if (!/^[a-f0-9]{32}\.(jpg|png|webp)$/.test(f)) throw bad("Foto inválida");
    await stat(join(UPLOADS, f)).catch(() => { throw bad("Foto no encontrada: súbela de nuevo"); });
  }
}

function guardarFotos(id, fotos) {
  db.prepare("DELETE FROM fotos WHERE evidencia_id=?").run(id);
  const ins = db.prepare("INSERT INTO fotos(evidencia_id,archivo,orden) VALUES(?,?,?)");
  fotos.forEach((f, i) => ins.run(id, f, i));
}

async function subirImagen(req, max = 12e6) {
  const buf = await leer(req, max);
  const ext = tipoImagen(buf);
  if (!ext) throw bad("Solo se aceptan imágenes JPG, PNG o WebP");
  const archivo = `${randomBytes(16).toString("hex")}.${ext}`;
  await writeFile(join(UPLOADS, archivo), buf);
  return archivo;
}

/** Reemplaza lo que ya se había leído de ese archivo (así se reflejan correcciones y filas borradas). */
function sincronizarConsolidado(b) {
  const fuente = txt(b.archivo_id, 200, true), archivo = txt(b.archivo, 300);
  const resolver = crearResolver(db.prepare("SELECT id,nombre,codigo,alias FROM sedes").all());
  const noReconocidas = new Set(), resumen = { tipo: b.tipo, archivo };
  const sedeId = (t, alt) => { const s = resolver(t) ?? (alt ? resolver(alt) : null); if (!s) noReconocidas.add(t || alt || "(vacía)"); return s?.id ?? null; };
  db.exec("BEGIN");
  try {
    if (b.tipo === "socializaciones") {
      const r = parsearSocializaciones(b.hojas?.["REGISTRO SOCIALIZACIONES"] ?? []);
      db.prepare("DELETE FROM consolidado_charlas WHERE fuente=?").run(fuente);
      const ins = db.prepare("INSERT INTO consolidado_charlas(fuente,fecha,sede_id,sede_texto,tema,tipo,asistentes,responsable) VALUES (?,?,?,?,?,?,?,?)");
      for (const c of r.charlas) ins.run(fuente, c.fecha, sedeId(c.sede_texto, c.sede_alterna), c.sede_texto || c.sede_alterna, c.tema, c.tipo, c.asistentes, c.responsable);
      Object.assign(resumen, { charlas: r.charlas.length, avisos: r.avisos });
    } else if (b.tipo === "recoleccion") {
      const r = parsearRecoleccion(b.hojas ?? {});
      db.prepare("DELETE FROM consolidado_mensual WHERE fuente=?").run(fuente);
      const ins = db.prepare("INSERT INTO consolidado_mensual(fuente,tecnico,sede_id,sede_texto,periodo,indicador,valor) VALUES (?,?,?,?,?,?,?)");
      for (const f of r.filas) ins.run(fuente, r.tecnico, sedeId(f.sede_texto), f.sede_texto, f.periodo, f.indicador, f.valor);
      Object.assign(resumen, { tecnico: r.tecnico, anio: r.anio, sedes: r.sedes, registros: r.filas.length, avisos: r.avisos });
    } else throw bad("tipo debe ser «socializaciones» o «recoleccion»");
    resumen.sedes_no_reconocidas = [...noReconocidas];
    db.prepare("INSERT INTO sincronizaciones(fuente,archivo,resumen) VALUES (?,?,?)").run(b.tipo, archivo, JSON.stringify(resumen));
    db.exec("COMMIT");
  } catch (e) { db.exec("ROLLBACK"); throw e; }
  return resumen;
}

function config() {
  return {
    marca: {
      nombre_siau: ajuste("nombre_siau", "SIAU"),
      nombre_asociacion: ajuste("nombre_asociacion", "Asociación de Usuarios"),
      logo_siau: ajuste("logo_siau") ? `/uploads/${ajuste("logo_siau")}` : "/shared/marca/siau-azul.png",
      logo_asociacion: ajuste("logo_asociacion") ? `/uploads/${ajuste("logo_asociacion")}` : "/shared/marca/asociacion.png",
    },
    tipos: db.prepare("SELECT * FROM tipos ORDER BY area, rowid").all(),
    sedes: db.prepare("SELECT * FROM sedes ORDER BY nombre").all(),
    tecnicos: db.prepare("SELECT * FROM tecnicos ORDER BY nombre").all(),
  };
}

function cumplimiento(mes) {
  if (!mesValido(mes)) throw bad("Mes inválido");
  const tipos = db.prepare("SELECT * FROM tipos").all();
  const evs = db.prepare("SELECT tipo,tecnico_id,sede_id,fecha,cantidad FROM evidencias WHERE substr(fecha,1,7)=?").all(mes);
  const tecnicos = db.prepare("SELECT id,nombre FROM tecnicos WHERE activo=1 ORDER BY nombre").all();
  const sedes = db.prepare("SELECT id,nombre FROM sedes WHERE activa=1 ORDER BY nombre").all();
  const r = calcularCumplimiento({ mes, tipos, evs, tecnicos, sedes });
  const nCharlas = db.prepare("SELECT COUNT(*) n FROM consolidado_charlas WHERE substr(fecha,1,7)=?").get(mes).n;
  const nEnc = db.prepare("SELECT COUNT(*) n, COALESCE(SUM(valor),0) v FROM consolidado_mensual WHERE periodo=? AND indicador='encuestas'").get(mes);
  r.consolidado = { charla: nCharlas || null, encuesta_sg: nEnc.n ? nEnc.v : null };
  r.sincronizado = db.prepare("SELECT creado FROM sincronizaciones ORDER BY id DESC LIMIT 1").get()?.creado ?? null;
  return r;
}

async function api(req, res, url) {
  const m = req.method, p = url.pathname, q = url.searchParams;
  let r;

  if (m === "POST" && p === "/api/login") {
    limitarLogin(req.socket.remoteAddress ?? "?");
    const { password } = await leerJson(req);
    const rol = igualesSeguro(password ?? "", ADMIN_PASSWORD) ? "admin" : VISOR_PASSWORD && igualesSeguro(password ?? "", VISOR_PASSWORD) ? "visor" : null;
    if (!rol) throw new HttpError(401, "Contraseña incorrecta");
    const tok = firmar({ rol, exp: Date.now() + 12 * 3600e3 }, SECRETO);
    return send(res, 200, JSON.stringify({ rol }), { "content-type": "application/json", "set-cookie": `sess=${tok}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200` });
  }
  if (m === "POST" && p === "/api/logout") return send(res, 200, "{}", { "content-type": "application/json", "set-cookie": "sess=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0" });
  if (m === "GET" && p === "/api/sesion") return json(res, { rol: sesion(req)?.rol ?? null, visor_protegido: Boolean(VISOR_PASSWORD) });

  // ----- Lectura (visor)
  if (m === "GET" && p === "/api/config") { exigirVisor(req); return json(res, config()); }
  if (m === "GET" && p === "/api/evidencias") { exigirVisor(req); return json(res, listarEvidencias(q)); }
  if (m === "GET" && p === "/api/cumplimiento") { exigirVisor(req); return json(res, cumplimiento(q.get("mes") ?? new Date().toISOString().slice(0, 7))); }
  if (m === "GET" && p === "/api/verificacion") {
    exigirVisor(req);
    const v = db.prepare("SELECT periodo, creado, resumen FROM verificaciones ORDER BY id DESC LIMIT 1").get();
    return json(res, v ? { periodo: v.periodo, creado: v.creado, resumen: JSON.parse(v.resumen) } : null);
  }

  // ----- Bot
  if (p.startsWith("/api/bot/")) {
    exigirBot(req);
    if (m === "GET" && p === "/api/bot/contexto") return json(res, { sedes: db.prepare("SELECT id,nombre FROM sedes WHERE activa=1").all(), tipos: db.prepare("SELECT clave,nombre,meta,alcance FROM tipos WHERE area='siau'").all() });
    if (m === "POST" && p === "/api/bot/consolidados") return json(res, sincronizarConsolidado(await leerJson(req, 8e6)), 201);
    if (m === "POST" && p === "/api/bot/verificacion") {
      const b = await leerJson(req);
      if (!mesValido(b.periodo) || typeof b.resumen !== "object") throw bad("Datos inválidos");
      db.prepare("INSERT INTO verificaciones(periodo,resumen) VALUES(?,?)").run(b.periodo, JSON.stringify(b.resumen));
      return json(res, { ok: true }, 201);
    }
    throw new HttpError(404, "No encontrado");
  }

  // ----- Administración
  if (!p.startsWith("/api/admin/")) throw new HttpError(404, "No encontrado");
  exigirAdmin(req);

  if (m === "POST" && p === "/api/admin/foto") return json(res, { archivo: await subirImagen(req) }, 201);

  if (m === "POST" && p === "/api/admin/evidencias") {
    const v = validarEvidencia(await leerJson(req));
    await archivosExisten(v.fotos);
    const id = Number(db.prepare("INSERT INTO evidencias(area,tipo,titulo,descripcion,fecha,sede_id,tecnico_id,cantidad,asistentes) VALUES(?,?,?,?,?,?,?,?,?)")
      .run(v.area, v.tipo, v.titulo, v.descripcion, v.fecha, v.sede_id, v.tecnico_id, v.cantidad, v.asistentes).lastInsertRowid);
    guardarFotos(id, v.fotos);
    return json(res, { id }, 201);
  }
  if ((r = /^\/api\/admin\/evidencias\/(\d+)$/.exec(p))) {
    const id = Number(r[1]);
    if (!db.prepare("SELECT 1 FROM evidencias WHERE id=?").get(id)) throw new HttpError(404, "No existe");
    if (m === "PUT") {
      const v = validarEvidencia(await leerJson(req));
      await archivosExisten(v.fotos);
      const antes = db.prepare("SELECT archivo FROM fotos WHERE evidencia_id=?").all(id).map((f) => f.archivo);
      db.prepare("UPDATE evidencias SET area=?,tipo=?,titulo=?,descripcion=?,fecha=?,sede_id=?,tecnico_id=?,cantidad=?,asistentes=? WHERE id=?")
        .run(v.area, v.tipo, v.titulo, v.descripcion, v.fecha, v.sede_id, v.tecnico_id, v.cantidad, v.asistentes, id);
      guardarFotos(id, v.fotos);
      await Promise.all(antes.filter((a) => !v.fotos.includes(a)).map((a) => unlink(join(UPLOADS, a)).catch(() => {})));
      return json(res, { ok: true });
    }
    if (m === "DELETE") {
      const fs = db.prepare("SELECT archivo FROM fotos WHERE evidencia_id=?").all(id);
      db.prepare("DELETE FROM evidencias WHERE id=?").run(id);
      await Promise.all(fs.map((f) => unlink(join(UPLOADS, f.archivo)).catch(() => {})));
      return json(res, { ok: true });
    }
  }

  if (m === "POST" && p === "/api/admin/sedes") {
    const { nombres } = await leerJson(req);
    const lista = (Array.isArray(nombres) ? nombres : []).map((n) => txt(n, 120)).filter(Boolean).slice(0, 200);
    const ins = db.prepare("INSERT OR IGNORE INTO sedes(nombre) VALUES(?)");
    let nuevas = 0;
    for (const n of lista) nuevas += Number(ins.run(n).changes);
    return json(res, { nuevas }, 201);
  }
  if ((r = /^\/api\/admin\/sedes\/(\d+)$/.exec(p)) && m === "PUT") {
    const b = await leerJson(req);
    db.prepare("UPDATE sedes SET nombre=COALESCE(?,nombre), activa=COALESCE(?,activa) WHERE id=?").run(b.nombre ? txt(b.nombre, 120) : null, b.activa == null ? null : Number(Boolean(b.activa)), Number(r[1]));
    return json(res, { ok: true });
  }
  if (m === "POST" && p === "/api/admin/tecnicos") {
    const b = await leerJson(req);
    const sede = b.sede_id ? entero(b.sede_id, 1, 1e9) : null;
    const id = Number(db.prepare("INSERT INTO tecnicos(nombre,sede_id) VALUES(?,?)").run(txt(b.nombre, 120, true), sede).lastInsertRowid);
    return json(res, { id }, 201);
  }
  if ((r = /^\/api\/admin\/tecnicos\/(\d+)$/.exec(p)) && m === "PUT") {
    const b = await leerJson(req);
    db.prepare("UPDATE tecnicos SET nombre=COALESCE(?,nombre), activo=COALESCE(?,activo) WHERE id=?").run(b.nombre ? txt(b.nombre, 120) : null, b.activo == null ? null : Number(Boolean(b.activo)), Number(r[1]));
    return json(res, { ok: true });
  }
  if ((r = /^\/api\/admin\/tipos\/([a-z_]+)$/.exec(p)) && m === "PUT") {
    const b = await leerJson(req);
    const alcance = b.alcance === "tecnico" ? "tecnico" : "global";
    db.prepare("UPDATE tipos SET meta=?, alcance=? WHERE clave=?").run(b.meta == null || b.meta === "" ? null : entero(b.meta, 0, 1e6), alcance, r[1]);
    return json(res, { ok: true });
  }
  if (m === "PUT" && p === "/api/admin/marca") {
    const b = await leerJson(req);
    if (b.nombre_siau != null) setAjuste("nombre_siau", txt(b.nombre_siau, 100, true));
    if (b.nombre_asociacion != null) setAjuste("nombre_asociacion", txt(b.nombre_asociacion, 100, true));
    return json(res, { ok: true });
  }
  if ((r = /^\/api\/admin\/logo\/(siau|asociacion)$/.exec(p)) && m === "POST") {
    const archivo = await subirImagen(req, 5e6);
    const anterior = ajuste(`logo_${r[1]}`);
    setAjuste(`logo_${r[1]}`, archivo);
    if (anterior) await unlink(join(UPLOADS, anterior)).catch(() => {});
    return json(res, { archivo }, 201);
  }
  throw new HttpError(404, "No encontrado");
}

async function estatico(req, res, url) {
  let ruta = decodeURIComponent(url.pathname);
  if (ruta.startsWith("/uploads/")) {
    exigirVisor(req);
    const f = normalize(join(UPLOADS, ruta.slice(9)));
    if (!f.startsWith(UPLOADS + sep)) throw new HttpError(403, "Prohibido");
    return servir(res, f, "private, max-age=86400");
  }
  if (ruta === "/admin") return send(res, 301, "", { location: "/admin/" });
  if (ruta.endsWith("/")) ruta += "index.html";
  const propio = ruta.startsWith("/admin/") || ruta.startsWith("/shared/");
  const f = normalize(join(WEB, propio ? "" : "visor", ruta));
  if (!f.startsWith(WEB + sep)) throw new HttpError(403, "Prohibido");
  return servir(res, f, "no-cache");
}

async function servir(res, f, cache) {
  try {
    const data = await readFile(f);
    send(res, 200, data, { "content-type": MIME[extname(f)] ?? "application/octet-stream", "cache-control": cache });
  } catch { throw new HttpError(404, "No encontrado"); }
}

createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  try {
    if (url.pathname.startsWith("/api/")) await api(req, res, url);
    else if (req.method === "GET") await estatico(req, res, url);
    else throw new HttpError(405, "Método no permitido");
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500;
    if (status === 500) console.error(e);
    const msg = e instanceof HttpError ? e.message : /UNIQUE|constraint/i.test(e?.message) ? "Registro duplicado o inválido" : "Error interno";
    json(res, { error: msg }, e instanceof HttpError ? status : /UNIQUE|constraint/i.test(e?.message) ? 400 : 500);
  }
}).listen(PORT, () => console.log(`Visor:  http://localhost:${PORT}/\nAdmin:  http://localhost:${PORT}/admin/`));
