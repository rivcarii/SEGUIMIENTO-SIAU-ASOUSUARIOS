// Reglas del monitor. Puras (sin red) para poder probarlas. Nada de lo que produce incluye nombres de personas.
export const REQUERIDAS = {
  charlas_matriz: "Consolidado de charlas",
  buzon: "Consolidado de buzón",
  nps: "Encuestas NPS",
  medica: "Evaluación médica",
  ilsc: "Registro del intérprete (LSC)",
};
export const HORAS_MAX = 36; // el script de Drive corre a diario; más de 36 h sin novedades es una falla
const NIVEL = { alto: 0, medio: 1, info: 2 };
const lista = (xs, n = 8) => xs.slice(0, n).join(", ") + (xs.length > n ? ` y ${xs.length - n} más` : "");

export function analizar(e, ahora = Date.now()) {
  const h = [];
  const agregar = (nivel, texto) => h.push({ nivel, texto });

  for (const [tipo, nombre] of Object.entries(REQUERIDAS)) {
    const f = e.fuentes.find((x) => x.tipo === tipo);
    if (!f) { agregar("alto", `${nombre}: nunca se ha sincronizado. Revise el script de Drive (propiedades del script y permisos).`); continue; }
    const horas = (ahora - Date.parse(f.creado.replace(" ", "T") + "Z")) / 36e5;
    if (horas > HORAS_MAX) agregar("alto", `${nombre}: lleva ${Math.round(horas)} h sin sincronizar (máximo ${HORAS_MAX} h).`);
    if (f.sedes_no_reconocidas.length) agregar("medio", `${nombre}: ${f.sedes_no_reconocidas.length} nombre(s) de sede sin reconocer (${lista(f.sedes_no_reconocidas)}). Indíquelos en Administrador → Personal y rotación.`);
    if (f.registros === 0) agregar("medio", `${nombre}: la última sincronización no trajo registros.`);
  }
  if (e.personal.sin_cobertura.length) agregar("medio", `${e.personal.sin_cobertura.length} sede(s) sin SIAU este mes: ${lista(e.personal.sin_cobertura)}.`);

  // Ritmo: a mitad de mes un SIAU debería llevar ~la mitad de la meta. Solo cuentas, sin nombres.
  const esperado = (100 * e.dia) / e.dias_mes, evaluados = e.progreso.filter((p) => p.encuestas_pct != null || p.charlas_pct != null);
  const atrasados = evaluados.filter((p) => Math.min(p.encuestas_pct ?? 999, p.charlas_pct ?? 999) < esperado - 25).length;
  if (e.dia >= 10 && atrasados) agregar("medio", `${atrasados} de ${evaluados.length} SIAU van por debajo del ritmo de sus metas mínimas (esperado hoy ≈ ${Math.round(esperado)} %).`);

  if (e.actas && e.actas.esperadas > e.actas.entregadas) agregar("info", `${e.actas.esperadas - e.actas.entregadas} acta(s) de buzón vencidas sin entregar en ${e.actas.sedes_pendientes} sede(s).`);
  for (const f of e.fuentes) if (f.avisos) agregar("info", `${REQUERIDAS[f.tipo] ?? f.tipo}: ${f.avisos} aviso(s) al leer el archivo (revise el resumen de la sincronización).`);
  return h.sort((a, b) => NIVEL[a.nivel] - NIVEL[b.nivel]);
}

const ICONO = { alto: "🔴", medio: "🟠", info: "🔵" };
export function informeMarkdown(e, hallazgos, ahora = new Date()) {
  const filas = Object.entries(REQUERIDAS).map(([t, n]) => { const f = e.fuentes.find((x) => x.tipo === t); return `| ${n} | ${f ? f.creado + " UTC" : "—"} | ${f ? f.registros : "—"} |`; });
  return [
    `# Estado de los consolidados · ${e.mes}`, "",
    hallazgos.length ? hallazgos.map((x) => `- ${ICONO[x.nivel]} ${x.texto}`).join("\n") : "✅ Todo en orden: las fuentes están al día y no hay pendientes.", "",
    "| Fuente | Última sincronización | Registros |", "|---|---|---|", ...filas, "",
    `SIAU evaluados: ${e.personal.evaluados} (ausentes este mes: ${e.personal.ausentes}). Generado ${ahora.toISOString()}.`,
    "_Este informe no incluye nombres de personas ni datos de usuarios._",
  ].join("\n");
}
