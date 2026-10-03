# PRD — Gestión Simba

Sistema web para gestionar empleados, asistencia diaria, ventas y propinas de un restaurante.

- **Versión:** 0.1 (borrador)
- **Fecha:** 2026-09-23
- **Estado:** F1–F13 completadas y en producción (Vercel + Neon)

---

## 1. Resumen y objetivo

Hoy el control de quién trabajó, cuánto se vendió y cómo se reparten las propinas se lleva a mano (libreta u hoja de cálculo). Esto provoca errores en el reparto de propinas, poca visibilidad de faltas y descansos, y nada de historial consultable.

**Objetivo:** una aplicación web sencilla, usable desde el celular, donde el administrador:

1. Mantiene la lista de empleados.
2. Marca cada día quién trabajó, quién descansó o faltó.
3. Al cerrar el día, anota la venta total, los gastos del día y el monto de propinas.
4. El sistema reparte las propinas en partes iguales **solo entre quienes trabajaron ese día**.

## 2. Usuario

| Rol | Descripción |
|---|---|
| Administrador | Dueño o gerente. Acceso a todo. Puede haber varios. |
| Reservas | Personal que maneja las reservas: solo ve la sección Reservas y su propia cuenta (RF-21). |

Todos inician sesión con correo y contraseña. Los usuarios los crea un administrador.

Los empleados **no** tienen acceso al sistema en el MVP.

## 3. Alcance

### Dentro del MVP
- CRUD de empleados (N empleados, sin límite).
- Asistencia diaria con descanso fijo semanal pre-marcado y días libres extra.
- Cierre del día con venta total y gastos del día.
- Registro de propinas diarias y reparto automático.
- Reportes por rango de fechas y exportación CSV.
- Pago diario por empleado y resumen de pago semanal (pago de los días trabajados + propinas).

### Fuera de alcance (por ahora)
- Nómina formal (prestaciones, seguridad social, descuentos, recibos).
- Múltiples sucursales.
- Roles distintos de Administrador y Reservas (permisos por pantalla a la medida).
- Acceso de empleados para consultar sus datos.
- Desglose de ventas por método de pago; detalle de gastos por concepto (solo se anota el total del día).
- Reparto de propinas por puesto u horas.

## 4. Requisitos funcionales

### RF-1 · Gestión de empleados
- Registrar empleado con: **nombre** y **puesto** (obligatorios; el puesto se elige de la lista de Configuración), teléfono, fecha de ingreso y **día(s) de descanso fijo** semanal (0 = domingo … 6 = sábado; puede ser más de uno).
- Editar cualquier dato del empleado.
- Eliminar = **baja lógica** (`activo = false`). El empleado deja de aparecer en la asistencia diaria, pero su historial de asistencias y propinas se conserva. Se puede reactivar.
- Listado agrupado por puesto (en orden alfabético, como Asistencia), con búsqueda por nombre (sin importar tildes) y chips por puesto con su número de empleados. Cada empleado muestra **cómo está hoy** (Trabaja hoy, Descansa hoy, Permiso / Vacaciones hasta el…, Faltó hoy, Sin marcar hoy; con los colores de Asistencia), su descanso fijo y lo que lleva del **mes** (días trabajados y faltas en rojo). Cada grupo dice cuántos trabajan hoy. Los **dados de baja** van al final, plegados (se abren solos si la búsqueda encuentra a alguno).
- **Ficha del empleado** (al tocarlo en la lista), con su puesto, descanso fijo y fecha de ingreso, y dos pestañas:
  - **Historial** (por defecto), por **semana de pago** (la misma de Pagos, ej. lunes a domingo; ‹ ›, "Esta semana"): cuándo se paga o si ya se pagó; lo **ganado** (pago del día + propinas + producción), **pagado** y **por pagar** de la semana (lo mismo que cuenta Pagos); conteos de la semana (días trabajados con dobles, faltas, descansos, permisos, vacaciones, producción, sin marcar) y **los 7 días**, cada uno con lo marcado (estado, turno, producción, día cerrado, sin cerrar) o lo previsto (descanso fijo, días libres asignados), con su pago, propina y producción; cada día abre su asistencia. Abajo, los pagos de la semana y las **últimas 8 semanas** con días, faltas, lo ganado y si están pagadas o cuánto falta.
  - **Datos**: editar, días libres asignados y dar de baja / reactivar.

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
- **Vista rápida** (por defecto; se puede cambiar a **Lista**, y cada navegador recuerda la elegida): todos los empleados como **chips agrupados por puesto**, con color por estado (los conteos de arriba sirven de leyenda), buscador por nombre (sin importar tildes) y filtro **Por marcar** (pendientes y, en doble turno, los que no tienen turno).
  - Un toque a un pendiente lo marca **Trabajó**; la flecha ▾ abre los demás estados y "Volver a pendiente". En días de doble turno el toque abre el menú con **Trabajó · Mañana / Tarde / Ambos** (se marca estado y turno de una vez), respetando el cierre de la mañana.
  - Cada cambio muestra un aviso con **Deshacer**.
- **Barra fija abajo** mientras se recorre la lista: cuántos trabajan, cuántos faltan por marcar (y Mañana/Tarde en doble turno) y botón **Ir al cierre**.
- **Asignar días libres por adelantado:** elegir empleado + rango de fechas + tipo (Descanso extra o Vacaciones/Incapacidad). Se aplica al abrir esos días.
- Un empleado que trabaja en su día de descanso fijo simplemente se cambia a **Trabajó**.
- Navegar a días anteriores para consultar o corregir (si el día no está cerrado).
- Nota opcional por empleado/día (ej. "salió temprano").

### RF-3 · Cierre del día
- Capturar **venta total del día**, **gastos totales del día** del restaurante (compras, insumos, servicios…; obligatorio, $0 si no hubo) y una **nota** opcional. Se ve en vivo *Venta − gastos*.
- Capturar el **monto total de propinas** (RF-4).
- Al confirmar, el día pasa a **Cerrado**: se guarda el reparto de propinas y ya no se puede editar asistencia, ventas ni propinas.
- **Reabrir día:** acción explícita con confirmación; permite editar y al volver a cerrar se recalcula el reparto.
- Validaciones: no hay empleados en *Pendiente*; montos ≥ 0.
- Los días cerrados antes de existir los gastos quedan *sin gastos anotados*; para agregarlos se reabre el día (al volver a cerrar se piden).

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

### RF-19 · Producción (preparación)
- Uno o dos días a la semana (cualquier día) algunos empleados ayudan a preparar todo. Pantalla **Producción** (menú "Más"), pestaña **Jornadas**: las jornadas con fecha, nota, quién asistió, excedentes y total (pestaña **Historial**: RF-25).
- Cada asistente cobra un **pago fijo** (Configuración → Puestos y pago diario → "Producción: pago por asistir"; inicial **$50.000**) más un **excedente** opcional por persona.
- El pago fijo se guarda en cada asistente al registrarlo: si luego cambia en Configuración, las jornadas pasadas no cambian (al editar una jornada, los que ya estaban conservan el suyo).
- Una jornada por fecha. Se puede editar (fecha, nota, asistentes, excedentes) y eliminar.
- Se **suma al pago semanal** en Pagos (total del periodo, por empleado "+ producción", detalle y CSV con columna Producción); si se registra después de marcar pagada la semana, la diferencia queda por pagar.

### RF-25 · Historial de cambios de producción
- **Quién** registró, editó o eliminó cada jornada, **qué** cambió y **cuándo**, del más reciente al más viejo. Se ve en **Producción → Historial** (todas las jornadas, incluso las eliminadas; enlaza a la jornada si todavía existe) y al final de cada jornada ("Historial de cambios").
- Registrar: quiénes asistieron (con su excedente), total y nota. Editar: cada cambio en una línea (fecha, a quién agregó o quitó, "Excedente de Ana: $10.000 → $15.000", nota) y el total antes → después si cambió. Eliminar: lo que tenía la jornada (quiénes, total y nota), para poder registrarla otra vez si fue un error.
- Guardar sin cambios no deja registro. Las jornadas registradas antes del historial aparecen como "Registró la jornada" sin quién ni detalle ("Antes del historial").

### RF-20 · Navegación
- Celular: barra inferior con **Hoy · Asistencia · Reservas · Más**; "Más" abre Producción, Pagos, Reportes y Empleados (la pestaña muestra el nombre de la sección abierta).
- Pantallas medianas: igual en la barra superior ("Más ▾"); pantallas anchas: todo a la vista.

### RF-21 · Usuarios y roles
- **Configuración → Usuarios** (`/gestion/usuarios`, solo administradores): lista, crear y editar usuarios con **nombre**, **correo**, **rol** y contraseña.
- Roles: **Administrador** (todo) y **Reservas** (solo Reservas: ver, anotar, editar, cancelar, eliminar, marcar Llegó/No vino y confirmar por WhatsApp).
- La contraseña inicial la escribe el administrador y se la comparte a la persona; ella la cambia en **Mi cuenta**. Al editar, el administrador puede poner una contraseña nueva (se cierra la sesión de esa persona en todos lados).
- **Desactivar / activar** un usuario: el desactivado no puede entrar y su sesión se cierra de inmediato; no se borra (queda en el historial, ej. "Registrada por"). Al entrar con la contraseña correcta se le dice que está desactivado.
- Un administrador no puede cambiar su propio rol ni desactivarse (así siempre queda al menos uno). Sobre sí mismo solo cambia el nombre ahí; su correo y contraseña, en Configuración → Cuenta.
- Un usuario de Reservas ve solo **Reservas** en el menú y **Mi cuenta** (correo, contraseña, cerrar otras sesiones); cualquier otra dirección de la administración lo lleva a Reservas. Al entrar va directo a Reservas.
- Cada reserva guarda **quién la registró** ("Registrada por … el …" al editarla).
- El rol se comprueba en el servidor en cada página, acción y descarga (no solo se oculta el menú); un cambio de rol aplica de inmediato.

### RF-22 · Recordatorio de reservas por correo
- **1 hora antes** de cada reserva **confirmada** llega un correo (Resend, remitente del dominio `profiya.com`) al **correo de recordatorios** de Configuración → Restaurante (inicial: simbaparrilla1@gmail.com; vacío = sin recordatorios).
- El correo trae hora, fecha, a nombre de, personas, teléfono, ocasión, observación, quién la registró y un botón **Ver la reserva**.
- Se programa en Resend al guardar la reserva. Al editarla se cancela el programado y se programa otro con los datos nuevos; al cancelarla, marcar Llegó/No vino o eliminarla, se cancela; al volver a confirmarla, se programa otra vez. Si falta menos de 1 hora, sale de inmediato; si ya empezó, no se manda.
- Resend programa hasta 30 días adelante: una **revisión diaria** (Vercel Cron, 7:00 a. m.) programa las que faltan (más lejanas, anteriores a esta función o con fallo de Resend). Un fallo de Resend nunca impide guardar la reserva.
- En la reserva se ve el estado: "sale el …", "enviado el …" o pendiente.
- Si se cambia el correo en Configuración, los ya programados siguen yendo al anterior; las reservas nuevas o editadas usan el nuevo.

### RF-23 · Reservas en Google Calendar
- Cada reserva llega como **invitación de calendario** (correo con `invite.ics`, por Resend) al **Google Calendar de reservas** de Configuración → Restaurante (inicial: simbaparrilla1@gmail.com; vacío = desactivado). Con "Agregar invitaciones a mi calendario: De todos" en Google Calendar, el evento se agrega solo.
- Evento de 2 horas: "Reserva: Nombre (N personas)", con teléfono, ocasión, observación, quién la registró y el enlace a la reserva; lugar: el restaurante. No marca el calendario como ocupado.
- Cada reserva es **un solo evento** (UID fijo): al editar algo que se ve (fecha, hora, datos) llega una actualización con versión mayor; al **cancelarla o eliminarla** se quita; al volver a confirmarla vuelve. Marcar Llegó/No vino no manda nada.
- La revisión diaria (RF-22) también manda al calendario las reservas de hoy en adelante que no estén (anteriores a esta función o con fallo). Las pasadas no se llenan.
- Si se cambia el correo del calendario, al editar una reserva se quita del anterior y se pone en el nuevo.
- En la reserva se ve "En el Google Calendar de …".

### RF-18 · Doble turno (uso interno de empleados)
- En **Configuración → Doble turno** se marcan los días con dos turnos (por defecto **sábado y domingo**) y el horario de cada uno (por defecto **mañana 11:00 a. m.–4:00 p. m.** y **tarde 5:30–11:30 p. m.**). Un día se marca con doble turno al abrirse; en Asistencia se puede activar o quitar a mano ese día.
- En esos días, a cada empleado que **Trabajó** se le indica el turno: **Mañana**, **Tarde** o **Ambos**. Es obligatorio para cerrar.
- **Cierre del turno de la mañana** (al terminar la mañana): se anotan sus propinas y se reparten en partes iguales entre quienes hicieron la mañana (Mañana o Ambos). Desde ahí queda fijo quién hizo la mañana (nadie entra ni sale de ese turno) hasta que se reabra el turno.
- **Cierre del día** (en la noche): venta y gastos totales del día, propinas de la tarde (repartidas entre Tarde y Ambos) y el pago de cada empleado. Si no se cerró la mañana, sus propinas se anotan aquí mismo.
- **Pago por turno:** la tarifa del puesto **por cada turno** (Ambos = doble), automático.
- Pagos y Reportes suman ambos turnos (pago y propinas del día por empleado).

### RF-5 · Reportes
Filtro por rango de fechas (semana, quincena, mes o personalizado):
- **Ventas y gastos:** venta total, gastos, *venta − gastos*, propinas, promedio diario, mejor día y tabla por día (venta, gastos, venta − gastos, propinas). *Venta − gastos* solo cuenta los días con gastos anotados (si no, parecería ganancia) y se avisa cuántos días no los tienen. No descuenta el pago de empleados (eso está en Pagos).
- **Propinas por empleado:** total recibido y días que recibió.
- **Asistencia por empleado:** días trabajados, descansos, descansos extra, faltas, vacaciones.
- Exportar cada reporte a **CSV**.

### RF-6 · Inicio ("Hoy")
- **Quién está hoy** en una tarjeta con chips: barra de proporción y grupos Trabajan / Pendientes / Descansan (con el motivo) / Faltaron; cada grupo muestra 12 y "+N más". Tocar un pendiente lo marca **Trabajó** (con Deshacer) y hay "Marcar los N pendientes como Trabajó"; en días de doble turno los pendientes llevan a Asistencia (hay que elegir el turno).
- Número de empleados pendientes de marcar.
- Estado del día (Abierto / Cerrado), venta y propinas si ya se cerró.
- Accesos directos a Asistencia y Cierre.

### RF-7 · Pago diario
- Aplica a **todos** los empleados.
- **Tarifa fija por puesto** (desde 2026-09-28). En Configuración → **Puestos y pago diario** se agregan, renombran, quitan y cambian de pago los puestos. Iniciales: Cocinero $80.000, Mesero $60.000, Cajero $80.000, Jefe de mesa $70.000, Bartender $80.000.
- El **pago del día** de cada empleado que **Trabajó** es **automático** (desde 2026-09-28 no se escribe en el cierre): la tarifa de su puesto (en doble turno, por cada turno). El cierre lo muestra junto con la propina y el total.
- Un empleado sin puesto no deja cerrar el día hasta asignárselo.
- Cambiar la tarifa de un puesto no modifica los días ya cerrados. Si se reabre un día, quien no cambió conserva lo que se le pagó; solo se recalcula a quien se le cambie el estado o el turno. Un puesto que tiene empleados no se puede quitar.
- Es obligatorio para cerrar (puede ser $0). Los demás estados (descanso, permiso, falta, vacaciones/incapacidad) **no se pagan**.
- Queda guardado con el cierre; al reabrir el día se puede corregir.

### RF-8 · Pago semanal
- Pantalla **Pagos** con un periodo: por defecto la semana actual; el día en que empieza la semana es **configurable** (lunes por defecto) y también se puede elegir un rango libre de fechas.
- Por cada empleado: días trabajados, suma de pagos diarios, suma de propinas y **total a pagar** = pagos diarios + propinas.
- Detalle por día al abrir un empleado (fecha, pago del día, propina).
- Aviso si en el periodo hay días **sin cerrar** (sus pagos y propinas aún no cuentan).
- Exportar a CSV.

### RF-9 · Apertura diaria
- El restaurante **abre de lunes a domingo** (decisión del 2026-09-28). Ya no existen días de cierre semanal ni **festivos**: un festivo es un día normal con el horario de su día de la semana.
- **Cierre puntual:** en Asistencia, "Marcar como día cerrado" (ej. 25 de diciembre) y "Abrir este día" para deshacerlo. Cerrar un día borra su asistencia sin cerrar; un día ya cerrado con venta hay que reabrirlo primero. Un día marcado como cerrado no tiene asistencia y Pagos/Reportes no lo cuentan como "día sin cerrar".
- **Hoy** indica el horario del día.

### RF-10 · Configuración y seguridad
- Pantalla **Configuración** (ícono de engranaje arriba):
  - **Cuenta:** cambiar correo y/o contraseña; siempre pide la contraseña actual. Contraseña nueva: mínimo 10 caracteres, con letras y números, distinta de la actual.
  - **Sesiones:** cambiar la contraseña o pulsar "Cerrar sesión en los demás dispositivos" invalida las sesiones de otros equipos (versión de sesión en el usuario).
  - **Restaurante:** WhatsApp, día de inicio de la semana de pago, día de pago y horario de atención (RF-13). Se guardan en la BD (tabla `AppSettings`); las variables de entorno solo son el valor inicial.
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
- **Horario** (Configuración): hora de apertura y de cierre para cada día de la semana (lunes a domingo). Es **informativo**: se muestra en Hoy y en Asistencia. El día de trabajo sigue cambiando a medianoche (siempre cierran antes de las 12).
  - Un día vacío no muestra horario. Un día marcado como cerrado no muestra horario.
  - La hora de cierre debe ser posterior a la de apertura.
- **Día de pago** (Configuración, por defecto lunes): la semana se paga el primer día de pago desde que termina (semana lunes–domingo → se paga el lunes siguiente).
  - Hoy muestra la tarjeta **"Hoy es día de pago"** con lo que falta pagar de la semana que terminó, cuántos empleados y un botón **Ir a pagar** (abre esa semana en Pagos). Si pasa el día y sigue sin pagar: **"Pago pendiente desde…"**. Desaparece cuando todo queda marcado como pagado.
  - Si esa semana tiene días sin cerrar, avisa que el total puede cambiar.
  - Entregar el dinero es responsabilidad de los dueños; el sistema calcula, recuerda y registra.

### RF-14 · Reservas
- Pantalla **Reservas** en el menú. Cada reserva tiene: **fecha y hora**, **cantidad de personas**, **a nombre de** (quien reserva), **teléfono** (opcional), **ocasión** (opcional: Cumpleaños, Aniversario, Grado, Despedida, Reunión de trabajo, Pedida de mano u "Otra" con texto libre), **persona de la ocasión** (ej. el cumpleañero; solo si hay ocasión) y **observación**.
- Dos pestañas, agrupadas por día con total de reservas y personas (el encabezado del día queda fijo al bajar):
  - **Próximas** (desde hoy), con un resumen arriba: hoy, mañana y los próximos 7 días (reservas y personas, sin canceladas).
  - **Historial**: reservas de un periodo (semana, quincena, mes u otras fechas; por defecto el mes actual) **hasta hoy**, de la más reciente hacia atrás, con resumen: reservas, personas, llegaron (% de las marcadas), no vinieron y canceladas, y aviso de las que siguen **sin marcar** con enlace para verlas.
- **Buscar por nombre** (quien reserva o persona de la ocasión) y **filtrar por estado** (Todas, Confirmadas / Sin marcar, Llegó, No vino, Canceladas) con el número de cada una; búsqueda, estado y periodo se combinan y se conservan en la dirección (se puede compartir o volver atrás).
- Las confirmadas de días pasados se marcan **Sin marcar**.
- Estados: **Confirmada** (al crearla), **Llegó**, **No vino** (se marcan desde el día de la reserva) y **Cancelada** (desde Editar; queda en el historial y no cuenta en los totales). Todos se pueden deshacer. **Eliminar** borra la reserva (para las registradas por error).
- **Elegir fecha y hora rápido:** botones **Hoy**, **Mañana** y los 5 días siguientes (los marcados como cerrados salen desactivados) u **Otra fecha**; horas **cada 30 minutos** según el horario del día (sin horario: 11:00 a. m. a 11:00 p. m.) u **Otra hora**; personas con botones **− / +**.
- **Nada hacia atrás:** no se anotan reservas en fechas u horas que ya pasaron (hoy solo se ofrecen las horas que faltan; el servidor lo vuelve a revisar con 10 minutos de margen). Una reserva vieja se puede corregir (nota, teléfono…) sin moverla, pero no moverla a una fecha u hora pasada.
- Avisos que no impiden guardar: el restaurante está cerrado ese día (encabezado del día) o la hora queda fuera del horario de atención (RF-13).
- **Hoy** muestra las reservas del día con acceso a Nueva reserva.
- **WhatsApp:** en las reservas confirmadas de hoy en adelante con teléfono, botón que abre WhatsApp con el mensaje de confirmación escrito (nombre, fecha, hora, personas y ocasión); el empleado solo lo envía. Números de 10 dígitos llevan el indicativo `PHONE_COUNTRY_CODE` (57).

### RF-24 · Historial de cambios de cada reserva
- Al final de cada reserva: **quién** hizo **qué** y **cuándo**, del más reciente al más viejo: la creó, la editó (con cada dato que cambió: "Hora: 7:30 p. m. → 8:00 p. m."), la canceló, la volvió a confirmar, marcó Llegó / No vino o quitó la marca.
- Guardar sin cambios no deja registro. Las reservas anteriores al historial muestran su creación con los datos que ya tenían ("Registrada por").
- Si se elimina la reserva, se borra con su historial (eliminar es para las anotadas por error).

### RF-15 · Reporte de reservas
- En **Reportes → Reservas**, para el periodo elegido: reservas y personas (sin canceladas), promedio de personas por reserva, % que llegaron (llegó / (llegó + no vino)), confirmadas por venir y canceladas.
- Aviso de reservas pasadas sin marcar Llegó / No vino, con enlace para marcarlas.
- Tablas por día de la semana, por hora y por ocasión (reservas y personas).
- CSV con todas las reservas del periodo y el resumen.

### RF-16 · Página pública
- En la raíz del sitio (`/`); la administración pasa a `/gestion` (login en `/gestion/login`) y las direcciones viejas redirigen.
- Secciones: portada (foto, lema, especialidades, "hoy abrimos de…"), **menú** completo en HTML con atajos por sección y descarga del PDF, **reservar**, **ubicación** (mapa y "Cómo llegar") con el **horario** de Configuración, Instagram y acceso discreto para empleados.
- **Reservas desde la web:** el cliente llena nombre, fecha (desde hoy), hora (lista cada 30 minutos según el horario del día; hoy solo las que no han pasado), personas, ocasión, persona de la ocasión y observación; se abre el **WhatsApp del restaurante** con el mensaje listo. **No se guarda nada**: el restaurante confirma por WhatsApp y el empleado la anota en `/gestion/reservas`.
- **Pedidos:** botón "Pedir a domicilio" y botón flotante que abren WhatsApp con "Quiero hacer un pedido".
- El número de WhatsApp se cambia en **Configuración** (por defecto 301 216 8273).
- SEO: título y descripción, imagen para redes, datos estructurados de restaurante (dirección, horario, reservas), `robots.txt` (sin `/gestion`) y `sitemap.xml`. La página se regenera cada 10 minutos y al guardar Configuración.

### RF-17 · Reseñas en la página pública
- Sección **"Lo que dicen nuestros clientes"** (antes de Reservar): calificación general y total de opiniones de Google, tarjetas con estrellas, texto, nombre abreviado y fecha relativa ("hace 8 meses"), y botones **"Déjanos tu reseña"** (abre el formulario de Google) y **"Ver todas en Google"**.
- **Sin API de Google**: las reseñas se copian a mano. En **/gestion/resenas** (desde Configuración → Página pública) se agregan, editan, ocultan, ordenan y eliminan; también se actualiza la calificación y el total.
- Arranca con 8 reseñas copiadas de Google el 2026-09-26 (4,6 ★ · 243 opiniones).

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

enum UserRole {
  ADMIN
  RESERVATIONS
}

model User {
  id             String   @id @default(cuid())
  email          String   @unique
  passwordHash   String
  name           String?
  role           UserRole @default(ADMIN)
  active         Boolean  @default(true)
  sessionVersion Int      @default(0)
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
  expensesTotal Decimal?   @db.Decimal(10, 2) // gastos del día; null en días cerrados antes de anotarlos
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
| Autenticación | **Sesión propia con jose** (cookie JWT firmada) + bcrypt | Patrón recomendado por Next 16; más simple que Auth.js para pocos usuarios. El rol se lee de la BD en cada petición (`verifyAdmin` / `verifyReservations` en `src/lib/dal.ts`). |
| Validación | **Zod** | Mismos esquemas en formularios y en servidor. |
| Parámetros de la dirección | **nuqs** | Filtros, búsqueda, fechas y periodos en la URL con tipo y valor por defecto, definidos una vez (`src/lib/search-params.ts`) y usados igual en el servidor (loaders), en los enlaces (serializers) y en el cliente (`useQueryState`). |
| Fechas | **date-fns + date-fns-tz** | Manejo del día local del restaurante. |
| Pruebas | **Vitest** | Pruebas unitarias del reparto de propinas y reglas de asistencia. |
| Deploy | **Vercel** | Despliegue gratuito y automático desde Git. |

## 8. Pantallas

1. **Login**
2. **Hoy** (inicio / dashboard)
3. **Asistencia** — selector de fecha, lista de empleados con su estado.
4. **Cierre del día** — venta total, gastos, propinas, pago del día por empleado, vista previa del reparto, cerrar/reabrir.
5. **Empleados** — lista, alta, edición, baja/reactivación, días libres asignados.
6. **Pagos** — resumen semanal (o rango libre) por empleado: días trabajados, pagos diarios, propinas y total a pagar.
7. **Reportes** — ventas y gastos, propinas por empleado, asistencia; exportar CSV.
8. **Configuración** — usuarios, correo y contraseña, cerrar otras sesiones, inicio de la semana de pago, días de cierre (zona horaria, moneda y hora de corte se muestran; se cambian en Vercel).
9. **Usuarios** — lista, alta y edición (rol, contraseña nueva), desactivar/activar. Los de Reservas ven solo Reservas y **Mi cuenta**.

## 9. Requisitos no funcionales

- **Mobile-first:** todo usable con una mano desde el celular.
- Interfaz en **español**.
- Moneda y zona horaria configurables.
- Respaldos automáticos de la base de datos (los del proveedor: Neon/Supabase).
- Tiempo de carga de pantallas < 2 s en conexión móvil normal.
- **Respuesta inmediata al navegar:** al tocar una sección se ve al instante su esqueleto de carga (la forma de la pantalla) mientras llegan los datos.
- **Errores entendibles:** si una pantalla no carga (conexión, servidor), mensaje en español con **Reintentar** e **Ir al inicio**, sin perder el menú; un registro que ya no existe muestra "No encontramos lo que buscas".

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
| F6 ✅ | Cierres puntuales (RF-9). Los días de cierre semanal y los festivos se quitaron el 2026-09-28. |
| F7 ✅ | Configuración (cuenta, sesiones, ajustes del restaurante) y límite de intentos de login (RF-10). |
| F8 ✅ | Pagos realizados (RF-11) y gráfico de ventas (RF-12). |
| F9 ✅ | Horario de atención y recordatorio del día de pago (RF-13). |
| F10 ✅ | Reservas (RF-14). |
| F11 ✅ | Confirmación por WhatsApp y reporte de reservas (RF-14, RF-15). |
| F12 ✅ | Administración en `/gestion` y página pública con menú y reservas por WhatsApp (RF-16). |
| F13 ✅ | Reseñas en la página pública, administradas en /gestion/resenas (RF-17). |
| F14 ✅ | Puestos con pago diario fijo, configurables (RF-7). |
| F15 ✅ | Doble turno con propinas por turno (RF-18). |
| F16 ✅ | Producción con pago fijo + excedente en el pago semanal (RF-19) y menú "Más" (RF-20). |
| F17 ✅ | Gastos del día en el cierre y en reportes (RF-3, RF-5). |
| F18 ✅ | Usuarios con rol: administradores y usuarios que solo manejan reservas (RF-21). |
| F19 ✅ | Recordatorio por correo 1 hora antes de cada reserva, con Resend (RF-22). |
| F20 ✅ | Reservas en Google Calendar por invitaciones de correo (RF-23). |
| F21 ✅ | Reservas: pestañas Próximas / Historial, búsqueda y filtros por estado y fechas, e historial de cambios (RF-14, RF-24). |
| F22 ✅ | Asistencia rápida en chips por puesto, barra fija con "Ir al cierre" y "Quién está hoy" en chips (RF-2, RF-6). |
| T2 ✅ | Parámetros de la dirección con nuqs; búsqueda mientras se escribe en Reservas y Empleados. |
| F23 ✅ | Historial de cambios de producción: pestaña Historial y sección en cada jornada (RF-25). |
| F24 ✅ | Pantallas de carga (esqueletos) en cada sección, pantalla de error con Reintentar y "No encontrado" (requisitos no funcionales). |
| F25 ✅ | Ficha del empleado: historial del mes (calendario, lo ganado, pagado / por pagar, pagos) y sus datos (RF-1). |
| F26 ✅ | Lista de empleados por puesto: chips con conteos, cómo está hoy cada uno, su mes y dados de baja plegados (RF-1). |
| F27 ✅ | Ficha del empleado por semana de pago: los 7 días con lo ganado, estado del pago y últimas semanas (RF-1). |

## 11. Preguntas abiertas

- ¿Algún empleado tiene más de un día de descanso fijo por semana? (el modelo ya lo soporta)

**Resueltas**
- Zona horaria: **America/Bogota** (`APP_TIMEZONE`).
- Fin del día de trabajo: **00:00** (`DAY_CUTOFF_HOUR=0`, configurable).
- Moneda: **peso colombiano (COP)**, montos enteros sin centavos (`APP_CURRENCY`). El reparto de propinas redondea a pesos: el sobrante se da de 1 peso en 1 peso por orden alfabético.
