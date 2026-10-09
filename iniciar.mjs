// Arranque amigable: comprueba la versión de Node antes de cargar la plataforma (que necesita Node 22.13 o superior).
const [mayor, menor] = process.versions.node.split(".").map(Number);
if (mayor < 22 || (mayor === 22 && menor < 13)) {
  console.error(`\nSu Node.js es la versión ${process.versions.node}; esta plataforma necesita la 22.13 o una más nueva.\nDescargue la versión «LTS» desde https://nodejs.org, instálela y vuelva a abrir este programa.\n`);
  process.exit(1);
}
await import("./server.mjs");
