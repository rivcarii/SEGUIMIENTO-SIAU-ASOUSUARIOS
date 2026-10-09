// Núcleo de la plataforma: todas las reglas y rutas, sin depender de dónde corre (Apps Script o Node).
// Recibe un «almacén» (tablas), un servicio de fotos y relojes; ver almacen.mjs (memoria) y google/Capa.gs (Hojas de Google).
import { CATALOGO, aliasDe, crearResolver, normalizar } from "./sedes.mjs";
import { parsearBuzon, parsearCharlasMatriz, parsearEncuestas, parsearHorario, parsearIlsc } from "./consolidados.mjs";
import { calcularCumplimiento, calcularPorTecnico, fechaValida, mesValido } from "./lib.mjs";
import { analizar } from "./analisis.mjs";
import { mismaPersona, sedesPorPersona } from "./rotacion.mjs";

export const VERSION_DATOS = 2;
export class ErrorHttp extends Error { constructor(estado, mensaje) { super(mensaje); this.estado = estado; } }
const bad = (m) => new ErrorHttp(400, m);

const TIPOS_INICIALES = [
  ["charla", "siau", "Charlas (consolidado de charlas)", 200, "tecnico"],
  ["acta_buzon", "siau", "Acta de apertura de buzón", null, "global"],
  ["acompanamiento", "siau", "Acompañamiento a usuarios", null, "global"],
  ["encuesta_sg", "siau", "Encuestas de satisfacción (NPS)", 90, "tecnico"],
  ["encuesta_ma", "siau", "Encuesta médico asistencial", null, "global"],
  ["actualizacion_datos", "siau", "Actualización de datos", null, "global"],
  ["ludoteca", "siau", "Actividad de ludoteca", null, "global"],
  ["iami", "siau", "Encuesta IAMI", null, "global"],
  ["control_prenatal", "siau", "Encuesta control prenatal", null, "global"],
  ["cartelera", "asociacion", "Cartelera informativa", null, "global"],
  ["valla", "asociacion", "Valla informativa", null, "global"],
  ["actividad", "asociacion", "Actividad del subcronograma", null, "global"],
];
const ROLES_PERSONAL = ["tecnico", "interprete", "administrativo"];
const TIPOS_AUSENCIA = ["vacaciones", "licencia", "incapacidad", "otro"];

const txt = (v, max, req = false) => {
  const s = String(v ?? "").trim();
  if (req && !s) throw bad("Falta un campo obligatorio");
  if (s.length > max) throw bad("Texto demasiado largo");
  return s;
};
const enteroEn = (v, min, max, def) => {
  if (v == null || v === "") return def;
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max) throw bad("Número inválido");
  return n;
};
const ultimoDiaMes = (mes) => new Date(Number(mes.slice(0, 4)), Number(mes.slice(5)), 0).getDate();
const enOrden = (a, b) => String(a).localeCompare(String(b), "es");
const lista = (v) => { try { return v ? JSON.parse(v) : []; } catch { return []; } };
const porId = (filas) => new Map(filas.map((f) => [f.id, f]));

/** Crea las tablas base (40 sedes con alias, tipos de evidencia). Idempotente; fusiona alias agregados a mano. */
export function inicializar(almacen, { rotacion = true } = {}) {
  return almacen.atomico(() => {
    const ajustes = almacen.tabla("ajustes");
    if (ajustes.todos().find((a) => a.id === "version_datos")?.valor === String(VERSION_DATOS)) return false;
    const sedes = almacen.tabla("sedes"), actuales = sedes.todos();
    for (const [nombre, tipo, codigo, largo] of CATALOGO) {
      const f = actuales.find((s) => s.nombre === nombre), nuevos = aliasDe(nombre, largo);
      if (!f) sedes.insertar({ nombre, codigo, tipo, alias: JSON.stringify(nuevos), activa: 1 });
      else sedes.actualizar(f.id, { codigo, tipo, alias: JSON.stringify([...new Set([...lista(f.alias), ...nuevos])]) });
    }
    const tipos = almacen.tabla("tipos"), existentes = new Set(tipos.todos().map((t) => t.id));
    for (const [clave, area, nombre, meta, alcance] of TIPOS_INICIALES) if (!existentes.has(clave)) tipos.insertar({ id: clave, clave, area, nombre, meta, alcance });
    if (rotacion) sembrarRotacion(almacen);
    const v = ajustes.todos().find((a) => a.id === "version_datos");
    if (v) ajustes.actualizar("version_datos", { valor: String(VERSION_DATOS) }); else ajustes.insertar({ id: "version_datos", valor: String(VERSION_DATOS) });
    return true;
  });
}

/** Crea (o reutiliza, aunque el horario escriba el nombre completo) a cada SIAU de la rotación base y le asigna sus sedes. Repetible. */
function sembrarRotacion(almacen) {
  const tecnicos = almacen.tabla("tecnicos"), asign = almacen.tabla("asignaciones"), sedes = almacen.tabla("sedes").todos();
  for (const [nombre, nombresSedes] of sedesPorPersona(CATALOGO)) {
    let t = tecnicos.todos().find((x) => mismaPersona(nombre, x.nombre));
    const id = t ? t.id : tecnicos.insertar({ nombre, sede_id: null, activo: 1, rol: "tecnico", clave: normalizar(nombre) });
    if (t) tecnicos.actualizar(id, { rol: "tecnico", activo: 1 });
    asign.reemplazar((a) => a.tecnico_id === id && a.origen === "base", []);
    for (const n of nombresSedes) { const s = sedes.find((x) => x.nombre === n); if (s) asign.insertar({ tecnico_id: id, sede_id: s.id, desde: "2026-01-01", hasta: null, origen: "base" }); }
  }
}

export function crearNucleo({ almacen, fotos, hoy = () => new Date().toLocaleDateString("sv"), ahora = () => new Date().toISOString().replace("T", " ").slice(0, 19) }) {
  const T = (n) => almacen.tabla(n);
  const ajuste = (k, d = "") => T("ajustes").todos().find((a) => a.id === k)?.valor ?? d;
  const setAjuste = (k, v) => { const t = T("ajustes"); if (t.todos().some((a) => a.id === k)) t.actualizar(k, { valor: String(v) }); else t.insertar({ id: k, valor: String(v) }); };
  const resolverSedes = () => crearResolver(T("sedes").todos());

  // ───────── Lectura
  function config() {
    return {
      marca: { nombre_siau: ajuste("nombre_siau", "SIAU"), nombre_asociacion: ajuste("nombre_asociacion", "Asociación de Usuarios") },
      tipos: T("tipos").todos(),
      sedes: T("sedes").todos().sort((a, b) => enOrden(a.nombre, b.nombre)).map(({ alias, ...s }) => ({ ...s, activa: Number(s.activa) })),
      tecnicos: T("tecnicos").todos().sort((a, b) => enOrden(a.nombre, b.nombre)).map((t) => ({ ...t, activo: Number(t.activo) })),
    };
  }

  function listarEvidencias(q) {
    if (q.mes && !mesValido(q.mes)) throw bad("Mes inválido");
    const limit = enteroEn(q.limit, 1, 100, 24), offset = enteroEn(q.offset, 0, 1e6, 0);
    const sedes = porId(T("sedes").todos()), tecnicos = porId(T("tecnicos").todos()), tipos = porId(T("tipos").todos());
    const filas = T("evidencias").todos().filter((e) => (!q.area || e.area === q.area) && (!q.tipo || e.tipo === q.tipo) && (!q.sede || String(e.sede_id) === String(q.sede))
      && (!q.tecnico || String(e.tecnico_id) === String(q.tecnico)) && (!q.mes || e.fecha.startsWith(q.mes)))
      .sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : b.id - a.id));
    return {
      total: filas.length,
      items: filas.slice(offset, offset + limit).map((e) => {
        const ids = lista(e.fotos);
        return { ...e, descripcion: e.descripcion ?? "", sede: sedes.get(e.sede_id)?.nombre ?? null, tecnico: tecnicos.get(e.tecnico_id)?.nombre ?? null,
          tipo_nombre: tipos.get(e.tipo)?.nombre ?? e.tipo, fotos: undefined, fotos_ids: ids, portada: e.portada ?? null };
      }),
    };
  }

  function cumplimiento(mes, dia = hoy()) {
    if (!mesValido(mes)) throw bad("Mes inválido");
    if (!fechaValida(dia)) throw bad("Fecha inválida");
    const tipos = T("tipos").todos();
    const evs = T("evidencias").todos().filter((e) => e.fecha.startsWith(mes));
    const todos = T("tecnicos").todos().map((t) => ({ ...t, activo: Number(t.activo) })).sort((a, b) => enOrden(a.nombre, b.nombre));
    const tecnicos = todos.filter((t) => t.activo && t.rol === "tecnico").map(({ id, nombre }) => ({ id, nombre }));
    const sedes = T("sedes").todos().filter((s) => Number(s.activa)).sort((a, b) => enOrden(a.nombre, b.nombre)).map(({ id, nombre }) => ({ id, nombre }));
    const r = calcularCumplimiento({ mes, tipos, evs, tecnicos, sedes });

    const mensual = T("mensual").todos().filter((m) => m.periodo === mes);
    const actas = T("actas").todos().filter((a) => a.fecha.startsWith(mes));
    const meta = (c) => tipos.find((t) => t.clave === c)?.meta ?? null;
    r.hoy = dia;
    r.siau = calcularPorTecnico({
      mes, hoy: dia, tecnicos: todos, sedes, metas: { encuestas: meta("encuesta_sg"), charlas: meta("charla") },
      asignaciones: T("asignaciones").todos(), ausencias: T("ausencias").todos(),
      mensual: mensual.filter((m) => m.sede_id), actas: actas.filter((a) => a.sede_id),
    });
    const suma = (ind) => mensual.filter((m) => ind.includes(m.indicador)).reduce((t, m) => t + m.valor, 0);
    const hay = (ind) => mensual.some((m) => ind.includes(m.indicador));
    r.consolidado = { charla: hay(["charlas_usuarios", "charlas_funcionarios"]) ? suma(["charlas_usuarios", "charlas_funcionarios"]) : null, encuesta_sg: hay(["encuestas"]) ? suma(["encuestas"]) : null };

    const nombre = new Map(sedes.map((x) => [x.id, x.nombre]));
    const vencidas = actas.filter((a) => a.fecha <= dia);
    r.actas_consolidado = actas.length ? {
      codigos: [...new Set(vencidas.map((a) => a.codigo))].sort(),
      entregadas: vencidas.filter((a) => a.estado === "entregado").length, esperadas: vencidas.length,
      sedes_pendientes: [...new Set(vencidas.filter((a) => a.estado !== "entregado").map((a) => a.sede_id ?? a.sede_texto))]
        .map((k) => ({ sede: nombre.get(k) ?? String(k), pendientes: vencidas.filter((a) => (a.sede_id ?? a.sede_texto) === k && a.estado !== "entregado").map((a) => ({ codigo: a.codigo, fecha: a.fecha, estado: a.estado })) }))
        .sort((x, y) => enOrden(x.sede, y.sede)),
    } : null;

    const lsc = mensual.filter((m) => m.indicador.startsWith("lsc_")), porSede = new Map();
    for (const m of lsc.filter((x) => x.indicador === "lsc_atenciones")) { const k = nombre.get(m.sede_id) ?? m.sede_texto; porSede.set(k, (porSede.get(k) ?? 0) + m.valor); }
    r.lsc = lsc.length ? {
      atenciones: lsc.filter((m) => m.indicador === "lsc_atenciones").reduce((t, m) => t + m.valor, 0),
      actividades: lsc.filter((m) => m.indicador === "lsc_actividades").reduce((t, m) => t + m.valor, 0),
      asistentes: lsc.filter((m) => m.indicador === "lsc_actividades_asistentes").reduce((t, m) => t + m.valor, 0),
      sedes: porSede.size, por_sede: [...porSede].map(([sede, n]) => ({ sede, atenciones: n })).sort((x, y) => y.atenciones - x.atenciones).slice(0, 8),
    } : null;
    r.sin_reconocer = new Set([...mensual, ...actas].filter((x) => !x.sede_id).map((x) => x.sede_texto)).size;
    r.sincronizado = T("sincronizaciones").todos().sort((a, b) => b.id - a.id)[0]?.creado ?? null;
    return r;
  }

  /** Qué tan al día están las fuentes. Sin nombres de personas. */
  function estado(dia = hoy()) {
    if (!fechaValida(dia)) throw bad("Fecha inválida");
    const mes = dia.slice(0, 7), c = cumplimiento(mes, dia), filas = c.siau.tecnicos, evaluados = filas.filter((t) => !t.ausente);
    const pct = (x) => (x.meta ? Math.round((100 * x.valor) / x.meta) : null);
    const ultimas = new Map();
    for (const s of T("sincronizaciones").todos().sort((a, b) => a.id - b.id)) ultimas.set(s.fuente, s);
    const fuentes = [...ultimas.values()].map((f) => {
      const r = JSON.parse(f.resumen);
      return { tipo: f.fuente, archivo: f.archivo, creado: f.creado, registros: r.registros ?? r.personal ?? 0, avisos: (r.avisos ?? []).length, sedes_no_reconocidas: r.sedes_no_reconocidas ?? [], mes: r.mes ?? null };
    });
    const e = {
      hoy: dia, mes, dia: Number(dia.slice(8)), dias_mes: ultimoDiaMes(mes), fuentes,
      personal: { evaluados: evaluados.length, ausentes: filas.length - evaluados.length, sin_cobertura: c.siau.sin_cobertura.map((x) => x.sede) },
      progreso: evaluados.map((t) => ({ encuestas_pct: pct(t.encuestas), charlas_pct: pct(t.charlas) })),
      actas: c.actas_consolidado ? { esperadas: c.actas_consolidado.esperadas, entregadas: c.actas_consolidado.entregadas, sedes_pendientes: c.actas_consolidado.sedes_pendientes.length } : null,
      sin_reconocer: c.sin_reconocer,
    };
    return { ...e, hallazgos: analizar(e, Date.parse(ahora().replace(" ", "T") + "Z")) };
  }

  // ───────── Escritura
  function validarEvidencia(b) {
    const tipo = T("tipos").todos().find((t) => t.clave === b.tipo);
    if (!tipo) throw bad("Tipo inválido");
    if (!fechaValida(b.fecha)) throw bad("Fecha inválida");
    const sede = b.sede_id ? enteroEn(b.sede_id, 1, 1e9) : null, tec = b.tecnico_id ? enteroEn(b.tecnico_id, 1, 1e9) : null;
    if (sede && !T("sedes").todos().some((s) => s.id === sede)) throw bad("Sede inexistente");
    if (tec && !T("tecnicos").todos().some((t) => t.id === tec)) throw bad("Técnico inexistente");
    const ids = Array.isArray(b.fotos) ? b.fotos : [];
    if (ids.length > 30) throw bad("Máximo 30 fotos por evidencia");
    for (const f of ids) if (typeof f !== "string" || !fotos.existe(f)) throw bad("Foto no encontrada: súbela de nuevo");
    // La portada es una miniatura (JPEG diminuto) guardada en el propio registro: se ve al instante y no depende de que el navegador pueda abrir Drive.
    const portada = ids.length && typeof b.portada === "string" && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(b.portada) && b.portada.length <= 40000 ? b.portada : null;
    return { area: tipo.area, tipo: tipo.clave, titulo: txt(b.titulo, 200, true), descripcion: txt(b.descripcion, 5000), fecha: b.fecha, sede_id: sede, tecnico_id: tec,
      cantidad: enteroEn(b.cantidad, 1, 100000, 1), asistentes: enteroEn(b.asistentes, 0, 100000, null), fotos: JSON.stringify(ids), portada };
  }

  /** Reemplaza lo que ya se había leído de ese consolidado (correcciones y filas borradas se reflejan; nada se duplica). */
  function sincronizar(b) {
    const tipo = b.tipo, archivo = txt(b.archivo, 300), hojas = b.hojas ?? {};
    if (!["charlas_matriz", "buzon", "nps", "medica", "ilsc", "horario"].includes(tipo)) throw bad("Tipo de consolidado no válido");
    return almacen.atomico(() => {
      const resolver = resolverSedes(), noReconocidas = new Set(), resumen = { tipo, archivo };
      const sedeId = (t) => { const x = resolver(t); if (!x) noReconocidas.add(t || "(vacía)"); return x?.id ?? null; };
      const guardarMensual = (filas) => { T("mensual").reemplazar((m) => m.fuente === tipo, filas.map((f) => ({ fuente: tipo, sede_id: sedeId(f.sede_texto), sede_texto: f.sede_texto, periodo: f.periodo, indicador: f.indicador, valor: f.valor }))); resumen.registros = filas.length; };
      try {
        if (tipo === "charlas_matriz") {
          const anio = Number(b.anio) || Number(/20\d\d/.exec(archivo)?.[0]) || Number(hoy().slice(0, 4));
          const r = parsearCharlasMatriz(hojas, anio); guardarMensual(r.filas); Object.assign(resumen, { anio, avisos: r.avisos });
        } else if (tipo === "nps" || tipo === "medica") {
          const r = parsearEncuestas(hojas["Respuestas de formulario 1"] ?? Object.values(hojas)[0] ?? [], tipo); guardarMensual(r.filas); resumen.avisos = r.avisos;
        } else if (tipo === "ilsc") {
          const r = parsearIlsc(hojas); guardarMensual(r.filas); resumen.avisos = r.avisos;
        } else if (tipo === "buzon") {
          const r = parsearBuzon(hojas);
          T("actas").reemplazar((a) => a.fuente === tipo, r.actas.map((a) => ({ fuente: tipo, sede_id: sedeId(a.sede_texto), sede_texto: a.sede_texto, codigo: a.codigo, fecha: a.fecha, estado: a.estado })));
          Object.assign(resumen, { registros: r.actas.length, avisos: r.avisos });
        } else Object.assign(resumen, aplicarHorario(parsearHorario(hojas, b.mes), sedeId));
      } catch (e) { if (e.privacidad) throw bad(e.message); throw e; }
      resumen.sedes_no_reconocidas = [...noReconocidas];
      T("sincronizaciones").insertar({ fuente: tipo, archivo, creado: ahora(), resumen: JSON.stringify(resumen) });
      return resumen;
    });
  }

  /** El horario manda sobre las asignaciones y ausencias «de horario» de ese mes; lo cargado a mano no se toca. */
  function aplicarHorario(r, sedeId) {
    if (!r.mes) return { mes: null, personal: 0, avisos: r.avisos };
    const desde = `${r.mes}-01`, hasta = `${r.mes}-${String(ultimoDiaMes(r.mes)).padStart(2, "0")}`;
    T("asignaciones").reemplazar((a) => a.origen === "horario" && a.desde === desde, []);
    T("ausencias").reemplazar((a) => a.origen === "horario" && a.desde >= desde && a.desde <= hasta, []);
    const tecnicos = T("tecnicos"), existentes = tecnicos.todos();
    let nAsig = 0, nAus = 0;
    for (const p of r.personal) {
      const clave = normalizar(p.nombre);
      let id = existentes.find((t) => t.clave === clave)?.id ?? existentes.find((t) => mismaPersona(t.nombre, p.nombre))?.id;
      if (id) tecnicos.actualizar(id, { rol: p.rol }); else { id = tecnicos.insertar({ nombre: p.nombre.replace(/\s+/g, " ").trim(), sede_id: null, activo: 1, rol: p.rol, clave }); existentes.push({ id, clave, nombre: p.nombre }); }
      const conBase = T("asignaciones").todos().some((a) => a.tecnico_id === id && a.origen === "base");
      for (const t of conBase ? [] : p.sedes_texto) { const sid = sedeId(t); if (sid) { T("asignaciones").insertar({ tecnico_id: id, sede_id: sid, desde, hasta, origen: "horario" }); nAsig++; } }
      for (const a of p.ausencias) { T("ausencias").insertar({ tecnico_id: id, tipo: a.tipo, desde: a.desde, hasta: a.hasta, nota: a.nota, origen: "horario" }); nAus++; }
    }
    return { mes: r.mes, personal: r.personal.length, asignaciones: nAsig, ausencias: nAus, avisos: r.avisos };
  }

  /** Tras agregar un alias, las filas que no se habían podido asignar a una sede se vuelven a resolver. */
  function reasignarSedes() {
    const resolver = resolverSedes();
    let n = 0;
    for (const nombre of ["mensual", "actas"]) {
      const t = T(nombre);
      for (const f of t.todos().filter((x) => !x.sede_id)) { const s = resolver(f.sede_texto); if (s) { t.actualizar(f.id, { sede_id: s.id }); n++; } }
    }
    return n;
  }

  function personal(mes) {
    if (!mesValido(mes)) throw bad("Mes inválido");
    const inicio = `${mes}-01`, fin = `${mes}-${String(ultimoDiaMes(mes)).padStart(2, "0")}`;
    const sedes = porId(T("sedes").todos()), asig = T("asignaciones").todos(), aus = T("ausencias").todos();
    const tecnicos = T("tecnicos").todos().map((t) => ({ ...t, activo: Number(t.activo) })).sort((a, b) => enOrden(a.rol, b.rol) || enOrden(a.nombre, b.nombre)).map((t) => ({
      id: t.id, nombre: t.nombre, rol: t.rol, activo: t.activo,
      asignaciones: asig.filter((a) => a.tecnico_id === t.id && a.desde <= fin && (!a.hasta || a.hasta >= inicio)).map((a) => ({ id: a.id, sede_id: a.sede_id, sede: sedes.get(a.sede_id)?.nombre, desde: a.desde, hasta: a.hasta ?? null, origen: a.origen })).sort((x, y) => enOrden(x.sede, y.sede)),
      ausencias: aus.filter((a) => a.tecnico_id === t.id && a.desde <= fin && a.hasta >= inicio).map(({ id, tipo, desde, hasta, nota, origen }) => ({ id, tipo, desde, hasta, nota: nota ?? "", origen })).sort((x, y) => enOrden(x.desde, y.desde)),
    }));
    const conteo = new Map();
    for (const f of [...T("mensual").todos(), ...T("actas").todos()].filter((x) => !x.sede_id)) conteo.set(f.sede_texto, (conteo.get(f.sede_texto) ?? 0) + 1);
    return { mes, tecnicos, sin_cobertura: cumplimiento(mes).siau.sin_cobertura, sin_reconocer: [...conteo].map(([t, n]) => ({ t, n })).sort((a, b) => b.n - a.n) };
  }

  // ───────── Enrutador
  function exigir(usuario, nivel) {
    const rol = usuario?.rol;
    if (nivel === "admin" ? rol !== "admin" : !["admin", "visor"].includes(rol)) throw new ErrorHttp(403, nivel === "admin" ? "Solo los administradores pueden hacer esto." : "No tiene acceso a esta plataforma. Pida que agreguen su correo.");
  }

  /** req: { metodo, ruta, q?, cuerpo? }; usuario: { email, rol }. Devuelve los datos o lanza ErrorHttp. */
  function manejar(req, usuario) {
    const m = req.metodo, p = req.ruta, q = req.q ?? {}, b = req.cuerpo ?? {};
    let r;
    if (m === "GET" && p === "/api/sesion") return { rol: usuario?.rol ?? null, email: usuario?.email ?? "" };

    if (m === "GET" && p === "/api/config") { exigir(usuario, "visor"); return config(); }
    if (m === "GET" && p === "/api/evidencias") { exigir(usuario, "visor"); return listarEvidencias(q); }
    if (m === "GET" && p === "/api/cumplimiento") { exigir(usuario, "visor"); return cumplimiento(q.mes ?? hoy().slice(0, 7), q.hoy || undefined); }
    if (m === "GET" && p === "/api/estado") { exigir(usuario, "visor"); const { hallazgos, fuentes } = estado(q.hoy || undefined); return { hallazgos, fuentes: fuentes.map(({ tipo, creado }) => ({ tipo, creado })) }; }

    if (m === "GET" && p === "/api/foto") {
      exigir(usuario, "visor");
      const id = String(q.id ?? "");
      if (!T("evidencias").todos().some((e) => lista(e.fotos).includes(id))) throw new ErrorHttp(404, "Foto no encontrada");
      return { data: fotos.datos(id) };
    }

    if (!p.startsWith("/api/admin/")) throw new ErrorHttp(404, "No encontrado");
    exigir(usuario, "admin");
    const escribir = (fn) => { const x = almacen.atomico(fn); almacen.guardar(); return x; };

    if (m === "GET" && p === "/api/admin/personal") return personal(q.mes ?? hoy().slice(0, 7));
    if (m === "GET" && p === "/api/admin/estado") return estado(q.hoy || undefined);

    if (m === "POST" && p === "/api/admin/foto") {
      if (!/^image\/(jpeg|png|webp)$/.test(b.tipo ?? "")) throw bad("Solo se aceptan imágenes JPG, PNG o WebP");
      if (typeof b.base64 !== "string" || b.base64.length < 100 || b.base64.length > 16e6) throw bad("Imagen vacía o demasiado grande");
      return { archivo: fotos.guardar(b.base64, b.tipo) };
    }
    if (m === "POST" && p === "/api/admin/evidencias") return escribir(() => { const v = validarEvidencia(b); return { id: T("evidencias").insertar({ ...v, creado: ahora() }) }; });
    if ((r = /^\/api\/admin\/evidencias\/(\d+)$/.exec(p))) {
      const id = Number(r[1]), actual = T("evidencias").todos().find((e) => e.id === id);
      if (!actual) throw new ErrorHttp(404, "No existe");
      if (m === "PUT") return escribir(() => { const v = validarEvidencia(b), nuevas = lista(v.fotos); for (const f of lista(actual.fotos)) if (!nuevas.includes(f)) fotos.borrar(f); T("evidencias").actualizar(id, v); return { ok: true }; });
      if (m === "DELETE") return escribir(() => { for (const f of lista(actual.fotos)) fotos.borrar(f); T("evidencias").borrar(id); return { ok: true }; });
    }
    if (m === "POST" && p === "/api/admin/sedes") return escribir(() => {
      const nombres = (Array.isArray(b.nombres) ? b.nombres : []).map((n) => txt(n, 120)).filter(Boolean).slice(0, 200), t = T("sedes"), ya = new Set(t.todos().map((s) => s.nombre));
      let nuevas = 0;
      for (const n of nombres) if (!ya.has(n)) { t.insertar({ nombre: n, codigo: null, tipo: null, alias: null, activa: 1 }); ya.add(n); nuevas++; }
      return { nuevas };
    });
    if ((r = /^\/api\/admin\/sedes\/(\d+)$/.exec(p)) && m === "PUT") return escribir(() => { const parche = {}; if (b.nombre) parche.nombre = txt(b.nombre, 120); if (b.activa != null) parche.activa = Number(Boolean(b.activa)); T("sedes").actualizar(Number(r[1]), parche); return { ok: true }; });
    if ((r = /^\/api\/admin\/sedes\/(\d+)\/alias$/.exec(p)) && m === "POST") return escribir(() => {
      const sede = T("sedes").todos().find((s) => s.id === Number(r[1]));
      if (!sede) throw new ErrorHttp(404, "No existe");
      T("sedes").actualizar(sede.id, { alias: JSON.stringify([...new Set([...lista(sede.alias), txt(b.texto, 150, true)])]) });
      return { ok: true, reasignadas: reasignarSedes() };
    });
    if (m === "POST" && p === "/api/admin/tecnicos") return escribir(() => { const nombre = txt(b.nombre, 120, true); return { id: T("tecnicos").insertar({ nombre, sede_id: b.sede_id ? enteroEn(b.sede_id, 1, 1e9) : null, activo: 1, rol: "tecnico", clave: normalizar(nombre) }) }; });
    if ((r = /^\/api\/admin\/tecnicos\/(\d+)$/.exec(p)) && m === "PUT") return escribir(() => {
      const parche = {};
      if (b.nombre) { parche.nombre = txt(b.nombre, 120); parche.clave = normalizar(parche.nombre); }
      if (b.activo != null) parche.activo = Number(Boolean(b.activo));
      if (ROLES_PERSONAL.includes(b.rol)) parche.rol = b.rol;
      T("tecnicos").actualizar(Number(r[1]), parche); return { ok: true };
    });
    if ((r = /^\/api\/admin\/tipos\/([a-z_]+)$/.exec(p)) && m === "PUT") return escribir(() => { T("tipos").actualizar(r[1], { meta: b.meta == null || b.meta === "" ? null : enteroEn(b.meta, 0, 1e6), alcance: b.alcance === "tecnico" ? "tecnico" : "global" }); return { ok: true }; });
    if (m === "PUT" && p === "/api/admin/marca") return escribir(() => { if (b.nombre_siau != null) setAjuste("nombre_siau", txt(b.nombre_siau, 100, true)); if (b.nombre_asociacion != null) setAjuste("nombre_asociacion", txt(b.nombre_asociacion, 100, true)); return { ok: true }; });

    if (m === "POST" && p === "/api/admin/asignaciones") return escribir(() => {
      const t = enteroEn(b.tecnico_id, 1, 1e9), sd = enteroEn(b.sede_id, 1, 1e9);
      if (!fechaValida(b.desde) || (b.hasta && !fechaValida(b.hasta)) || (b.hasta && b.hasta < b.desde)) throw bad("Fechas inválidas");
      if (!T("tecnicos").todos().some((x) => x.id === t) || !T("sedes").todos().some((x) => x.id === sd)) throw bad("Técnico o sede inexistente");
      return { id: T("asignaciones").insertar({ tecnico_id: t, sede_id: sd, desde: b.desde, hasta: b.hasta || null, origen: "manual" }) };
    });
    if ((r = /^\/api\/admin\/asignaciones\/(\d+)$/.exec(p)) && m === "DELETE") return escribir(() => { T("asignaciones").borrar(Number(r[1])); return { ok: true }; });
    if (m === "POST" && p === "/api/admin/ausencias") return escribir(() => {
      const t = enteroEn(b.tecnico_id, 1, 1e9);
      if (!TIPOS_AUSENCIA.includes(b.tipo)) throw bad("Tipo de ausencia inválido");
      if (!fechaValida(b.desde) || !fechaValida(b.hasta) || b.hasta < b.desde) throw bad("Fechas inválidas");
      if (!T("tecnicos").todos().some((x) => x.id === t)) throw bad("Técnico inexistente");
      return { id: T("ausencias").insertar({ tecnico_id: t, tipo: b.tipo, desde: b.desde, hasta: b.hasta, nota: txt(b.nota, 200), origen: "manual" }) };
    });
    if ((r = /^\/api\/admin\/ausencias\/(\d+)$/.exec(p)) && m === "DELETE") return escribir(() => { T("ausencias").borrar(Number(r[1])); return { ok: true }; });
    if (m === "POST" && p === "/api/admin/importar") return escribir(() => sincronizar(b));
    throw new ErrorHttp(404, "No encontrado");
  }

  return { manejar, sincronizar: (b) => { const x = sincronizar(b); almacen.guardar(); return x; }, estado, cumplimiento };
}
