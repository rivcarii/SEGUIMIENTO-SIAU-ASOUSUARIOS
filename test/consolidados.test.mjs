import { test } from "node:test";
import assert from "node:assert/strict";
import { CATALOGO, aliasDe, crearResolver } from "../nucleo/sedes.mjs";
import { entero, fecha } from "../nucleo/consolidados.mjs";

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
  assert.equal(entero("1,181"), 1181);
  assert.equal(entero("297"), 297);
  assert.equal(entero(""), null);
  assert.equal(entero("abc"), null);
  assert.equal(fecha("12/05/2026"), "2026-05-12");
  assert.equal(fecha("05/02/2026 09:20:01"), "2026-02-05");
  assert.equal(fecha("2026-05-14T05:00:00.000Z"), "2026-05-14");
  assert.equal(fecha("31/02/2026"), null);
  assert.equal(fecha("mayo"), null);
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
    "CARRIZAL I": "P. CARRIZAL", "LA UNION SAN JOSE": "P. SAN JOSE", "CENTRO NUTRICIONAL ROSOUR": "P. ROSOUR", "CENTRO DE RECUPERACIÓN ROSOUR 7": "P. ROSOUR", "SANTO DOMINGO DE AMÉRICA": "P. SANTO DOMINGO",
  };
  for (const [texto, esperado] of Object.entries(casos)) assert.equal(r(texto)?.nombre, esperado, texto);
  for (const dudoso of ["HOSPITAL GENERAL DE BARRANQUILLA", "INTERPRETE", "TOTAL"]) assert.equal(r(dudoso), null, dudoso);
});
