# Roadmap — Gestión Simba

Dónde vamos y qué sigue. Los requisitos completos están en [PRD.md](PRD.md).

_Última actualización: 2026-10-03_

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
| F6 · Cierres puntuales (sin días de cierre ni festivos desde 2026-09-28) | ✅ en producción | `2985038` |
| F7 · Configuración + límite de intentos de login | ✅ en producción | `55aca31` |
| Logo de Simba (favicon, app instalable, encabezado, login) | ✅ en producción | `7aa7ecd` |
| F8 · Pagos realizados + gráfico de ventas | ✅ en producción | `a294a55` + `9596229` |
| F9 · Horario de atención + recordatorio del día de pago | ✅ en producción | `895142e` |
| F10 · Reservas | ✅ en producción | `72b21f4` |
| F11 · WhatsApp de confirmación + reporte de reservas | ✅ en producción | `5dc60b9` |
| F12 · Administración en `/gestion` + página pública | ✅ en producción | `951ab6c` + commit «F12: página pública…» |
| F13 · Reseñas en la página pública | ✅ en producción | commit «F13: reseñas…» |
| F14 · Puestos con pago diario fijo (configurables) | ✅ en producción | `eeed426` |
| Se quitan los festivos | ✅ en producción | `f0f553c` |
| F15 · Doble turno (propinas por turno) | ✅ en producción | `1f78a19` |
| F16 · Producción + menú "Más" | ✅ en producción | commits «F16: producción…» y «Navegación: menú Más…» |
| Pago del día automático (sin campos en el cierre) | ✅ en producción | `e10afe3` |
| F17 · Gastos del día en el cierre | ✅ en producción | `38292d1` |
| F18 · Usuarios con rol (administrador / solo reservas) | ✅ en producción | `daa4c47` |
| Reservas: fecha y hora con botones, sin horas pasadas (admin y página pública) | ✅ en producción | `c749c7a` + `3483c1a` |
| F19 · Recordatorio de reservas por correo (Resend) | ✅ en producción | `695221a` |
| F20 · Reservas en Google Calendar (invitaciones) | ✅ en producción | `d93eb35` |
| F21 · Reservas: historial, búsqueda y filtros; historial de cambios | ✅ en producción | `09e8159` |
| F22 · Asistencia rápida en chips + "Quién está hoy" en chips | ✅ en producción | `e0556d3` + `30345e2` (flecha del chip centrada) |
| T2 · Parámetros de la dirección con nuqs | ✅ en producción | `4f90f50` |
| F23 · Historial de cambios de producción | ✅ en producción | `fb7374b` |
| F24 · Pantallas de carga, de error y "no encontrado" | ✅ en producción | `ce06f0d` |
| F25 · Ficha del empleado con su historial | ✅ en producción | `82321f1` |
| F26 · Lista de empleados por puesto, con hoy y el mes | ✅ en producción | `d26e3bb` |
| F27 · Ficha del empleado por semana de pago | ✅ en producción | `a71311f` |
| Lista de empleados: semana pasada y esta semana (en vez del mes) | ✅ sin publicar | commit «Empleados: días de la semana de pago en la lista» |

Regla de trabajo: **un commit por feature** en `main`, y las pruebas en navegador se hacen con `npm run dev:e2e` (BD aparte), nunca sobre los datos reales.

**Producción:** cada `git push` a `main` publica en Vercel. Si hay migraciones nuevas, aplicarlas **antes** en Neon con la URL directa (ver [DEPLOY.md](DEPLOY.md) §6).

## Cómo retomar

```bash
npx prisma dev start gestion-simba          # BD local de desarrollo (puerto 51218)
npx prisma dev start gestion-simba-test     # BD de pruebas (puerto 51221)
npm run dev                                 # app real → http://localhost:3000
npm run dev:e2e                             # app de pruebas → http://localhost:3001
npm run start:e2e                           # app de pruebas en modo producción (build + start) → http://localhost:3002
npm test                                    # pruebas unitarias
```

## Pendientes de datos (los hace el usuario)

- [x] ~~Día 23/09 descuadrado~~ — corregido por el usuario el 2026-09-24 (reabrir → cerrar).
- [x] ~~Publicar F6~~ — publicado.
- [x] ~~Publicar F7 y logo~~ — publicado el 2026-09-24.
- [x] ~~Publicar F8~~ — publicado el 2026-09-24.
- [x] ~~Publicar F9–F13~~ — publicado el 2026-09-26.
- [ ] Llenar el horario en Configuración (se ve en la página pública).
- [ ] Conectar el dominio `simba.profiya.com` en Vercel (ver [DEPLOY.md](DEPLOY.md) §8).
- [ ] Revisar precios del menú en la página: en el PDF Buchanan's dice "270.00" (se puso 270.000) y los granizados/jugos se tomaron todos a 10.000.
- [ ] Enviar el logo en mayor resolución o vector (opcional) para reemplazar los íconos.

---

## F10 · Reservas ✅

- Tabla `Reservation` (fecha `@db.Date` + hora `"HH:MM"`, personas, a nombre de, teléfono, ocasión, persona de la ocasión, observación, estado `CONFIRMED/ARRIVED/NO_SHOW/CANCELLED`). Migración `reservas`.
- Pantallas: `/reservas` (Próximas/Anteriores, búsqueda, agrupadas por día), `/reservas/nueva` (acepta `?fecha=`), `/reservas/[id]` (editar, cancelar, eliminar). Sección "Reservas de hoy" en Hoy. Menú con 6 entradas (barra inferior a 10 px).
- Lógica en `src/lib/reservations.ts` (validación, ocasión "Otra", aviso fuera de horario, totales sin canceladas) y consultas en `src/lib/reservations-data.ts`. `FlashToast` pasó a `src/components`.
- Ideas que quedaron fuera: límite de cupo por hora.

## Lista de empleados por semana de pago (2026-10-05) ✅

- El usuario vio "Octubre: 4 días" en una empleada que trabajó del lunes 28 de septiembre al domingo 4 de octubre: el mes partía la semana. Cada fila ahora dice "Semana pasada: 7 días · Esta semana: 0 días" (faltas en rojo), con las fechas de las dos semanas arriba de la lista.
- `weekCounts` en employee-list.ts (con prueba); `getEmployeeList` usa `weekRange(today, payWeekStart)` y la anterior. Se quitaron las utilidades de mes que ya nadie usaba (`monthOf`, `monthPeriod`, `formatMonthName`, `ISOMonth`).

## F27 · Ficha del empleado por semana de pago (2026-10-03) ✅

- Pedido del usuario al ver la ficha de octubre: el mes calendario dejaba la primera fila con lunes a miércoles vacíos (eran de septiembre) y lo ganado / por pagar solo contaba del 1 al 3 de octubre, cuando el pago es por semana (lunes a domingo). El control tiene que ser por semana.
- Historial ahora es por semana de pago (`weekRange` con `payWeekStart`; `?semana=<un día de la semana>`, se quitó `?mes=`): estado del pago (`payDateOf` con `payDay`: "Se paga el…", "Pagada el…", "Por pagar desde el…"), ganado / pagado / por pagar de la semana, conteos en una fila, **los 7 días** (estado, turno, producción, "Sin cerrar", lo previsto, con pago + propina + producción por día), pagos de la semana y **últimas 8 semanas** (días, faltas, ganado, Pagada / Falta $X / Se paga el…).
- `employee-history.ts`: `employeeDays(period)` (antes `employeeCalendar` del mes), `dayCounts`, `moneyByDate`, `recentWeeks` y `weekSummaries` (con `summarizePayroll` + `applyPayments`, igual que Pagos). `employee-history-data.ts`: `getEmployeeWeek` y `getEmployeeWeeks`. `getPayData` sale de `getPayroll` (los datos sin agrupar). Se quitaron las utilidades de mes que ya no se usan (`isISOMonth`, `addMonths`, `formatMonth`, `parseAsMonth`).

## F26 · Lista de empleados por puesto (2026-10-03) ✅

- Elegido de la propuesta: 1 (chips por puesto con conteos y lista agrupada), 2 (cómo está hoy), 3 (días y faltas del mes) y 6 (dados de baja plegados al final). Quedaron fuera: WhatsApp en la fila, iniciales con color del puesto y tabla en computador.
- `src/lib/employee-list.ts` (puro, con pruebas): `todayStatus` (lo marcado hoy; si el día no se ha abierto, lo previsto con `initialStatus`; "hasta el…" del día libre asignado; día cerrado; ingreso futuro), `todayLabel`, `positionSlug` y `groupByPosition` (el mismo orden que Asistencia).
- `src/lib/employee-list-data.ts`: `getEmployeeList()` trae a todos con su estado de hoy (asistencia del día, días libres, `DayOverride`) y los días trabajados y faltas del mes (`attendance.groupBy`). La búsqueda (con `searchKey`, sin tildes) y el puesto se filtran en la página.
- Dirección: `?puesto=jefe-de-mesa` (slug del nombre) y `?q=`; se quitó `?estado=` (Activos / Inactivos / Todos). Un puesto que no existe se ignora.
- `formatMonthName` y `formatDayMonthShort` ("22 de oct") en dates.ts. Esqueleto de carga con grupos.

## F25 · Ficha del empleado con su historial (2026-10-03) ✅

- `/gestion/empleados/[id]` con pestañas **Historial** (por defecto) y **Datos** (`?ver=datos`; lo que había antes: formulario, días libres y baja). Mes en `?mes=YYYY-MM` (`parseAsMonth`, `employeeProfileParams` en search-params.ts). Título de la pestaña del navegador con el nombre (`generateMetadata` + `cache`).
- `src/lib/employee-history.ts` (puro): `employeeCalendar` arma las semanas del mes desde el inicio de la semana de pago (`payWeekStart`): lo marcado en la asistencia, producción, días cerrados (`DayOverride`), antes del ingreso y, en los días que vienen, lo previsto con `initialStatus` (descanso fijo o días libres asignados). `monthCounts` cuenta solo lo ya marcado.
- `src/lib/employee-history-data.ts`: `getEmployeeMonth` (asistencia, producción, días libres y cierres del mes) y el dinero con `getPayroll(period, employeeId)` — `getPayroll` ahora acepta un empleado, así la ficha cuenta igual que Pagos (ganado, pagado, por pagar, pagos que tocan el mes, días sin cerrar).
- Pantalla (`employee-history.tsx`): mes ‹ ›, totales, calendario con ícono y color por estado (los de Asistencia), ×2 = doble turno, gorro = producción, borde punteado = previsto; cada día abre su asistencia (sin precarga). Leyenda, "Lo ganado día por día" y "Pagos" con enlace a Pagos del mes.
- Utilidades de mes en dates.ts (`ISOMonth`, `isISOMonth`, `monthOf`, `addMonths`, `formatMonth`) y `monthPeriod` en periods.ts.
- Sin migración.

## F24 · Pantallas de carga y de error (2026-10-03) ✅

- `loading.tsx` en cada sección de `/gestion` con esqueletos que imitan la pantalla (Hoy, Asistencia, Reservas, Producción, Pagos, Reportes, Empleados, Configuración, Reseñas, Usuarios) y en los formularios (`[id]`, `nueva`/`nuevo`). Con `loading.tsx` Next.js precarga la parte fija de cada pantalla (solo en producción) y la navegación es inmediata; sin él esperaba al servidor sin mostrar nada.
- Piezas en `src/components/page-skeletons.tsx` (`LoadingPage` con aviso para lectores de pantalla, `HeaderSkeleton`, `TabsSkeleton`, `PeriodSkeleton`, `StatsSkeleton`, `ListSkeleton`, `ChipsSkeleton`, `FormSkeleton`, `FormPageSkeleton`) y `ui/skeleton.tsx` (`motion-safe:animate-pulse`).
- `(app)/error.tsx` (dentro del menú) y `gestion/error.tsx` (si falla el layout, ej. al verificar la sesión): `ErrorScreen` con **Reintentar** (`retry()` de Next 16: vuelve a pedir la pantalla) e **Ir al inicio**, y el código (`digest`) para buscarlo en los logs de Vercel. `(app)/not-found.tsx` para registros que ya no existen. Ambos usan `StatusScreen`.
- Cambiar solo los parámetros de la dirección (búsqueda, pestañas, fecha) no muestra el esqueleto: Next conserva la pantalla mientras llega la nueva.
- `npm run start:e2e` (`scripts/start-e2e.mjs`, puerto 3002, carpeta `.next-e2e-prod`): build de producción contra la BD de pruebas, para probar la precarga.

## F23 · Historial de cambios de producción (2026-10-03) ✅

- Tabla `ProductionLog` (jornada → `SetNull` al eliminarla, usuario, acción `CREATED`/`UPDATED`/`DELETED`, `date` de la jornada, `before`/`after` JSON con `{ date, note, attendees: [{ employeeId, name, basePay, extraPay }] }` en unidades mínimas). Migración `historial_de_produccion`: solo agrega, y registra las jornadas que ya existían como creadas "antes del historial" (sin usuario ni detalle).
- `src/lib/production-log.ts` (puro: `productionSnapshot`, `diffProduction`, `describeProductionLog`, `beforeHistory`). `getProductionLog(dayId)`, `getProductionActivity(limit)` y `employeeNames` en production-data.ts.
- Acciones: crear guarda la jornada y su registro en una sola escritura; editar compara antes/después y **sin cambios no guarda nada** (solo actualiza los excedentes que cambiaron); eliminar guarda lo que tenía y borra en la misma transacción. Un asistente que ya no existe da error en vez de fallar.
- Pantallas: `/gestion/produccion` con pestañas Jornadas / Historial (`?ver=historial`, `productionParams` en search-params.ts) y "Historial de cambios" + "Registrada por" en cada jornada.
- Componentes compartidos nuevos: `ViewTabs` (pestañas como enlaces; también en Reservas) y `HistoryTimeline` + `formatMoment` (línea de tiempo; también en el historial de cada reserva).
- **Para publicar:** aplicar la migración `historial_de_produccion` en Neon antes del push.

## T2 · Parámetros de la dirección con nuqs (2026-10-01) ✅

- `nuqs` 2.10 con `NuqsAdapter` en `src/app/gestion/layout.tsx` (solo la administración).
- **Todo en `src/lib/search-params.ts`** (importa de `nuqs/server`, sirve en servidor y cliente): parser `parseAsISODate` (días válidos), listas cerradas con alias de enlaces viejos (`ver=anteriores` → historial, `estado=sin-marcar` → confirmadas) y, por pantalla, sus parámetros + `load…` (páginas y Route Handlers) + `…Href` (enlaces; quitan los valores por defecto): día (`fecha`), periodo (`desde`/`hasta`), reservas, empleados, CSV de reportes y aviso.
- **Avisos tras guardar**: un solo parámetro `?aviso=creado|actualizado|eliminado` (`withAviso` en las acciones); `FlashToast` recibe los textos y lo borra de la dirección con `useQueryState`.
- **Cliente**: `SearchInput` (búsqueda mientras se escribe, `shallow: false` + debounce de 350 ms, conserva los demás parámetros) en Reservas y Empleados; `DateNav` de Asistencia y `PeriodRangeForm` ("Otras fechas") con `useQueryState(s)`. `PeriodNav` ahora recibe `baseHref`.
- Regla: **ningún parámetro se arma ni se lee a mano**; para uno nuevo, agregarlo a `search-params.ts` con su parser y usar su loader/serializer.

## F22 · Asistencia rápida y "Quién está hoy" en chips (2026-10-01) ✅

- Asistencia: `quick-attendance.tsx` (chips por puesto, buscador con `searchKey` sin tildes, filtro "Por marcar", menú de Base UI por chip con estados y turnos; respeta el cierre de la mañana). `AttendanceList` elige Rápida/Lista con `useSyncExternalStore` sobre `localStorage` (`asistencia-vista`), avisos con Deshacer y barra `sticky` abajo con "Ir al cierre" (#cierre). Conteos con los colores de `STATUS_CHIP_CLASS`.
- Acciones: `setAttendanceStatus(id, status, withShift?)` marca estado y turno de una vez; `resetAttendance` vuelve a Pendiente (Deshacer). Las de asistencia ahora también revalidan `/gestion`.
- Hoy: `today-people.tsx` reemplaza las columnas Trabajan/Pendientes/Descansan: chips por estado, barra de proporción, "+N más", tocar un pendiente = Trabajó.
- Sin migración. En la BD de pruebas se crearon 26 empleados más (31 en total) para probar con el tamaño real.

## F21 · Reservas: historial, búsqueda, filtros e historial de cambios (2026-10-01) ✅

- Tabla `ReservationLog` (reserva, usuario, acción `CREATED`/`UPDATED`/`STATUS`, `changes` JSON `[{field, from, to}]`). Migración `historial_de_reservas` (solo agrega). Las acciones de reservas lo escriben con escritura anidada (atómica); editar sin cambios no guarda nada ni manda correos.
- `src/lib/reservation-log.ts` (puro: `diffReservation`, `describeLog`, `reservationHistory` que agrega la creación de las reservas viejas). `getReservationLog` y `getReservationHistory(period, today, q)` (hasta hoy + `summarizeReservations`) en reservations-data.ts; se quitó `getPastReservations` (`?ver=anteriores` abre el historial).
- `/gestion/reservas`: pestañas Próximas/Historial, búsqueda con botón para borrar, filtros de estado con conteo (`?estado=confirmadas|llego|no-vino|canceladas`; `sin-marcar` = confirmadas), resumen de hoy/mañana/7 días, `PeriodNav` (nuevo prop `keep` para conservar parámetros) y resumen del periodo. Encabezados de día fijos. Reportes → "Marcarlas" abre el historial filtrado en Sin marcar del mismo periodo.
- Reserva: sección "Historial de cambios" (línea de tiempo).

## F20 · Reservas en Google Calendar (2026-10-01) ✅

- Sin API de Google: cada reserva se manda como invitación (`invite.ics`, `text/calendar; method=REQUEST|CANCEL`) por Resend a `AppSettings.calendarEmail` (inicial simbaparrilla1@gmail.com). El usuario dejó "Agregar invitaciones a mi calendario: De todos" en Google Calendar.
- `Reservation.calendarTo` / `calendarSequence` / `calendarHash`. Migración `invitaciones_de_calendario` (solo agrega).
- `src/lib/calendar-invite.ts` (puro: `buildIcs` con escape y corte a 75 bytes, `reservationEvent` de 2 h con UID `reserva-<id>@simba.profiya.com`, `eventHash`, `inviteEmail`); `src/lib/calendar-data.ts` (`syncReservationCalendar`: nueva/actualizada/quitada según estado y huella, nunca lanza; `removeReservationCalendar` antes de borrar; `syncPendingCalendar` en el cron). Correos de reserva comparten `reservationRows`/`reservationEmailBody` de reminders.ts; `fromParts()` y adjuntos en resend.ts.
- Probado en e2e con el Resend falso: versiones 1→2 (editar)→3 CANCEL (cancelar)→4 (volver a confirmar)→5 CANCEL (eliminar); sin cambios o Llegó = sin correo; la revisión diaria no repite. Invitación real de prueba enviada a simbaparrilla1@gmail.com (falta que el usuario confirme que apareció; luego mandar su CANCEL con `scratchpad/test-invite.ts CANCEL 2`).

## F19 · Recordatorio de reservas por correo (2026-09-29) ✅

- `Reservation.reminderEmailId` / `reminderAt` (correo programado en Resend y cuándo sale) y `AppSettings.reminderEmail` (inicial simbaparrilla1@gmail.com). Migración `recordatorios_de_reservas` (solo agrega).
- `src/lib/resend.ts` (fetch a la API: enviar/programar con `scheduled_at` y cancelar; sin `RESEND_API_KEY` no manda nada; `RESEND_API_URL` solo para pruebas). `src/lib/reminders.ts` (puro: `planReminder`, `reminderEmail` con HTML escapado) y `zonedToUtc` en dates.ts. `src/lib/reminders-data.ts`: `syncReservationReminder` (cancela el programado si no ha salido y programa otro; nunca lanza), `cancelReservationReminder`, `syncPendingReminders`.
- Las acciones de reservas lo llaman al crear, editar, cambiar estado y eliminar. `GET /api/cron/recordatorios` (con `CRON_SECRET`) + `vercel.json` a las 12:00 UTC (7:00 Bogotá).
- Probado en e2e con un Resend falso (scratchpad `resend-mock.mjs`, `.env.e2e` con `RESEND_API_URL=http://localhost:4010`): programa a las 6:30 p. m. para una reserva de 7:30 p. m., editar = cancelar + programar, cancelar/eliminar = cancelar, a menos de 1 hora sale ya, la revisión diaria no repite, y si Resend no responde la reserva igual se guarda.
- **Para publicar:** migración en Neon + `RESEND_API_KEY` y `CRON_SECRET` en Vercel (DEPLOY.md §9).

## Reservas: fecha y hora rápidas (2026-09-29) ✅

- Formulario de reserva con botones: fecha (Hoy, Mañana, 5 días más, "Otra fecha" sin fechas pasadas), hora cada 30 min según el horario del día (en "hoy" solo las que no han pasado; "Otra hora" libre) y personas con − / +. Lógica en `src/lib/reservation-slots.ts`; `localNow()` en dates.ts.
- El servidor rechaza fecha/hora pasadas (10 min de margen); al editar, una reserva vieja se puede corregir sin moverla.

## F18 · Usuarios y roles (2026-09-29) ✅

- `User.name`, `User.role` (`UserRole`: `ADMIN`/`RESERVATIONS`, por defecto `ADMIN`: el usuario actual queda como administrador), `User.active`, `User.createdAt`; `Reservation.createdById` (→ User, `SetNull`). Migración `usuarios_y_roles` (solo agrega).
- Acceso en `src/lib/dal.ts`: `verifyUser()` (cualquier usuario activo; lee rol, activo y versión de sesión de la BD), `verifyAdmin()` (lo que antes era `verifySession`, en todas las páginas, acciones y CSV de administración) y `verifyReservations()` (pantallas y acciones de reservas). Un no-admin que abre otra ruta va a `homeFor(role)`.
- Pantallas `/gestion/usuarios` (lista), `/nuevo`, `/[id]` (editar, contraseña nueva, desactivar/activar). Acciones en `src/app/actions/users.ts`, reglas en `src/lib/users.ts` (roles, `userFormSchema`, `homeFor`, `displayName`), consultas en `src/lib/users-data.ts`. Reglas de contraseña compartidas: `passwordIssue()` en `src/lib/account.ts`.
- Login: rechaza desactivados (solo con la contraseña correcta) y manda a cada rol a su inicio. Layout: menú y "Mi cuenta" según el rol; sin barra inferior para Reservas. Configuración muestra solo Cuenta y Sesiones a los de Reservas.
- Probado en e2e: el usuario de reservas se creó por script (sin escribir contraseñas en formularios); las 13 rutas de administración lo mandan a Reservas; al desactivarlo su sesión deja de valer.
- Ideas fuera por ahora: obligar a cambiar la contraseña inicial al primer ingreso; más roles.

## F17 · Gastos del día (2026-09-29) ✅

- `WorkDay.expensesTotal` (`Decimal(14,2)?`). Migración `gastos_del_dia` (solo agrega una columna; aplicarla en Neon antes del push).
- Cierre: campo obligatorio "Gastos del día" ($0 permitido) y línea en vivo *Venta − gastos*; `closeDay` lo valida y guarda. En días de doble turno se anota en el cierre de la noche.
- Resumen del día cerrado, tarjeta de Hoy y Reportes muestran gastos y *venta − gastos*. `summarizeSales` suma solo los gastos anotados; `net` usa solo los días con gastos (`missingExpenses` cuenta los que no tienen). CSV de ventas con columnas Gastos y Venta - gastos.
- Días cerrados antes de esto: "Sin anotar: reabre el día para agregarlos".
- Fuera por ahora: gastos por concepto/categoría.

## Pago del día automático (2026-09-28) ✅

- Se quitan los campos de pago del cierre: `dayPays`/`payFor` en `src/lib/closing.ts` calculan tarifa del puesto × turnos (`DayRow.payRate`), o conservan `Attendance.dailyPay` de un cierre anterior. `setAttendanceStatus`/`setAttendanceShift`/`markPendingAsWorked`/`setDoubleShift` borran `dailyPay` cuando cambian, para que se recalcule. Sin puesto → no se puede cerrar.

---

## F16 · Producción y menú "Más" ✅

- Tablas `ProductionDay` (fecha única, nota) y `ProductionAttendance` (empleado, `basePay` guardado al registrarlo, `extraPay`); `AppSettings.productionPay` (50.000). Migración `produccion` (solo agrega).
- Pantallas `/gestion/produccion` (historial), `/nueva` y `/[id]` (editar, eliminar). Lógica en `src/lib/production.ts`, consultas en `src/lib/production-data.ts`, acciones en `src/app/actions/production.ts`. El pago fijo se cambia en Configuración (`production-pay-form.tsx`).
- Pagos: `PayEntry` con `kind: "production"` y `production`; `entryTotal` suma pago + propina + producción; `EmployeePayroll.productionDays/production`. `getPayroll` agrega las jornadas del periodo. CSV con columna Producción y concepto en el detalle.
- Navegación (`nav-links.tsx`): principales Hoy/Asistencia/Reservas; secundarias en un `Menu` de Base UI ("Más"), en la barra inferior y en la superior por debajo de `lg`.

---

## F15 · Doble turno ✅

- `AppSettings.doubleShiftWeekdays` (por defecto `[0, 6]`) y `shiftHours` (`["11:00-16:00", "17:30-23:30"]`), en Configuración → Doble turno. `WorkDay.doubleShift` se fija al crear el día (`isDoubleShiftDay`) y se cambia a mano con `setDoubleShift` (Asistencia, barra "Doble turno"). Migración `doble_turno` (solo agrega columnas y el enum `WorkShift`).
- `Attendance.shift` (MORNING/EVENING/BOTH) con selector en Asistencia para quien Trabajó (`setAttendanceShift`).
- Cierre del turno de la mañana: `closeMorningShift` guarda `tipsMorning` y `morningClosedAt`; desde ahí `setAttendanceStatus`/`setAttendanceShift`/`markPendingAsWorked` no dejan entrar ni salir de la mañana (los nuevos Trabajó quedan en Tarde). `reopenMorningShift` lo reabre.
- Cierre del día: `closeDay` con `tipsEvening` (+ `tipsMorning` si la mañana no se cerró); `checkClose(rows, { morning, evening })` y `splitShiftTips` en `src/lib/closing.ts`. `tipsTotal` = suma; `TipShare` sigue siendo uno por empleado y día (suma de los dos turnos), así Pagos y Reportes no cambian.
- Pago sugerido: tarifa del puesto × turnos (`payRates` en `DayView`; la sugerencia sigue al turno mientras no se escriba a mano).

---

## F14 · Puestos y pago diario ✅

- Tabla `JobPosition` (nombre único, `dailyPay`, orden) y `Employee.jobPositionId` (FK, `onDelete: SetNull`). La migración `puestos` crea Cocinero 80.000, Mesero 60.000, Cajero 80.000, Jefe de mesa 70.000 y Bartender 80.000, y asigna el puesto a los empleados cuyo texto viejo coincidía (mesero/mesera, cocinero/cocinera, …). La columna de texto `Employee.position` queda en la BD sin uso.
- Configuración → **Puestos y pago diario** (`job-positions-form.tsx`, acción `saveJobPositions`): agregar, renombrar, cambiar pago, reordenar por posición y quitar (solo si ningún empleado lo tiene). Validación en `src/lib/job-positions.ts` (nombres únicos sin importar mayúsculas/tildes, pago > 0).
- Empleado: "Puesto *" es un selector con la tarifa ("Mesero · $ 60.000 por día"). Empleados sin puesto: la ficha muestra lo que tenían escrito para elegir el correcto.
- Cierre del día: el pago sugerido es el del puesto (`suggestedPays` en `workdays.ts`); sin puesto, el último pago. Sigue siendo editable ese día.

---

## F13 · Reseñas en la página pública ✅

- Tabla `Review` (autor, estrellas, texto, fecha aproximada, visible, posición) y `AppSettings.googleRating` / `googleReviewCount`. La migración `resenas` **inserta las 8 reseñas iniciales** (así aparecen en producción sin cargar nada).
- Administración: `/gestion/resenas` (lista con subir/bajar, ocultar, editar; nueva; eliminar) y la calificación general. Acceso desde Configuración → Página pública.
- Página: `src/app/_landing/reviews-section.tsx` (carrusel en celular, cuadrícula en pantallas grandes). Enlaces a Google sin API: `#lrd=<id de la ficha>,1` (ver reseñas) y `,3` (escribir una).
- Decisión: nada de API de Google (el usuario no quiere manejar Google Cloud). Las reseñas son de sus autores: se muestran abreviadas y con enlace a Google.

---

## F12 · Página pública y administración en /gestion ✅

- Administración movida a `src/app/gestion/(app)` (URLs `/gestion/...`), login `/gestion/login`, `/gestion/salir`; redirecciones de las URLs viejas en `next.config.ts`; el proxy solo mira `/gestion`; manifiesto en `/gestion/manifest.webmanifest` (start_url `/gestion`), `/gestion` con `noindex`.
- Página pública `src/app/page.tsx` + `src/app/_landing/` (menú, formulario de reserva). ISR `revalidate = 600`; Configuración y excepciones de apertura la revalidan.
- Menú en `src/lib/menu.ts` (transcrito del PDF; **para cambiar precios se edita ese archivo**). PDF original en `public/menu-simba.pdf`. Fotos sacadas del PDF en `public/landing/` (portada, parrilla, perro, bebidas, imagen para redes). Siluetas de los personajes (`personajes.webp`) recortadas de una captura de la carta que envió el usuario; cierran el menú antes de Reservar.
- Reservas web: `reservationRequestMessage` en `src/lib/public-site.ts`; se abre `wa.me/<WhatsApp del restaurante>`; no se guarda nada.
- `AppSettings.whatsapp` (Configuración). Migración `whatsapp_restaurante`.
- Colores y letras de la carta como tokens de Tailwind (`simba-cream`, `simba-rust`, `simba-forest`, `font-display` = Alfa Slab One, `font-price` = Bree Serif).
- Ideas: editar el menú desde la administración; más fotos (del Instagram, las que el restaurante entregue).
- SEO (2026-09-26): título "Simba Parrilla · Restaurante y hamburguesas en Piedecuesta" (≤ 60) y descripción ≤ 155; h1 con "Restaurante en Piedecuesta"; `lang="es-CO"`; datos estructurados con URLs absolutas, `@id`, `url`, nombres alternos y ficha de Google Maps (CID); sitemap con `lastmod`. `SITE_URL` en `src/lib/public-site.ts`. Verificación de Search Console por DNS (o `GOOGLE_SITE_VERIFICATION`).

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

> **2026-09-28 (2):** también se quitaron los **festivos** (`src/lib/holidays.ts`, fila "Festivos" del horario, "Próximo festivo" en Hoy, etiqueta en Asistencia): un festivo es un día normal.
>
> **2026-09-28:** el restaurante abre **de lunes a domingo**. Se quitó por completo la regla de días de cierre (lunes) y la de "festivo en día de cierre → abre y cierra el siguiente": `daySchedule(fecha, excepción)` solo cierra un día marcado a mano ("Marcar como día cerrado" en Asistencia, acción `setDayClosed`). Se quitaron `closedWeekdays` de Configuración y `CLOSED_WEEKDAYS` del `.env`; la columna `AppSettings.closedWeekdays` sigue en la BD sin uso (borrarla con una migración cuando convenga). Las excepciones viejas de "abrir" se ignoran.

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
- Editar el menú (platos y precios) desde la administración; hoy está en `src/lib/menu.ts`.
- Reservas: límite de personas por hora / aviso de cupo lleno.
- Botón "Descargar respaldo" en Configuración (exportar todos los datos).
- Logo en mayor resolución o vector para que el ícono de 512 px quede nítido (falta el archivo).
- Más fotos para la página y siluetas de los personajes en archivo original (faltan los archivos).
- **Resumen diario por correo** al cerrar el día (Resend): venta, gastos, propinas, quién trabajó y reservas atendidas, para los dueños. *(propuesta 7, 2026-10-01; pospuesta)*
- **Aviso si el día no se cerró**: correo a las 11:45 p. m. si falta el cierre (otra tarea de Vercel Cron, una vez al día). *(propuesta 8, 2026-10-01; pospuesta)*
- Hoy: comparativo de la venta con la semana pasada y con el mismo día ("+12 %"). *(propuesta 2)*
- Empleados: botón de WhatsApp en cada fila (si tiene teléfono), iniciales con el color del puesto y tabla en computador. *(propuesta del 2026-10-03, no elegida todavía)*
- **Adelantos / vales** que se descuentan del pago semanal (hoy Pagos solo marca pagado el total). *(propuesta del 2026-10-03; solo si los usan)*
- **Historial de cierres**: quién cerró o reabrió el día y qué cambió en venta, propinas y gastos (como el de producción). *(propuesta del 2026-10-03)*
- Nombres de empleados en Pagos, Reportes y Hoy con enlace a su ficha (en el mes que se está mirando).

**Decisiones del usuario (sin código)**
- Plan de Vercel: Hobby es para uso no comercial; con la página pública del restaurante, pasar a Pro.
- Respaldos: el plan gratis de Neon guarda poco historial; ¿exportación periódica?
- Siluetas de El Rey León en la página pública (personajes de Disney): decisión de los dueños.
- Identidad de git del proyecto: los commits salen como `lac617a <botlacrita617@gmail.com>` (config global); decidir si se cambia solo para este repo.

**Técnico**
- Pruebas automáticas de pantallas (Playwright) contra `dev:e2e`; hoy solo hay pruebas de lógica (196).

## Notas técnicas conocidas

- La BD local de `prisma dev` (PGlite) no soporta conexiones en paralelo → `DATABASE_POOL_MAX=1` en `.env` y `.env.e2e`.
- Después de cada migración hay que **reiniciar** `npm run dev` (el cliente de Prisma queda en memoria). Migrar también la BD de pruebas: `DATABASE_URL=<url de pruebas> npx prisma migrate deploy`.
- Los enlaces que abren días (`/gestion/asistencia?fecha=…`) llevan `prefetch={false}`: abrir un día lo crea en la BD.
- En desarrollo, al editar el layout la recarga completa a veces vuelve a `/gestion/asistencia`; no pasa en producción.
