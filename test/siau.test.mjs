import { test } from "node:test";
import assert from "node:assert/strict";
import { parsearBuzon, parsearCharlasMatriz, parsearEncuestas, parsearHorario, parsearIlsc, rechazarPersonales } from "../nucleo/consolidados.mjs";
import { calcularPorTecnico } from "../nucleo/lib.mjs";
import { nuevoNucleo, falla } from "./ayuda.mjs";

// ── Cuadrículas sintéticas con la MISMA forma que los archivos reales (nombres y datos inventados)
const BUZON = {
  "ENERO_2026": [["SEDES", "ENERO"], ["DIA", "02(B001)", "09(B002)", "ESTADO"], ["C. PLAYA", "ENTREGADO ", "ENTREGADO", "=COUNTIF"], ["P. VILLANUEVA", "ENTREGADO", "PENDIENTE", ""], ["ENTREGADAS", "2", "1"]],
  "ABRIL_2026": [["SEDES", "ABRIL"], ["DIA", "6(B014)", "10(B015)", "ESTADO"], ["C. PLAYA", "ENTREGADO", ""], ["ENTREGADAS", "1"]],
  "FEBRER_2026": [["0.0", "FEBRERO"], ["DIA", "6(B006)", "ESTADO"], ["P. LAS MALVINA", "ENTREGADO"]],
  "INDICADORES": [["INDICADORES DE BUZON AMIGOS"]],
};
const CHARLAS = {
  "CHARLAS USUARIOS": [["Charlas a Usuarios"], ["SEDES", "ENERO", "FEBRERO", "MARZO", "TOTAL"], ["C. PLAYA ", "1.181", "601", "", "=SUM"], ["INTERPRETE", "50", "", "", ""], ["P. NIEVES", "100", "", "20", ""], ["TOTAL", "9999", "", "", ""], ["fila posterior", "5"]],
  "CHARLAS FUNCIONARIOS": [["Charlas de funcionarios"], ["SEDES", "ENERO", "FEBRERO"], ["C. PLAYA", "30", "20"]],
};
const nps = (filas) => [["Marca temporal", "SEDE QUE CONSULTÓ:", "Servicio en que fue atendido:", " ¿Cuál es la probabilidad de que recomiende a sus familiares y amigos?"], ...filas];
const medica = (filas) => [["Marca temporal", "Sede en la consulto", "En una escala numérica de 0 a 10, califique la experiencia"], ...filas];

test("buzón: fechas del propio calendario (no viernes fijos), códigos y estados normalizados", () => {
  const r = parsearBuzon(BUZON);
  assert.equal(r.actas.length, 2 * 2 + 1 * 2 + 1);
  const a = (cod, sede) => r.actas.find((x) => x.codigo === cod && x.sede_texto === sede);
  assert.equal(a("B014", "C. PLAYA").fecha, "2026-04-06"); // lunes por el festivo
  assert.equal(a("B014", "C. PLAYA").estado, "entregado");
  assert.equal(a("B015", "C. PLAYA").estado, "sin_dato");
  assert.equal(a("B002", "P. VILLANUEVA").estado, "pendiente");
  assert.equal(a("B006", "P. LAS MALVINA").fecha, "2026-02-06"); // «FEBRER_2026» con el nombre incompleto
  assert.ok(!r.actas.some((x) => x.sede_texto === "ENTREGADAS"));
});

test("charlas: matriz sede × mes; omite INTERPRETE y TOTAL; entiende miles con punto", () => {
  const r = parsearCharlasMatriz(CHARLAS, 2026);
  const f = (s, p, i) => r.filas.find((x) => x.sede_texto === s && x.periodo === p && x.indicador === i)?.valor;
  assert.equal(f("C. PLAYA", "2026-01", "charlas_usuarios"), 1181);
  assert.equal(f("C. PLAYA", "2026-02", "charlas_funcionarios"), 20);
  assert.equal(f("P. NIEVES", "2026-03", "charlas_usuarios"), 20);
  assert.ok(!r.filas.some((x) => ["INTERPRETE", "TOTAL", "fila posterior"].includes(x.sede_texto)));
});

test("NPS y evaluación médica: agrega por sede y mes; promotores ≥9, pasivos 7–8, detractores ≤6", () => {
  const r = parsearEncuestas(nps([
    ["5/02/2026 9:20:01", "NUEVA VIDA", "CONSULTA EXTERNA", "10"], ["2026-02-06 10:00:00", "NUEVA VIDA", "URGENCIAS", "8"],
    ["12/02/2026 11:00:00", "NUEVA VIDA", "URGENCIAS", "3"], ["01/03/2026 08:00:00", "NUEVA VIDA", "", "9"], ["sin fecha", "NUEVA VIDA", "", "9"],
  ]), "nps");
  const f = (p, i) => r.filas.find((x) => x.periodo === p && x.indicador === i)?.valor;
  assert.equal(f("2026-02", "encuestas"), 3);
  assert.deepEqual(["nps_promotores", "nps_pasivos", "nps_detractores"].map((i) => f("2026-02", i)), [1, 1, 1]);
  assert.equal(f("2026-03", "encuestas"), 1);
  assert.match(r.avisos[0], /sin fecha/);
  const m = parsearEncuestas(medica([["01/05/2026 1:00:00", "CAMINO NAZARETH", "10"], ["02/05/2026 1:00:00", "CAMINO NAZARETH", "5"]]), "medica");
  assert.equal(m.filas.find((x) => x.indicador === "medica_evaluaciones").valor, 2);
});

test("privacidad: se rechaza todo envío cuyo encabezado traiga datos personales", () => {
  for (const col of ["CÉDULA", "NOMBRES", "Dirección de correo electrónico", "Teléfono ", "NUMERO DE DOCUMENTO", "NOMBRE DEL USUARIO", "N° de identificación", "Nombre y apellidos quien diligencia la encuesta", "NUMERO DE TELEFONO DE CONTACTO"]) {
    assert.throws(() => rechazarPersonales([["Marca temporal", col, "SEDE"]]), /datos personales/, col);
  }
  assert.throws(() => parsearEncuestas([["Marca temporal", "CÉDULA", "SEDE QUE CONSULTÓ:", "probabilidad"]], "nps"), /datos personales/);
  assert.doesNotThrow(() => rechazarPersonales([["Marca temporal", "SEDE QUE CONSULTÓ:", "Servicio en que fue atendido:", "calificación"]]));
});

test("intérprete LSC: cuenta atenciones por sede y mes; solo encabezados sin datos personales", () => {
  const reg = [["MES", "FECHA DE ATENCION ASISTIDA", "SERVICIO", "SEDE"], ["FEBRERO", "2026-02-03", "CONSULTA EXTERNA", "CAMINO NAZARETH"], ["FEBRERO", "04/02/2026", "URGENCIAS", "CAMINO NAZARETH"], ["MARZO", "05/03/2026", "URGENCIAS", "CIUDADELA20DEJULIO"]];
  const act = [[], ["MES", "TIPO DE PERSONA", "FECHA DE LA ATENCIÓN DD/MM/AAAA", "TEMATICA", "SEDE", "N° DE ASISTENTES "], ["FEBRERO", "USUARIOS", "2026-02-04", "DEBERES", "CAMINO NAZARETH", "19 PERSONAS"]];
  const r = parsearIlsc({ "REGISTRO 2026": reg, "ACTIVIDADES ASOCIADAS LSC 2026": act, "OTRA": [["x"]] });
  const f = (s, p, i) => r.filas.find((x) => x.sede_texto === s && x.periodo === p && x.indicador === i)?.valor;
  assert.equal(f("CAMINO NAZARETH", "2026-02", "lsc_atenciones"), 2);
  assert.equal(f("CIUDADELA20DEJULIO", "2026-03", "lsc_atenciones"), 1);
  assert.equal(f("CAMINO NAZARETH", "2026-02", "lsc_actividades"), 1);
  assert.equal(f("CAMINO NAZARETH", "2026-02", "lsc_actividades_asistentes"), 19);
  assert.throws(() => parsearIlsc({ "REGISTRO 2026": [["MES", "NUMERO DE DOCUMENTO", "FECHA DE ATENCION ASISTIDA", "SEDE"]] }), /datos personales/);
});

// Horario: misma disposición que «CUADRO DE TURNO» (fila 6 = días, fila 7 = encabezado, desde la columna F los turnos). Nombres inventados.
function horario() {
  const dias = Array.from({ length: 30 }, (_, i) => i + 1);
  const fila = (n, nombre, cargo, sede, turnos) => [String(n), "(cédula omitida)", nombre, cargo, sede, ...turnos];
  const T = (inicio, fin, v = "C8") => dias.map((d) => (d >= inicio && d <= fin ? v : ""));
  return {
    "CUADRO DE TURNO": [
      ["", "AREA", "ATENCION AL USUARIO"], ["", "RESPONSABLE", "LIDER"], ["", "MES", "SEPTIEMBRE"], [], 
      ["CALENDARIO X DIAS", "", "", "", "", ...dias],
      ["N°", "CEDULA", "NOMBRE", "CARGO", "SEDE", ...dias.map(() => "L")],
      fila(1, "ANA PAZ ROJAS DIAZ", "TÉCNICO ATENCIÓN AL USUARIO", "PASOS", T(1, 30)),
      fila(2, "BEATRIZ LUNA MORA", "TÉCNICO ATENCIÓN AL USUARIO", "C. Murillo - P. Palmas", T(1, 30)),
      fila(3, "CARLA RIOS NIETO", "TÉCNICO ATENCIÓN AL USUARIO", "C. Playa - P. Las Flores", ["VACACIONES", ...Array(12).fill(""), ...Array(17).fill("C8")]),
      fila(4, "DORA SOL VEGA", "TÉCNICO ATENCIÓN AL USUARIO", "C. Ciudadela 20 de julio - P. La Villa", ["LICENCIA DE MATERNINDAD", ...Array(29).fill("")]),
      fila(5, "ELSA MAR TORO", "TÉCNICO ATENCIÓN AL USUARIO", "Oficina administrativa MIX", T(1, 30)),
      fila(6, "FANNY OLA PRIETO", "INTERPRETE LENGUA DE SEÑAS", "Todas las sedes", T(1, 30)),
      fila(7, "GINA VIDAL SOTO", "TÉCNICO ATENCIÓN AL USUARIO", "REALIZANDO VACACIONES", T(1, 30)),
    ],
    "HORARIO PASOS": [["LUDOTECA"], [], ["ANA PAZ", "L", "MALVINAS"], ["", "M", "MALVINAS"], ["", "MI", "B. ESPERANZA"], ["", "S", "LUDOTECA"], [], ["OTRO NOMBRE", "L", "ROSOUR"]],
  };
}

test("horario: roles, sedes, rotación de «PASOS» y ausencias por días", () => {
  const r = parsearHorario(horario(), "2026-09");
  assert.equal(r.mes, "2026-09");
  const p = (n) => r.personal.find((x) => x.nombre.startsWith(n));
  assert.deepEqual(p("BEATRIZ").sedes_texto, ["C. Murillo", "P. Palmas"]);
  assert.deepEqual(p("ANA").sedes_texto, ["MALVINAS", "B. ESPERANZA"]); // rotación, sin la ludoteca del sábado
  assert.equal(p("ELSA").rol, "administrativo");
  assert.equal(p("FANNY").rol, "interprete");
  assert.equal(p("BEATRIZ").rol, "tecnico");
  assert.deepEqual(p("CARLA").ausencias, [{ tipo: "vacaciones", nota: "VACACIONES", desde: "2026-09-01", hasta: "2026-09-13" }]);
  assert.deepEqual(p("DORA").ausencias.map((a) => [a.tipo, a.desde, a.hasta]), [["licencia", "2026-09-01", "2026-09-30"]]);
  assert.deepEqual(p("GINA").sedes_texto, []);
  assert.equal(p("GINA").ausencias[0].tipo, "vacaciones"); // el horario solo dice «REALIZANDO VACACIONES»
  assert.equal(p("GINA").ausencias[0].hasta, "2026-09-30");
  assert.ok(!JSON.stringify(r).includes("cédula"), "no debe leer la cédula");
});

// ── Cumplimiento individual
const T3 = [{ id: 1, nombre: "Ana", rol: "tecnico", activo: 1 }, { id: 2, nombre: "Beatriz", rol: "tecnico", activo: 1 }, { id: 3, nombre: "Carla", rol: "tecnico", activo: 1 }, { id: 4, nombre: "Elsa", rol: "administrativo", activo: 1 }];
const SEDES3 = [1, 2, 3, 4].map((id) => ({ id, nombre: `S${id}` }));
const M = (sede_id, indicador, valor) => ({ sede_id, periodo: "2026-09", indicador, valor });
const base = () => ({
  mes: "2026-09", hoy: "2026-09-30", tecnicos: T3, sedes: SEDES3, metas: { encuestas: 90, charlas: 200 }, ausencias: [], actas: [],
  asignaciones: [{ tecnico_id: 1, sede_id: 1, desde: "2026-09-01", hasta: "2026-09-30" }, { tecnico_id: 1, sede_id: 2, desde: "2026-09-01", hasta: null }, { tecnico_id: 2, sede_id: 2, desde: "2026-09-01", hasta: null }, { tecnico_id: 3, sede_id: 3, desde: "2026-09-01", hasta: null }],
  mensual: [M(1, "encuestas", 100), M(2, "encuestas", 60), M(3, "encuestas", 10), M(1, "charlas_usuarios", 150), M(1, "charlas_funcionarios", 60), M(2, "charlas_usuarios", 100), M(1, "nps_promotores", 9), M(1, "nps_detractores", 1)],
});
const fila = (r, n) => r.tecnicos.find((t) => t.nombre === n);

test("cumplimiento individual: suma sus sedes, reparte las compartidas y detecta sedes sin SIAU", () => {
  const r = calcularPorTecnico(base());
  assert.equal(r.tecnicos.length, 3); // el administrativo no se evalúa
  assert.equal(fila(r, "Ana").encuestas.valor, 100 + 30); // sede 1 completa + mitad de la sede 2 (compartida con Beatriz)
  assert.equal(fila(r, "Beatriz").encuestas.valor, 30);
  assert.equal(fila(r, "Ana").encuestas.cumple, true);
  assert.equal(fila(r, "Beatriz").encuestas.cumple, false);
  assert.equal(fila(r, "Ana").charlas.valor, 150 + 60 + 50);
  assert.equal(fila(r, "Ana").charlas.cumple, true);
  assert.equal(fila(r, "Ana").nps, 80); // (9 promotores − 1 detractor) / 10
  assert.deepEqual(r.sin_cobertura, [{ sede: "S4", motivo: "Sin SIAU asignado" }]);
});

test("cumplimiento individual: la meta baja con vacaciones/licencia y la sede pasa al compañero presente", () => {
  const d = base();
  d.ausencias = [{ tecnico_id: 2, tipo: "vacaciones", desde: "2026-09-01", hasta: "2026-09-15" }, { tecnico_id: 3, tipo: "licencia", desde: "2026-08-20", hasta: "2026-10-30" }];
  const r = calcularPorTecnico(d);
  assert.equal(fila(r, "Beatriz").dias_activos, 15);
  assert.equal(fila(r, "Beatriz").encuestas.meta, 45); // 90 × 15/30
  assert.equal(fila(r, "Beatriz").charlas.meta, 100);
  assert.equal(fila(r, "Carla").ausente, true);
  assert.equal(fila(r, "Carla").encuestas.valor, 0);
  assert.deepEqual(r.sin_cobertura.map((s) => s.sede).sort(), ["S3", "S4"]);
  assert.equal(r.sin_cobertura.find((s) => s.sede === "S3").motivo, "El SIAU asignado está ausente todo el mes");
});

test("cumplimiento individual: actas pendientes solo hasta hoy y solo de sus sedes", () => {
  const d = base();
  d.actas = [
    { sede_id: 1, codigo: "B040", fecha: "2026-09-04", estado: "entregado" }, { sede_id: 1, codigo: "B041", fecha: "2026-09-11", estado: "pendiente" },
    { sede_id: 1, codigo: "B042", fecha: "2026-09-18", estado: "sin_dato" }, { sede_id: 3, codigo: "B040", fecha: "2026-09-04", estado: "entregado" },
  ];
  d.hoy = "2026-09-12";
  const a = fila(calcularPorTecnico(d), "Ana").actas;
  assert.equal(a.esperadas, 2); // B042 (18/09) aún no vence
  assert.equal(a.entregadas, 1);
  assert.deepEqual(a.pendientes.map((p) => p.codigo), ["B041"]);
});

// ── Punta a punta, con el núcleo completo
test("punta a punta: horario + consolidados → cumplimiento individual; rechaza datos personales", async () => {
  const { api, nucleo } = nuevoNucleo();
  const r1 = nucleo.sincronizar({ tipo: "horario", archivo: "Horario", mes: "2026-09", hojas: horario() });
  assert.equal(r1.personal, 7);
  assert.ok(r1.asignaciones >= 6);
  assert.equal(r1.ausencias, 3);
  nucleo.sincronizar({ tipo: "nps", archivo: "NPS", hojas: { "Respuestas de formulario 1": nps(Array.from({ length: 4 }, (_, i) => [`0${i + 1}/09/2026 10:00:00`, "P. LAS PALMAS", "", "10"])) } });
  const ch = nucleo.sincronizar({ tipo: "charlas_matriz", archivo: "CONS_CHARLAS_2026_3", hojas: { "CHARLAS USUARIOS": [["x"], ["SEDES", "SEPTIEMBRE"], ["C. MURILLO", "500"]] } });
  assert.equal(ch.anio, 2026);
  const bz = nucleo.sincronizar({ tipo: "buzon", archivo: "CONS_BUZON", hojas: { SEPTIEMBRE_2026: [["SEDES", "SEPTIEMBRE"], ["DIA", "04(B036)", "11(B037)"], ["C. MURILLO", "ENTREGADO", ""]] } });
  assert.equal(bz.registros, 2);

  const c = api("GET", "/api/cumplimiento", { q: { mes: "2026-09", hoy: "2026-09-30" } });
  const bea = c.siau.tecnicos.find((t) => t.nombre.startsWith("BEATRIZ"));
  assert.equal(bea.encuestas.valor, 4); // «P. LAS PALMAS» llega como «P. Palmas» en su horario y como «LAS PALMAS» en el formulario
  assert.equal(bea.charlas.valor, 500);
  assert.equal(bea.actas.pendientes.length, 1);
  const carla = c.siau.tecnicos.find((t) => t.nombre.startsWith("CARLA"));
  assert.equal(carla.dias_activos, 17);
  assert.equal(carla.encuestas.meta, 51); // 90 × 17/30
  assert.equal(c.siau.tecnicos.some((t) => t.nombre.startsWith("ELSA") || t.nombre.startsWith("FANNY")), false);
  assert.ok(c.siau.sin_cobertura.length > 30);
  assert.equal(c.actas_consolidado.esperadas, 2);

  const malo = await falla(() => nucleo.sincronizar({ tipo: "nps", archivo: "NPS", hojas: { "Respuestas de formulario 1": [["Marca temporal", "CÉDULA", "SEDE QUE CONSULTÓ:", "probabilidad"], ["01/09/2026", "123", "X", "10"]] } }), 400);
  assert.match(malo.message, /datos personales/);
  await falla(() => nucleo.sincronizar({ tipo: "otro", archivo: "x", hojas: {} }), 400);
});

test("punta a punta: sincronizar de nuevo reemplaza (no duplica) y lo cargado a mano sobrevive al horario", () => {
  const { api, nucleo } = nuevoNucleo();
  nucleo.sincronizar({ tipo: "horario", archivo: "H", mes: "2026-09", hojas: horario() });
  const bea = api("GET", "/api/admin/personal", { q: { mes: "2026-09" } }).tecnicos.find((t) => t.nombre.startsWith("GINA"));
  const palmas = api("GET", "/api/config").sedes.find((s) => s.nombre === "P. UNIVERSAL");
  api("POST", "/api/admin/asignaciones", { cuerpo: { tecnico_id: bea.id, sede_id: palmas.id, desde: "2026-09-01", hasta: "" } });
  for (let i = 0; i < 2; i++) nucleo.sincronizar({ tipo: "horario", archivo: "H", mes: "2026-09", hojas: horario() });
  const despues = api("GET", "/api/admin/personal", { q: { mes: "2026-09" } });
  assert.equal(despues.tecnicos.filter((t) => t.nombre.startsWith("GINA")).length, 1);
  assert.deepEqual(despues.tecnicos.find((t) => t.nombre.startsWith("GINA")).asignaciones.map((a) => [a.sede, a.origen]), [["P. UNIVERSAL", "manual"]]);
  assert.equal(despues.tecnicos.find((t) => t.nombre.startsWith("BEATRIZ")).asignaciones.length, 2); // 2 sedes del horario, sin duplicar
});
