import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CATALOGO, aliasDe, crearResolver } from "../sedes.mjs";
import { entero, fecha, parsearRecoleccion, parsearSocializaciones } from "../consolidados.mjs";

const RECOLECCION = JSON.parse(readFileSync(new URL("./fixtures/recoleccion.json", import.meta.url)));
const SOCIALIZACIONES = [
  ["REGISTRO SOCIALIZACIONES", "", "", "", "", "", "", "", "", ""],
  ["Fecha", "Mes", "Semana", "Código sede", "Sede", "Tema socializado", "Tipo charla", "Asistentes", "Responsable", "Observación"],
  ["12/05/2026", "Mayo", "2", "PAS005", "Paso El Ferry 1° de Mayo", "Buzón digital", "Usuarios", "35", "Ana Pérez", ""],
  ["2026-05-14", "Mayo", "2", "CAM011", "Camino Universitario Distrital Adelita de Char", "Derechos y deberes", "Funcionarios", "1.020", "Luis Mora", ""],
  ["15/05/2026", "Mayo", "3", "XXX999", "Sede Inventada", "Tema", "Usuarios", "10", "Ana Pérez", ""],
  ["", "", "", "", "", "", "", "", "", ""],
  ["sin fecha", "", "", "PAS001", "Paso Barlovento", "Tema", "Usuarios", "5", "Ana Pérez", ""],
];

const sedesDb = () => CATALOGO.map(([nombre, tipo, codigo, largo], i) => ({ id: i + 1, nombre, tipo, codigo, alias: aliasDe(nombre, largo).length ? JSON.stringify(aliasDe(nombre, largo)) : null }));

test("catálogo: 40 sedes (12 Camino + 28 Paso), 37 con código del consolidado", () => {
  assert.equal(CATALOGO.length, 40);
  assert.equal(CATALOGO.filter((s) => s[1] === "CAMINO").length, 12);
  assert.equal(CATALOGO.filter((s) => s[1] === "PASO").length, 28);
  assert.equal(CATALOGO.filter((s) => s[2]).length, 37);
  assert.equal(new Set(CATALOGO.map((s) => s[2]).filter(Boolean)).size, 37);
});

test("resolver de sedes: nombre corto, largo, código y sin prefijo dan la misma sede", () => {
  const r = crearResolver(sedesDb());
  const ferry = r("P. FERRY");
  assert.equal(ferry.codigo, "PAS005");
  for (const t of ["Paso El Ferry 1° de Mayo", "PAS005", "pas005", "p. ferry"]) assert.equal(r(t)?.id, ferry.id, t);
  assert.equal(r("Camino Universitario Distrital Adelita de Char").nombre, "C. ADELITA DE CHAR");
  assert.equal(r("Camino Metropolitano").nombre, "C. SALUD METROPOLITANA");
  assert.equal(r("C. LA PLAYA").codigo, null);
  assert.equal(r("Sede Inventada"), null);
  assert.equal(r(""), null);
});

test("entero y fecha entienden los formatos de la hoja", () => {
  assert.equal(entero(" 1.200 "), 1200);
  assert.equal(entero("297"), 297);
  assert.equal(entero(""), null);
  assert.equal(entero("abc"), null);
  assert.equal(fecha("12/05/2026"), "2026-05-12");
  assert.equal(fecha("2026-05-14T05:00:00.000Z"), "2026-05-14");
  assert.equal(fecha("31/02/2026"), null);
  assert.equal(fecha("mayo"), null);
});

test("socializaciones: una fila por charla; omite filas sin fecha válida y avisa", () => {
  const r = parsearSocializaciones(SOCIALIZACIONES);
  assert.equal(r.charlas.length, 3);
  assert.deepEqual(r.charlas.map((c) => [c.fecha, c.tipo, c.asistentes]), [["2026-05-12", "usuarios", 35], ["2026-05-14", "funcionarios", 1020], ["2026-05-15", "usuarios", 10]]);
  assert.equal(r.avisos.length, 1);
  assert.match(r.avisos[0], /fecha ilegible/);
  assert.equal(parsearSocializaciones([["otra", "hoja"]]).charlas.length, 0);
});

test("recolección: lee los bloques reales de la plantilla (satisfacción, manifestaciones, charlas)", () => {
  const r = parsearRecoleccion(RECOLECCION);
  assert.equal(r.tecnico, "Ana Pérez");
  assert.equal(r.anio, 2026);
  assert.deepEqual(r.sedes, ["C. LA PLAYA", "P. FERRY", "P. SIERRITA"]);
  assert.deepEqual(r.avisos, []);
  const f = (sede, periodo, ind) => r.filas.find((x) => x.sede_texto === sede && x.periodo === periodo && x.indicador === ind)?.valor;
  assert.equal(f("C. LA PLAYA", "2026-05", "rec_encuestas"), 91);
  assert.equal(f("C. LA PLAYA", "2026-05", "rec_satisfechos"), 90);
  assert.equal(f("C. LA PLAYA", "2026-05", "rec_trazadora"), 89);
  assert.equal(f("C. LA PLAYA", "2026-06", "rec_encuestas"), 1200);
  assert.equal(f("P. FERRY", "2026-05", "rec_encuestas"), 50); // bloque derecho
  assert.equal(f("P. SIERRITA", "2026-05", "rec_encuestas"), 40); // segunda banda, bloque izquierdo
  assert.equal(f("C. LA PLAYA", "2026-05", "rec_felicitaciones"), 69);
  assert.equal(f("C. LA PLAYA", "2026-05", "rec_quejas"), 6);
  assert.equal(f("C. LA PLAYA", "2026-05", "rec_asistentes_usuarios"), 297);
  assert.equal(f("C. LA PLAYA", "2026-05", "rec_asistentes_funcionarios"), 10);
  assert.equal(f("P. FERRY", "2026-05", "rec_asistentes_usuarios"), 120);
  assert.equal(f("P. FERRY", "2026-06", "rec_encuestas"), undefined); // celdas vacías no generan filas
});

test("recolección: si la plantilla cambió de forma, avisa en vez de leer celdas equivocadas", () => {
  const roto = structuredClone(RECOLECCION);
  roto.SATISFACCION[6][1] = "ENERO ";
  roto.SATISFACCION[10][1] = "JUNIO"; // el mes 5 ya no está donde se espera
  const r = parsearRecoleccion(roto);
  assert.ok(r.avisos.some((a) => a.includes("SATISFACCION") && a.includes("C. LA PLAYA")));
  assert.equal(r.filas.some((x) => x.sede_texto === "C. LA PLAYA" && x.indicador === "encuestas"), false);
});

// --- Punta a punta: servidor real con base temporal
async function conServidor(fn) {
  const dir = mkdtempSync(join(tmpdir(), "ev-"));
  const puerto = 3900 + Math.floor(Math.random() * 90);
  const p = spawn(process.execPath, ["server.mjs"], { cwd: new URL("..", import.meta.url), env: { ...process.env, PORT: String(puerto), DATA_DIR: dir, ADMIN_PASSWORD: "x", BOT_TOKEN: "tok" }, stdio: "ignore" });
  const base = `http://localhost:${puerto}`;
  try {
    for (let i = 0; i < 50; i++) { try { await fetch(base + "/api/sesion"); break; } catch { await new Promise((r) => setTimeout(r, 100)); } }
    await fn(base);
  } finally { p.kill(); }
}
const post = (base, body, token = "tok") => fetch(base + "/api/bot/consolidados", { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify(body) });

test("enlace de punta a punta: sincroniza, no duplica y alimenta el cumplimiento", async () => {
  await conServidor(async (base) => {
    assert.equal((await post(base, {}, "malo")).status, 401);
    const soc = { tipo: "socializaciones", archivo_id: "F1", archivo: "F_SIAU_031", hojas: { "REGISTRO SOCIALIZACIONES": SOCIALIZACIONES } };
    const rec = { tipo: "recoleccion", archivo_id: "T1", archivo: "Recolección Ana", hojas: RECOLECCION };
    for (let vez = 0; vez < 2; vez++) {
      const a = await (await post(base, soc)).json();
      assert.equal(a.charlas, 3);
      assert.deepEqual(a.sedes_no_reconocidas, ["XXX999"]);
      const b = await (await post(base, rec)).json();
      assert.equal(b.tecnico, "Ana Pérez");
      assert.deepEqual(b.sedes_no_reconocidas, []);
    }
    const c = await (await fetch(base + "/api/cumplimiento?mes=2026-05")).json();
    assert.ok(c.sincronizado);
    assert.equal(c.consolidado.encuesta_sg, null); // la recolección manual no se mezcla con las encuestas reales
    assert.equal((await post(base, { tipo: "otro", archivo_id: "Z" })).status, 400);
  });
});

test("resolver: todas las variantes de sede vistas en los archivos reales apuntan a la sede correcta", () => {
  const r = crearResolver(sedesDb());
  const casos = {
    "C. CUIDADELA 20 DE JULIO": "C. CIUDADELA", "C. PLAYA": "C. LA PLAYA", "C. SALUDMETROPOLITANA": "C. SALUD METROPOLITANA", "CAMINO SALUD METROPOLITANO": "C. SALUD METROPOLITANA",
    "P. EL FERRY": "P. FERRY", "P. LAS MALVINA": "P. LAS MALVINAS", "PASO MALVINAS": "P. LAS MALVINAS", "P. PRADERA": "P. LA PRADERA", "P. VILLANUEVA": "P. VILLA NUEVA",
    "C. NUEVO DE BARRANQUILLA": "C. NUEVO BARRANQUILLA", "P. NIEVES": "P. LAS NIEVES", "P. VILLA DE SAN PABLO": "P. VILLA SAN PABLO", "PASO VILLAS DE SANPABLO": "P. VILLA SAN PABLO",
    "PASO PALMAS": "P. LAS PALMAS", "P. PALMAS": "P. LAS PALMAS", "PASO FLORES": "P. LAS FLORES", "LA ESMERALDA LIPAYA": "P. ESMERALDA LIPAYA", "P. LA 21 MICHELLE": "P. LA 21",
    "CIUDADELA20DEJULIO": "C. CIUDADELA", "PASOLAVILLA": "P. LA VILLA", "CAMINO LA MANGA": "C. LA MANGA", "CAMINO NAZARETH": "C. NAZARETH", "NUEVA VIDA": "P. NUEVA VIDA",
    "CAMINOUNIVERSITARIODISTRITALADELITADECHA": "C. ADELITA DE CHAR", "Paso San Jose": "P. SAN JOSE", "P. Carlos Meisel": "P. CARLOS MEISEL", "B. ESPERANZA": "P. BUENA ESPERANZA", "SANTO DOMINGO": "P. SANTO DOMINGO",
  };
  for (const [texto, esperado] of Object.entries(casos)) assert.equal(r(texto)?.nombre, esperado, texto);
  for (const dudoso of ["HOSPITAL GENERAL DE BARRANQUILLA", "INTERPRETE", "TOTAL", "CARRIZAL I", "LA UNION SAN JOSE"]) assert.equal(r(dudoso), null, dudoso);
});
