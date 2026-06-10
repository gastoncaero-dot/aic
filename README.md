# Prode Mundial 2026 ⚽

App web para armar y organizar un **prode (pool de pronósticos) del Mundial 2026** con amigos.
Cada jugador carga sus pronósticos para los 104 partidos del torneo, arma o se suma a "ligas"
privadas con un código de invitación, y compite en una tabla de posiciones.

Construida con **React + Vite + TypeScript + Tailwind CSS**, **Firebase** (Firestore +
Authentication, plan gratuito Spark) y pensada para deployar gratis en **Netlify**.

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

Toda la lógica de puntaje vive en [`src/lib/scoring.ts`](src/lib/scoring.ts) y se aplica para
calcular la tabla de posiciones en [`src/pages/LeagueDetail.tsx`](src/pages/LeagueDetail.tsx).

## Stack

- **Frontend**: React 19 + Vite + TypeScript + Tailwind CSS v4, react-router-dom.
- **Backend**: [Firebase](https://firebase.google.com) (Firestore + Authentication). El plan
  gratuito **Spark** alcanza de sobra para un grupo de amigos.
- **Hosting**: [Netlify](https://www.netlify.com) (plan gratuito), configurado vía `netlify.toml`.

## Puesta en marcha

### 1. Crear el proyecto en Firebase

1. Creá un proyecto en [console.firebase.google.com](https://console.firebase.google.com).
2. Andá a **Build > Authentication > Sign-in method** y habilitá el proveedor **Email/contraseña**.
3. Andá a **Build > Firestore Database** y creá la base de datos (modo producción).
4. En **Firestore Database > Reglas**, pegá el contenido completo de
   [`firestore.rules`](firestore.rules) y publicá.
5. La configuración del proyecto (`apiKey`, `authDomain`, etc.) ya está embebida en
   [`src/lib/firebase.ts`](src/lib/firebase.ts) — no es información secreta, así que no hace
   falta usar variables de entorno. Si vas a usar tu propio proyecto de Firebase, reemplazá esos
   valores por los de **Configuración del proyecto > Tus apps > Configuración del SDK**.

### 2. Correr la app en desarrollo

```bash
npm install
npm run dev
```

Abrí la URL que te indica Vite (por defecto `http://localhost:5173`).

### 3. Crear tu usuario administrador y cargar el fixture

1. Registrate normalmente desde la app (`/signup`).
2. En **Firestore Database > Datos** de Firebase, abrí la colección `users`, buscá el documento
   con tu UID y cambiá el campo `is_admin` a `true`.
3. Volvé a iniciar sesión. Vas a ver la pestaña **Admin** en el menú.
4. En **Admin > Configuración** vas a ver un botón **"Cargar datos iniciales"** (solo aparece si
   todavía no hay equipos cargados): hacé click para crear los 48 equipos y los 104 partidos del
   fixture inicial de una sola vez.
5. Desde **Admin** podés:
   - Cargar resultados partido a partido (fase de grupos y eliminación directa).
   - Completar los equipos de la eliminación directa a medida que se van definiendo.
   - Configurar el cierre de pronósticos especiales y, al final del torneo, cargar campeón,
     subcampeón y goleador para liquidar los puntos especiales.

### 4. Deploy en Netlify

1. Subí el repo a GitHub (o el proveedor que uses) y conectalo en Netlify como **nuevo sitio**, o
   arrastrá la carpeta `dist` (generada con `npm run build`) a
   [app.netlify.com/drop](https://app.netlify.com/drop).
2. Netlify ya toma `npm run build` y la carpeta `dist` desde [`netlify.toml`](netlify.toml);
   no hace falta configurar variables de entorno.

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
- `node scripts/generate-seed.mjs` — regenera `src/data/seedData.ts` (equipos + fixture). Útil
  si necesitás corregir fechas/horarios del fixture según el calendario oficial de FIFA;
  también podés editar los partidos directamente desde el panel de Admin una vez cargados.

## Estructura del proyecto

```
src/
  components/   Componentes de UI (navbar, fila de partido, editor de admin, etc.)
  context/      Contexto de autenticación (Firebase Auth)
  data/         seedData.ts: equipos + fixture inicial para el botón "Cargar datos iniciales"
  hooks/        Hooks de datos (fixture de equipos/partidos)
  lib/          Cliente de Firebase, reglas de puntaje, formateo de fechas
  pages/        Páginas/rutas (Inicio, Fixture, Reglas, Pronósticos, Ligas, Admin, etc.)
firestore.rules Reglas de seguridad de Firestore
scripts/
  generate-seed.mjs  Generador de src/data/seedData.ts
```
