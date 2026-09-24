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
| `CLOSED_WEEKDAYS` | Días en que el restaurante cierra (por defecto `1` = lunes; si es festivo abre y cierra al día siguiente). Vacío = nunca cierra por regla |
| `PAY_WEEK_START` | Día en que empieza la semana de pago (0 = domingo … 6 = sábado; 1 = lunes) |
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
| `npm run dev:e2e` | Servidor de pruebas en el puerto 3001 contra una BD aparte (ver abajo) |
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
src/lib/closing.ts          reglas de cierre, reparto de propinas y pago del día
src/lib/payroll.ts          resumen de pagos por empleado
src/lib/periods.ts          semana / quincena / mes y navegación entre periodos
src/lib/holidays.ts         festivos de Colombia (Ley 51 de 1983 + Pascua)
src/lib/schedule.ts         regla de días de cierre (lunes; martes tras lunes festivo) y excepciones
src/lib/reports.ts          reportes de ventas, propinas y asistencia
src/lib/csv.ts              armado de CSV para Excel en español
src/components/             selector de periodo y piezas compartidas de reportes
src/app/actions/            Server Actions (auth, empleados, asistencia, días libres, cierre)
src/app/login/              pantalla de login
src/app/(app)/              pantallas autenticadas (layout con navegación)
```

## Probar sin tocar los datos reales

El servidor de pruebas usa otra BD local y otra carpeta de build, así que corre junto a `npm run dev`:

```bash
npx prisma dev --name gestion-simba-test --detach    # una vez; anota el puerto TCP
# crea .env.e2e con DATABASE_URL de esa BD y DATABASE_POOL_MAX=1
DATABASE_URL=<url de pruebas> npx prisma migrate deploy
DATABASE_URL=<url de pruebas> npm run db:seed
npm run dev:e2e                                      # http://localhost:3001
```
