# Roadmap — Gestión Simba

Dónde vamos y qué sigue. Los requisitos completos están en [PRD.md](PRD.md).

_Última actualización: 2026-09-26_

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
| F6 · Días de cierre (lunes) y festivos de Colombia | ✅ en producción | `2985038` |
| F7 · Configuración + límite de intentos de login | ✅ en producción | `55aca31` |
| Logo de Simba (favicon, app instalable, encabezado, login) | ✅ en producción | `7aa7ecd` |
| F8 · Pagos realizados + gráfico de ventas | ✅ en producción | `a294a55` + `9596229` |
| F9 · Horario de atención + recordatorio del día de pago | ✅ sin publicar (tiene migración) | `895142e` |
| F10 · Reservas | ✅ sin publicar (tiene migración) | `72b21f4` |
| F11 · WhatsApp de confirmación + reporte de reservas | ✅ sin publicar | `5dc60b9` |
| F12 · Administración en `/gestion` + página pública | ✅ sin publicar (tiene migración) | `951ab6c` + commit «F12: página pública…» |

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
- [x] ~~Publicar F6~~ — publicado.
- [x] ~~Publicar F7 y logo~~ — publicado el 2026-09-24.
- [x] ~~Publicar F8~~ — publicado el 2026-09-24.
- [ ] **Publicar F9–F12:** primero `npx prisma migrate deploy` en Neon (migraciones `horario_y_dia_de_pago`, `reservas` y `whatsapp_restaurante`), después `git push`. Luego llenar el horario en Configuración (se ve en la página pública).
- [ ] Conectar el dominio `simba.profiya.com` en Vercel (ver [DEPLOY.md](DEPLOY.md) §8).
- [ ] Revisar precios del menú en la página: en el PDF Buchanan's dice "270.00" (se puso 270.000) y los granizados/jugos se tomaron todos a 10.000.
- [ ] Enviar el logo en mayor resolución o vector (opcional) para reemplazar los íconos.

---

## F10 · Reservas ✅

- Tabla `Reservation` (fecha `@db.Date` + hora `"HH:MM"`, personas, a nombre de, teléfono, ocasión, persona de la ocasión, observación, estado `CONFIRMED/ARRIVED/NO_SHOW/CANCELLED`). Migración `reservas`.
- Pantallas: `/reservas` (Próximas/Anteriores, búsqueda, agrupadas por día), `/reservas/nueva` (acepta `?fecha=`), `/reservas/[id]` (editar, cancelar, eliminar). Sección "Reservas de hoy" en Hoy. Menú con 6 entradas (barra inferior a 10 px).
- Lógica en `src/lib/reservations.ts` (validación, ocasión "Otra", aviso fuera de horario, totales sin canceladas) y consultas en `src/lib/reservations-data.ts`. `FlashToast` pasó a `src/components`.
- Ideas que quedaron fuera: límite de cupo por hora.

## F12 · Página pública y administración en /gestion ✅

- Administración movida a `src/app/gestion/(app)` (URLs `/gestion/...`), login `/gestion/login`, `/gestion/salir`; redirecciones de las URLs viejas en `next.config.ts`; el proxy solo mira `/gestion`; manifiesto en `/gestion/manifest.webmanifest` (start_url `/gestion`), `/gestion` con `noindex`.
- Página pública `src/app/page.tsx` + `src/app/_landing/` (menú, formulario de reserva). ISR `revalidate = 600`; Configuración y excepciones de apertura la revalidan.
- Menú en `src/lib/menu.ts` (transcrito del PDF; **para cambiar precios se edita ese archivo**). PDF original en `public/menu-simba.pdf`. Fotos sacadas del PDF en `public/landing/` (portada, parrilla, perro, bebidas, imagen para redes).
- Reservas web: `reservationRequestMessage` en `src/lib/public-site.ts`; se abre `wa.me/<WhatsApp del restaurante>`; no se guarda nada.
- `AppSettings.whatsapp` (Configuración). Migración `whatsapp_restaurante`.
- Colores y letras de la carta como tokens de Tailwind (`simba-cream`, `simba-rust`, `simba-forest`, `font-display` = Alfa Slab One, `font-price` = Bree Serif).
- Ideas: editar el menú desde la administración; más fotos (del Instagram, las que el restaurante entregue).

---

## F11 · WhatsApp de confirmación y reporte de reservas ✅

- Botón **WhatsApp** en reservas confirmadas de hoy en adelante: `wa.me/<número>?text=<mensaje>` (`whatsappNumber`, `confirmationMessage`, `whatsappHref` en `src/lib/reservations.ts`). No envía nada solo: abre WhatsApp con el texto escrito. Indicativo por defecto `PHONE_COUNTRY_CODE=57`.
- **Reportes → Reservas** (`src/lib/reservation-report.ts`): totales, % de llegada, por venir, canceladas, sin marcar, tablas por día/hora/ocasión y CSV `?tipo=reservas`.
- `toCsv` antepone `'` a textos que Excel tomaría como fórmula (`=`, `@`, `+x`, `-x`).

---

## F9 · Horario de atención y día de pago ✅

- `AppSettings.openingHours` (8 textos `"HH:MM-HH:MM"`: domingo…sábado + festivos; `""` = sin horario) y `AppSettings.payDay` (por defecto lunes). Migración `horario_y_dia_de_pago`.
- Horario **informativo** (siempre cierran antes de medianoche; el día sigue cambiando a las 00:00). Lógica en `src/lib/hours.ts` (`hoursFor`: festivos > día de la semana; nada si el día está cerrado). Se ve en Hoy y en la barra de Asistencia.
- Configuración: tabla de horario (en celular el día va arriba para que quepa "a. m./p. m."), botón para copiar el primer horario a los días vacíos, validación de cierre > apertura.
- Día de pago: `src/lib/payday.ts` (`payDue`: semana que toca pagar y estado upcoming/today/late). Hoy muestra la tarjeta con lo pendiente de esa semana y "Ir a pagar" → `/pagos?desde…&hasta…`; desaparece cuando se marca pagado.
- Decisión: entregar el dinero es de los dueños; el sistema calcula, recuerda y registra.

---

## F7 · Configuración y seguridad ✅

- `/configuracion`: cuenta (correo/contraseña con contraseña actual), cerrar otras sesiones, ajustes del restaurante (inicio de semana de pago, días de cierre) guardados en `AppSettings`.
- Sesiones con versión (`User.sessionVersion` en la cookie); `verifySession` la compara con la BD y manda a `/gestion/salir` si no coincide. Las cookies anteriores cuentan como versión 0.
- Límite de intentos de login en `LoginThrottle` (`src/lib/throttle.ts`, `src/lib/auth.ts`).
- Arreglado: correos con espacio al final daban "Correo inválido" en el login.

## Logo de Simba ✅

- Original: JPG 150×150 enviado por el usuario → `public/brand/simba-logo.png`. Colores en `src/lib/brand.ts` (verde `#022813`, dorado `#bfa889`).
- Derivados: `src/app/favicon.ico` (16/32/48, PNG RGBA dentro del ICO), `src/app/apple-icon.png` (180), `public/brand/icon-192.png`, `icon-512.png` e `icon-512-maskable.png` (logo al 72 % con margen para Android) usados por `src/app/manifest.ts`.
- El proxy no intercepta `manifest.webmanifest` (el navegador lo pide sin sesión).
- Pendiente opcional: una versión del logo más grande o en vector para que el ícono de 512 px quede nítido.

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
3. Reemplazar `MoneyField` en `src/app/gestion/(app)/asistencia/close-day-panel.tsx` (venta total, propinas y pago del día de cada empleado) y borrar `formatPlain`/`tidy` si quedan sin uso.
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

**Funciones**
- Logo en mayor resolución o vector para que el ícono de 512 px quede nítido (falta el archivo).

**Decisiones del usuario (sin código)**
- Plan de Vercel: Hobby es para uso no comercial; evaluar Pro.
- Respaldos: el plan gratis de Neon guarda poco historial; ¿exportación periódica?
- Identidad de git del proyecto: los commits salen como `lac617a <botlacrita617@gmail.com>` (config global); decidir si se cambia solo para este repo.

**Técnico**
- Pruebas automáticas de pantallas (Playwright) contra `dev:e2e`; hoy solo hay pruebas de lógica (132).

## Notas técnicas conocidas

- La BD local de `prisma dev` (PGlite) no soporta conexiones en paralelo → `DATABASE_POOL_MAX=1` en `.env` y `.env.e2e`.
- Después de cada migración hay que **reiniciar** `npm run dev` (el cliente de Prisma queda en memoria). Migrar también la BD de pruebas: `DATABASE_URL=<url de pruebas> npx prisma migrate deploy`.
- Los enlaces que abren días (`/gestion/asistencia?fecha=…`) llevan `prefetch={false}`: abrir un día lo crea en la BD.
- En desarrollo, al editar el layout la recarga completa a veces vuelve a `/gestion/asistencia`; no pasa en producción.
