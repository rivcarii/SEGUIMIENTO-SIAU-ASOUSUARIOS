// Reporte de cumplimiento: se arma con los datos de /api/cumplimiento, ordenado por estado de cada SIAU, con la acción sugerida.
// Sale como documento HTML independiente (se abre, se imprime o se guarda como PDF desde el navegador) y como texto para pegar en un correo.
const esc = (t) => String(t ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const mesTxt = (m) => `${MESES[Number(m.slice(5)) - 1]} de ${m.slice(0, 4)}`;
const nombre = (n) => n.split(/\s+/).filter(Boolean).map((x) => x[0] + x.slice(1).toLowerCase()).join(" ");
const ETQ = { cumple: "Cumplen sus metas", camino: "En camino (60 % o más de la meta)", atencion: "Requieren atención (menos del 60 %)", ausente: "Ausentes este mes (no se evalúan)" };
const TXT = { cumple: "Cumple", camino: "En camino", atencion: "Atención", ausente: "Ausente" };
const COL = { cumple: "#009e4d", camino: "#b98a00", atencion: "#e20a31", ausente: "#6b7c85" };

/** Qué le falta y a qué ritmo, según los días que quedan del mes. */
function accion(t, restantes) {
  if (t.ausente) return `Ausente (${t.ausencias.map((a) => a.tipo).join(", ") || "sin detalle"}). Verifique que sus sedes tengan cobertura.`;
  const f = [];
  for (const [n, m] of [["encuestas", t.encuestas], ["charlas", t.charlas]]) if (m.meta != null && m.valor < m.meta) { const falta = m.meta - m.valor; f.push(restantes > 0 ? `faltan ${falta} ${n} (≈ ${Math.ceil(falta / restantes)} por día en los ${restantes} día(s) que quedan)` : `quedaron ${falta} ${n} por debajo de la meta`); }
  if (t.actas.pendientes.length) f.push(`${t.actas.pendientes.length} acta(s) de buzón pendiente(s): ${t.actas.pendientes.map((p) => `${p.sede} (${p.codigo})`).join(", ")}`);
  if (!f.length) return "Meta cumplida. Mantener el ritmo.";
  return f.join("; ").replace(/^./, (c) => c.toUpperCase()) + ".";
}

/**
 * d: respuesta de /api/cumplimiento. siauId: filtra a una persona ("" = todos). Devuelve { titulo, html, texto }.
 */
export function construirReporte(d, siauId = "", ahora = new Date()) {
  const todas = d.siau.tecnicos, filas = siauId ? todas.filter((t) => String(t.tecnico_id) === String(siauId)) : todas;
  const dia = d.hoy && d.hoy.startsWith(d.mes) ? Number(d.hoy.slice(8)) : null, restantes = dia ? Math.max(0, d.siau.dias - dia) : 0;
  const titulo = siauId && filas[0] ? `Cumplimiento de ${nombre(filas[0].nombre)} · ${mesTxt(d.mes)}` : `Cumplimiento de los SIAU · ${mesTxt(d.mes)}`;
  const grupos = ["atencion", "camino", "cumple", "ausente"].map((k) => [k, filas.filter((t) => t.estado === k).sort((a, b) => a.avance - b.avance)]).filter(([, l]) => l.length);
  const ev = filas.filter((t) => !t.ausente);
  const sum = (f) => ev.reduce((t, x) => t + f(x), 0);
  const resumen = [
    ["SIAU evaluados", `${ev.length} de ${filas.length}`], ["Cumplen todas sus metas", `${grupos.find(([k]) => k === "cumple")?.[1].length ?? 0}`],
    ["Encuestas", `${sum((t) => t.encuestas.valor)} de ${sum((t) => t.encuestas.meta ?? 0)} (NPS ${sum((t) => t.encuestas.nps)} · médica ${sum((t) => t.encuestas.medica)})`],
    ["Charlas (asistentes)", `${sum((t) => t.charlas.valor)} de ${sum((t) => t.charlas.meta ?? 0)}`],
    ["Actas de buzón", `${sum((t) => t.actas.entregadas)} de ${sum((t) => t.actas.esperadas)} entregadas`], ["Días restantes del mes", dia ? String(restantes) : "mes cerrado"]];
  const sinCob = siauId ? [] : d.siau.sin_cobertura;

  const texto = [titulo.toUpperCase(), `Generado el ${ahora.toLocaleDateString("es-CO")}`, "", ...resumen.map(([k, v]) => `${k}: ${v}`), "",
    ...grupos.flatMap(([k, l]) => [`${ETQ[k].toUpperCase()} (${l.length})`, ...l.map((t) => `• ${nombre(t.nombre)} — ${t.sedes.join(", ") || "sin sedes"} — Encuestas ${t.encuestas.valor}/${t.encuestas.meta ?? "—"} · Charlas ${t.charlas.valor}/${t.charlas.meta ?? "—"}. ${accion(t, restantes)}`), ""]),
    ...(sinCob.length ? ["SEDES SIN SIAU ESTE MES", sinCob.map((x) => x.sede).join(", "), ""] : [])].join("\n");

  const bloque = ([k, l]) => `<section><h2 style="color:${COL[k]}">${esc(ETQ[k])} <small>(${l.length})</small></h2>${l.map((t) => `<article style="border-left:6px solid ${COL[k]}">
    <h3>${esc(nombre(t.nombre))} <span class="est" style="background:${COL[k]}">${TXT[k]}</span></h3>
    <p class="sedes">${esc(t.sedes.join(" · ") || "Sin sedes asignadas")}</p>
    ${t.ausente ? "" : `<table><tr><th>Encuestas</th><th>Charlas</th><th>Actas</th><th>Días activos</th><th>NPS</th></tr><tr>
      <td>${t.encuestas.valor}${t.encuestas.meta != null ? ` / ${t.encuestas.meta}` : ""}<br><small>NPS ${t.encuestas.nps} · médica ${t.encuestas.medica}</small></td>
      <td>${t.charlas.valor}${t.charlas.meta != null ? ` / ${t.charlas.meta}` : ""}</td><td>${t.actas.esperadas ? `${t.actas.entregadas} / ${t.actas.esperadas}` : "—"}</td><td>${t.dias_activos} / ${t.dias_mes}</td><td>${t.nps ?? "—"}</td></tr></table>`}
    <p class="acc"><b>Acción:</b> ${esc(accion(t, restantes))}</p></article>`).join("")}</section>`;
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${esc(titulo)}</title><style>
    body{font:14px/1.5 "Nunito",Arial,sans-serif;color:#12323f;max-width:820px;margin:24px auto;padding:0 16px}h1{color:#006081;margin:0 0 4px}.sub{color:#566f7b;margin:0 0 16px}
    .res{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:8px;margin:12px 0 20px}.res div{background:#eef4f3;border-radius:10px;padding:8px 12px}.res b{display:block;font-size:12px;color:#566f7b}
    h2{font-size:17px;margin:22px 0 8px}h2 small{color:#566f7b;font-weight:600}article{background:#fff;border:1px solid #d5e0e3;border-radius:10px;padding:10px 14px;margin:8px 0;break-inside:avoid}h3{margin:0;font-size:16px}
    .est{color:#fff;font-size:11px;border-radius:99px;padding:1px 9px;vertical-align:middle;margin-left:6px}.sedes{margin:2px 0 6px;color:#566f7b;font-size:13px}table{border-collapse:collapse;width:100%;margin:4px 0}th,td{border:1px solid #d5e0e3;padding:4px 8px;text-align:center}th{background:#eef4f3;font-size:12px}
    .acc{margin:6px 0 0}.pie{margin-top:24px;color:#566f7b;font-size:12px;border-top:1px solid #d5e0e3;padding-top:8px}@media print{body{margin:0}}</style></head><body>
    <h1>${esc(titulo)}</h1><p class="sub">SIAU · Subproceso de Gestión de la Calidad · MiRed IPS — generado el ${esc(ahora.toLocaleDateString("es-CO"))}</p>
    <div class="res">${resumen.map(([k, v]) => `<div><b>${esc(k)}</b>${esc(v)}</div>`).join("")}</div>
    ${grupos.map(bloque).join("")}
    ${sinCob.length ? `<section><h2>Sedes sin SIAU este mes <small>(${sinCob.length})</small></h2><p>${esc(sinCob.map((x) => x.sede).join(", "))}</p></section>` : ""}
    <p class="pie">Metas mínimas por SIAU: la meta baja en proporción a los días de vacaciones o licencia. Las encuestas suman NPS y evaluación médica; las charlas cuentan asistentes. Lo registrado en cada sede se reparte entre quienes la atienden.</p></body></html>`;
  return { titulo, html, texto };
}

export function descargarReporte(r) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([r.html], { type: "text/html;charset=utf-8" }));
  a.download = r.titulo.replace(/[^\p{L}\p{N}]+/gu, "-").toLowerCase() + ".html";
  document.body.append(a); a.click(); a.remove();
}
