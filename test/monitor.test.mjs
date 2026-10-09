import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { analizar, informeMarkdown, REQUERIDAS } from "../bot/analisis.mjs";

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

test("monitor: sedes sin reconocer, horario de otro mes, sin cobertura, ritmo y actas", () => {
  const e = estado({
    fuentes: todas().map((f) => (f.tipo === "nps" ? { ...f, sedes_no_reconocidas: ["HOSPITAL GENERAL", "CARRIZAL I"], avisos: 2 } : f.tipo === "horario" ? { ...f, mes: "2026-08" } : f)),
    personal: { evaluados: 10, ausentes: 1, sin_cobertura: ["P. UNIVERSAL", "P. VILLA NUEVA"] },
    progreso: [...Array.from({ length: 7 }, () => ({ encuestas_pct: 80, charlas_pct: 90 })), ...Array.from({ length: 3 }, () => ({ encuestas_pct: 10, charlas_pct: 90 }))],
    actas: { esperadas: 80, entregadas: 71, sedes_pendientes: 6 },
  });
  const t = analizar(e, AHORA).map((x) => x.texto).join("\n");
  assert.match(t, /Encuestas NPS: 2 nombre\(s\) de sede sin reconocer \(HOSPITAL GENERAL, CARRIZAL I\)/);
  assert.match(t, /horario cargado es de 2026-08/);
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

// ── Punta a punta: servidor real + monitor real
async function conServidor(fn) {
  const dir = mkdtempSync(join(tmpdir(), "mon-"));
  const puerto = 3700 + Math.floor(Math.random() * 90);
  const p = spawn(process.execPath, ["server.mjs"], { cwd: new URL("..", import.meta.url), env: { ...process.env, PORT: String(puerto), DATA_DIR: dir, ADMIN_PASSWORD: "x", BOT_TOKEN: "tok" }, stdio: "ignore" });
  const base = `http://localhost:${puerto}`;
  try {
    for (let i = 0; i < 50; i++) { try { await fetch(base + "/api/sesion"); break; } catch { await new Promise((r) => setTimeout(r, 100)); } }
    await fn(base, dir);
  } finally { p.kill(); }
}

test("monitor de punta a punta: detecta fuentes faltantes y publica el resumen en el tablero", async () => {
  await conServidor(async (base, dir) => {
    assert.equal((await fetch(base + "/api/salud")).status, 200);
    const est = await (await fetch(base + "/api/bot/estado", { headers: { authorization: "Bearer tok" } })).json();
    assert.equal(est.fuentes.length, 0);
    assert.equal((await fetch(base + "/api/bot/estado")).status, 401);
    await fetch(base + "/api/bot/consolidados", { method: "POST", headers: { authorization: "Bearer tok", "content-type": "application/json" },
      body: JSON.stringify({ tipo: "charlas_matriz", archivo_id: "C", archivo: "CONS_CHARLAS_2026", anio: 2026, hojas: { "CHARLAS USUARIOS": [["x"], ["SEDES", "SEPTIEMBRE"], ["SEDE INVENTADA", "5"]] } }) });
    const r = spawnSync(process.execPath, ["bot/monitor.mjs"], { cwd: new URL("..", import.meta.url), env: { ...process.env, PLATAFORMA_URL: base, BOT_TOKEN: "tok", FALLAR_CON_HALLAZGOS: "1" }, encoding: "utf8" });
    assert.equal(r.status, 1, r.stderr); // hay fuentes que nunca llegaron
    assert.match(r.stdout, /Encuestas NPS: nunca se ha sincronizado/);
    assert.match(r.stdout, /Consolidado de charlas: 1 nombre\(s\) de sede sin reconocer \(SEDE INVENTADA\)/);
    const v = await (await fetch(base + "/api/verificacion")).json();
    assert.ok(v.resumen.hallazgos.length >= 6);
    assert.equal(readFileSync(new URL("../informe.md", import.meta.url), "utf8").includes("SEDE INVENTADA"), true);
  });
});

test("arranque amigable: iniciar.mjs levanta la plataforma", async () => {
  const dir = mkdtempSync(join(tmpdir(), "ini-"));
  const puerto = 3500 + Math.floor(Math.random() * 90);
  const p = spawn(process.execPath, ["iniciar.mjs"], { cwd: new URL("..", import.meta.url), env: { ...process.env, PORT: String(puerto), DATA_DIR: dir, ADMIN_PASSWORD: "x" }, stdio: "ignore" });
  try {
    let ok = false;
    for (let i = 0; i < 50 && !ok; i++) { try { ok = (await fetch(`http://localhost:${puerto}/api/salud`)).ok; } catch { await new Promise((r) => setTimeout(r, 100)); } }
    assert.ok(ok);
    assert.equal((await fetch(`http://localhost:${puerto}/admin/`)).status, 200);
  } finally { p.kill(); }
});
