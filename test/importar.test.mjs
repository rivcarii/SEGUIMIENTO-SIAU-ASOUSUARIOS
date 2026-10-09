import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { nuevoNucleo, falla } from "./ayuda.mjs";
import { abrirLibro } from "../web/shared/xlsx.js";
import { prepararLibro, detectar, soloColumnas, sinColumna, LISTA_BLANCA } from "../web/shared/preparar.js";

const fix = (n) => readFileSync(new URL(`./fixtures/${n}`, import.meta.url));
const AHORA = new Date("2026-10-09T12:00:00");

test("xlsx: lee textos (con & y acentos), números enteros y fechas con hora", async () => {
  const l = await abrirLibro(fix("nps.xlsx"));
  assert.deepEqual(l.nombres, ["Respuestas de formulario 1"]);
  const g = await l.hoja("Respuestas de formulario 1");
  assert.equal(g[0][4], "CÉDULA");
  assert.equal(g[1][0], "03/09/2026 09:20:01"); // fecha y hora como las muestra Google Sheets
  assert.equal(g[1][6], "CONSULTA & URGENCIAS");
  assert.equal(g[1][8], "10"); // sin «.0»
  assert.equal(await l.hoja("no existe"), null);
});

test("xlsx: rechaza lo que no es un .xlsx", async () => {
  await assert.rejects(() => abrirLibro(new TextEncoder().encode("esto no es un excel, ni un zip, ni nada parecido")), /no es un \.xlsx válido/);
});

test("preparar: el formulario NPS sale SOLO con fecha, sede y calificación", async () => {
  const r = await prepararLibro(await abrirLibro(fix("nps.xlsx")), "NPS 2026 (respuestas).xlsx", AHORA);
  assert.equal(r.tipo, "nps");
  assert.deepEqual(r.cuerpo.hojas["Respuestas de formulario 1"][1], ["03/09/2026 09:20:01", "NUEVA VIDA", "10"]);
  assert.ok(["CÉDULA", "NOMBRES", "APELLIDOS", "Teléfono", "Dirección de correo electrónico"].every((c) => r.descartadas.includes(c)));
  const enviado = JSON.stringify(r.cuerpo);
  for (const dato of ["persona0@ejemplo", "Nombre0", "Apellido0", "1000", "3000000"]) assert.ok(!enviado.includes(dato), dato);
});

test("preparar: reconoce charlas y buzón por sus hojas", async () => {
  assert.equal(detectar(["CHARLAS USUARIOS", "CHARLAS FUNCIONARIOS", "Hoja1"]), "charlas_matriz");
  assert.equal(detectar(["ENERO_2026", "FEBRER_2026", "MAYO_2026 ", "INDICADORES"]), "buzon");
  assert.equal(detectar(["CUADRO DE TURNO", "HORARIO PASOS"]), "horario");
  assert.equal(detectar(["REGISTRO 2026", "LUDOTECA 2026"]), "ilsc");
  assert.equal(detectar(["Hoja 1"]), null);
  const c = await prepararLibro(await abrirLibro(fix("charlas.xlsx")), "CONS_CHARLAS_2026_3.xlsx", AHORA);
  assert.equal(c.cuerpo.anio, 2026);
  const b = await prepararLibro(await abrirLibro(fix("buzon.xlsx")), "CONS_BUZON_2026_1.xlsx", AHORA);
  assert.deepEqual(Object.keys(b.cuerpo.hojas), ["SEPTIEMBRE_2026"]);
  await assert.rejects(() => prepararLibro({ nombres: ["Otra cosa"], hoja: async () => [] }, "x.xlsx", AHORA), /No se reconoce/);
});

test("preparar: el horario sale sin la cédula del personal", () => {
  const g = [["N°", "CEDULA", "NOMBRE"], ["1", "12345", "ANA"]];
  assert.deepEqual(sinColumna(g, (c) => c === "cedula"), [["N°", "CEDULA", "NOMBRE"], ["1", "", "ANA"]]);
  assert.deepEqual(soloColumnas([["MES", "NOMBRE DEL USUARIO", "FECHA DE ATENCION ASISTIDA", "SEDE"], ["X", "Persona", "01/09/2026", "C"]], LISTA_BLANCA.ilscRegistro).grid, [["FECHA DE ATENCION ASISTIDA", "SEDE"], ["01/09/2026", "C"]]);
});

// ── Punta a punta: de los .xlsx al tablero, pasando por la importación del administrador
test("importación: exige ser administrador, no duplica al repetir y alimenta el tablero", async () => {
  const { api } = nuevoNucleo();
  const cuerpos = [];
  for (const [f, nombre] of [["nps.xlsx", "NPS.xlsx"], ["charlas.xlsx", "CONS_CHARLAS_2026_3.xlsx"], ["buzon.xlsx", "CONS_BUZON_2026_1.xlsx"]]) cuerpos.push((await prepararLibro(await abrirLibro(fix(f)), nombre, AHORA)).cuerpo);
  await falla(() => api("POST", "/api/admin/importar", { rol: "visor", cuerpo: cuerpos[0] }), 403);
  await falla(() => api("POST", "/api/admin/importar", { rol: "nadie", cuerpo: cuerpos[0] }), 403);
  for (let vez = 0; vez < 2; vez++) {
    const [nps, ch, bz] = cuerpos.map((c) => api("POST", "/api/admin/importar", { cuerpo: c }));
    assert.deepEqual(nps.sedes_no_reconocidas, []); // «NUEVA VIDA», «P. PALMAS» y «LAS PALMAS» se reconocen
    assert.equal(ch.anio, 2026);
    assert.equal(bz.registros, 2 * 2);
  }
  const c = api("GET", "/api/cumplimiento", { rol: "visor", q: { mes: "2026-09", hoy: "2026-09-30" } });
  assert.equal(c.consolidado.encuesta_sg, 4); // 4 respuestas, no 8: la segunda importación reemplazó a la primera
  assert.equal(c.consolidado.charla, 300 + 7 + 30);
  assert.equal(c.actas_consolidado.esperadas, 4);
  assert.equal(c.actas_consolidado.entregadas, 2);
});
