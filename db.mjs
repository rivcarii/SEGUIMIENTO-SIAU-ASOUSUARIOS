import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

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
CREATE TABLE IF NOT EXISTS verificaciones(id INTEGER PRIMARY KEY, periodo TEXT NOT NULL, creado TEXT NOT NULL DEFAULT (datetime('now')), resumen TEXT NOT NULL);
`);

// Tipos iniciales. Las metas se editan desde el administrador.
const TIPOS = [
  ["charla", "siau", "Charla educativa", 200, "global"],
  ["acta_buzon", "siau", "Acta de apertura de buzón", null, "global"],
  ["acompanamiento", "siau", "Acompañamiento a usuarios", null, "global"],
  ["encuesta_sg", "siau", "Encuesta satisfacción general y pregunta trazadora", 90, "global"],
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
