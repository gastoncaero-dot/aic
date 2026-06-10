# Prode Mundial 2026 ⚽

App web para armar y organizar un **prode (pool de pronósticos) del Mundial 2026** con amigos.
Cada jugador carga sus pronósticos para los 104 partidos del torneo, arma o se suma a "ligas"
privadas con un código de invitación, y compite en una tabla de posiciones.

Construida con **React + Vite + TypeScript + Tailwind CSS**, **Supabase** (base de datos,
autenticación y permisos) y pensada para deployar gratis en **Netlify**.

## Reglas de puntaje

- **5 puntos**: acertás el resultado exacto (ej: predijiste 2-1 y terminó 2-1).
- **2 puntos**: acertás el ganador/empate pero no el resultado exacto (ej: predijiste 2-1 y terminó 3-0).
- **0 puntos**: no acertás ni el resultado ni el signo del partido.
- En partidos de eliminación directa solo se evalúa el resultado de los 90 minutos
  (no se tienen en cuenta penales ni alargue).
- Los pronósticos de un partido se cierran **60 minutos antes del kickoff**.

### Pronósticos especiales (una vez por torneo)

- 🏆 **Campeón del Mundial**: 20 puntos.
- 🥈 **Subcampeón**: 10 puntos.
- 👟 **Goleador / Balón de Oro**: 10 puntos (debe coincidir el nombre, sin importar mayúsculas/minúsculas).

Estos pronósticos se cierran en la fecha que configure el administrador (por defecto, el
arranque del Mundial) y se liquidan cuando el admin carga los resultados finales.

### Desempates

1. Más resultados exactos.
2. Más aciertos totales (exactos + por signo).
3. Acertar al campeón.

Toda la lógica de puntaje vive en [`src/lib/scoring.ts`](src/lib/scoring.ts) y está
sincronizada con las vistas SQL de [`supabase/schema.sql`](supabase/schema.sql).

## Stack

- **Frontend**: React 19 + Vite + TypeScript + Tailwind CSS v4, react-router-dom.
- **Backend**: [Supabase](https://supabase.com) (Postgres + Auth + Row Level Security). Plan
  gratuito alcanza de sobra para un grupo de amigos.
- **Hosting**: [Netlify](https://www.netlify.com) (plan gratuito), configurado vía `netlify.toml`.

## Puesta en marcha

### 1. Crear el proyecto en Supabase

1. Creá una cuenta y un proyecto nuevo en [supabase.com](https://supabase.com).
2. Andá a **SQL Editor** y ejecutá, en este orden:
   1. Todo el contenido de [`supabase/schema.sql`](supabase/schema.sql) — crea las tablas,
      funciones, vistas y políticas de RLS.
   2. Todo el contenido de [`supabase/seed.sql`](supabase/seed.sql) — carga los 48 equipos y
      los 104 partidos del fixture (fase de grupos con fechas estimadas + llaves de
      eliminación directa como "Por definir").
3. En **Authentication > Providers**, dejá habilitado el login por **Email**. Si no querés
   que los usuarios confirmen su email antes de poder loguearse, podés desactivar
   "Confirm email" en **Authentication > Settings** (más cómodo para un grupo cerrado de amigos).

### 2. Configurar las variables de entorno

1. Copiá `.env.example` a `.env`:
   ```bash
   cp .env.example .env
   ```
2. Completá `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` con los valores de
   **Project Settings > API** de tu proyecto Supabase.

### 3. Correr la app en desarrollo

```bash
npm install
npm run dev
```

Abrí la URL que te indica Vite (por defecto `http://localhost:5173`).

### 4. Crear tu usuario administrador

1. Registrate normalmente desde la app (`/signup`).
2. En el **SQL Editor** de Supabase, ejecutá (reemplazando el email):
   ```sql
   update public.profiles set is_admin = true
   where id = (select id from auth.users where email = 'tu@email.com');
   ```
3. Volvé a iniciar sesión. Vas a ver la pestaña **Admin** en el menú, donde podés:
   - Cargar resultados partido a partido (fase de grupos y eliminación directa).
   - Completar los equipos de la eliminación directa a medida que se van definiendo.
   - Configurar el cierre de pronósticos especiales y, al final del torneo, cargar
     campeón, subcampeón y goleador para liquidar los puntos especiales.

### 5. Deploy en Netlify

1. Subí el repo a GitHub (o el proveedor que uses) y conectalo en Netlify como **nuevo sitio**.
2. Netlify ya toma `npm run build` y la carpeta `dist` desde [`netlify.toml`](netlify.toml);
   no hace falta configurar nada manualmente.
3. En **Site configuration > Environment variables**, agregá `VITE_SUPABASE_URL` y
   `VITE_SUPABASE_ANON_KEY` con los mismos valores que usaste en `.env`.
4. Redeployá el sitio para que tome las variables de entorno.

## Cómo jugar con amigos

1. Cada persona se registra en `/signup`.
2. Desde **Mis ligas**, alguien crea una liga nueva (le pone nombre y queda como dueño).
3. Esa persona comparte el **código de invitación** de 6 caracteres con el resto.
4. Cada amigo entra a **Mis ligas > Sumarme a una liga** y pega el código.
5. Todos cargan sus pronósticos en **Mis pronósticos** y **Pronósticos especiales** antes de
   que cierre cada partido.
6. A medida que el admin carga resultados, la tabla de posiciones de cada liga
   (**Mis ligas > [nombre de la liga]**) se actualiza sola.

Una misma cuenta puede pertenecer a varias ligas (por ejemplo, una con la familia y otra
con el trabajo) — los pronósticos son los mismos, solo cambia con quién comparás puntos.

## Scripts útiles

- `npm run dev` — servidor de desarrollo.
- `npm run build` — chequeo de tipos + build de producción (`dist/`).
- `npm run lint` — ESLint.
- `node scripts/generate-seed.mjs` — regenera `supabase/seed.sql` (equipos + fixture). Útil
  si necesitás corregir fechas/horarios del fixture según el calendario oficial de FIFA;
  también podés editar los partidos directamente desde el panel de Admin una vez cargados.

## Estructura del proyecto

```
src/
  components/   Componentes de UI (navbar, fila de partido, editor de admin, etc.)
  context/      Contexto de autenticación (Supabase Auth)
  hooks/        Hooks de datos (fixture de equipos/partidos)
  lib/          Cliente de Supabase, reglas de puntaje, formateo de fechas
  pages/        Páginas/rutas (Inicio, Fixture, Reglas, Pronósticos, Ligas, Admin, etc.)
supabase/
  schema.sql    Esquema completo: tablas, RLS, funciones y vistas
  seed.sql      Datos iniciales: 48 equipos + 104 partidos
scripts/
  generate-seed.mjs  Generador de supabase/seed.sql
```
