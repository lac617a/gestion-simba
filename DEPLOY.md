# Publicar Gestión Simba (F5)

Guía paso a paso para dejar la app en internet: **código en GitHub → base de datos en Neon → app en Vercel**.
Los comandos son para **PowerShell** en esta PC, desde la carpeta del proyecto (`D:\Develop\gestion-simba`).

Tiempo estimado: 30–45 minutos.

---

## 0. Antes de empezar

- **Costos:**
  - **Neon (base de datos):** el plan gratis alcanza de sobra para un restaurante (0,5 GB). Si nadie usa la app un rato, la BD se "duerme" y el primer acceso tarda ~1 segundo más.
  - **Vercel (la app):** el plan gratis (*Hobby*) es solo para uso **personal y no comercial**. Como la usa un negocio, lo correcto es el plan **Pro** (US$20/mes). Revisa las condiciones actuales en vercel.com/pricing antes de decidir.
- Vas a crear cuentas y escribir contraseñas en esos servicios: eso lo haces tú. Cuando un paso diga **"pégalo en el chat"**, es para que yo siga con lo que sigue.

---

## 1. Subir el código a GitHub

1. Entra a <https://github.com> y crea una cuenta si no tienes.
2. Arriba a la derecha: **+ → New repository**.
   - Nombre: `gestion-simba`
   - Visibilidad: **Private** (el código no tiene secretos, pero no hace falta que sea público).
   - **No** marques "Add a README" ni ".gitignore" (el proyecto ya los tiene).
3. Copia la URL del repositorio (algo como `https://github.com/TU_USUARIO/gestion-simba.git`).
4. En PowerShell:

   ```powershell
   git remote add origin https://github.com/TU_USUARIO/gestion-simba.git
   git push -u origin main
   ```

   La primera vez Git abre una ventana para iniciar sesión en GitHub.

> El archivo `.env` (con tus claves) **no** se sube: está en `.gitignore`.

---

## 2. Crear la base de datos en Neon

1. Entra a <https://neon.tech> → **Sign up** (puedes entrar con tu cuenta de GitHub).
2. **Create project**:
   - Nombre: `gestion-simba`
   - Postgres: la versión que venga por defecto.
   - Región: **AWS US East (N. Virginia)** — la misma zona donde Vercel corre la app por defecto, así la app y la BD quedan cerca.
3. En el panel del proyecto, botón **Connect**. Copia **dos** direcciones:
   - **Con pooling activado** (el host contiene `-pooler`) → la usará la app. La llamaremos **URL_POOLED**.
   - **Con pooling desactivado** → para crear las tablas. La llamaremos **URL_DIRECTA**.

   Ambas se ven así: `postgresql://usuario:clave@ep-xxxx.us-east-1.aws.neon.tech/neondb?sslmode=require`

> Estas direcciones incluyen la contraseña de la BD: no las pegues en el chat ni las subas a GitHub.

---

## 3. Crear las tablas y el usuario admin (desde tu PC)

Esto se hace una sola vez, apuntando a Neon con la **URL_DIRECTA**.

1. Crea las tablas:

   ```powershell
   $env:DATABASE_URL = "PEGA_AQUI_LA_URL_DIRECTA"
   npx prisma migrate deploy
   ```

   Debe terminar con `All migrations have been successfully applied`.

2. Crea el admin de producción con **tu** correo y una **contraseña fuerte** (no uses `cambiar123`):

   ```powershell
   $env:ADMIN_EMAIL = "tu-correo@ejemplo.com"
   $env:ADMIN_PASSWORD = "UNA_CONTRASEÑA_LARGA_Y_DIFICIL"
   npm run db:seed
   ```

   Debe decir `Admin listo: tu-correo@ejemplo.com`.

3. Borra esas variables de la sesión para no usarlas por error después:

   ```powershell
   Remove-Item Env:DATABASE_URL, Env:ADMIN_EMAIL, Env:ADMIN_PASSWORD
   ```

4. Genera la clave de sesión para producción y guárdala (la usarás en el paso 4):

   ```powershell
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

---

## 4. Publicar en Vercel

1. Entra a <https://vercel.com> → **Sign up with GitHub**.
2. **Add New… → Project** → busca `gestion-simba` → **Import**.
   (Si no aparece: **Adjust GitHub App Permissions** y dale acceso a ese repositorio.)
3. Framework: Vercel detecta **Next.js** solo. No cambies Build Command ni Output Directory.
4. Abre **Environment Variables** y agrega **todas** estas **antes** de pulsar Deploy (el build las necesita):

   | Variable | Valor |
   |---|---|
   | `DATABASE_URL` | la **URL_POOLED** de Neon |
   | `SESSION_SECRET` | la clave que generaste en el paso 3.4 |
   | `APP_TIMEZONE` | `America/Bogota` |
   | `DAY_CUTOFF_HOUR` | `0` |
   | `APP_CURRENCY` | `COP` |
   | `PAY_WEEK_START` | `1` |

   **No** agregues `DATABASE_POOL_MAX` (solo es para la BD local).
5. **Deploy**. Tarda 1–3 minutos. Al terminar te da una dirección tipo `https://gestion-simba-xxxx.vercel.app`.
6. **Pégame en el chat esa dirección** (no las claves) y la reviso contigo.

---

## 5. Comprobar que todo funciona

En la dirección de Vercel, desde la PC y desde el celular:

- [ ] Entrar con el correo y la contraseña del paso 3.2.
- [ ] Registrar un empleado.
- [ ] En **Asistencia**, la fecha de hoy es la correcta (hora de Colombia).
- [ ] Marcar la asistencia y **cerrar el día** con venta, propinas y pago.
- [ ] **Pagos** y **Reportes** muestran los montos; el **CSV** se descarga y abre en Excel.
- [ ] En el celular: **Compartir → Agregar a pantalla de inicio** para tenerla como una app.

---

## 6. Después: cómo se actualiza

- Cada `git push` a `main` → Vercel publica la nueva versión sola en 1–3 minutos.
- Si un cambio trae **migraciones nuevas** (carpeta `prisma/migrations`), **antes** del push aplica la migración a Neon con la **URL_DIRECTA**, igual que en el paso 3.1.
- Respaldos: Neon guarda historial para restaurar la BD a un momento anterior (ver *Branches / Restore* en su panel; los días de historial dependen del plan).

---

## 7. (Opcional) Pasar tus datos locales a Neon

La app en Neon arranca **vacía**. Si quieres llevar lo que ya registraste en tu PC (empleados, días cerrados, pagos), dímelo y preparo un script que los copie. Se corre una vez, antes de empezar a usar la versión publicada.

---

## Si algo falla

| Síntoma | Causa probable |
|---|---|
| El build en Vercel falla mencionando `DATABASE_URL` | Falta la variable en Vercel (paso 4.4). Agrégala y usa **Redeploy**. |
| "Correo o contraseña incorrectos" en producción | El admin se creó en otra BD. Repite el paso 3.2 con la URL de Neon. |
| Error al cargar pantallas (500) | Faltan tablas: repite el paso 3.1. Los detalles salen en Vercel → proyecto → **Logs**. |
| La fecha de "hoy" está corrida | Revisa `APP_TIMEZONE=America/Bogota` en Vercel y haz Redeploy. |
