import { test } from "node:test";
import assert from "node:assert/strict";
import { nuevoNucleo, falla } from "./ayuda.mjs";

const nps = (filas) => [["Marca temporal", "SEDE QUE CONSULTÓ:", "probabilidad"], ...filas];
function conDatos() {
  const x = nuevoNucleo({ rotacion: true });
  x.nucleo.sincronizar({ tipo: "nps", archivo: "NPS", hojas: { "Respuestas de formulario 1": nps([
    ...Array.from({ length: 6 }, (_, i) => [`0${i + 1}/09/2026 10:00:00`, "C. MURILLO", "10"]), ["07/09/2026 10:00:00", "C. MURILLO", "3"],
    ["08/08/2026 10:00:00", "P. LAS PALMAS", "9"]]) } });
  x.nucleo.sincronizar({ tipo: "medica", archivo: "MED", hojas: { "Respuestas de formulario 1": [["Marca temporal", "Sede", "En una escala numérica de 0 a 10"], ["01/09/2026 10:00:00", "C. MURILLO", "9"], ["02/09/2026 10:00:00", "P. LAS PALMAS", "8"]] } });
  x.nucleo.sincronizar({ tipo: "charlas_matriz", archivo: "CONS_CHARLAS_2026", anio: 2026, hojas: { "CHARLAS USUARIOS": [["x"], ["SEDES", "AGOSTO", "SEPTIEMBRE"], ["C. MURILLO", "30", "250"]] } });
  return x;
}

test("panel: indicadores, series de 12 meses, distribución y estado de cada SIAU", () => {
  const { api } = conDatos();
  const p = api("GET", "/api/panel", { q: { mes: "2026-09" }, rol: "visor" });
  assert.equal(p.resumen.siau, 15);
  assert.equal(p.resumen.encuestas.nps, 7);
  assert.equal(p.resumen.encuestas.medica, 2);
  assert.equal(p.resumen.encuestas.valor, p.resumen.encuestas.nps + p.resumen.encuestas.medica);
  assert.equal(p.serie.length, 12);
  assert.equal(p.serie.at(-1).mes, "2026-09");
  assert.equal(p.serie.find((s) => s.mes === "2026-08").nps, 1);
  assert.deepEqual(p.distribucion.nps, { promotores: 6, pasivos: 0, detractores: 1 });
  assert.equal(p.resumen.nps, Math.round((1000 * (6 - 1)) / 7) / 10);
  const horacio = p.siau.find((s) => s.nombre === "HORACIO AMARIS"); // atiende C. MURILLO
  assert.ok(horacio.charlas >= 250 && ["cumple", "camino", "atencion"].includes(horacio.estado));
  assert.equal(p.resumen.estados.cumple + p.resumen.estados.camino + p.resumen.estados.atencion + p.resumen.estados.ausente, 15);
  assert.equal(p.sedes[0].sede, "C. MURILLO");
  assert.equal(await_ok(() => api("GET", "/api/panel", { q: { mes: "2026-13" } }), 400), true);
});
function await_ok(fn, estado) { try { fn(); } catch (e) { return e.estado === estado; } return false; }

test("consulta: por mes, por sede, por SIAU, con filtros, y rechaza combinaciones imposibles", async () => {
  const { api } = conDatos();
  const q = (extra) => api("GET", "/api/consulta", { rol: "visor", q: { desde: "2026-08", hasta: "2026-09", ...extra } });
  const porMes = q({ medida: "encuestas_nps", por: "mes" });
  assert.deepEqual(porMes.filas.map((f) => [f.clave, f.valor]), [["2026-08", 1], ["2026-09", 7]]);
  assert.equal(porMes.total, 8);
  const porSede = q({ medida: "charlas", por: "sede" });
  assert.deepEqual([porSede.filas[0].etiqueta, porSede.filas[0].valor], ["C. MURILLO", 280]);
  assert.equal(q({ medida: "charlas", por: "sede", sede: porSede.filas[0].clave }).filas.length, 1);
  assert.equal(q({ medida: "nps_puntaje", por: "mes" }).filas.find((f) => f.clave === "2026-09").valor, Math.round((1000 * 5) / 7) / 10);
  const porSiau = q({ medida: "charlas", por: "siau" });
  assert.ok(porSiau.filas.find((f) => f.etiqueta === "HORACIO AMARIS").valor >= 250);
  const id = api("GET", "/api/config").tecnicos.find((t) => t.nombre === "HORACIO AMARIS").id;
  assert.deepEqual(q({ medida: "encuestas_total", por: "mes", siau: id }).filas.map((f) => f.clave), ["2026-08", "2026-09"]);
  await falla(() => q({ medida: "charlas_usuarios", por: "siau" }), 400); // no se reparte por SIAU
  await falla(() => q({ medida: "charlas", por: "tipo" }), 400);
  await falla(() => q({ medida: "inventada" }), 400);
  await falla(() => q({ medida: "charlas", desde: "2026-09", hasta: "2026-01" }), 400);
  await falla(() => api("GET", "/api/consulta", { rol: "nadie", q: { medida: "charlas" } }), 403);
});

test("documentos PDF: se adjuntan junto a las fotos, se listan por álbum y se limpian al borrar", async () => {
  const { api, fotos } = nuevoNucleo();
  const pdf = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF".repeat(10)).toString("base64");
  const img = Buffer.alloc(300, 7).toString("base64");
  await falla(() => api("POST", "/api/admin/foto", { cuerpo: { base64: img, tipo: "application/pdf" } }), 400); // no es un PDF
  await falla(() => api("POST", "/api/admin/foto", { cuerpo: { base64: pdf, tipo: "text/html" } }), 400);
  const d = api("POST", "/api/admin/foto", { cuerpo: { base64: pdf, tipo: "application/pdf" } }).archivo;
  const f = api("POST", "/api/admin/foto", { cuerpo: { base64: img, tipo: "image/jpeg" } }).archivo;
  const base = { tipo: "cartelera", fecha: "2026-09-10" };
  const e1 = api("POST", "/api/admin/evidencias", { cuerpo: { ...base, titulo: "Con foto", fotos: [f], portada: "data:image/jpeg;base64,/9j/AAAA" } });
  const e2 = api("POST", "/api/admin/evidencias", { cuerpo: { ...base, titulo: "Acta enviada", descripcion: "Acta firmada por la sede", documentos: [{ id: d, nombre: "acta.pdf" }] } });
  assert.deepEqual(api("GET", "/api/evidencias", { q: { album: "fotos" } }).items.map((e) => e.titulo), ["Con foto"]);
  const docs = api("GET", "/api/evidencias", { q: { album: "documentos" } }).items;
  assert.deepEqual([docs.length, docs[0].documentos[0].nombre, docs[0].descripcion], [1, "acta.pdf", "Acta firmada por la sede"]);
  assert.match(api("GET", "/api/foto", { rol: "visor", q: { id: d } }).data, /^data:application\/pdf;base64,/);
  await falla(() => api("POST", "/api/admin/evidencias", { cuerpo: { ...base, titulo: "x", documentos: [{ id: "ajeno", nombre: "a.pdf" }] } }), 400);
  api("DELETE", "/api/admin/evidencias/" + e2.id);
  assert.equal(fotos.existe(d), false);
  assert.equal(fotos.existe(f), true);
  assert.equal(api("GET", "/api/panel", { q: { mes: "2026-09" } }).resumen.evidencias.total, 1);
});

test("top 5: ordena por promedio de % de encuestas y charlas (topado en 100), sin ausentes ni quien aún no suma", () => {
  const { api, nucleo } = nuevoNucleo({ rotacion: true });
  const nps = (sede, n) => Array.from({ length: n }, (_, i) => [`0${1 + (i % 9)}/09/2026 10:00:00`, sede, "", "10"]);
  nucleo.sincronizar({ tipo: "nps", archivo: "NPS", hojas: { "Respuestas de formulario 1": [["Marca temporal", "SEDE QUE CONSULTÓ:", "x", "probabilidad"], ...nps("C. MURILLO", 45), ...nps("C. LA MANGA", 90), ...nps("C. NAZARETH", 12)] } });
  nucleo.sincronizar({ tipo: "charlas_matriz", archivo: "CONS_CHARLAS_2026", anio: 2026, hojas: { "CHARLAS USUARIOS": [["x"], ["SEDES", "SEPTIEMBRE"], ["C. MURILLO", "300"], ["C. LA MANGA", "100"]] } });
  const top = api("GET", "/api/panel", { q: { mes: "2026-09" }, rol: "visor" }).top;
  // Horacio (Murillo): 22,5 enc. de 90 = 25 % y 150 de 200 → 75 %; Nira (La Manga): 45 de 90 = 50 % y 50 de 200 = 25 %
  assert.ok(top.length >= 2 && top.length <= 5);
  assert.deepEqual(top.map((t) => t.puesto), top.map((_, i) => i + 1));
  assert.ok(top.every((t, i) => i === 0 || top[i - 1].puntaje >= t.puntaje));
  assert.ok(top.every((t) => t.puntaje > 0 && t.puntaje <= 100));
  const sin = api("GET", "/api/panel", { q: { mes: "2025-01" }, rol: "visor" }).top;
  assert.deepEqual(sin, []);
});

test("actas de buzón: resumen por acta del calendario y sedes al día / con pendientes", () => {
  const { api, nucleo } = nuevoNucleo();
  nucleo.sincronizar({ tipo: "buzon", archivo: "CONS_BUZON", hojas: { SEPTIEMBRE_2026: [["SEDES", "SEPTIEMBRE"], ["DIA", "04(B036)", "11(B037)", "18(B038)"],
    ["C. MURILLO", "ENTREGADO", "ENTREGADO", ""], ["C. LA MANGA", "ENTREGADO", "", ""], ["P. LAS PALMAS", "ENTREGADO", "ENTREGADO", ""]] } });
  const a = api("GET", "/api/cumplimiento", { q: { mes: "2026-09", hoy: "2026-09-15" } }).actas_consolidado;
  assert.deepEqual(a.por_codigo.map((c) => [c.codigo, c.entregadas, c.esperadas]), [["B036", 3, 3], ["B037", 2, 3]]); // B038 aún no vence
  assert.deepEqual(a.al_dia, ["C. MURILLO", "P. LAS PALMAS"]);
  assert.deepEqual(a.sedes_pendientes.map((x) => x.sede), ["C. LA MANGA"]);
});
