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
