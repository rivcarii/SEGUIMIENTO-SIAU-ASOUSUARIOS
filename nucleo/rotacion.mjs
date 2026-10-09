// Rotación base de los SIAU: quién atiende qué sedes (definida por la líder de Calidad). El horario mensual aporta vacaciones y licencias;
// las sedes de estas personas salen de aquí y se ajustan en Administrador → Personal y rotación.
// [nombre, sedes (nombre del catálogo)]. La última persona atiende «las restantes» (null).
export const ROTACION = [
  ["LILIANA SUAREZ", ["C. ADELITA DE CHAR", "P. LA 21"]],
  ["HORACIO AMARIS", ["C. MURILLO", "P. LAS PALMAS"]],
  ["JEIMIS LARA", ["C. NUEVO BARRANQUILLA", "P. REBOLO"]],
  ["ANYI MORALES", ["C. CIUDADELA", "P. LA VILLA"]], // cubre la licencia de maternidad de Sindi Buelvas
  ["NIRA LARA", ["C. LA MANGA", "P. VILLA SAN PABLO"]],
  ["GREYS CARDENAS", ["C. LA PLAYA", "P. LAS FLORES"]],
  ["SHIRLY MESA", ["C. SIMON BOLIVAR", "P. NUEVA VIDA"]],
  ["ANDREA DE LEON", ["C. LUZ CHINITA", "P. LAS NIEVES"]],
  ["KARLA CATAÑO", ["C. SUROCCIDENTE", "P. SAN JOSE"]],
  ["LUIS ROMERO", ["C. SALUD METROPOLITANA", "P. CARLOS MEISEL"]],
  ["LINDA DE LA CRUZ", ["C. BOSQUES DE MARIA", "P. SAN SALVADOR"]],
  ["YUIRIS MEDINA", ["C. NAZARETH", "P. GALAN"]],
  ["JULENIS ROJANO", ["P. JULIO MONTES", "P. LAS MALVINAS", "P. SIERRITA", "P. UNIVERSAL", "P. SANTO DOMINGO"]],
  ["MARCOS FONTALVO", ["P. ESMERALDA LIPAYA", "P. JUAN MINA", "P. BUENA ESPERANZA", "P. NUEVA ERA", "P. LA PRADERA"]],
  ["MICHEL VARGAS", null], // «en las restantes»
];

/** Compara nombres sin tildes ni mayúsculas; «y» e «i» se tratan igual (Jeimis/Jeimys) y basta que estén todas las palabras del nombre de la rotación. */
const palabras = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/y/g, "i").split(/[^a-z0-9]+/).filter(Boolean);
export const mismaPersona = (nombreRotacion, nombreHorario) => { const h = new Set(palabras(nombreHorario)), r = palabras(nombreRotacion); return r.length >= 2 && r.every((w) => h.has(w)); };

/** Sedes de cada persona de la rotación; a la última («las restantes») le tocan las que nadie más tiene. */
export function sedesPorPersona(catalogo) {
  const nombres = catalogo.map((c) => c[0]), usadas = new Set(ROTACION.flatMap((r) => r[1] ?? []));
  return ROTACION.map(([nombre, sedes]) => [nombre, sedes ?? nombres.filter((n) => !usadas.has(n))]);
}
