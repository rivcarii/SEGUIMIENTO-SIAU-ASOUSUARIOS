// Lector mínimo de .xlsx (zip + XML) sin dependencias. Funciona en el navegador y en Node 18+.
// Devuelve las hojas como cuadrículas de texto, igual que Google Sheets (fechas como DD/MM/AAAA [HH:MM:SS]).
const dec = new TextDecoder();

async function inflar(datos) {
  const ds = new DecompressionStream("deflate-raw"), w = ds.writable.getWriter();
  w.write(datos); w.close();
  return new Uint8Array(await new Response(ds.readable).arrayBuffer());
}

function abrirZip(buf) {
  const u = buf instanceof Uint8Array ? buf : new Uint8Array(buf), v = new DataView(u.buffer, u.byteOffset, u.byteLength);
  let e = u.length - 22;
  while (e >= 0 && v.getUint32(e, true) !== 0x06054b50) e--;
  if (e < 0) throw new Error("El archivo no es un .xlsx válido (¿es un .xls antiguo o un PDF?).");
  const n = v.getUint16(e + 10, true), entradas = new Map();
  for (let i = 0, p = v.getUint32(e + 16, true); i < n; i++) {
    if (v.getUint32(p, true) !== 0x02014b50) throw new Error("Archivo .xlsx dañado.");
    const nl = v.getUint16(p + 28, true), el = v.getUint16(p + 30, true), cl = v.getUint16(p + 32, true);
    entradas.set(dec.decode(u.subarray(p + 46, p + 46 + nl)), { metodo: v.getUint16(p + 10, true), comp: v.getUint32(p + 20, true), off: v.getUint32(p + 42, true) });
    p += 46 + nl + el + cl;
  }
  return async (nombre) => {
    const x = entradas.get(nombre);
    if (!x) return null;
    const ini = x.off + 30 + v.getUint16(x.off + 26, true) + v.getUint16(x.off + 28, true), datos = u.subarray(ini, ini + x.comp);
    return dec.decode(x.metodo === 0 ? datos : await inflar(datos));
  };
}

const entidades = (s) => s.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
const attr = (tag, nombre) => { const m = new RegExp(`\\b${nombre}="([^"]*)"`).exec(tag); return m ? entidades(m[1]) : null; };
const textos = (xml) => [...xml.replace(/<rPh\b[\s\S]*?<\/rPh>/g, "").matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((m) => entidades(m[1])).join("");

const FORMATOS_FECHA = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 45, 46, 47, 50, 51, 52, 53, 54, 55, 56, 57, 58]);
const esFormatoFecha = (codigo) => { const c = codigo.replace(/"[^"]*"|\[[^\]]*\]|\\.|_.|\*./g, ""); return /[dmyhs]/i.test(c) && !/^general$/i.test(c); };

function serialAFecha(x) {
  const d = new Date(Math.round((x - 25569) * 86400e3)), p = (n) => String(n).padStart(2, "0");
  const dia = `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
  return x % 1 ? `${dia} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}` : dia;
}
const colIndice = (letras) => [...letras].reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0) - 1;

/** Abre un .xlsx: devuelve { nombres, hoja(nombre) → cuadrícula }. Solo se procesan las hojas que se piden. */
export async function abrirLibro(buf) {
  const leer = await abrirZip(buf);
  const libroXml = await leer("xl/workbook.xml");
  if (!libroXml) throw new Error("El archivo no parece un libro de Excel (.xlsx).");
  const rels = new Map([...(await leer("xl/_rels/workbook.xml.rels")).matchAll(/<Relationship\b[^>]*>/g)].map((m) => [attr(m[0], "Id"), attr(m[0], "Target")]));
  const hojas = [...libroXml.matchAll(/<sheet\b[^>]*>/g)].map((m) => ({ nombre: attr(m[0], "name"), destino: rels.get(attr(m[0], "r:id")) }));
  const compartidas = [...((await leer("xl/sharedStrings.xml")) ?? "").matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map((m) => textos(m[1]));
  const estilos = (await leer("xl/styles.xml")) ?? "", custom = new Map([...estilos.matchAll(/<numFmt\b[^>]*>/g)].map((m) => [+attr(m[0], "numFmtId"), attr(m[0], "formatCode")]));
  const bloque = /<cellXfs\b[^>]*>([\s\S]*?)<\/cellXfs>/.exec(estilos)?.[1] ?? "";
  const fecha = [...bloque.matchAll(/<xf\b[^>]*>/g)].map((m) => { const id = +attr(m[0], "numFmtId"); return FORMATOS_FECHA.has(id) || (custom.has(id) && esFormatoFecha(custom.get(id))); });

  return {
    nombres: hojas.map((h) => h.nombre),
    async hoja(nombre) {
      const h = hojas.find((x) => x.nombre === nombre);
      if (!h) return null;
      const ruta = h.destino.startsWith("/") ? h.destino.slice(1) : "xl/" + h.destino, xml = await leer(ruta), grid = [];
      for (const c of xml.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const [, columna, fila] = /^([A-Z]+)(\d+)$/.exec(attr(c[1], "r"));
        const cuerpo = c[2] ?? "", t = attr(c[1], "t"), v = /<v>([\s\S]*?)<\/v>/.exec(cuerpo)?.[1];
        let valor = "";
        if (t === "s") valor = compartidas[+v] ?? "";
        else if (t === "inlineStr") valor = textos(cuerpo);
        else if (t === "str") valor = entidades(v ?? "");
        else if (t === "b") valor = v === "1" ? "TRUE" : "FALSE";
        else if (t !== "e" && v != null && v !== "") {
          const x = Number(v);
          valor = Number.isFinite(x) ? (fecha[+(attr(c[1], "s") ?? 0)] && x > 0 && x < 2958466 ? serialAFecha(x) : String(x)) : v;
        }
        if (valor === "") continue;
        const r = +fila - 1;
        (grid[r] ??= [])[colIndice(columna)] = valor;
      }
      return Array.from(grid, (f) => Array.from(f ?? [], (x) => x ?? ""));
    },
  };
}
