# PadelJarto

App web para organizar torneos privados de pádel entre amigos con:

- login social con Google y Apple vía Supabase
- torneos reutilizables
- grupos + eliminatoria
- modo `fixed_pairs` y modo `individual_ranking`
- resultados enviados por jugadores y validados por organizer

## Stack

- `Next.js 16` + `React 19` + `TypeScript`
- `Tailwind CSS 4`
- `Supabase Auth + data adapter`
- capa de dominio propia para calendario, standings y cuadro final
- `Vitest` para reglas puras

## Estado actual

La app funciona ya en dos modos:

1. `Demo mode`
   Si faltan credenciales de datos, puedes entrar como organizer o player demo y recorrer el MVP completo con torneos de ejemplo.

2. `Supabase full mode`
   Si configuras `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY`, tanto el login OAuth como el repositorio de torneos pasan a usar Supabase.

El esquema SQL para la base está en `supabase/schema.sql`.

## Setup

1. Instala dependencias:

```bash
npm install
```

2. Crea variables de entorno:

```bash
cp .env.example .env.local
```

3. Arranca en desarrollo:

```bash
npm run dev
```

## Scripts

```bash
npm run dev
npm run lint
npm run typecheck
npm run test
npm run build
```

## Flujo del MVP

- `/login`: acceso OAuth o demo
- `/app`: dashboard con torneos e invitaciones
- `/app/tournaments/new`: wizard de creación
- `/app/tournaments/[id]`: gestión completa del torneo
- `/invite/[token]`: aceptación de invitación privada

## Reglas implementadas

- marcador al mejor de 3 sets
- clasificación recalculada solo con resultados validados
- orden por victorias, mini head-to-head, diferencia de sets y diferencia de juegos
- en `fixed_pairs`, el cuadro final se genera automáticamente desde la clasificación
- en `individual_ranking`, el organizer define manualmente las parejas del knockout

## Supabase

El proyecto ya trae:

- clientes browser/server para Supabase
- cliente admin para mutaciones server-side
- callback OAuth
- sincronización del perfil autenticado hacia la capa de datos
- esquema SQL inicial

Para una puesta en producción completa, configura también `SUPABASE_SERVICE_ROLE_KEY` y aplica el esquema SQL.

## Deploy

El workflow de GitHub Actions está en `.github/workflows/deploy.yml` y despliega a Vercel al hacer push a `main` o al ejecutarlo manualmente.

Configura estos secrets en GitHub:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

Las variables de Supabase se gestionan como variables de entorno del proyecto en Vercel.
