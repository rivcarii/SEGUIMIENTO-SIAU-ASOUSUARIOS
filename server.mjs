import { createServer } from "node:http";
import { readFile, writeFile, unlink, stat } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { join, extname, normalize, sep } from "node:path";
import { db, UPLOADS, ajuste, setAjuste } from "./db.mjs";
import { crearResolver, normalizar } from "./sedes.mjs";
import { parsearBuzon, parsearCharlasMatriz, parsearEncuestas, parsearHorario, parsearIlsc, parsearRecoleccion, parsearSocializaciones } from "./consolidados.mjs";
import { calcularCumplimiento, calcularPorTecnico, fechaValida, firmar, igualesSeguro, mesValido, tipoImagen, verificar } from "./lib.mjs";

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

const ipDe = (req) => (process.env.TRUST_PROXY ? req.headers["x-forwarded-for"]?.split(",")[0].trim() : null) || req.socket.remoteAddress || "?";
const seguro = (req) => (req.headers["x-forwarded-proto"] === "https" ? "; Secure" : "");
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

const resolverSedes = () => crearResolver(db.prepare("SELECT id,nombre,codigo,alias FROM sedes").all());
const ultimoDiaMes = (mes) => new Date(Number(mes.slice(0, 4)), Number(mes.slice(5)), 0).getDate();

/** Reemplaza lo que ya se había leído de ese archivo (así se reflejan correcciones y filas borradas). */
function sincronizarConsolidado(b) {
  // Cada consolidado único tiene una sola «fuente»: importar a mano y el script de Drive se reemplazan entre sí (nunca se duplican).
  const fuente = ["charlas_matriz", "buzon", "nps", "medica", "ilsc"].includes(b.tipo) ? b.tipo : txt(b.archivo_id, 200, true), archivo = txt(b.archivo, 300);
  const resolver = resolverSedes();
  const noReconocidas = new Set(), resumen = { tipo: b.tipo, archivo };
  const sedeId = (t, alt) => { const x = resolver(t) ?? (alt ? resolver(alt) : null); if (!x) noReconocidas.add(t || alt || "(vacía)"); return x?.id ?? null; };
  const hojas = b.hojas ?? {};
  const guardarMensual = (filas, tecnico = "") => {
    db.prepare("DELETE FROM consolidado_mensual WHERE fuente=?").run(fuente);
    const ins = db.prepare("INSERT INTO consolidado_mensual(fuente,tecnico,sede_id,sede_texto,periodo,indicador,valor) VALUES (?,?,?,?,?,?,?)");
    for (const f of filas) ins.run(fuente, tecnico, sedeId(f.sede_texto), f.sede_texto, f.periodo, f.indicador, f.valor);
    resumen.registros = filas.length;
  };
  db.exec("BEGIN");
  try {
    if (b.tipo === "socializaciones") {
      const r = parsearSocializaciones(hojas["REGISTRO SOCIALIZACIONES"] ?? []);
      db.prepare("DELETE FROM consolidado_charlas WHERE fuente=?").run(fuente);
      const ins = db.prepare("INSERT INTO consolidado_charlas(fuente,fecha,sede_id,sede_texto,tema,tipo,asistentes,responsable) VALUES (?,?,?,?,?,?,?,?)");
      for (const c of r.charlas) ins.run(fuente, c.fecha, sedeId(c.sede_texto, c.sede_alterna), c.sede_texto || c.sede_alterna, c.tema, c.tipo, c.asistentes, c.responsable);
      Object.assign(resumen, { charlas: r.charlas.length, avisos: r.avisos });
    } else if (b.tipo === "recoleccion") {
      const r = parsearRecoleccion(hojas);
      guardarMensual(r.filas, r.tecnico);
      Object.assign(resumen, { tecnico: r.tecnico, anio: r.anio, sedes: r.sedes, avisos: r.avisos });
    } else if (b.tipo === "charlas_matriz") {
      const anio = Number(b.anio) || Number(/20\d\d/.exec(archivo)?.[0]) || new Date().getFullYear();
      const r = parsearCharlasMatriz(hojas, anio);
      guardarMensual(r.filas); Object.assign(resumen, { anio, avisos: r.avisos });
    } else if (b.tipo === "nps" || b.tipo === "medica") {
      const r = parsearEncuestas(hojas["Respuestas de formulario 1"] ?? Object.values(hojas)[0] ?? [], b.tipo);
      guardarMensual(r.filas); resumen.avisos = r.avisos;
    } else if (b.tipo === "ilsc") {
      const r = parsearIlsc(hojas);
      guardarMensual(r.filas); resumen.avisos = r.avisos;
    } else if (b.tipo === "buzon") {
      const r = parsearBuzon(hojas);
      db.prepare("DELETE FROM consolidado_actas WHERE fuente=?").run(fuente);
      const ins = db.prepare("INSERT INTO consolidado_actas(fuente,sede_id,sede_texto,codigo,fecha,estado) VALUES (?,?,?,?,?,?)");
      for (const a of r.actas) ins.run(fuente, sedeId(a.sede_texto), a.sede_texto, a.codigo, a.fecha, a.estado);
      Object.assign(resumen, { registros: r.actas.length, avisos: r.avisos });
    } else if (b.tipo === "horario") {
      Object.assign(resumen, aplicarHorario(parsearHorario(hojas, b.mes), sedeId));
    } else throw bad("tipo no válido");
    resumen.sedes_no_reconocidas = [...noReconocidas];
    db.prepare("INSERT INTO sincronizaciones(fuente,archivo,resumen) VALUES (?,?,?)").run(b.tipo, archivo, JSON.stringify(resumen));
    db.exec("COMMIT");
  } catch (e) { db.exec("ROLLBACK"); if (e.privacidad) throw bad(e.message); throw e; }
  return resumen;
}

/** El horario manda sobre las asignaciones y ausencias «de horario» de ese mes; lo cargado a mano no se toca. */
function aplicarHorario(r, sedeId) {
  if (!r.mes) return { mes: null, personal: 0, avisos: r.avisos };
  const desde = `${r.mes}-01`, hasta = `${r.mes}-${String(ultimoDiaMes(r.mes)).padStart(2, "0")}`;
  db.prepare("DELETE FROM asignaciones WHERE origen='horario' AND desde=?").run(desde);
  db.prepare("DELETE FROM ausencias WHERE origen='horario' AND desde>=? AND desde<=?").run(desde, hasta);
  const buscar = db.prepare("SELECT id FROM tecnicos WHERE clave=?"), crear = db.prepare("INSERT INTO tecnicos(nombre,rol,clave) VALUES (?,?,?)"), rol = db.prepare("UPDATE tecnicos SET rol=? WHERE id=?");
  const asig = db.prepare("INSERT INTO asignaciones(tecnico_id,sede_id,desde,hasta,origen) VALUES (?,?,?,?, 'horario')"), aus = db.prepare("INSERT INTO ausencias(tecnico_id,tipo,desde,hasta,nota,origen) VALUES (?,?,?,?,?, 'horario')");
  let nAsig = 0, nAus = 0;
  for (const p of r.personal) {
    const clave = normalizar(p.nombre);
    let id = buscar.get(clave)?.id;
    if (id) rol.run(p.rol, id); else id = Number(crear.run(p.nombre.replace(/\s+/g, " ").trim(), p.rol, clave).lastInsertRowid);
    for (const t of p.sedes_texto) { const sid = sedeId(t); if (sid) { asig.run(id, sid, desde, hasta); nAsig++; } }
    for (const a of p.ausencias) { aus.run(id, a.tipo, a.desde, a.hasta, a.nota); nAus++; }
  }
  return { mes: r.mes, personal: r.personal.length, asignaciones: nAsig, ausencias: nAus, avisos: r.avisos };
}

/** Tras agregar un alias, las filas que no se habían podido asignar a una sede se vuelven a resolver. */
function reasignarSedes() {
  const resolver = resolverSedes();
  let n = 0;
  for (const tabla of ["consolidado_mensual", "consolidado_charlas", "consolidado_actas"]) {
    for (const { t } of db.prepare(`SELECT DISTINCT sede_texto t FROM ${tabla} WHERE sede_id IS NULL`).all()) {
      const x = resolver(t);
      if (x) n += Number(db.prepare(`UPDATE ${tabla} SET sede_id=? WHERE sede_id IS NULL AND sede_texto=?`).run(x.id, t).changes);
    }
  }
  return n;
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

const hoyLocal = () => new Date().toLocaleDateString("sv");

function cumplimiento(mes, hoy = hoyLocal()) {
  if (!mesValido(mes)) throw bad("Mes inválido");
  if (!fechaValida(hoy)) throw bad("Fecha inválida");
  const tipos = db.prepare("SELECT * FROM tipos").all();
  const evs = db.prepare("SELECT tipo,tecnico_id,sede_id,fecha,cantidad FROM evidencias WHERE substr(fecha,1,7)=?").all(mes);
  const todos = db.prepare("SELECT id,nombre,rol,activo FROM tecnicos ORDER BY nombre").all();
  const tecnicos = todos.filter((t) => t.activo && t.rol === "tecnico").map(({ id, nombre }) => ({ id, nombre }));
  const sedes = db.prepare("SELECT id,nombre FROM sedes WHERE activa=1 ORDER BY nombre").all();
  const r = calcularCumplimiento({ mes, tipos, evs, tecnicos, sedes });

  const mensual = db.prepare("SELECT sede_id,sede_texto,periodo,indicador,valor FROM consolidado_mensual WHERE periodo=?").all(mes);
  const actas = db.prepare("SELECT sede_id,sede_texto,codigo,fecha,estado FROM consolidado_actas WHERE substr(fecha,1,7)=?").all(mes);
  const meta = (c) => tipos.find((t) => t.clave === c)?.meta ?? null;
  r.hoy = hoy;
  r.siau = calcularPorTecnico({
    mes, hoy, tecnicos: todos, sedes, metas: { encuestas: meta("encuesta_sg"), charlas: meta("charla") },
    asignaciones: db.prepare("SELECT tecnico_id,sede_id,desde,hasta FROM asignaciones").all(),
    ausencias: db.prepare("SELECT tecnico_id,tipo,desde,hasta FROM ausencias").all(),
    mensual: mensual.filter((m) => m.sede_id), actas: actas.filter((a) => a.sede_id),
  });
  const suma = (ind) => mensual.filter((m) => ind.includes(m.indicador)).reduce((t, m) => t + m.valor, 0);
  const hay = (ind) => mensual.some((m) => ind.includes(m.indicador));
  r.consolidado = { charla: hay(["charlas_usuarios", "charlas_funcionarios"]) ? suma(["charlas_usuarios", "charlas_funcionarios"]) : null, encuesta_sg: hay(["encuestas"]) ? suma(["encuestas"]) : null };

  // Actas de buzón según el calendario del propio consolidado (no «cada viernes»: hay festivos)
  const nombre = new Map(sedes.map((x) => [x.id, x.nombre]));
  const vencidas = actas.filter((a) => a.fecha <= hoy);
  r.actas_consolidado = actas.length ? {
    codigos: [...new Set(vencidas.map((a) => a.codigo))].sort(),
    entregadas: vencidas.filter((a) => a.estado === "entregado").length, esperadas: vencidas.length,
    sedes_pendientes: [...new Set(vencidas.filter((a) => a.estado !== "entregado").map((a) => a.sede_id ?? a.sede_texto))]
      .map((k) => ({ sede: nombre.get(k) ?? String(k), pendientes: vencidas.filter((a) => (a.sede_id ?? a.sede_texto) === k && a.estado !== "entregado").map((a) => ({ codigo: a.codigo, fecha: a.fecha, estado: a.estado })) }))
      .sort((x, y) => x.sede.localeCompare(y.sede, "es")),
  } : null;

  // Acompañamiento LSC (intérprete): solo totales, sin datos de personas
  const lsc = mensual.filter((m) => m.indicador.startsWith("lsc_"));
  const porSede = new Map();
  for (const m of lsc.filter((x) => x.indicador === "lsc_atenciones")) { const k = nombre.get(m.sede_id) ?? m.sede_texto; porSede.set(k, (porSede.get(k) ?? 0) + m.valor); }
  r.lsc = lsc.length ? {
    atenciones: lsc.filter((m) => m.indicador === "lsc_atenciones").reduce((t, m) => t + m.valor, 0),
    actividades: lsc.filter((m) => m.indicador === "lsc_actividades").reduce((t, m) => t + m.valor, 0),
    asistentes: lsc.filter((m) => m.indicador === "lsc_actividades_asistentes").reduce((t, m) => t + m.valor, 0),
    sedes: porSede.size, por_sede: [...porSede].map(([sede, n]) => ({ sede, atenciones: n })).sort((x, y) => y.atenciones - x.atenciones).slice(0, 8),
  } : null;
  r.sin_reconocer = new Set([...mensual, ...actas].filter((x) => !x.sede_id).map((x) => x.sede_texto)).size;
  r.sincronizado = db.prepare("SELECT creado FROM sincronizaciones ORDER BY id DESC LIMIT 1").get()?.creado ?? null;
  return r;
}

/** Estado para el monitor del repositorio: sin nombres de personas ni datos de usuarios (su informe se publica en un issue). */
function estadoBot(hoy) {
  if (!fechaValida(hoy)) throw bad("Fecha inválida");
  const mes = hoy.slice(0, 7), c = cumplimiento(mes, hoy), filas = c.siau.tecnicos, evaluados = filas.filter((t) => !t.ausente);
  const pct = (x) => (x.meta ? Math.round((100 * x.valor) / x.meta) : null);
  const fuentes = db.prepare("SELECT fuente tipo, archivo, creado, resumen FROM sincronizaciones WHERE id IN (SELECT MAX(id) FROM sincronizaciones GROUP BY fuente)").all().map((f) => {
    const r = JSON.parse(f.resumen);
    return { tipo: f.tipo, archivo: f.archivo, creado: f.creado, registros: r.registros ?? r.personal ?? 0, avisos: (r.avisos ?? []).length, sedes_no_reconocidas: r.sedes_no_reconocidas ?? [], mes: r.mes ?? null };
  });
  return {
    hoy, mes, dia: Number(hoy.slice(8)), dias_mes: ultimoDiaMes(mes), fuentes,
    personal: { evaluados: evaluados.length, ausentes: filas.length - evaluados.length, sin_cobertura: c.siau.sin_cobertura.map((x) => x.sede) },
    progreso: evaluados.map((t) => ({ encuestas_pct: pct(t.encuestas), charlas_pct: pct(t.charlas) })),
    actas: c.actas_consolidado ? { esperadas: c.actas_consolidado.esperadas, entregadas: c.actas_consolidado.entregadas, sedes_pendientes: c.actas_consolidado.sedes_pendientes.length } : null,
    sin_reconocer: c.sin_reconocer,
  };
}

async function api(req, res, url) {
  const m = req.method, p = url.pathname, q = url.searchParams;
  let r;

  if (m === "POST" && p === "/api/login") {
    limitarLogin(ipDe(req));
    const { password } = await leerJson(req);
    const rol = igualesSeguro(password ?? "", ADMIN_PASSWORD) ? "admin" : VISOR_PASSWORD && igualesSeguro(password ?? "", VISOR_PASSWORD) ? "visor" : null;
    if (!rol) throw new HttpError(401, "Contraseña incorrecta");
    const tok = firmar({ rol, exp: Date.now() + 12 * 3600e3 }, SECRETO);
    return send(res, 200, JSON.stringify({ rol }), { "content-type": "application/json", "set-cookie": `sess=${tok}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200${seguro(req)}` });
  }
  if (m === "POST" && p === "/api/logout") return send(res, 200, "{}", { "content-type": "application/json", "set-cookie": "sess=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0" });
  if (m === "GET" && p === "/api/salud") return json(res, { ok: true });
  if (m === "GET" && p === "/api/sesion") return json(res, { rol: sesion(req)?.rol ?? null, visor_protegido: Boolean(VISOR_PASSWORD) });

  // ----- Lectura (visor)
  if (m === "GET" && p === "/api/config") { exigirVisor(req); return json(res, config()); }
  if (m === "GET" && p === "/api/evidencias") { exigirVisor(req); return json(res, listarEvidencias(q)); }
  if (m === "GET" && p === "/api/cumplimiento") { exigirVisor(req); return json(res, cumplimiento(q.get("mes") ?? hoyLocal().slice(0, 7), q.get("hoy") ?? undefined)); }
  if (m === "GET" && p === "/api/verificacion") {
    exigirVisor(req);
    const v = db.prepare("SELECT periodo, creado, resumen FROM verificaciones ORDER BY id DESC LIMIT 1").get();
    return json(res, v ? { periodo: v.periodo, creado: v.creado, resumen: JSON.parse(v.resumen) } : null);
  }

  // ----- Bot
  if (p.startsWith("/api/bot/")) {
    exigirBot(req);
    if (m === "GET" && p === "/api/bot/contexto") return json(res, { sedes: db.prepare("SELECT id,nombre FROM sedes WHERE activa=1").all(), tipos: db.prepare("SELECT clave,nombre,meta,alcance FROM tipos WHERE area='siau'").all() });
    if (m === "GET" && p === "/api/bot/estado") return json(res, estadoBot(q.get("hoy") ?? hoyLocal()));
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

  if (m === "POST" && p === "/api/admin/importar") return json(res, sincronizarConsolidado(await leerJson(req, 12e6)), 201);

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
  if (m === "GET" && p === "/api/admin/personal") {
    const mes = q.get("mes") ?? hoyLocal().slice(0, 7);
    if (!mesValido(mes)) throw bad("Mes inválido");
    const fin = `${mes}-${String(ultimoDiaMes(mes)).padStart(2, "0")}`;
    const tecnicos = db.prepare("SELECT id,nombre,rol,activo FROM tecnicos ORDER BY rol, nombre").all().map((t) => ({
      ...t,
      asignaciones: db.prepare("SELECT a.id,a.sede_id,s.nombre sede,a.desde,a.hasta,a.origen FROM asignaciones a JOIN sedes s ON s.id=a.sede_id WHERE a.tecnico_id=? AND a.desde<=? AND (a.hasta IS NULL OR a.hasta>=?) ORDER BY s.nombre").all(t.id, fin, `${mes}-01`),
      ausencias: db.prepare("SELECT id,tipo,desde,hasta,nota,origen FROM ausencias WHERE tecnico_id=? AND desde<=? AND hasta>=? ORDER BY desde").all(t.id, fin, `${mes}-01`),
    }));
    const c = cumplimiento(mes);
    const sinReconocer = db.prepare(`SELECT sede_texto t, COUNT(*) n FROM (SELECT sede_texto FROM consolidado_mensual WHERE sede_id IS NULL UNION ALL SELECT sede_texto FROM consolidado_actas WHERE sede_id IS NULL UNION ALL SELECT sede_texto FROM consolidado_charlas WHERE sede_id IS NULL) GROUP BY sede_texto ORDER BY n DESC`).all();
    return json(res, { mes, tecnicos, sin_cobertura: c.siau.sin_cobertura, sin_reconocer: sinReconocer });
  }
  if (m === "POST" && p === "/api/admin/asignaciones") {
    const b = await leerJson(req);
    const t = entero(b.tecnico_id, 1, 1e9), sd = entero(b.sede_id, 1, 1e9);
    if (!fechaValida(b.desde) || (b.hasta && !fechaValida(b.hasta)) || (b.hasta && b.hasta < b.desde)) throw bad("Fechas inválidas");
    if (!db.prepare("SELECT 1 FROM tecnicos WHERE id=?").get(t) || !db.prepare("SELECT 1 FROM sedes WHERE id=?").get(sd)) throw bad("Técnico o sede inexistente");
    const id = Number(db.prepare("INSERT INTO asignaciones(tecnico_id,sede_id,desde,hasta) VALUES (?,?,?,?)").run(t, sd, b.desde, b.hasta || null).lastInsertRowid);
    return json(res, { id }, 201);
  }
  if ((r = /^\/api\/admin\/asignaciones\/(\d+)$/.exec(p)) && m === "DELETE") { db.prepare("DELETE FROM asignaciones WHERE id=?").run(Number(r[1])); return json(res, { ok: true }); }
  if (m === "POST" && p === "/api/admin/ausencias") {
    const b = await leerJson(req);
    const t = entero(b.tecnico_id, 1, 1e9);
    if (!["vacaciones", "licencia", "incapacidad", "otro"].includes(b.tipo)) throw bad("Tipo de ausencia inválido");
    if (!fechaValida(b.desde) || !fechaValida(b.hasta) || b.hasta < b.desde) throw bad("Fechas inválidas");
    if (!db.prepare("SELECT 1 FROM tecnicos WHERE id=?").get(t)) throw bad("Técnico inexistente");
    const id = Number(db.prepare("INSERT INTO ausencias(tecnico_id,tipo,desde,hasta,nota) VALUES (?,?,?,?,?)").run(t, b.tipo, b.desde, b.hasta, txt(b.nota, 200)).lastInsertRowid);
    return json(res, { id }, 201);
  }
  if ((r = /^\/api\/admin\/ausencias\/(\d+)$/.exec(p)) && m === "DELETE") { db.prepare("DELETE FROM ausencias WHERE id=?").run(Number(r[1])); return json(res, { ok: true }); }
  if ((r = /^\/api\/admin\/sedes\/(\d+)\/alias$/.exec(p)) && m === "POST") {
    const b = await leerJson(req), sede = db.prepare("SELECT id,alias FROM sedes WHERE id=?").get(Number(r[1]));
    if (!sede) throw new HttpError(404, "No existe");
    const t = txt(b.texto, 150, true);
    db.prepare("UPDATE sedes SET alias=? WHERE id=?").run(JSON.stringify([...new Set([...(sede.alias ? JSON.parse(sede.alias) : []), t])]), sede.id);
    return json(res, { ok: true, reasignadas: reasignarSedes() });
  }
  if (m === "POST" && p === "/api/admin/tecnicos") {
    const b = await leerJson(req);
    const sede = b.sede_id ? entero(b.sede_id, 1, 1e9) : null;
    const id = Number(db.prepare("INSERT INTO tecnicos(nombre,sede_id) VALUES(?,?)").run(txt(b.nombre, 120, true), sede).lastInsertRowid);
    return json(res, { id }, 201);
  }
  if ((r = /^\/api\/admin\/tecnicos\/(\d+)$/.exec(p)) && m === "PUT") {
    const b = await leerJson(req);
    db.prepare("UPDATE tecnicos SET nombre=COALESCE(?,nombre), clave=COALESCE(?,clave), activo=COALESCE(?,activo), rol=COALESCE(?,rol) WHERE id=?").run(b.nombre ? txt(b.nombre, 120) : null, b.nombre ? normalizar(String(b.nombre)) : null, b.activo == null ? null : Number(Boolean(b.activo)), ["tecnico", "interprete", "administrativo"].includes(b.rol) ? b.rol : null, Number(r[1]));
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
