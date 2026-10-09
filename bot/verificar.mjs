#!/usr/bin/env node
// Verifica que los consolidados en Drive (actas de buzón, encuestas, charlas) estén completos
// y publica el resultado en la plataforma. Uso: node bot/verificar.mjs [AAAA-MM] [--sin-publicar]
import { Drive } from "./drive.mjs";
import { analizar } from "./analisis.mjs";

const args = process.argv.slice(2);
const env = (k) => { const v = process.env[k]; if (!v) { console.error(`Falta la variable ${k}`); process.exit(2); } return v; };

const base = env("PLATAFORMA_URL").replace(/\/$/, "");
const token = env("BOT_TOKEN");
const mes = args.find((a) => /^\d{4}-\d{2}$/.test(a)) ?? new Date().toISOString().slice(0, 7);
const publicar = !args.includes("--sin-publicar");

const llamar = async (ruta, opts = {}) => {
  const r = await fetch(base + ruta, { ...opts, headers: { authorization: `Bearer ${token}`, "content-type": "application/json" } });
  if (!r.ok) throw new Error(`${ruta}: ${r.status} ${(await r.text()).slice(0, 200)}`);
  return r.json();
};

const ctx = await llamar("/api/bot/contexto");
const drive = new Drive(JSON.parse(env("GOOGLE_SERVICE_ACCOUNT_JSON")));
const carpetas = {};
for (const [k, v] of [["actas", "DRIVE_CARPETA_ACTAS"], ["encuestas", "DRIVE_CARPETA_ENCUESTAS"], ["charlas", "DRIVE_CARPETA_CHARLAS"]]) carpetas[k] = await drive.listar(env(v));
const meta = (clave) => ctx.tipos.find((t) => t.clave === clave)?.meta ?? null;

const reporte = analizar({ mes, sedes: ctx.sedes, carpetas, metas: { encuestas: meta("encuesta_sg"), charlas: meta("charla") } });
console.log(`Verificación ${mes}: ${reporte.hallazgos.length} hallazgo(s)`);
for (const h of reporte.hallazgos) console.log(" -", h);

if (publicar) await llamar("/api/bot/verificacion", { method: "POST", body: JSON.stringify({ periodo: mes, resumen: reporte }) });
if (reporte.hallazgos.length && process.env.FALLAR_CON_HALLAZGOS === "1") process.exit(1);
