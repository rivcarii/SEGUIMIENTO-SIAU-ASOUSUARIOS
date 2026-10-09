import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { CATALOGO, aliasDe } from "./sedes.mjs";

export const DATA_DIR = process.env.DATA_DIR ?? join(import.meta.dirname, "data");
export const UPLOADS = join(DATA_DIR, "uploads");
mkdirSync(UPLOADS, { recursive: true });

export const db = new DatabaseSync(join(DATA_DIR, "evidencias.db"));
db.exec(`
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS sedes(id INTEGER PRIMARY KEY, nombre TEXT UNIQUE NOT NULL, activa INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS tecnicos(id INTEGER PRIMARY KEY, nombre TEXT NOT NULL, sede_id INTEGER REFERENCES sedes(id), activo INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS tipos(clave TEXT PRIMARY KEY, area TEXT NOT NULL, nombre TEXT NOT NULL, meta INTEGER, alcance TEXT NOT NULL DEFAULT 'global');
CREATE TABLE IF NOT EXISTS evidencias(
  id INTEGER PRIMARY KEY, area TEXT NOT NULL, tipo TEXT NOT NULL REFERENCES tipos(clave),
  titulo TEXT NOT NULL, descripcion TEXT NOT NULL DEFAULT '', fecha TEXT NOT NULL,
  sede_id INTEGER REFERENCES sedes(id), tecnico_id INTEGER REFERENCES tecnicos(id),
  cantidad INTEGER NOT NULL DEFAULT 1, asistentes INTEGER, creado TEXT NOT NULL DEFAULT (datetime('now')));
CREATE INDEX IF NOT EXISTS ev_fecha ON evidencias(fecha);
CREATE TABLE IF NOT EXISTS fotos(id INTEGER PRIMARY KEY, evidencia_id INTEGER NOT NULL REFERENCES evidencias(id) ON DELETE CASCADE, archivo TEXT NOT NULL, orden INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS ajustes(clave TEXT PRIMARY KEY, valor TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS consolidado_charlas(id INTEGER PRIMARY KEY, fuente TEXT NOT NULL, fecha TEXT NOT NULL, sede_id INTEGER REFERENCES sedes(id), sede_texto TEXT NOT NULL, tema TEXT NOT NULL DEFAULT '', tipo TEXT NOT NULL DEFAULT '', asistentes INTEGER NOT NULL DEFAULT 0, responsable TEXT NOT NULL DEFAULT '');
CREATE INDEX IF NOT EXISTS cc_fecha ON consolidado_charlas(fecha);
CREATE TABLE IF NOT EXISTS consolidado_mensual(id INTEGER PRIMARY KEY, fuente TEXT NOT NULL, tecnico TEXT NOT NULL DEFAULT '', sede_id INTEGER REFERENCES sedes(id), sede_texto TEXT NOT NULL, periodo TEXT NOT NULL, indicador TEXT NOT NULL, valor INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS cm_periodo ON consolidado_mensual(periodo, indicador);
CREATE TABLE IF NOT EXISTS asignaciones(id INTEGER PRIMARY KEY, tecnico_id INTEGER NOT NULL REFERENCES tecnicos(id) ON DELETE CASCADE, sede_id INTEGER NOT NULL REFERENCES sedes(id), desde TEXT NOT NULL, hasta TEXT, origen TEXT NOT NULL DEFAULT 'manual');
CREATE TABLE IF NOT EXISTS ausencias(id INTEGER PRIMARY KEY, tecnico_id INTEGER NOT NULL REFERENCES tecnicos(id) ON DELETE CASCADE, tipo TEXT NOT NULL, desde TEXT NOT NULL, hasta TEXT NOT NULL, nota TEXT NOT NULL DEFAULT '', origen TEXT NOT NULL DEFAULT 'manual');
CREATE TABLE IF NOT EXISTS consolidado_actas(id INTEGER PRIMARY KEY, fuente TEXT NOT NULL, sede_id INTEGER REFERENCES sedes(id), sede_texto TEXT NOT NULL, codigo TEXT NOT NULL, fecha TEXT NOT NULL, estado TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS ca_fecha ON consolidado_actas(fecha);
CREATE TABLE IF NOT EXISTS sincronizaciones(id INTEGER PRIMARY KEY, fuente TEXT NOT NULL, archivo TEXT NOT NULL DEFAULT '', creado TEXT NOT NULL DEFAULT (datetime('now')), resumen TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS verificaciones(id INTEGER PRIMARY KEY, periodo TEXT NOT NULL, creado TEXT NOT NULL DEFAULT (datetime('now')), resumen TEXT NOT NULL);
`);

// Sedes: columnas nuevas (bases creadas antes) y catálogo de las 40 sedes; los alias se fusionan con los que el administrador haya agregado.
for (const col of ["codigo TEXT", "tipo TEXT", "alias TEXT"]) { try { db.exec(`ALTER TABLE sedes ADD COLUMN ${col}`); } catch { /* ya existe */ } }
{
  const ver = db.prepare("SELECT id, alias FROM sedes WHERE nombre=?"), ins = db.prepare("INSERT INTO sedes(nombre,codigo,tipo,alias) VALUES (?,?,?,?)");
  const upd = db.prepare("UPDATE sedes SET codigo=?, tipo=?, alias=? WHERE id=?");
  for (const [nombre, tipo, codigo, largo] of CATALOGO) {
    const nuevos = aliasDe(nombre, largo), fila = ver.get(nombre);
    if (!fila) ins.run(nombre, codigo, tipo, nuevos.length ? JSON.stringify(nuevos) : null);
    else upd.run(codigo, tipo, JSON.stringify([...new Set([...(fila.alias ? JSON.parse(fila.alias) : []), ...nuevos])]), fila.id);
  }
}

// Personal: rol (tecnico | interprete | administrativo) y clave de nombre para cruzar el horario.
for (const col of ["rol TEXT NOT NULL DEFAULT 'tecnico'", "clave TEXT"]) { try { db.exec(`ALTER TABLE tecnicos ADD COLUMN ${col}`); } catch { /* ya existe */ } }

// Tipos iniciales. Las metas se editan desde el administrador.
const TIPOS = [
  ["charla", "siau", "Charlas (consolidado de charlas)", 200, "tecnico"],
  ["acta_buzon", "siau", "Acta de apertura de buzón", null, "global"],
  ["acompanamiento", "siau", "Acompañamiento a usuarios", null, "global"],
  ["encuesta_sg", "siau", "Encuestas de satisfacción (NPS)", 90, "tecnico"],
  ["encuesta_ma", "siau", "Encuesta médico asistencial", null, "global"],
  ["actualizacion_datos", "siau", "Actualización de datos", null, "global"],
  ["ludoteca", "siau", "Actividad de ludoteca", null, "global"],
  ["iami", "siau", "Encuesta IAMI", null, "global"],
  ["control_prenatal", "siau", "Encuesta control prenatal", null, "global"],
  ["cartelera", "asociacion", "Cartelera informativa", null, "global"],
  ["valla", "asociacion", "Valla informativa", null, "global"],
  ["actividad", "asociacion", "Actividad del subcronograma", null, "global"],
];
const ins = db.prepare("INSERT OR IGNORE INTO tipos(clave,area,nombre,meta,alcance) VALUES (?,?,?,?,?)");
for (const t of TIPOS) ins.run(...t);

export const ajuste = (k, d = "") => db.prepare("SELECT valor FROM ajustes WHERE clave=?").get(k)?.valor ?? d;
export const setAjuste = (k, v) => db.prepare("INSERT INTO ajustes(clave,valor) VALUES(?,?) ON CONFLICT(clave) DO UPDATE SET valor=excluded.valor").run(k, v);

// Las metas mínimas (90 encuestas y 200 charlas) se exigen a cada SIAU: se corrige una sola vez en bases anteriores.
if (!ajuste("migr_metas_por_tecnico")) {
  db.exec("UPDATE tipos SET alcance='tecnico' WHERE clave IN ('charla','encuesta_sg') AND meta IS NOT NULL");
  db.exec("UPDATE tipos SET nombre='Charlas (consolidado de charlas)' WHERE clave='charla'");
  db.exec("UPDATE tipos SET nombre='Encuestas de satisfacción (NPS)' WHERE clave='encuesta_sg'");
  setAjuste("migr_metas_por_tecnico", "1");
}
