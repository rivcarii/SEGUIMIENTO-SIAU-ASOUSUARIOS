import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { rechazarPersonales } from "../consolidados.mjs";

// Se ejecuta el script de Google tal cual (sin servicios de Google) para comprobar su lista blanca.
const codigo = readFileSync(new URL("../apps-script/EnlaceConsolidados.gs", import.meta.url), "utf8");
const { soloColumnas, LISTA_BLANCA } = vm.runInNewContext(codigo + "\n({ soloColumnas, LISTA_BLANCA })");

// Encabezados reales de los archivos (los datos son inventados).
const NPS = [
  ["Marca temporal", "Dirección de correo electrónico", "NOMBRES", "APELLIDOS", "CÉDULA", "SEDE QUE CONSULTÓ:", "Servicio en que fue atendido:", "EPS del Paciente ", "Teléfono ", "Por favor, califica cada aspecto…", " ¿Cuál es la probabilidad de que recomiende a sus familiares y amigos a MiRed IPS?", "Su opinión es muy importante…"],
  ["05/02/2026 9:20:01", "ana@ejemplo.org", "Ana", "Paz", "123456", "NUEVA VIDA", "CONSULTA EXTERNA", "Mutual", "3000000000", "10", "10", "Excelente atención"],
];
const MEDICA = [
  ["Marca temporal", "Nombre y apellidos quien diligencia la encuesta", "N° de identificación", "EPS ", "Usted es?", "Sede en la consulto", "A quien evalua?", "¿La atención recibida fue oportuna? ", "En una escala numérica de 0 a 10, califique la experiencia de la atención", "Nombre del profesional que lo atendio"],
  ["05/03/2024 12:41:06", "Marta R", "5163", "Coosalud", "Paciente", "CAMINO NAZARETH", "Dr X", "SI", "10", "Dra Y"],
];
const ILSC = [
  ["MES", "NUMERO DE DOCUMENTO", "TIPO DE DOCUMENTO", "NOMBRE DEL USUARIO", "GENERO", "NUMERO DE TELEFONO DE CONTACTO", "EPS DEL AFILIADO", "FECHA DE ATENCION ASISTIDA ", "SERVICIO", "SEDE", "PERSONA CON DISCAPACIDAD"],
  ["FEBRERO", "99", "CC", "Persona Uno", "F", "300", "EPS", "03/02/2026", "CONSULTA EXTERNA", "CAMINO NAZARETH", "PERSONA SORDA SEÑANTE"],
];

const sinDatos = (g) => JSON.stringify(g);
test("script: la lista blanca deja solo fecha, sede y calificación", () => {
  const n = soloColumnas(NPS, LISTA_BLANCA.nps);
  assert.equal(n[0].length, 3);
  assert.deepEqual(n[1], ["05/02/2026 9:20:01", "NUEVA VIDA", "10"]);
  const m = soloColumnas(MEDICA, LISTA_BLANCA.medica);
  assert.deepEqual(m[1], ["05/03/2024 12:41:06", "CAMINO NAZARETH", "10"]);
  const i = soloColumnas(ILSC, LISTA_BLANCA.ilscRegistro);
  assert.deepEqual(i[1], ["03/02/2026", "CAMINO NAZARETH"]);
  for (const g of [n, m, i]) for (const dato of ["ana@ejemplo", "Ana", "123456", "Marta", "Persona Uno", "SORDA", "3000000000"]) assert.ok(!sinDatos(g).includes(dato), dato);
});

test("servidor: lo que el script filtra pasa la barrera; el archivo completo sin filtrar, no", () => {
  for (const [g, lista] of [[NPS, LISTA_BLANCA.nps], [MEDICA, LISTA_BLANCA.medica], [ILSC, LISTA_BLANCA.ilscRegistro]]) {
    assert.doesNotThrow(() => rechazarPersonales(soloColumnas(g, lista)));
    assert.throws(() => rechazarPersonales(g), /datos personales/);
  }
});

// ── autoconfigurar y verificarConexion, con servicios de Google simulados
function entorno({ archivos = [], props = {}, http = () => ({ code: 200, text: "{}" }) } = {}) {
  const guardadas = { ...props }, logs = [];
  const archivo = (nombre, id, edad, padre = null) => ({ getName: () => nombre, getId: () => id, getLastUpdated: () => edad, getParents: () => { const q = padre ? [{ getId: () => padre.id, getName: () => padre.n }] : []; return { hasNext: () => q.length > 0, next: () => q.shift() }; } });
  const ctx = {
    console: { log: (t) => logs.push(t) },
    DriveApp: { searchFiles: () => { const q = archivos.map((a) => archivo(a[0], a[1], a[2], a[3])); return { hasNext: () => q.length > 0, next: () => q.shift() }; } },
    PropertiesService: { getScriptProperties: () => ({ getProperties: () => ({ ...guardadas }), setProperty: (k, v) => { guardadas[k] = v; } }) },
    UrlFetchApp: { fetch: (url, o) => { const r = http(url, o); return { getResponseCode: () => r.code, getContentText: () => r.text }; } },
  };
  vm.createContext(ctx);
  vm.runInContext(codigo, ctx);
  return { ctx, guardadas, logs };
}

test("autoconfigurar: reconoce cada consolidado por su nombre y no confunde NPS con evaluación médica", () => {
  const { ctx, guardadas } = entorno({
    archivos: [
      ["CONS_CHARLAS_2026", "id-charlas", 5], ["CONS_BUZON_2026", "id-buzon-nuevo", 9], ["CONS_BUZON_2026 (copia antigua)", "id-buzon-viejo", 1],
      ["SATISFACCIÓN DE LOS USUARIOS MiRed IPS NPS. 2026 (respuestas)", "id-nps", 4], ["Evaluación de la satisfacción médica (respuestas)", "id-medica", 3],
      ["REGISTRO DE ATENCIONES ILSC MIRED IPS", "id-ilsc", 2], ["Consolidado_PQRS_2026", "id-pqrs", 8],
      ["Horario Agosto 2026 - SIAU", "h-ago", 6, { id: "carpeta-h", n: "Horarios" }], ["Horario Septiembre 2026 - SIAU", "h-sep", 7, { id: "carpeta-h", n: "Horarios" }], ["Horario Médicos", "h-med", 9, { id: "otra", n: "Médicos" }],
    ],
  });
  const informe = ctx.autoconfigurar();
  assert.deepEqual(guardadas, { ID_CHARLAS: "id-charlas", ID_BUZON: "id-buzon-nuevo", ID_NPS: "id-nps", ID_MEDICA: "id-medica", ID_ILSC: "id-ilsc", CARPETA_HORARIOS: "carpeta-h" });
  assert.ok(informe.some((l) => /ID_BUZON: REVISAR \(2 candidatos/.test(l)));
  assert.ok(informe.some((l) => /ID_NPS: OK/.test(l)));
});

test("autoconfigurar: avisa lo que no encuentra y no pisa lo ya configurado", () => {
  const { ctx, guardadas } = entorno({ archivos: [["CONS_CHARLAS_2026", "nuevo", 1]], props: { ID_CHARLAS: "manual" } });
  const informe = ctx.autoconfigurar();
  assert.equal(guardadas.ID_CHARLAS, "manual");
  assert.ok(informe.some((l) => /ID_CHARLAS: ya configurado/.test(l)));
  assert.ok(informe.some((l) => /ID_BUZON: NO ENCONTRADO/.test(l)));
  assert.ok(informe.some((l) => /CARPETA_HORARIOS: NO ENCONTRADA/.test(l)));
});

test("verificarConexion: mensajes claros para dirección inalcanzable, dirección equivocada y token incorrecto", () => {
  const p = { PLATAFORMA_URL: "https://x.test", BOT_TOKEN: "t" };
  const caso = (http) => entorno({ http }).ctx.verificarConexion(p);
  assert.doesNotThrow(() => caso(() => ({ code: 200, text: "{}" })));
  assert.throws(() => caso(() => { throw new Error("DNS"); }), /No se pudo llegar a https:\/\/x.test/);
  assert.throws(() => caso(() => ({ code: 404, text: "" })), /¿es la dirección de la plataforma/);
  assert.throws(() => caso((u) => (u.endsWith("/api/salud") ? { code: 200, text: "{}" } : { code: 401, text: "" })), /rechazó el BOT_TOKEN/);
});
