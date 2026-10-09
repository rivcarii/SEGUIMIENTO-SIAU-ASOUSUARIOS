import { test } from "node:test";
import assert from "node:assert/strict";
import { nuevoNucleo } from "./ayuda.mjs";
import { ROTACION, mismaPersona, sedesPorPersona } from "../nucleo/rotacion.mjs";
import { CATALOGO } from "../nucleo/sedes.mjs";

test("rotación: cada sede de la lista existe y ninguna se repite entre personas", () => {
  const nombres = new Set(CATALOGO.map((c) => c[0])), vistas = new Set();
  for (const [persona, sedes] of ROTACION) for (const s of sedes ?? []) { assert.ok(nombres.has(s), `${persona}: «${s}» no está en el catálogo`); assert.ok(!vistas.has(s), `${s} repetida`); vistas.add(s); }
  const todas = sedesPorPersona(CATALOGO), restantes = todas.find(([n]) => n === "MICHEL VARGAS")[1];
  assert.equal(new Set(todas.flatMap(([, s]) => s)).size, 40); // las 40 sedes quedan con alguien
  for (const s of ["P. ROSOUR", "P. VILLA NUEVA", "P. BARLOVENTO"]) assert.ok(restantes.includes(s), s);
  assert.equal(restantes.length, 40 - vistas.size);
});

test("rotación: reconoce el nombre aunque el horario lo escriba completo o con otra ortografía", () => {
  assert.ok(mismaPersona("JEIMIS LARA", "JEIMYS PAOLA LARA GOMEZ"));
  assert.ok(mismaPersona("KARLA CATAÑO", "Karla Patricia Cataño Ruiz"));
  assert.ok(!mismaPersona("LUIS ROMERO", "LUIS PEREZ"));
  assert.ok(!mismaPersona("", "LUIS PEREZ"));
});

test("rotación: 15 SIAU con sus sedes desde el inicio, las 40 sedes cubiertas, repetible y el horario no las pisa", () => {
  const { api, nucleo, almacen } = nuevoNucleo({ rotacion: true });
  const c = api("GET", "/api/cumplimiento", { q: { mes: "2026-09", hoy: "2026-09-30" } });
  assert.equal(c.siau.tecnicos.length, 15);
  assert.equal(c.siau.sin_cobertura.length, 0);
  assert.deepEqual(c.siau.tecnicos.find((t) => t.nombre === "ANYI MORALES").sedes, ["C. CIUDADELA", "P. LA VILLA"]);
  const antes = almacen.tabla("asignaciones").todos().length;
  const horario = [["", "", "", "", "", "", "1", "2"], ["N°", "CEDULA", "NOMBRE", "CARGO", "SEDE", "", "M", "T"], ["1", "", "JEIMYS PAOLA LARA GOMEZ", "AUXILIAR SIAU", "VACACIONES", "", "C8", "C8"]];
  const r = nucleo.sincronizar({ tipo: "horario", archivo: "H", mes: "2026-09", hojas: { "CUADRO DE TURNO": horario } });
  assert.equal(r.personal, 1);
  assert.equal(api("GET", "/api/config").tecnicos.filter((t) => /LARA/.test(t.nombre) && /JEIM/i.test(t.nombre)).length, 1); // mismo registro, sin duplicar
  assert.equal(almacen.tabla("asignaciones").todos().length, antes);
});
