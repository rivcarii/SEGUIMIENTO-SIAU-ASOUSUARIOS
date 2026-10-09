// Catálogo de sedes de MiRed IPS: 40 sedes (nombre corto del libro de los técnicos, hoja LISTAS)
// con el nombre largo y el código del consolidado de la líder (MAESTRO SEDES) como alias.
// [nombre técnicos, tipo, código MAESTRO, nombre MAESTRO]. Código/alias null = no figura en el MAESTRO de 37 sedes.
export const CATALOGO = [
  ["C. ADELITA DE CHAR", "CAMINO", "CAM011", "Camino Universitario Distrital Adelita de Char"],
  ["C. BOSQUES DE MARIA", "CAMINO", "CAM001", "Camino Bosque de María"],
  ["C. CIUDADELA", "CAMINO", "CAM002", "Camino Ciudadela 20 de Julio"],
  ["C. LA MANGA", "CAMINO", "CAM004", "Camino La Manga"],
  ["C. LA PLAYA", "CAMINO", null, null],
  ["C. LUZ CHINITA", "CAMINO", "CAM003", "Camino La Luz Chinita"],
  ["C. MURILLO", "CAMINO", "CAM006", "Camino Murillo"],
  ["C. NAZARETH", "CAMINO", "CAM007", "Camino Nazareth"],
  ["C. NUEVO BARRANQUILLA", "CAMINO", "CAM008", "Camino Nuevo Barranquilla"],
  ["C. SALUD METROPOLITANA", "CAMINO", "CAM005", "Camino Metropolitano"],
  ["C. SIMON BOLIVAR", "CAMINO", "CAM009", "Camino Simón Bolívar"],
  ["C. SUROCCIDENTE", "CAMINO", "CAM010", "Camino Sur Occidente"],
  ["P. BARLOVENTO", "PASO", "PAS001", "Paso Barlovento"],
  ["P. BUENA ESPERANZA", "PASO", "PAS002", "Paso Buena Esperanza"],
  ["P. CARLOS MEISEL", "PASO", "PAS003", "Paso Carlos Meisel II"],
  ["P. CARRIZAL", "PASO", "PAS004", "Paso Carrizal"],
  ["P. ESMERALDA LIPAYA", "PASO", "PAS006", "Paso Esmeralda - Lipaya"],
  ["P. FERRY", "PASO", "PAS005", "Paso El Ferry 1° de Mayo"],
  ["P. GALAN", "PASO", "PAS007", "Paso Galán"],
  ["P. JUAN MINA", "PASO", "PAS008", "Paso Juan Mina"],
  ["P. JULIO MONTES", "PASO", "PAS009", "Paso Julio Montes"],
  ["P. LA 21", "PASO", "PAS010", "Paso La 21"],
  ["P. LA PRADERA", "PASO", "PAS011", "Paso La Pradera"],
  ["P. LA VILLA", "PASO", "PAS013", "Paso La Villa"],
  ["P. LAS FLORES", "PASO", "PAS014", "Paso Las Flores"],
  ["P. LAS MALVINAS", "PASO", "PAS015", "Paso Las Malvinas"],
  ["P. LAS NIEVES", "PASO", "PAS016", "Paso Las Nieves"],
  ["P. LAS PALMAS", "PASO", "PAS017", "Paso Las Palmas"],
  ["P. NUEVA ERA", "PASO", "PAS018", "Paso Nueva Era"],
  ["P. NUEVA VIDA", "PASO", "PAS019", "Paso Nueva Vida"],
  ["P. REBOLO", "PASO", "PAS020", "Paso Rebolo"],
  ["P. ROSOUR", "PASO", null, null],
  ["P. SAN CAMILO", "PASO", "PAS021", "Paso San Camilo"],
  ["P. SAN JOSE", "PASO", "PAS022", "Paso San José"],
  ["P. SAN SALVADOR", "PASO", "PAS023", "Paso San Salvador"],
  ["P. SANTO DOMINGO", "PASO", "PAS024", "Paso Santo Domingo"],
  ["P. SIERRITA", "PASO", "PAS012", "Paso La Sierrita"],
  ["P. UNIVERSAL", "PASO", "PAS025", "Paso Universal"],
  ["P. VILLA NUEVA", "PASO", null, null],
  ["P. VILLA SAN PABLO", "PASO", "PAS026", "Paso Villas de San Pablo"],
];

export const normalizar = (s) =>
  String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const sinPrefijo = (n) => n.replace(/^(c|p|camino|paso) /, "");

/** Devuelve resolver(texto) → fila de sede o null. Acepta nombre corto, nombre largo, código o el nombre sin prefijo (si es único). */
export function crearResolver(sedes) {
  const exacto = new Map(), nucleo = new Map();
  const poner = (m, k, s) => { if (k) m.set(k, m.has(k) && m.get(k) !== s ? null : s); };
  for (const s of sedes) {
    const nombres = [s.nombre, s.codigo, ...(s.alias ? JSON.parse(s.alias) : [])];
    for (const n of nombres) { poner(exacto, normalizar(n), s); poner(nucleo, sinPrefijo(normalizar(n)), s); }
  }
  return (texto) => {
    const n = normalizar(texto);
    if (!n) return null;
    return exacto.get(n) ?? nucleo.get(sinPrefijo(n)) ?? null;
  };
}
