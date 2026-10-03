import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Builds del servidor de pruebas (npm run dev:e2e / start:e2e) y cliente generado de Prisma
    ".next-e2e/**",
    ".next-e2e-prod/**",
    "src/generated/**",
  ]),
]);

export default eslintConfig;
