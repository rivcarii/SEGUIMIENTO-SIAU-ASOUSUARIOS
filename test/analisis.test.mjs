import { test } from "node:test";
import assert from "node:assert/strict";
import { nuevoNucleo } from "./ayuda.mjs";
import { analizar, informeMarkdown, REQUERIDAS } from "../nucleo/analisis.mjs";

const AHORA = Date.parse("2026-09-16T12:30:00Z");
const fuente = (tipo, extra = {}) => ({ tipo, archivo: tipo, creado: "2026-09-16 11:00:00", registros: 10, avisos: 0, sedes_no_reconocidas: [], mes: null, ...extra });
const todas = () => Object.keys(REQUERIDAS).map((t) => fuente(t, t === "horario" ? { mes: "2026-09" } : {}));
const estado = (extra = {}) => ({ hoy: "2026-09-16", mes: "2026-09", dia: 16, dias_mes: 30, fuentes: todas(), personal: { evaluados: 10, ausentes: 1, sin_cobertura: [] },
  progreso: Array.from({ length: 10 }, () => ({ encuestas_pct: 80, charlas_pct: 90 })), actas: { esperadas: 80, entregadas: 80, sedes_pendientes: 0 }, sin_reconocer: 0, ...extra });

test("monitor: sin novedades → sin hallazgos", () => {
  const h = analizar(estado(), AHORA);
  assert.deepEqual(h, []);
  assert.match(informeMarkdown(estado(), h), /Todo en orden/);
});

test("monitor: fuente nunca sincronizada o vencida = alto; va primero", () => {
  const e = estado({ fuentes: todas().filter((f) => f.tipo !== "nps").map((f) => (f.tipo === "buzon" ? { ...f, creado: "2026-09-14 06:00:00" } : f)) });
  const h = analizar(e, AHORA);
  assert.deepEqual(h.map((x) => x.nivel), ["alto", "alto"]);
  assert.ok(h.some((x) => /Encuestas NPS: nunca/.test(x.texto)));
  assert.ok(h.some((x) => /Consolidado de buzón: lleva 55 h/.test(x.texto)));
});

test("monitor: sedes sin reconocer, sin cobertura, ritmo y actas", () => {
  const e = estado({
    fuentes: todas().map((f) => (f.tipo === "nps" ? { ...f, sedes_no_reconocidas: ["HOSPITAL GENERAL", "CARRIZAL NORTE"], avisos: 2 } : f)),
    personal: { evaluados: 10, ausentes: 1, sin_cobertura: ["P. UNIVERSAL", "P. VILLA NUEVA"] },
    progreso: [...Array.from({ length: 7 }, () => ({ encuestas_pct: 80, charlas_pct: 90 })), ...Array.from({ length: 3 }, () => ({ encuestas_pct: 10, charlas_pct: 90 }))],
    actas: { esperadas: 80, entregadas: 71, sedes_pendientes: 6 },
  });
  const t = analizar(e, AHORA).map((x) => x.texto).join("\n");
  assert.match(t, /Encuestas NPS: 2 nombre\(s\) de sede sin reconocer \(HOSPITAL GENERAL, CARRIZAL NORTE\)/);
  assert.match(t, /2 sede\(s\) sin SIAU este mes: P. UNIVERSAL, P. VILLA NUEVA/);
  assert.match(t, /3 de 10 SIAU van por debajo del ritmo/);
  assert.match(t, /9 acta\(s\) de buzón vencidas sin entregar en 6 sede\(s\)/);
  assert.match(t, /Encuestas NPS: 2 aviso/);
});

test("monitor: el ritmo solo se evalúa desde el día 10 y el informe nunca trae nombres", () => {
  const e = estado({ dia: 5, progreso: [{ encuestas_pct: 0, charlas_pct: 0 }] });
  assert.ok(!analizar(e, AHORA).some((x) => /ritmo/.test(x.texto)));
  const md = informeMarkdown(estado(), analizar(estado(), AHORA));
  assert.match(md, /no incluye nombres de personas/);
});

test("estado: sin nada sincronizado, todas las fuentes aparecen como pendientes; después van desapareciendo", () => {
  const { api, nucleo } = nuevoNucleo({ hoy: "2026-09-16", ahora: "2026-09-16 12:00:00" });
  const vacio = api("GET", "/api/admin/estado");
  assert.equal(vacio.fuentes.length, 0);
  assert.equal(vacio.hallazgos.filter((h) => h.nivel === "alto").length, 5);
  nucleo.sincronizar({ tipo: "charlas_matriz", archivo: "CONS_CHARLAS_2026", anio: 2026, hojas: { "CHARLAS USUARIOS": [["x"], ["SEDES", "SEPTIEMBRE"], ["SEDE INVENTADA", "5"]] } });
  const e = api("GET", "/api/admin/estado");
  assert.equal(e.fuentes.length, 1);
  assert.equal(e.hallazgos.filter((h) => h.nivel === "alto").length, 4);
  assert.ok(e.hallazgos.some((h) => /Consolidado de charlas: 1 nombre\(s\) de sede sin reconocer \(SEDE INVENTADA\)/.test(h.texto)));
  // un visor ve los hallazgos pero no el detalle administrativo
  assert.equal(api("GET", "/api/estado", { rol: "visor" }).hallazgos.length, e.hallazgos.length);
  assert.throws(() => api("GET", "/api/admin/estado", { rol: "visor" }), /Solo los administradores/);
});
