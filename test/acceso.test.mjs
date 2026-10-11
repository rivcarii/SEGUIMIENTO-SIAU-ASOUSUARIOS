import { test } from "node:test";
import assert from "node:assert/strict";
import { nuevoNucleo, falla } from "./ayuda.mjs";

const entrar = (n, usuario, clave) => n.nucleo.manejar({ metodo: "POST", ruta: "/api/login", cuerpo: { usuario, clave } }, { email: "", rol: null });

test("usuarios: el administrador crea una persona, recibe la contraseña una sola vez y la lista no la expone", () => {
  const n = nuevoNucleo();
  const r = n.api("POST", "/api/admin/usuarios", { cuerpo: { nombre: "Ana María Pérez", rol: "visor" } });
  assert.equal(r.usuario, "ana.maria");
  assert.match(r.clave, /^[a-km-np-z2-9]{14}$/); // sin caracteres que se confunden (l, o, i, 0, 1)
  const lista = n.api("GET", "/api/admin/usuarios");
  assert.deepEqual(Object.keys(lista[0]).sort(), ["activo", "creado", "id", "nombre", "rol", "usuario"]);
  assert.ok(!JSON.stringify(n.almacen.tabla("usuarios").todos()).includes(r.clave)); // en la base solo queda la huella
  assert.equal(n.api("POST", "/api/admin/usuarios", { cuerpo: { nombre: "Ana María Pérez" } }).usuario, "ana.maria2"); // no repite
  return Promise.all([
    falla(() => n.api("POST", "/api/admin/usuarios", { rol: "visor", cuerpo: { nombre: "X Y" } }), 403),
    falla(() => n.api("POST", "/api/admin/usuarios", { cuerpo: { nombre: "X Y", usuario: "ana.maria" } }), 400),
    falla(() => n.api("POST", "/api/admin/usuarios", { cuerpo: { nombre: "X Y", rol: "dios" } }), 400),
  ]);
});

test("login: entra con la contraseña correcta, el token abre la sesión y cerrar la invalida", () => {
  const n = nuevoNucleo();
  const { usuario, clave } = n.api("POST", "/api/admin/usuarios", { cuerpo: { nombre: "Luis Prueba", rol: "visor" } });
  const s = entrar(n, usuario.toUpperCase() + " ", clave);
  assert.equal(s.rol, "visor");
  const u = n.nucleo.identificar(s.token);
  assert.deepEqual([u.rol, u.via, u.nombre], ["visor", "clave", "Luis Prueba"]);
  assert.equal(n.nucleo.manejar({ metodo: "GET", ruta: "/api/config" }, u).sedes.length, 40); // el visor consulta
  assert.throws(() => n.nucleo.manejar({ metodo: "POST", ruta: "/api/admin/tecnicos", cuerpo: { nombre: "X" } }, u), /administradores/); // pero no administra
  n.nucleo.manejar({ metodo: "POST", ruta: "/api/logout", token: s.token }, u);
  assert.equal(n.nucleo.identificar(s.token), null);
  assert.equal(n.nucleo.identificar("x".repeat(30)), null);
  assert.equal(n.nucleo.identificar(undefined), null);
});

test("login: errores genéricos (no revela si el usuario existe), bloqueo tras 5 intentos y desbloqueo a los 15 minutos", async () => {
  const n = nuevoNucleo();
  const { usuario, clave } = n.api("POST", "/api/admin/usuarios", { cuerpo: { nombre: "Luis Prueba" } });
  const a = await falla(() => entrar(n, "no.existe", "cualquier-cosa-123"), 401), b = await falla(() => entrar(n, usuario, "clave-equivocada"), 401);
  assert.equal(a.message, b.message);
  for (let i = 0; i < 4; i++) await falla(() => entrar(n, usuario, "otra-mala"), 401);
  await falla(() => entrar(n, usuario, clave), 429); // 5 fallos: queda bloqueado aunque ahora acierte
  n.reloj.t += 16 * 60 * 1000;
  assert.equal(entrar(n, usuario, clave).usuario, usuario);
  await falla(() => entrar(n, "", ""), 401);
});

test("sesiones: vencen a las 6 h y dejan de valer si la persona se desactiva o se reinicia su contraseña", async () => {
  const n = nuevoNucleo();
  const c = n.api("POST", "/api/admin/usuarios", { cuerpo: { nombre: "Luis Prueba" } });
  const s1 = entrar(n, c.usuario, c.clave);
  n.reloj.t += 6 * 3600 * 1000 + 1000;
  assert.equal(n.nucleo.identificar(s1.token), null);
  const s2 = entrar(n, c.usuario, c.clave);
  n.api("PUT", "/api/admin/usuarios/" + c.id, { cuerpo: { activo: false } });
  assert.equal(n.nucleo.identificar(s2.token), null);
  await falla(() => entrar(n, c.usuario, c.clave), 401);
  n.api("PUT", "/api/admin/usuarios/" + c.id, { cuerpo: { activo: true } });
  const nueva = n.api("PUT", "/api/admin/usuarios/" + c.id, { cuerpo: { reiniciar: true } }).clave;
  await falla(() => entrar(n, c.usuario, c.clave), 401); // la anterior ya no sirve
  assert.ok(entrar(n, c.usuario, nueva).token);
});

test("sin sesión: las rutas piden iniciar sesión (401), distinto de no tener permiso (403)", async () => {
  const n = nuevoNucleo();
  await falla(() => n.api("GET", "/api/config", { rol: "anonimo" }), 401);
  await falla(() => n.api("GET", "/api/panel", { rol: "anonimo" }), 401);
  await falla(() => n.api("GET", "/api/admin/usuarios", { rol: "anonimo" }), 401);
  await falla(() => n.api("GET", "/api/config", { rol: "nadie" }), 403);
  assert.deepEqual(n.api("GET", "/api/sesion", { rol: "anonimo" }), { rol: null, email: "", nombre: "", via: null, clave_disponible: true });
});

test("cambiar la propia contraseña: exige la actual, mínimo 10 caracteres, y no se puede dejar sin administradores a sí mismo", async () => {
  const n = nuevoNucleo();
  const c = n.api("POST", "/api/admin/usuarios", { cuerpo: { nombre: "Ana Admin", rol: "admin" } });
  const yo = n.nucleo.identificar(entrar(n, c.usuario, c.clave).token);
  const cambiar = (cuerpo) => n.nucleo.manejar({ metodo: "POST", ruta: "/api/clave", cuerpo }, yo);
  await falla(() => cambiar({ actual: "mala", nueva: "una-clave-larga-1" }), 401);
  await falla(() => cambiar({ actual: c.clave, nueva: "corta" }), 400);
  cambiar({ actual: c.clave, nueva: "una-clave-larga-1" });
  await falla(() => entrar(n, c.usuario, c.clave), 401);
  assert.ok(entrar(n, c.usuario, "una-clave-larga-1").token);
  const admin = (m, r, cuerpo) => n.nucleo.manejar({ metodo: m, ruta: r, cuerpo }, yo);
  await falla(() => admin("PUT", "/api/admin/usuarios/" + c.id, { activo: false }), 400);
  await falla(() => admin("PUT", "/api/admin/usuarios/" + c.id, { rol: "visor" }), 400);
  await falla(() => admin("DELETE", "/api/admin/usuarios/" + c.id), 400);
  // alguien que entra con Google no tiene contraseña que cambiar
  await falla(() => n.api("POST", "/api/clave", { rol: "admin", cuerpo: { actual: "x", nueva: "una-clave-larga-1" } }), 400);
});
