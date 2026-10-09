#!/usr/bin/env node
// Monitor de consolidados: consulta a la plataforma, aplica las reglas de analisis.mjs, escribe el informe
// y publica el resumen en el tablero. Uso: node bot/monitor.mjs [--sin-publicar]
// Variables: PLATAFORMA_URL, BOT_TOKEN. FALLAR_CON_HALLAZGOS=1 → código de salida 1 si hay hallazgos «alto».
import { appendFileSync, writeFileSync } from "node:fs";
import { analizar, informeMarkdown } from "./analisis.mjs";

const env = (k) => { const v = process.env[k]; if (!v) { console.error(`Falta la variable ${k}`); process.exit(2); } return v; };
const base = env("PLATAFORMA_URL").replace(/\/$/, ""), token = env("BOT_TOKEN");
const llamar = async (ruta, opts = {}) => {
  const r = await fetch(base + ruta, { ...opts, headers: { authorization: `Bearer ${token}`, "content-type": "application/json" } });
  if (!r.ok) throw new Error(`${ruta}: ${r.status} ${(await r.text()).slice(0, 200)}`);
  return r.json();
};

const estado = await llamar("/api/bot/estado");
const hallazgos = analizar(estado);
const informe = informeMarkdown(estado, hallazgos);
console.log(informe);
writeFileSync("informe.md", informe + "\n");
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, informe + "\n");
if (!process.argv.includes("--sin-publicar")) {
  await llamar("/api/bot/verificacion", { method: "POST", body: JSON.stringify({ periodo: estado.mes, resumen: { hallazgos: hallazgos.map((x) => x.texto), generado: new Date().toISOString() } }) });
}
if (process.env.FALLAR_CON_HALLAZGOS === "1" && hallazgos.some((x) => x.nivel === "alto")) process.exit(1);
