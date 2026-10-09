// Empaqueta nucleo/*.mjs + google/Capa.gs + las dos páginas en UN solo archivo: dist/Codigo.gs (se pega en Apps Script).
// Cada módulo va en su propia función para que los nombres internos no choquen entre sí.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const leer = (r) => readFileSync(join(RAIZ, r), "utf8");
const MODULOS = ["sedes", "lib", "consolidados", "analisis", "api"]; // en orden de dependencia (almacen.mjs es solo para pruebas)

export function construir() {
  const partes = [`// ARCHIVO GENERADO por google/construir.mjs — no lo edite aquí: edite nucleo/ o google/Capa.gs y vuelva a construir.\n`];
  for (const m of MODULOS) {
    let src = leer(`nucleo/${m}.mjs`);
    const exportados = [];
    src = src.replace(/^import\s*\{([^}]*)\}\s*from\s*"\.\/(\w+)\.mjs";?[ \t]*$/gm, (_, nombres, mod) => `const {${nombres}} = M_${mod};`);
    src = src.replace(/^export\s+((?:async\s+)?(?:const|let|function\*?|class))\s+(\w+)/gm, (_, kw, nombre) => { exportados.push(nombre); return `${kw} ${nombre}`; });
    if (/^\s*(import|export)\b/m.test(src)) throw new Error(`nucleo/${m}.mjs usa una forma de import/export que el empaquetador no entiende`);
    partes.push(`const M_${m} = (() => {\n${src}\nreturn { ${exportados.join(", ")} };\n})();\n`);
  }
  partes.push(`const { ErrorHttp, crearNucleo, inicializar } = M_api;\n`);
  partes.push(`const PLANTILLA_VISOR = ${JSON.stringify(leer("web/visor/index.html"))};\nconst PLANTILLA_ADMIN = ${JSON.stringify(leer("web/admin/index.html"))};\n`);
  partes.push(leer("google/Capa.gs"));
  return partes.join("\n");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  mkdirSync(join(RAIZ, "dist"), { recursive: true });
  const codigo = construir();
  writeFileSync(join(RAIZ, "dist/Codigo.gs"), codigo);
  console.log(`dist/Codigo.gs generado (${(codigo.length / 1024).toFixed(0)} KB)`);
}
