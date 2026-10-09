import { test } from "node:test";
import assert from "node:assert/strict";
import { nuevoNucleo, falla } from "./ayuda.mjs";

const FOTO = { base64: "A".repeat(400), tipo: "image/jpeg" };
const PORTADA = "data:image/jpeg;base64," + "B".repeat(300);

test("permisos: sin acceso no ve nada; el visor ve pero no escribe; el administrador todo", async () => {
  const { api } = nuevoNucleo();
  for (const ruta of ["/api/config", "/api/evidencias", "/api/cumplimiento", "/api/estado"]) await falla(() => api("GET", ruta, { rol: "nadie" }), 403);
  assert.equal(api("GET", "/api/sesion", { rol: "nadie" }).rol, null);
  assert.equal(api("GET", "/api/sesion", { rol: "admin" }).rol, "admin");
  assert.ok(api("GET", "/api/config", { rol: "visor" }).sedes.length === 40);
  for (const [m, r] of [["POST", "/api/admin/evidencias"], ["POST", "/api/admin/sedes"], ["GET", "/api/admin/personal"], ["POST", "/api/admin/importar"], ["POST", "/api/admin/foto"]]) await falla(() => api(m, r, { rol: "visor" }), 403);
  await falla(() => api("GET", "/api/no-existe"), 404);
});

test("inicio: 40 sedes con alias, 12 tipos, metas por técnico; repetir no duplica", () => {
  const { api } = nuevoNucleo();
  const c = api("GET", "/api/config");
  assert.equal(c.sedes.length, 40);
  assert.equal(c.tipos.length, 12);
  const meta = (k) => c.tipos.find((t) => t.clave === k);
  assert.deepEqual([meta("encuesta_sg").meta, meta("encuesta_sg").alcance, meta("charla").meta, meta("charla").alcance], [90, "tecnico", 200, "tecnico"]);
  assert.ok(!c.sedes.some((s) => "alias" in s));
});

test("inicio: repetir la inicialización no cambia nada", async () => {
  const { almacen } = nuevoNucleo();
  const { inicializar } = await import("../nucleo/api.mjs");
  assert.equal(inicializar(almacen), false);
  assert.equal(almacen.tabla("sedes").todos().length, 40);
});

test("evidencias: crear con fotos, listar con filtros, editar quitando una foto y eliminar", async () => {
  const { api, fotos } = nuevoNucleo();
  const sede = api("GET", "/api/config").sedes.find((s) => s.nombre === "C. LA PLAYA");
  const f1 = api("POST", "/api/admin/foto", { cuerpo: FOTO }).archivo, f2 = api("POST", "/api/admin/foto", { cuerpo: FOTO }).archivo;
  const { id } = api("POST", "/api/admin/evidencias", { cuerpo: { tipo: "ludoteca", fecha: "2026-09-08", sede_id: sede.id, titulo: "Jornada", descripcion: "Niños", cantidad: 2, fotos: [f1, f2], portada: PORTADA } });
  api("POST", "/api/admin/evidencias", { cuerpo: { tipo: "cartelera", fecha: "2026-08-01", titulo: "Cartelera de agosto" } });
  const l = api("GET", "/api/evidencias", { rol: "visor", q: { area: "siau", mes: "2026-09" } });
  assert.equal(l.total, 1);
  assert.deepEqual([l.items[0].sede, l.items[0].tipo_nombre, l.items[0].fotos_ids.length, l.items[0].portada], ["C. LA PLAYA", "Actividad de ludoteca", 2, PORTADA]);
  assert.equal(api("GET", "/api/foto", { rol: "visor", q: { id: f1 } }).data.startsWith("data:image/jpeg;base64,"), true);
  assert.equal(api("GET", "/api/evidencias", { q: { area: "asociacion" } }).total, 1);
  assert.equal(api("GET", "/api/evidencias", { q: { limit: "1" } }).items.length, 1);
  api("PUT", `/api/admin/evidencias/${id}`, { cuerpo: { tipo: "ludoteca", fecha: "2026-09-08", titulo: "Jornada editada", fotos: [f1] } });
  assert.equal(fotos.existe(f2), false); // la foto quitada se borra
  assert.equal(fotos.existe(f1), true);
  api("DELETE", `/api/admin/evidencias/${id}`);
  assert.equal(fotos.existe(f1), false);
  await falla(() => api("GET", "/api/foto", { q: { id: f1 } }), 404); // una foto que ya no pertenece a ninguna evidencia no se entrega
  assert.equal(api("GET", "/api/evidencias", { q: { area: "siau" } }).total, 0);
});

test("evidencias: valida tipo, fecha (incluye 31/02), sede, foto inexistente e imágenes", async () => {
  const { api } = nuevoNucleo();
  const base = { tipo: "charla", fecha: "2026-09-08", titulo: "T" };
  for (const malo of [{ tipo: "xx" }, { fecha: "2026-02-31" }, { titulo: "  " }, { sede_id: 999 }, { fotos: ["no-existe"] }, { cantidad: 0 }, { tecnico_id: 999 }]) await falla(() => api("POST", "/api/admin/evidencias", { cuerpo: { ...base, ...malo } }), 400);
  await falla(() => api("POST", "/api/admin/foto", { cuerpo: { base64: "A".repeat(400), tipo: "image/gif" } }), 400);
  await falla(() => api("POST", "/api/admin/foto", { cuerpo: { base64: "", tipo: "image/png" } }), 400);
  await falla(() => api("GET", "/api/evidencias", { q: { mes: "2026-13" } }), 400);
});

test("sedes, técnicos y metas: se agregan, se desactivan y se editan", () => {
  const { api } = nuevoNucleo();
  assert.equal(api("POST", "/api/admin/sedes", { cuerpo: { nombres: ["Sede Nueva", "C. LA PLAYA", " ", "Sede Nueva"] } }).nuevas, 1);
  const { id } = api("POST", "/api/admin/tecnicos", { cuerpo: { nombre: "Ana Prueba" } });
  api("PUT", `/api/admin/tecnicos/${id}`, { cuerpo: { rol: "interprete", activo: false } });
  const t = api("GET", "/api/config").tecnicos.find((x) => x.id === id);
  assert.deepEqual([t.rol, t.activo], ["interprete", 0]);
  api("PUT", "/api/admin/tipos/encuesta_sg", { cuerpo: { meta: "120", alcance: "global" } });
  assert.deepEqual(api("GET", "/api/config").tipos.find((x) => x.clave === "encuesta_sg").meta, 120);
  api("PUT", "/api/admin/marca", { cuerpo: { nombre_siau: "SIAU Barranquilla" } });
  assert.equal(api("GET", "/api/config").marca.nombre_siau, "SIAU Barranquilla");
});

test("alias: un nombre sin reconocer se asigna a una sede y las filas pendientes se corrigen solas", () => {
  const { api, nucleo } = nuevoNucleo();
  const r = nucleo.sincronizar({ tipo: "charlas_matriz", archivo: "CONS_CHARLAS_2026", anio: 2026, hojas: { "CHARLAS USUARIOS": [["x"], ["SEDES", "SEPTIEMBRE"], ["CARRIZAL I", "40"]] } });
  assert.deepEqual(r.sedes_no_reconocidas, ["CARRIZAL I"]);
  assert.deepEqual(api("GET", "/api/admin/personal", { q: { mes: "2026-09" } }).sin_reconocer, [{ t: "CARRIZAL I", n: 1 }]);
  const carrizal = api("GET", "/api/config").sedes.find((s) => s.nombre === "P. CARRIZAL");
  assert.equal(api("POST", `/api/admin/sedes/${carrizal.id}/alias`, { cuerpo: { texto: "CARRIZAL I" } }).reasignadas, 1);
  assert.deepEqual(api("GET", "/api/admin/personal", { q: { mes: "2026-09" } }).sin_reconocer, []);
});

test("personal: asignar sedes, registrar ausencias y validar fechas", async () => {
  const { api } = nuevoNucleo();
  const { id } = api("POST", "/api/admin/tecnicos", { cuerpo: { nombre: "Beatriz Prueba" } });
  const [s1, s2] = api("GET", "/api/config").sedes;
  const a = api("POST", "/api/admin/asignaciones", { cuerpo: { tecnico_id: id, sede_id: s1.id, desde: "2026-09-01" } });
  api("POST", "/api/admin/asignaciones", { cuerpo: { tecnico_id: id, sede_id: s2.id, desde: "2026-09-01", hasta: "2026-09-10" } });
  api("POST", "/api/admin/ausencias", { cuerpo: { tecnico_id: id, tipo: "vacaciones", desde: "2026-09-15", hasta: "2026-09-30", nota: "Vacaciones" } });
  let p = api("GET", "/api/admin/personal", { q: { mes: "2026-09" } }).tecnicos.find((t) => t.id === id);
  assert.equal(p.asignaciones.length, 2);
  assert.equal(p.ausencias[0].tipo, "vacaciones");
  assert.equal(api("GET", "/api/admin/personal", { q: { mes: "2026-11" } }).tecnicos.find((t) => t.id === id).asignaciones.length, 1); // la que tiene fecha de fin no aplica en noviembre
  const c = api("GET", "/api/cumplimiento", { q: { mes: "2026-09", hoy: "2026-09-30" } });
  assert.equal(c.siau.tecnicos.find((t) => t.nombre === "Beatriz Prueba").dias_activos, 14);
  api("DELETE", `/api/admin/asignaciones/${a.id}`);
  p = api("GET", "/api/admin/personal", { q: { mes: "2026-09" } }).tecnicos.find((t) => t.id === id);
  assert.equal(p.asignaciones.length, 1);
  for (const cuerpo of [{ tecnico_id: id, tipo: "viaje", desde: "2026-09-01", hasta: "2026-09-02" }, { tecnico_id: id, tipo: "otro", desde: "2026-09-05", hasta: "2026-09-01" }, { tecnico_id: 999, tipo: "otro", desde: "2026-09-01", hasta: "2026-09-02" }]) await falla(() => api("POST", "/api/admin/ausencias", { cuerpo }), 400);
  await falla(() => api("POST", "/api/admin/asignaciones", { cuerpo: { tecnico_id: id, sede_id: 999, desde: "2026-09-01" } }), 400);
});

test("atomicidad: si una sincronización falla a la mitad, no queda nada a medias", async () => {
  const { api, nucleo } = nuevoNucleo();
  nucleo.sincronizar({ tipo: "buzon", archivo: "B", hojas: { SEPTIEMBRE_2026: [["SEDES"], ["DIA", "04(B036)"], ["C. LA PLAYA", "ENTREGADO"]] } });
  const antes = api("GET", "/api/cumplimiento", { q: { mes: "2026-09", hoy: "2026-09-30" } }).actas_consolidado.esperadas;
  await falla(() => nucleo.sincronizar({ tipo: "nps", archivo: "N", hojas: { x: [["Marca temporal", "NOMBRES", "SEDE", "probabilidad"]] } }), 400);
  assert.equal(api("GET", "/api/cumplimiento", { q: { mes: "2026-09", hoy: "2026-09-30" } }).actas_consolidado.esperadas, antes);
  assert.equal(api("GET", "/api/admin/estado").fuentes.length, 1); // el envío rechazado no quedó registrado como sincronizado
});

test("portada: solo se acepta un JPEG pequeño en base64; cualquier otra cosa se descarta", () => {
  const { api } = nuevoNucleo();
  const f = api("POST", "/api/admin/foto", { cuerpo: FOTO }).archivo;
  const crear = (portada) => { const { id } = api("POST", "/api/admin/evidencias", { cuerpo: { tipo: "charla", fecha: "2026-09-01", titulo: "T", fotos: [f], portada } }); return api("GET", "/api/evidencias").items.find((e) => e.id === id).portada; };
  assert.equal(crear("javascript:alert(1)"), null);
  assert.equal(crear("data:image/svg+xml;base64,AAAA"), null);
  assert.equal(crear("data:image/jpeg;base64," + "A".repeat(50000)), null);
  assert.equal(crear(PORTADA), PORTADA);
});
