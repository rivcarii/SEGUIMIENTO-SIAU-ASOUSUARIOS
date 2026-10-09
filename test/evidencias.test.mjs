import { test } from "node:test";
import assert from "node:assert/strict";
import { viernesDelMes, calcularCumplimiento } from "../nucleo/lib.mjs";

test("viernes de octubre 2026", () => assert.deepEqual(viernesDelMes("2026-10"), ["2026-10-02", "2026-10-09", "2026-10-16", "2026-10-23", "2026-10-30"]));

test("cumplimiento: totales, por técnico y actas faltantes", () => {
  const r = calcularCumplimiento({
    mes: "2026-10",
    tipos: [{ clave: "charla", area: "siau", nombre: "Charla", meta: 200, alcance: "global" }, { clave: "acta_buzon", area: "siau", nombre: "Acta", meta: null, alcance: "global" }],
    tecnicos: [{ id: 1, nombre: "A" }, { id: 2, nombre: "B" }],
    sedes: [{ id: 1, nombre: "Norte" }],
    evs: [{ tipo: "charla", tecnico_id: 1, sede_id: 1, fecha: "2026-10-05", cantidad: 3 }, { tipo: "charla", tecnico_id: 2, sede_id: 1, fecha: "2026-10-06", cantidad: 1 },
      { tipo: "acta_buzon", tecnico_id: 1, sede_id: 1, fecha: "2026-10-02", cantidad: 1 }],
  });
  assert.equal(r.tipos[0].total, 4);
  assert.deepEqual(r.tipos[0].porTecnico.map((t) => t.total), [3, 1]);
  assert.equal(r.actas[0].entregadas, 1);
  assert.equal(r.actas[0].faltantes.length, 4);
});
