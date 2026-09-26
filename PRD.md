# PRD — Gestión Simba

Sistema web para gestionar empleados, asistencia diaria, ventas y propinas de un restaurante.

- **Versión:** 0.1 (borrador)
- **Fecha:** 2026-09-23
- **Estado:** F1–F8 completadas y en producción (Vercel + Neon); F9 y F10 listas para publicar

---

## 1. Resumen y objetivo

Hoy el control de quién trabajó, cuánto se vendió y cómo se reparten las propinas se lleva a mano (libreta u hoja de cálculo). Esto provoca errores en el reparto de propinas, poca visibilidad de faltas y descansos, y nada de historial consultable.

**Objetivo:** una aplicación web sencilla, usable desde el celular, donde el administrador:

1. Mantiene la lista de empleados.
2. Marca cada día quién trabajó, quién descansó o faltó.
3. Al cerrar el día, anota la venta total y el monto de propinas.
4. El sistema reparte las propinas en partes iguales **solo entre quienes trabajaron ese día**.

## 2. Usuario

| Rol | Descripción |
|---|---|
| Administrador | Dueño o gerente. Único usuario del sistema. Inicia sesión con email y contraseña. |

Los empleados **no** tienen acceso al sistema en el MVP.

## 3. Alcance

### Dentro del MVP
- CRUD de empleados (N empleados, sin límite).
- Asistencia diaria con descanso fijo semanal pre-marcado y días libres extra.
- Cierre del día con venta total.
- Registro de propinas diarias y reparto automático.
- Reportes por rango de fechas y exportación CSV.
- Pago diario por empleado y resumen de pago semanal (pago de los días trabajados + propinas).

### Fuera de alcance (por ahora)
- Nómina formal (prestaciones, seguridad social, descuentos, recibos).
- Múltiples sucursales.
- Varios usuarios o roles.
- Acceso de empleados para consultar sus datos.
- Desglose de ventas por método de pago, registro de gastos.
- Reparto de propinas por puesto u horas.

## 4. Requisitos funcionales

### RF-1 · Gestión de empleados
- Registrar empleado con: **nombre** (obligatorio), **puesto** (mesero, cocinero, etc.), teléfono, fecha de ingreso y **día(s) de descanso fijo** semanal (0 = domingo … 6 = sábado; puede ser más de uno).
- Editar cualquier dato del empleado.
- Eliminar = **baja lógica** (`activo = false`). El empleado deja de aparecer en la asistencia diaria, pero su historial de asistencias y propinas se conserva. Se puede reactivar.
- Listado con búsqueda por nombre y filtro Activos / Inactivos / Todos.

### RF-2 · Asistencia diaria
- Pantalla por fecha (hoy por defecto) con todos los empleados activos.
- Al abrir un día por primera vez, el sistema crea un registro por empleado activo:
  - Si el día de la semana coincide con su descanso fijo → **Descanso**.
  - Si ya tenía asignado un día libre extra o vacaciones para esa fecha → ese estado.
  - Si no → **Pendiente**.
- Estados posibles:

| Estado | ¿Recibe propina? | Descripción |
|---|---|---|
| Pendiente | — | Aún no se marca. No se puede cerrar el día con pendientes. |
| Trabajó | ✅ Sí | Se presentó a trabajar. |
| Descanso | ❌ No | Su descanso fijo semanal. |
| Descanso extra / Permiso | ❌ No | Día libre adicional otorgado. |
| Falta | ❌ No | No se presentó sin justificación. |
| Vacaciones / Incapacidad | ❌ No | Ausencia justificada. |

- Cambiar el estado de cada empleado con un toque (acción rápida "Marcar todos los pendientes como Trabajó").
- **Asignar días libres por adelantado:** elegir empleado + rango de fechas + tipo (Descanso extra o Vacaciones/Incapacidad). Se aplica al abrir esos días.
- Un empleado que trabaja en su día de descanso fijo simplemente se cambia a **Trabajó**.
- Navegar a días anteriores para consultar o corregir (si el día no está cerrado).
- Nota opcional por empleado/día (ej. "salió temprano").

### RF-3 · Cierre del día
- Capturar **venta total del día** y una **nota** opcional.
- Capturar el **monto total de propinas** (RF-4).
- Al confirmar, el día pasa a **Cerrado**: se guarda el reparto de propinas y ya no se puede editar asistencia, ventas ni propinas.
- **Reabrir día:** acción explícita con confirmación; permite editar y al volver a cerrar se recalcula el reparto.
- Validaciones: no hay empleados en *Pendiente*; montos ≥ 0.

### RF-4 · Propinas
- Un solo monto de propinas por día.
- **Reparto en partes iguales** entre los empleados con estado **Trabajó**:
  - `parte = propinas / nº de empleados que trabajaron`, redondeado hacia abajo a centavos.
  - Los centavos sobrantes se asignan de 1 en 1 a los empleados en orden alfabético, para que la suma cuadre exacto.
  - Ejemplo: $1,000.00 entre 3 → $333.34, $333.33, $333.33.
- Empleados con cualquier otro estado reciben $0.
- Si nadie trabajó, no se puede cerrar con propinas > 0.
- Vista previa del reparto antes de cerrar.
- El reparto se guarda como registro (snapshot) al cerrar; cambios posteriores en empleados no lo alteran.

### RF-5 · Reportes
Filtro por rango de fechas (semana, quincena, mes o personalizado):
- **Ventas:** total del periodo, promedio diario, venta por día.
- **Propinas por empleado:** total recibido y días que recibió.
- **Asistencia por empleado:** días trabajados, descansos, descansos extra, faltas, vacaciones.
- Exportar cada reporte a **CSV**.

### RF-6 · Inicio ("Hoy")
- Quién trabaja hoy y quién descansa.
- Número de empleados pendientes de marcar.
- Estado del día (Abierto / Cerrado), venta y propinas si ya se cerró.
- Accesos directos a Asistencia y Cierre.

### RF-7 · Pago diario
- Aplica a **todos** los empleados.
- En el cierre del día se escribe el **pago del día** de cada empleado que **Trabajó** (ej. $70.000 un día, $80.000 otro). No hay tarifa fija: se anota cada día.
- Para agilizar, el campo se sugiere con el último pago registrado de ese empleado; se puede cambiar.
- Es obligatorio para cerrar (puede ser $0). Los demás estados (descanso, permiso, falta, vacaciones/incapacidad) **no se pagan**.
- Queda guardado con el cierre; al reabrir el día se puede corregir.

### RF-8 · Pago semanal
- Pantalla **Pagos** con un periodo: por defecto la semana actual; el día en que empieza la semana es **configurable** (lunes por defecto) y también se puede elegir un rango libre de fechas.
- Por cada empleado: días trabajados, suma de pagos diarios, suma de propinas y **total a pagar** = pagos diarios + propinas.
- Detalle por día al abrir un empleado (fecha, pago del día, propina).
- Aviso si en el periodo hay días **sin cerrar** (sus pagos y propinas aún no cuentan).
- Exportar a CSV.

### RF-9 · Días de cierre y festivos
- El restaurante **cierra los lunes** (configurable con `CLOSED_WEEKDAYS`).
- Si el lunes es **festivo de Colombia**, el restaurante **abre** ese lunes y **cierra el martes** siguiente.
- Festivos calculados automáticamente (Ley 51 de 1983: fijos, trasladados al lunes y los que dependen de la Pascua).
- En un día de cierre no hay asistencia ni cierre que registrar, y Pagos/Reportes no lo cuentan como "día sin cerrar".
- En un lunes festivo, el descanso fijo de lunes de los empleados no aplica (quedan Pendiente).
- **Excepciones manuales:** abrir un día de cierre o cerrar un día normal (ej. 25 de diciembre). Cerrar un día borra su asistencia sin cerrar; un día ya cerrado con venta hay que reabrirlo primero.
- **Hoy** indica si hoy se abre y cuál es el próximo festivo.

### RF-10 · Configuración y seguridad
- Pantalla **Configuración** (ícono de engranaje arriba):
  - **Cuenta:** cambiar correo y/o contraseña; siempre pide la contraseña actual. Contraseña nueva: mínimo 10 caracteres, con letras y números, distinta de la actual.
  - **Sesiones:** cambiar la contraseña o pulsar "Cerrar sesión en los demás dispositivos" invalida las sesiones de otros equipos (versión de sesión en el usuario).
  - **Restaurante:** día de inicio de la semana de pago, día de pago, días de cierre y horario de atención (RF-13). Se guardan en la BD (tabla `AppSettings`); las variables de entorno solo son el valor inicial.
- **Límite de intentos de inicio de sesión:** 5 fallos desde la misma conexión en 15 min, o 20 contra el mismo correo en 1 h → bloqueo de 15 min. Un acceso correcto limpia los contadores. La respuesta no revela si el correo existe.

### RF-11 · Pagos realizados
- En **Pagos**, cada empleado muestra su estado en el periodo: **Pagado**, **Pagado en parte** o **Pendiente**.
- **Marcar pagado** (por empleado) o **Marcar todos como pagados**: registra un pago por el rango de fechas visto, con el monto total de ese momento. Pide confirmación y avisa si hay días sin cerrar.
- Un pago cubre días, no un periodo fijo: si se paga por semanas y luego se mira el mes, se ve qué parte está pagada.
- No se pueden registrar dos pagos del mismo empleado sobre las mismas fechas.
- Si después de pagar cambian los montos de esos días (se reabrió un día), la diferencia aparece en "Por pagar" con aviso y botón **Registrar diferencia**.
- **Deshacer** elimina un pago registrado por error.
- Totales del periodo: Total, Pagado y Por pagar. Hoy muestra lo pendiente de la semana. El CSV incluye Pagado, Pendiente y Estado.

### RF-12 · Gráfico de ventas
- En **Reportes → Ventas**, gráfico de columnas de venta por día (por semana si el rango pasa de 62 días), hasta hoy.
- Los días sin cierre quedan como hueco; se marca el valor del mejor día; al pasar o tocar una barra se ve fecha, venta y propinas. La tabla de abajo sigue siendo el detalle.

### RF-13 · Horario de atención y día de pago
- **Horario** (Configuración): hora de apertura y de cierre para cada día de la semana y una fila **Festivos**. Es **informativo**: se muestra en Hoy y en Asistencia. El día de trabajo sigue cambiando a medianoche (siempre cierran antes de las 12).
  - Un día vacío no muestra horario. En festivo se usa la fila Festivos si está llena; si no, la del día. En días de cierre no se muestra; el horario de un día de cierre (ej. lunes) solo se usa si abre por festivo o excepción.
  - La hora de cierre debe ser posterior a la de apertura.
- **Día de pago** (Configuración, por defecto lunes): la semana se paga el primer día de pago desde que termina (semana lunes–domingo → se paga el lunes siguiente).
  - Hoy muestra la tarjeta **"Hoy es día de pago"** con lo que falta pagar de la semana que terminó, cuántos empleados y un botón **Ir a pagar** (abre esa semana en Pagos). Si pasa el día y sigue sin pagar: **"Pago pendiente desde…"**. Desaparece cuando todo queda marcado como pagado.
  - Si esa semana tiene días sin cerrar, avisa que el total puede cambiar.
  - Entregar el dinero es responsabilidad de los dueños; el sistema calcula, recuerda y registra.

### RF-14 · Reservas
- Pantalla **Reservas** en el menú. Cada reserva tiene: **fecha y hora**, **cantidad de personas**, **a nombre de** (quien reserva), **teléfono** (opcional), **ocasión** (opcional: Cumpleaños, Aniversario, Grado, Despedida, Reunión de trabajo, Pedida de mano u "Otra" con texto libre), **persona de la ocasión** (ej. el cumpleañero; solo si hay ocasión) y **observación**.
- Lista **Próximas** (desde hoy) y **Anteriores**, agrupadas por día con total de reservas y personas; búsqueda por nombre (quien reserva o persona de la ocasión).
- Estados: **Confirmada** (al crearla), **Llegó**, **No vino** (se marcan desde el día de la reserva) y **Cancelada** (desde Editar; queda en el historial y no cuenta en los totales). Todos se pueden deshacer. **Eliminar** borra la reserva (para las registradas por error).
- Avisos que no impiden guardar: el restaurante está cerrado ese día (encabezado del día) o la hora queda fuera del horario de atención (RF-13).
- **Hoy** muestra las reservas del día con acceso a Nueva reserva.

## 5. Reglas de negocio

1. Solo los empleados con estado **Trabajó** reciben propina y pago diario ese día.
2. Existe un único registro de asistencia por empleado por día.
3. Un día cerrado es de solo lectura hasta que se reabre.
4. Los empleados no se borran físicamente; se dan de baja (baja lógica).
5. Los días se manejan según la **zona horaria del restaurante** (configurable), no la del servidor.
6. Los montos se guardan con 2 decimales exactos (nunca como punto flotante).

## 6. Modelo de datos (Prisma, preliminar)

```prisma
enum AttendanceStatus {
  PENDING
  WORKED
  REST          // descanso fijo
  EXTRA_REST    // descanso extra / permiso
  ABSENT        // falta
  LEAVE         // vacaciones / incapacidad
}

enum DayStatus {
  OPEN
  CLOSED
}

model User {
  id           String @id @default(cuid())
  email        String @unique
  passwordHash String
}

model Employee {
  id          String       @id @default(cuid())
  name        String
  position    String?
  phone       String?
  hireDate    DateTime?    @db.Date
  restDays    Int[]        // 0 = domingo ... 6 = sábado
  active      Boolean      @default(true)
  createdAt   DateTime     @default(now())
  attendances Attendance[]
  tipShares   TipShare[]
  timeOff     TimeOff[]
}

model WorkDay {
  id          String       @id @default(cuid())
  date        DateTime     @unique @db.Date
  totalSales  Decimal?     @db.Decimal(10, 2)
  tipsTotal   Decimal?     @db.Decimal(10, 2)
  note        String?
  status      DayStatus    @default(OPEN)
  closedAt    DateTime?
  attendances Attendance[]
  tipShares   TipShare[]
}

model Attendance {
  id         String           @id @default(cuid())
  workDayId  String
  employeeId String
  status     AttendanceStatus @default(PENDING)
  note       String?
  dailyPay   Decimal?         @db.Decimal(14, 2) // RF-7: pago del día (solo si Trabajó)
  workDay    WorkDay          @relation(fields: [workDayId], references: [id], onDelete: Cascade)
  employee   Employee         @relation(fields: [employeeId], references: [id])

  @@unique([workDayId, employeeId])
}

// Días libres asignados por adelantado (descanso extra o vacaciones)
model TimeOff {
  id         String           @id @default(cuid())
  employeeId String
  startDate  DateTime         @db.Date
  endDate    DateTime         @db.Date
  type       AttendanceStatus // EXTRA_REST | LEAVE
  note       String?
  employee   Employee         @relation(fields: [employeeId], references: [id])
}

model TipShare {
  id         String   @id @default(cuid())
  workDayId  String
  employeeId String
  amount     Decimal  @db.Decimal(10, 2)
  workDay    WorkDay  @relation(fields: [workDayId], references: [id], onDelete: Cascade)
  employee   Employee @relation(fields: [employeeId], references: [id])

  @@unique([workDayId, employeeId])
}
```

## 7. Stack tecnológico

| Capa | Tecnología | Por qué |
|---|---|---|
| Framework | **Next.js 16 (App Router) + TypeScript** | Frontend y backend en un solo proyecto; Server Actions evitan escribir una API aparte. |
| UI | **Tailwind CSS + shadcn/ui** | Componentes accesibles y responsive listos, fácil de usar en celular. |
| ORM | **Prisma 7** (driver adapter `pg`) | Tipado de extremo a extremo, migraciones sencillas. |
| Base de datos | **PostgreSQL** (Neon o Supabase) | Plan gratuito suficiente, soporta `Decimal` y arreglos (`restDays`). |
| Autenticación | **Sesión propia con jose** (cookie JWT firmada) + bcrypt | Patrón recomendado por Next 16; para un solo admin es más simple que Auth.js. |
| Validación | **Zod** | Mismos esquemas en formularios y en servidor. |
| Fechas | **date-fns + date-fns-tz** | Manejo del día local del restaurante. |
| Pruebas | **Vitest** | Pruebas unitarias del reparto de propinas y reglas de asistencia. |
| Deploy | **Vercel** | Despliegue gratuito y automático desde Git. |

## 8. Pantallas

1. **Login**
2. **Hoy** (inicio / dashboard)
3. **Asistencia** — selector de fecha, lista de empleados con su estado.
4. **Cierre del día** — venta total, propinas, pago del día por empleado, vista previa del reparto, cerrar/reabrir.
5. **Empleados** — lista, alta, edición, baja/reactivación, días libres asignados.
6. **Pagos** — resumen semanal (o rango libre) por empleado: días trabajados, pagos diarios, propinas y total a pagar.
7. **Reportes** — ventas, propinas por empleado, asistencia; exportar CSV.
8. **Configuración** — correo y contraseña, cerrar otras sesiones, inicio de la semana de pago, días de cierre (zona horaria, moneda y hora de corte se muestran; se cambian en Vercel).

## 9. Requisitos no funcionales

- **Mobile-first:** todo usable con una mano desde el celular.
- Interfaz en **español**.
- Moneda y zona horaria configurables.
- Respaldos automáticos de la base de datos (los del proveedor: Neon/Supabase).
- Tiempo de carga de pantallas < 2 s en conexión móvil normal.

## 10. Roadmap

Estado detallado, siguiente tarea y cómo retomar: ver [ROADMAP.md](ROADMAP.md).

| Fase | Entregable |
|---|---|
| F1 ✅ | Setup del proyecto (Next.js, Prisma, BD), login del admin, CRUD de empleados. |
| F2 ✅ | Asistencia diaria, descanso fijo pre-marcado, días libres por adelantado. |
| F3 ✅ | Cierre del día, propinas y reparto (con pruebas unitarias). |
| F3b ✅ | Pago diario por empleado en el cierre (RF-7) y pantalla de pago semanal (RF-8). |
| F4 ✅ | Pantalla "Hoy", reportes y exportación CSV. |
| F5 ✅ | Deploy en Vercel + BD en producción. |
| F6 ✅ | Días de cierre (lunes) y festivos de Colombia, con excepciones manuales (RF-9). |
| F7 ✅ | Configuración (cuenta, sesiones, ajustes del restaurante) y límite de intentos de login (RF-10). |
| F8 ✅ | Pagos realizados (RF-11) y gráfico de ventas (RF-12). |
| F9 ✅ | Horario de atención y recordatorio del día de pago (RF-13). |
| F10 ✅ | Reservas (RF-14). |

## 11. Preguntas abiertas

- ¿Algún empleado tiene más de un día de descanso fijo por semana? (el modelo ya lo soporta)

**Resueltas**
- Zona horaria: **America/Bogota** (`APP_TIMEZONE`).
- Fin del día de trabajo: **00:00** (`DAY_CUTOFF_HOUR=0`, configurable).
- Moneda: **peso colombiano (COP)**, montos enteros sin centavos (`APP_CURRENCY`). El reparto de propinas redondea a pesos: el sobrante se da de 1 peso en 1 peso por orden alfabético.
