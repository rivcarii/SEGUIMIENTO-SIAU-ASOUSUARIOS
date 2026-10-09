import { createSign } from "node:crypto";

/** Cliente mínimo de Drive (solo lectura) con cuenta de servicio, sin dependencias. */
export class Drive {
  constructor(credenciales) { this.cred = credenciales; this.token = null; }

  async autenticar() {
    const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
    const ahora = Math.floor(Date.now() / 1000);
    const cuerpo = `${b64({ alg: "RS256", typ: "JWT" })}.${b64({ iss: this.cred.client_email, scope: "https://www.googleapis.com/auth/drive.readonly", aud: "https://oauth2.googleapis.com/token", iat: ahora, exp: ahora + 3600 })}`;
    const firma = createSign("RSA-SHA256").update(cuerpo).sign(this.cred.private_key, "base64url");
    const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${cuerpo}.${firma}` }) });
    if (!r.ok) throw new Error(`Autenticación con Drive falló (${r.status})`);
    this.token = (await r.json()).access_token;
  }

  /** Lista recursivamente una carpeta. Devuelve [{ruta, modificado}] con ruta relativa a la carpeta. */
  async listar(carpetaId, prefijo = "", profundidad = 0) {
    if (!this.token) await this.autenticar();
    if (profundidad > 6) return [];
    const out = [];
    let pagina;
    do {
      const u = new URL("https://www.googleapis.com/drive/v3/files");
      u.search = new URLSearchParams({ q: `'${carpetaId}' in parents and trashed=false`, fields: "nextPageToken,files(id,name,mimeType,modifiedTime)", pageSize: "1000", supportsAllDrives: "true", includeItemsFromAllDrives: "true", ...(pagina && { pageToken: pagina }) });
      const r = await fetch(u, { headers: { authorization: `Bearer ${this.token}` } });
      if (!r.ok) throw new Error(`Drive devolvió ${r.status} al listar la carpeta ${carpetaId} (¿está compartida con la cuenta de servicio?)`);
      const j = await r.json();
      for (const f of j.files) {
        const ruta = prefijo ? `${prefijo}/${f.name}` : f.name;
        if (f.mimeType === "application/vnd.google-apps.folder") out.push(...(await this.listar(f.id, ruta, profundidad + 1)));
        else out.push({ ruta, modificado: f.modifiedTime });
      }
      pagina = j.nextPageToken;
    } while (pagina);
    return out;
  }
}
