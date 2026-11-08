// Copia la página web a www/, que es la carpeta que Capacitor empaca dentro de la app.
// La web publicada en Netlify sigue saliendo de la raíz del repositorio.
import { cpSync, rmSync, mkdirSync, readdirSync } from "node:fs";

const SALIDA = "www";
const ARCHIVOS = /\.(html|css|js|json)$/;
const EXCLUIR = new Set(["package.json", "package-lock.json", "capacitor.config.json"]);

rmSync(SALIDA, { recursive: true, force: true });
mkdirSync(SALIDA);
for (const f of readdirSync(".")) {
  // El panel de administración queda solo en la web
  if (ARCHIVOS.test(f) && !EXCLUIR.has(f) && !f.startsWith("admin.")) cpSync(f, `${SALIDA}/${f}`);
}
cpSync("img", `${SALIDA}/img`, { recursive: true });
console.log("www/ lista:", readdirSync(SALIDA).join(", "));
