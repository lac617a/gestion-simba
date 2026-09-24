# Roadmap — Gestión Simba

Dónde vamos y qué sigue. Los requisitos completos están en [PRD.md](PRD.md).

_Última actualización: 2026-09-24_

## Estado

| Fase | Estado | Commit |
|---|---|---|
| F1 · Setup, login del admin, CRUD de empleados | ✅ | `c8177ac` |
| F2 · Asistencia diaria, descanso fijo, días libres | ✅ | `c8177ac` |
| F3 · Cierre del día, propinas y reparto | ✅ | `c8177ac` |
| F3b · Pago diario por empleado + pantalla Pagos (semana, CSV) | ✅ | `44ab4c4` |
| F4 · Pantalla "Hoy", reportes y CSV, barra inferior en celular | ✅ | `6484c51` |
| T1 · Inputs de moneda con librería | ✅ | `e328c56` |
| F5 · Deploy (Vercel + Neon) | ✅ en producción | `b5b7311` |
| F6 · Días de cierre (lunes) y festivos de Colombia | ✅ código · ⏳ **publicar** (ver abajo) | "F6: días de cierre…" |

Regla de trabajo: **un commit por feature** en `main`, y las pruebas en navegador se hacen con `npm run dev:e2e` (BD aparte), nunca sobre los datos reales.

**Producción:** cada `git push` a `main` publica en Vercel. Si hay migraciones nuevas, aplicarlas **antes** en Neon con la URL directa (ver [DEPLOY.md](DEPLOY.md) §6).

## Cómo retomar

```bash
npx prisma dev start gestion-simba          # BD local de desarrollo (puerto 51218)
npx prisma dev start gestion-simba-test     # BD de pruebas (puerto 51221)
npm run dev                                 # app real → http://localhost:3000
npm run dev:e2e                             # app de pruebas → http://localhost:3001
npm test                                    # pruebas unitarias
```

## Pendientes de datos (los hace el usuario)

- [x] ~~Día 23/09 descuadrado~~ — corregido por el usuario el 2026-09-24 (reabrir → cerrar).
- [ ] **Publicar F6**: aplicar la migración `dias_de_cierre` en Neon y luego `git push` (pasos en la respuesta del 2026-09-24 y en DEPLOY.md §6).

---

## F6 · Días de cierre y festivos ✅

- Regla: cierra los lunes (`CLOSED_WEEKDAYS`, por defecto `1`); lunes festivo abre y cierra el martes. Festivos de Colombia calculados en `src/lib/holidays.ts`.
- Días de cierre: sin asistencia ni cierre; no cuentan como "sin cerrar" en Pagos/Reportes.
- Lunes festivo: el descanso fijo de lunes no aplica (Pendiente).
- Excepciones manuales (tabla `DayOverride`) desde Asistencia: "Abrir este día igual" / "Marcar como día cerrado" / "Quitar excepción".
- Días que ya tenían registro antes de la regla se conservan con un aviso.
- Hoy: estado "restaurante cerrado" y próximo festivo.

---

## T1 · Inputs de moneda con librería ✅

**Por qué:** los campos de dinero eran `<input>` de texto con formato hecho a mano (`formatPlain` + `tidy` al salir del campo): el formato de miles solo aparecía al salir del campo, el cursor no se manejaba bien al editar en medio del número y cada campo repetía lógica.

**Resultado:** `src/components/money-input.tsx` (`MoneyInput`), usado en venta, propinas y pago del día. El estado del cierre ahora guarda montos en unidades mínimas (números), no texto. No se usó `fixedDecimalScale` (irrelevante en COP).

**Librería elegida:** [`react-number-format`](https://www.npmjs.com/package/react-number-format) (v5, compatible con React 19), componente `NumericFormat`.
Alternativa considerada: `react-currency-input-field` (también válida; se descartó por ser menos usada).

**Qué hacer:**

1. `npm i react-number-format`
2. Crear `src/components/money-input.tsx` (componente cliente reutilizable):
   - `NumericFormat` con `customInput={Input}` (el `Input` de shadcn, para mantener el estilo).
   - `thousandSeparator="."`, `decimalSeparator=","`, `decimalScale={currency.decimals}` (0 en COP), `fixedDecimalScale`, `allowNegative={false}`, `inputMode` numérico/decimal según la moneda.
   - Mantener el `$` como adorno a la izquierda (como ahora) en vez de `prefix`, para que el valor enviado no lleve símbolo.
   - Exponer `onValueChange` → valor en **unidades mínimas** (entero) para las vistas previas en vivo.
   - Seguir enviando el texto formateado en el `name` del input: el servidor lo valida con `parseMoney` (que ya acepta `1.250.000`). **La validación del servidor no cambia.**
3. Reemplazar `MoneyField` en `src/app/(app)/asistencia/close-day-panel.tsx` (venta total, propinas y pago del día de cada empleado) y borrar `formatPlain`/`tidy` si quedan sin uso.
4. Mantener el comportamiento actual de errores: la `key` del formulario remonta los campos con lo enviado cuando la acción devuelve error.

**Listo cuando:**
- [x] Al escribir `1250000` se ve `1.250.000` mientras se escribe, sin saltos del cursor (probado también editando en medio del número y con Backspace).
- [x] No se pueden escribir letras, negativos ni decimales en COP.
- [x] La vista previa del reparto y los totales por empleado se actualizan en vivo.
- [x] Cerrar/reabrir día sigue funcionando y los montos se guardan igual (probado en `dev:e2e`).
- [x] `npm test`, `npx tsc --noEmit`, `npm run lint` y `npm run build` en verde.
- [x] Commit: `T1: inputs de moneda con react-number-format`.

---

## F4 · Pantalla "Hoy", reportes y CSV ✅

Hecho (PRD RF-5 y RF-6):

- **Hoy** (`/`): estado del día con la acción siguiente (marcar asistencia → cerrar el día → ver cierre), quién trabaja / pendientes / descansa / faltó, y la semana (venta acumulada y total por pagar).
- **Reportes** (`/reportes`): ventas (total, promedio por día cerrado, mejor día, tabla por día), propinas por empleado y asistencia por empleado; CSV de cada uno en `/reportes/csv?tipo=ventas|propinas|asistencia`.
- Selector de periodo compartido (`src/components/period-nav.tsx`) con atajos **Semana / Quincena / Mes**; las flechas saltan de mes en mes o de quincena en quincena. Lo usan Pagos y Reportes.
- Navegación: barra inferior con íconos en celular; barra superior en pantallas grandes.
- Código: lógica pura en `src/lib/periods.ts`, `src/lib/reports.ts`, `src/lib/csv.ts` (con pruebas); consultas en `src/lib/reports-data.ts`.

Ideas que quedaron fuera: gráfico de ventas por día en Reportes.

## F5 · Deploy ✅

Guía paso a paso: **[DEPLOY.md](DEPLOY.md)** (GitHub → Neon → Vercel). Resumen:

- BD en Neon (o Supabase); `DATABASE_URL` de producción, **sin** `DATABASE_POOL_MAX`.
- Vercel: variables `SESSION_SECRET` (nuevo), `APP_TIMEZONE`, `DAY_CUTOFF_HOUR`, `APP_CURRENCY`, `PAY_WEEK_START`.
- `npx prisma migrate deploy` y seed del admin con una **contraseña fuerte**.
- Probar login, cierre de un día y CSV en producción.

## Backlog / ideas

- Pantalla **Configuración** (PRD §8): inicio de semana de pago, cambio de contraseña (hoy se hace por `.env`).
- Marcar una semana como **pagada** en `/pagos`.
- Identidad de git del proyecto: los commits salen como `lac617a <botlacrita617@gmail.com>` (config global); decidir si se cambia solo para este repo.

## Notas técnicas conocidas

- La BD local de `prisma dev` (PGlite) no soporta conexiones en paralelo → `DATABASE_POOL_MAX=1` en `.env` y `.env.e2e`.
- Después de cada migración hay que **reiniciar** `npm run dev` (el cliente de Prisma queda en memoria). Migrar también la BD de pruebas: `DATABASE_URL=<url de pruebas> npx prisma migrate deploy`.
- Los enlaces que abren días (`/asistencia?fecha=…`) llevan `prefetch={false}`: abrir un día lo crea en la BD.
- En desarrollo, al editar el layout la recarga completa a veces vuelve a `/asistencia`; no pasa en producción.
