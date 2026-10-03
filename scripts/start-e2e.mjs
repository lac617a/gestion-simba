// Servidor de PRODUCCIÓN (next build + next start) contra la BD de pruebas, en el puerto 3002.
// Para probar lo que solo pasa en producción: la precarga de pantallas y las pantallas de carga.
//   npm run start:e2e
import { execSync, spawn } from "node:child_process";
import { config } from "dotenv";

config({ path: ".env.e2e", override: true, quiet: true });
process.env.NEXT_DIST_DIR = ".next-e2e-prod";

execSync("npx next build", { stdio: "inherit", env: process.env });
const child = spawn("npx", ["next", "start", "-p", "3002"], { stdio: "inherit", shell: true, env: process.env });
child.on("exit", (code) => process.exit(code ?? 0));
