# Gestión Simba

Empleados, asistencia diaria, ventas y propinas del restaurante. Requisitos en [PRD.md](PRD.md).

## Stack

Next.js 16 (App Router, Server Actions) · TypeScript · Prisma 7 + PostgreSQL · Tailwind 4 + shadcn/ui · Zod · jose (sesión) · Vitest

## Primer arranque

```bash
npm install
cp .env.example .env            # y rellena los valores
npx prisma dev --name gestion-simba --detach   # Postgres local (o usa una URL de Neon en .env)
npm run db:migrate
npm run db:seed                 # crea el admin con ADMIN_EMAIL / ADMIN_PASSWORD
npm run dev
```

Abre http://localhost:3000 y entra con el admin.

> Después de `npm run db:migrate` reinicia `npm run dev`: el servidor guarda en memoria el cliente de Prisma anterior.

## Configuración (.env)

| Variable | Uso |
|---|---|
| `DATABASE_URL` | Conexión a PostgreSQL |
| `SESSION_SECRET` | Firma de la cookie de sesión |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Admin que crea el seed |
| `APP_TIMEZONE` | Zona del restaurante (define qué día es "hoy"). Por defecto `America/Bogota` |
| `DAY_CUTOFF_HOUR` | Hora en que termina el día de trabajo (0 = medianoche) |
| `APP_CURRENCY` | Moneda (`COP` = pesos enteros; `USD`/`PEN` con centavos) |
| `DATABASE_POOL_MAX` | Pon `1` con la BD local de `prisma dev`, que no soporta conexiones en paralelo. Vacío en producción |

## Scripts

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run db:start` | Vuelve a levantar la BD local después de reiniciar la PC |
| `npm run db:migrate` | Aplica cambios del esquema (`prisma/schema.prisma`) |
| `npm run db:seed` | Crea el usuario admin |
| `npm run db:studio` | Explorador visual de la BD |
| `npm test` | Pruebas unitarias |
| `npm run lint` / `npm run build` | Lint y build de producción |

## Estructura

```
prisma/schema.prisma        modelos
src/proxy.ts                redirección optimista a /login
src/lib/session.ts          cookie de sesión firmada (JWT)
src/lib/dal.ts              verifySession(): usar en cada página y Server Action
src/lib/employees.ts        validación y helpers de empleados
src/lib/dates.ts            fechas de calendario (YYYY-MM-DD) y "hoy" según zona horaria
src/lib/attendance.ts       estados de asistencia, estado inicial del día, validación de días libres
src/lib/workdays.ts         abrir un día y armar la vista de asistencia
src/lib/money.ts            montos en unidades enteras, parseo y formato (COP)
src/lib/closing.ts          reglas de cierre y reparto de propinas
src/app/actions/            Server Actions (auth, empleados, asistencia, días libres, cierre)
src/app/login/              pantalla de login
src/app/(app)/              pantallas autenticadas (layout con navegación)
```
