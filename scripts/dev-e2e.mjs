// Servidor de desarrollo contra la BD de pruebas, en el puerto 3001.
// Usa .env.e2e por encima de .env, para probar sin tocar los datos reales.
//   npx prisma dev --name gestion-simba-test --detach   (una vez)
//   npm run dev:e2e
import { spawn } from "node:child_process";
import { config } from "dotenv";

config({ path: ".env.e2e", override: true, quiet: true });
process.env.NEXT_DIST_DIR = ".next-e2e";

const child = spawn("npx", ["next", "dev", "-p", "3001"], { stdio: "inherit", shell: true, env: process.env });
child.on("exit", (code) => process.exit(code ?? 0));
