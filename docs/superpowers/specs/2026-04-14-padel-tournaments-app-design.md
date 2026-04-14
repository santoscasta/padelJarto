# Padeljarto — Diseño de aplicación de torneos de padel

- **Fecha:** 2026-04-14
- **Autor:** @santoscastane (con Claude)
- **Estado:** Diseño aprobado, pendiente plan de implementación
- **Stack:** Next.js 16 App Router + React 19 + TypeScript + Supabase + Tailwind v4 + Vitest

---

## 1. Contexto

Un grupo estable de 12–30 amigos juega padel de forma regular. Necesitan una aplicación para:

- Organizar torneos formales con cuadro (grupos round-robin + fase eliminatoria).
- Mantener un **ranking continuo** entre torneos: doble — de jugadores **y** de parejas.
- Gestionar inscripciones por link compartible (sin mantener una base de usuarios pre-registrada).
- Permitir a los jugadores reportar resultados y al organizador validarlos.
- Consultar perfiles, estadísticas e historial de rating.

La app debe ser **PWA instalable en móvil** (uso principal desde el club/pista) con notificaciones por email para eventos críticos.

No es una plataforma pública: es una herramienta privada para el grupo.

---

## 2. Alcance MVP (V1)

**Todo se construye de una vez, sin entregas por fases.** El usuario pidió explícitamente la app completa en V1.

Incluye:

- **Autenticación** OAuth Google (Supabase Auth).
- **Perfiles de jugador** con stats, historial de rating (gráfica), torneos jugados, compañero/rival más frecuentes.
- **Torneos** con los tres modos de formación de parejas (el organizador elige por torneo):
  - `pre_inscribed` — jugadores se inscriben con su pareja ya elegida.
  - `draw` — todos se inscriben solos, las parejas se sortean al cerrar inscripciones.
  - `mixed` — combinación: algunos llegan con pareja, otros se apuntan solos y se emparejan.
- **Bracket**: grupos round-robin + eliminatorias (R32/R16/QF/SF/F según nº de parejas).
- **Reporte y validación de resultados**: jugador involucrado reporta set-by-set; organizador valida.
- **Ranking continuo** doble (jugadores + parejas) con ELO adaptado a 2v2.
- **Invitaciones por link compartible** (token 32 chars, expiración 7 días).
- **Notificaciones email** (Supabase Edge Function + proveedor tipo Resend) en: nueva inscripción, apertura de torneo, resultado reportado, resultado validado con delta de rating, torneo comenzado.
- **PWA**: manifest + service worker mínimo (cache de la shell, fallback offline).

No incluye V1 (pendiente de decisión o deliberadamente fuera):

- App nativa (solo PWA).
- Pagos / inscripciones de pago.
- Programación automática de horarios de pistas.
- Chat dentro de la app.
- Temporadas con corte anual (se puede añadir más tarde sin romper el schema).

---

## 3. Arquitectura

Tres capas limpias, cada una con dependencias unidireccionales (`app → repositories → domain`):

```
src/app/            ← Next.js 16 App Router (UI + server actions)
src/lib/repositories/ ← Puerto (interfaces) + adaptadores (Supabase, InMemory)
src/lib/domain/     ← TS puro, inmutable, sin red (tipos, pairing, bracket, rating, standings)
```

### Reglas de oro

1. **`domain/` no importa de `repositories/` ni de `app/`.** Solo tipos, funciones puras, Zod. Vitest lo testea sin mocks de red.
2. **`repositories/` expone interfaces**; las implementaciones (`supabase-repository.ts`, `in-memory-repository.ts`) son intercambiables.
3. **`app/` nunca llama a Supabase directamente.** Siempre a través del repositorio.
4. **Inmutabilidad en el dominio**: todas las funciones devuelven nuevos objetos, nunca mutan.

### Flujo de una petición ("validar resultado")

```
page.tsx → actions.ts (Zod valida input)
        → repo.getMatch(id)
        → domain.applyRating(match, ratings) → nuevos snapshots
        → repo.saveValidatedResult(snapshots, newRatings)  ← transacción atómica
        → revalidatePath + return ActionResult<T>
```

### Stack de infraestructura

| Área | Herramienta |
|---|---|
| DB + Auth | Supabase Postgres con RLS + Supabase Auth (OAuth Google) |
| Email | Supabase Edge Function → Resend |
| PWA | `app/manifest.ts` + service worker minimal en `public/sw.js` |
| Validación | Zod en todos los bordes (server actions, invitation tokens) |
| Tests | Vitest unit (≥80% cobertura global) + contrato InMemory↔Supabase |
| Hosting | Vercel (ya vinculado) |

---

## 4. Modelo de datos

11 tablas en Supabase Postgres.

### profiles

Extensión de `auth.users`.

- `id UUID` (= `auth.users.id`)
- `display_name TEXT NOT NULL`
- `avatar_url TEXT`
- `created_at TIMESTAMPTZ DEFAULT now()`

### players

Entidad de juego (separada de `profiles` por si en el futuro hay jugadores sin cuenta).

- `id UUID PRIMARY KEY`
- `profile_id UUID REFERENCES profiles(id) UNIQUE`
- `rating REAL NOT NULL DEFAULT 1200`
- `matches_played INT NOT NULL DEFAULT 0`

### pairs

Canónica por orden lexicográfico `player_a_id < player_b_id`.

- `id UUID PRIMARY KEY`
- `player_a_id UUID REFERENCES players(id) NOT NULL`
- `player_b_id UUID REFERENCES players(id) NOT NULL`
- `rating REAL NOT NULL DEFAULT 1200`
- `UNIQUE(player_a_id, player_b_id)`
- `CHECK (player_a_id < player_b_id)`

### tournaments

- `id UUID PRIMARY KEY`
- `owner_id UUID REFERENCES profiles(id) NOT NULL`
- `name TEXT NOT NULL`
- `status tournament_status NOT NULL DEFAULT 'draft'`  — enum (`draft`, `open`, `groups`, `knockout`, `complete`)
- `pairing_mode pairing_mode NOT NULL` — enum (`pre_inscribed`, `draw`, `mixed`)
- `size INT NOT NULL` — número de parejas objetivo (8/16/32)
- `starts_at TIMESTAMPTZ`
- `created_at TIMESTAMPTZ DEFAULT now()`

### inscriptions

- `id UUID PRIMARY KEY`
- `tournament_id UUID REFERENCES tournaments(id) NOT NULL`
- `player_id UUID REFERENCES players(id) NOT NULL`
- `pair_id UUID REFERENCES pairs(id)` — nullable en `draw` hasta el sorteo
- `status inscription_status NOT NULL DEFAULT 'pending'` — enum (`pending`, `confirmed`)
- `created_at TIMESTAMPTZ DEFAULT now()`
- `UNIQUE(tournament_id, player_id)`

### invitations

- `id UUID PRIMARY KEY`
- `tournament_id UUID REFERENCES tournaments(id) NOT NULL`
- `token TEXT NOT NULL UNIQUE` — 32 chars URL-safe desde `crypto.randomBytes`
- `expires_at TIMESTAMPTZ NOT NULL`
- `created_by UUID REFERENCES profiles(id) NOT NULL`
- `created_at TIMESTAMPTZ DEFAULT now()`
- Multi-uso en V1 (no `used_by` bloqueante); vence por `expires_at`.

### groups

- `id UUID PRIMARY KEY`
- `tournament_id UUID REFERENCES tournaments(id) NOT NULL`
- `label TEXT NOT NULL` — "A", "B", "C", …

### group_pairs (pivot)

- `group_id UUID REFERENCES groups(id)`
- `pair_id UUID REFERENCES pairs(id)`
- `PRIMARY KEY (group_id, pair_id)`

### matches

- `id UUID PRIMARY KEY`
- `tournament_id UUID REFERENCES tournaments(id) NOT NULL`
- `phase match_phase NOT NULL` — enum (`group`, `R32`, `R16`, `QF`, `SF`, `F`)
- `group_id UUID REFERENCES groups(id)` — nullable si no es fase de grupos
- `pair_a_id UUID REFERENCES pairs(id) NOT NULL`
- `pair_b_id UUID REFERENCES pairs(id) NOT NULL`
- `court TEXT`
- `scheduled_at TIMESTAMPTZ`
- `CHECK (pair_a_id <> pair_b_id)`

### results

Único por match (UNIQUE match_id). Las correcciones son nuevos rows con `status='corrected'` referenciando el original.

- `id UUID PRIMARY KEY`
- `match_id UUID REFERENCES matches(id) NOT NULL`
- `sets JSONB NOT NULL` — `[{a:6,b:4},{a:3,b:6},{a:7,b:5}]`
- `winner_pair_id UUID REFERENCES pairs(id) NOT NULL`
- `reported_by UUID REFERENCES profiles(id) NOT NULL`
- `validated_by UUID REFERENCES profiles(id)`
- `validated_at TIMESTAMPTZ`
- `status result_status NOT NULL DEFAULT 'reported'` — enum (`reported`, `validated`, `disputed`, `walkover`, `corrected`)
- `corrects_result_id UUID REFERENCES results(id)` — nullable
- `UNIQUE(match_id) WHERE status <> 'corrected'`

### rating_snapshots (append-only)

Cada resultado validado emite **6 snapshots**: 4 jugadores + 2 parejas.

- `id UUID PRIMARY KEY`
- `subject_type snapshot_subject NOT NULL` — enum (`player`, `pair`)
- `subject_id UUID NOT NULL`
- `before REAL NOT NULL`
- `after REAL NOT NULL`
- `delta REAL NOT NULL`
- `match_id UUID REFERENCES matches(id) NOT NULL`
- `result_id UUID REFERENCES results(id) NOT NULL`
- `created_at TIMESTAMPTZ DEFAULT now()`

### notifications

- `id UUID PRIMARY KEY`
- `user_id UUID REFERENCES profiles(id) NOT NULL`
- `kind notification_kind NOT NULL` — enum (`inscription_new`, `tournament_open`, `tournament_started`, `result_reported`, `result_validated`, …)
- `payload JSONB NOT NULL`
- `read_at TIMESTAMPTZ`
- `created_at TIMESTAMPTZ DEFAULT now()`

### Algoritmo de rating (ELO 2v2)

- **Base**: 1200. **K**: 32 (48 si `matches_played < 10`).
- **Pareja**: ELO clásico `pair_A` vs `pair_B` sobre el rating de la pareja.
- **Jugador**: expected score usando `(mi_rating + companero_rating) / 2` vs media del rival. El mismo delta se aplica a ambos compañeros.
- Snapshots append-only → historial auditable y datos para gráfica de perfil.

### RLS (Row Level Security)

| Tabla | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `profiles` | autenticado | propio | propio | — |
| `players` | autenticado | propio (trigger desde profiles) | propio | — |
| `pairs` | autenticado | server (service role desde action) | — | — |
| `tournaments` | autenticado | autenticado | `owner_id = auth.uid()` | `owner_id = auth.uid()` |
| `inscriptions` | autenticado | auth + tournament abierto | owner del torneo | owner del torneo |
| `invitations` | público por token (function RPC) | owner del torneo | — | owner del torneo |
| `groups` / `group_pairs` | autenticado | owner del torneo | owner del torneo | owner del torneo |
| `matches` | autenticado | owner del torneo | owner del torneo | — |
| `results` | autenticado | jugador de match | owner del torneo (validar) | — |
| `rating_snapshots` | autenticado | server (service role) | **denegado** | **denegado** |
| `notifications` | propio | server | propio (read_at) | propio |

---

## 5. Tipos del dominio (TypeScript)

```ts
// src/lib/domain/types.ts

export type TournamentStatus = 'draft' | 'open' | 'groups' | 'knockout' | 'complete';
export type PairingMode = 'pre_inscribed' | 'draw' | 'mixed';
export type MatchPhase = 'group' | 'R32' | 'R16' | 'QF' | 'SF' | 'F';
export type ResultStatus = 'reported' | 'validated' | 'disputed' | 'walkover' | 'corrected';

export type SetScore = { a: number; b: number };

export type Player = Readonly<{
  id: string;
  profileId: string;
  displayName: string;
  rating: number;
  matchesPlayed: number;
}>;

export type Pair = Readonly<{
  id: string;
  playerAId: string;
  playerBId: string;
  rating: number;
}>;

export type Tournament = Readonly<{
  id: string;
  ownerId: string;
  name: string;
  status: TournamentStatus;
  pairingMode: PairingMode;
  size: number;
  startsAt: string | null;
}>;

export type Match = Readonly<{
  id: string;
  tournamentId: string;
  phase: MatchPhase;
  groupId: string | null;
  pairAId: string;
  pairBId: string;
  court: string | null;
  scheduledAt: string | null;
}>;

export type Result = Readonly<{
  id: string;
  matchId: string;
  sets: ReadonlyArray<SetScore>;
  winnerPairId: string;
  reportedBy: string;
  validatedBy: string | null;
  validatedAt: string | null;
  status: ResultStatus;
  correctsResultId: string | null;
}>;

export type RatingSnapshot = Readonly<{
  id: string;
  subjectType: 'player' | 'pair';
  subjectId: string;
  before: number;
  after: number;
  delta: number;
  matchId: string;
  resultId: string;
  createdAt: string;
}>;

// src/lib/domain/action-result.ts
export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: ErrorCode; message: string; fields?: Record<string, string> };

export type ErrorCode =
  | 'VALIDATION_FAILED'
  | 'NOT_AUTHORIZED'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RESULT_ALREADY_VALIDATED'
  | 'INVITATION_EXPIRED'
  | 'TOURNAMENT_FULL';
```

### Funciones puras clave

- `domain/pairing.ts::drawPairs(singles, seed)` — empareja jugadores sueltos balanceando por rating. Determinista con seed.
- `domain/bracket.ts::generateGroups(pairs, groupCount)` — reparte parejas en grupos balanceados por rating medio.
- `domain/bracket.ts::generateRoundRobinMatches(groupPairs)` — todos contra todos dentro de un grupo.
- `domain/bracket.ts::seedKnockout(qualified)` — empareja 1A vs 2B, 1B vs 2A, …
- `domain/result.ts::validateSets(sets)` — Zod + reglas (6-X con X<5 o 7-5 o 7-6, mejor de 3).
- `domain/rating.ts::applyRating(match, currentRatings)` — devuelve 6 snapshots (4 jugadores + 2 parejas) y los nuevos ratings.
- `domain/standings.ts::computeStandings(group, matches)` — ordena parejas por (victorias, diff sets, diff games, enfrentamiento directo).

---

## 6. Flujos de extremo a extremo

### Flujo 1 — Crear torneo + generar link

1. Organizador autenticado va a `/tournaments/new`.
2. Form: nombre, starts_at, pairing_mode, size (8/16/32).
3. Server action: Zod valida → `repo.createTournament` → `status = 'draft'`.
4. En detalle: botón "Generar link" → `repo.createInvitation` (token 32 chars, 7d).
5. URL compartible: `/invite/[token]`.
6. Organizador "Abrir inscripciones" → `status = 'open'`.

### Flujo 2 — Amigo se inscribe desde el link

1. Amigo abre `/invite/[token]`.
2. Si no autenticado → OAuth Google → vuelve al mismo link.
3. Si no tiene `players` row → trigger crea profile + player con `display_name` del provider.
4. Landing muestra torneo + form según `pairing_mode`:
   - `pre_inscribed`: selector de compañero (búsqueda por nombre entre jugadores del grupo).
   - `draw`: "Me apunto solo".
   - `mixed`: radio "con pareja" / "solo".
5. Server action: Zod → crea `inscriptions` (+ `pairs` si procede) → notif email al organizador.

### Flujo 3 — Organizador genera el cuadro

1. Al cerrar inscripciones:
   - Si quedan singles → `drawPairs(singles, seed)` → crea pairs.
   - `generateGroups(pairs, groupCount)` → N grupos balanceados.
   - Por grupo → `generateRoundRobinMatches(group_pairs)`.
2. Batch insert: `groups`, `group_pairs`, `matches (phase='group')`.
3. `tournament.status = 'groups'`.
4. Notif email a todos los inscritos: "torneo comenzado".

### Flujo 4 — Reportar + validar resultado (el núcleo)

1. Jugador involucrado abre match → "Reportar resultado".
2. Form set-by-set (sets 1, 2, 3). Zod valida cada set.
3. `domain.validateSets(sets)` → `winnerPairId`.
4. Insert `results (status='reported')` + notif email al organizador.
5. Organizador abre → "Validar" o "Rechazar".
6. Al validar, **transacción atómica**:
   - `results.status = 'validated'`
   - `applyRating(match, currentRatings)` → 6 snapshots
   - Insert `rating_snapshots`
   - UPDATE `players.rating`, `pairs.rating`
7. Notif email a los 4 jugadores con delta.

### Flujo 5 — De grupos a eliminatorias

1. Cuando todos los matches de grupo están `validated`:
   - `computeStandings(group, matches)` por cada grupo.
   - Top 2 de cada grupo clasifica.
2. `seedKnockout(qualified)` → empareja 1A vs 2B, …
3. Batch insert matches (phase = R16 / QF según nº).
4. `tournament.status = 'knockout'`.
5. Cuando gana la final → `status = 'complete'`.

### Flujo 6 — Ranking continuo + perfil

- `/leaderboard` → dos tabs: **Jugadores** / **Parejas**. `ORDER BY rating DESC`.
- `/players/[id]`:
  - Rating actual + gráfica histórica (de `rating_snapshots`).
  - Stats: partidos jugados, ratio victoria, compañero más frecuente, rival más frecuente.
  - Lista de torneos participados.

---

## 7. Errores, seguridad y casos borde

### Casos borde

| Caso | Comportamiento |
|---|---|
| Resultado disputado (dos jugadores reportan distinto) | UNIQUE lo impide; el segundo report marca `status='disputed'`; organizador resuelve. |
| Organizador no valida nunca | Banner "pendiente de validación desde hace X días". Sin SLA automático en V1. |
| Corrección tras validar | Validated es **inmutable**. Se crea un result nuevo (`status='corrected'`, `corrects_result_id=...`) que emite snapshots compensatorios. |
| Jugador abandona el torneo | Su pareja recibe walkover en partidos pendientes (organizador marca match → `status='walkover'`). No actualiza ratings. |
| Empate en grupo | Tiebreaker: diff sets → diff games → enfrentamiento directo. |
| Link expirado | Landing: "invitación caducada, pide otra al organizador". |
| Link ya usado (multi-uso V1) | Permitido; límite por `expires_at`. |
| Torneo lleno | Server action valida `count >= size`; devuelve `TOURNAMENT_FULL`. |
| Pre-inscripción compañero no existe | Le enviamos invitación; inscripción queda `pending` hasta confirmar. |
| Inscripción duplicada | `UNIQUE(tournament_id, player_id)` → `CONFLICT`. |

### Shape de errores

```ts
type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: ErrorCode; message: string; fields?: Record<string,string> };
```

Nunca `throw` silenciado en server actions. Todo error conocido se mapea a `ErrorCode`.

### Seguridad

- **Supabase RLS** activo en TODAS las tablas; revisión humana antes de cada migration deploy.
- **Zod** en todos los server actions antes de tocar repo/dominio.
- **CSRF**: protección nativa de Next.js server actions (origin check).
- **XSS**: React escapa por defecto; cero `dangerouslySetInnerHTML`; `display_name` y `tournament.name` tratados como texto plano.
- **Tokens invitación**: 32 chars desde `crypto.randomBytes`; comparación constant-time; expiración enforced en DB.
- **Rate limiting**: acciones críticas (crear torneo, reportar resultado) con límite 10/min por `user_id` (Upstash Ratelimit o equivalente).
- **CSP**: nonce-based + HSTS + X-Frame-Options + Permissions-Policy (camera/mic/geo disabled).
- **Secrets**: solo en env vars Vercel; chequeo en startup; nunca en repo.
- **Logs**: errores server con contexto (user_id, action, stack); nunca leakeados a UI.

---

## 8. Testing y calidad

### Pirámide

1. **Dominio** (`src/lib/domain/__tests__/`) — mayoría del coverage. Vitest puro, sin red.
   - `rating.test.ts` — ELO 2v2: igualdad, favorito gana, upset.
   - `pairing.test.ts` — balanceo por rating, determinista con seed, impar.
   - `bracket.test.ts` — grupos balanceados, round-robin, seed eliminatorias.
   - `standings.test.ts` — desempates en cadena.
   - `result.test.ts` — sets legales (6-4, 7-5, 7-6); rechaza 5-3.

2. **Repositorios** — contrato InMemory↔Supabase.
   - Mismos tests sobre ambas implementaciones (test matrix).
   - InMemory corre siempre; Supabase integration corre en CI con DB test.

3. **Server actions** — integración con InMemoryRepo inyectado.
   - Caso exitoso: `{ ok: true, data }`.
   - Auth: no-auth → `NOT_AUTHORIZED`.
   - Autorización: user valida resultado ajeno → `NOT_AUTHORIZED`.
   - Zod: payload inválido → `VALIDATION_FAILED` con `fields`.

4. **E2E** (Playwright) — opcional en V1. Un happy path: login → crear torneo → invitar → inscribir 2 parejas → cerrar → jugar → validar → ver ranking.

### Reglas

- **TDD** en dominio (RED → GREEN → REFACTOR).
- Cobertura mínima global **≥ 80%** (vitest coverage-v8).
- Tests como documentación: nombres descriptivos ("returns +18 delta when underdog pair wins 6-2 6-3").
- No mockear lo que puede usarse real (InMemoryRepo real, nunca `vi.fn()` para el repo).
- Cualquier cosa con aleatoriedad acepta `seed`.

### CI (GitHub Actions)

```yaml
on: [push, pull_request]
jobs:
  - lint       # pnpm eslint
  - typecheck  # pnpm tsc --noEmit
  - test       # pnpm vitest run --coverage  (fails if <80%)
  - supabase migration lint (opcional)
```

### Design quality

- UI con personalidad (no template shadcn plano). Dirección visual se decide en la fase `frontend-design` skill.
- Accesibilidad: contraste AA mínimo, navegación teclado completa, aria-labels en iconos.
- Performance: LCP < 2.5s, INP < 200ms, bundle JS < 300kb gzipped en app page.

---

## 9. Estructura de carpetas objetivo

```
src/
├── app/
│   ├── (auth)/
│   ├── app/
│   │   ├── tournaments/
│   │   │   ├── [tournamentId]/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── actions.ts
│   │   │   │   └── matches/[matchId]/page.tsx
│   │   │   ├── new/page.tsx
│   │   │   └── page.tsx
│   │   ├── leaderboard/page.tsx
│   │   ├── players/[id]/page.tsx
│   │   └── layout.tsx
│   ├── invite/[token]/page.tsx
│   ├── api/health/route.ts
│   ├── manifest.ts
│   └── layout.tsx
├── components/
│   ├── tournament/
│   ├── match/
│   ├── player/
│   └── ui/
├── lib/
│   ├── domain/
│   │   ├── __tests__/
│   │   ├── types.ts
│   │   ├── action-result.ts
│   │   ├── pairing.ts
│   │   ├── bracket.ts
│   │   ├── rating.ts
│   │   ├── standings.ts
│   │   └── result.ts
│   ├── repositories/
│   │   ├── __tests__/
│   │   ├── types.ts
│   │   ├── in-memory-repository.ts
│   │   └── supabase-repository.ts
│   ├── supabase/
│   │   ├── client.ts
│   │   └── server.ts
│   ├── auth/
│   └── email/
├── styles/
│   └── tokens.css
└── public/
    └── sw.js
supabase/
├── migrations/
│   ├── 20260414000001_init_schema.sql
│   ├── 20260414000002_rls_policies.sql
│   └── 20260414000003_triggers.sql
└── seed.sql
```

---

## 10. Stack exacto

| Área | Versión / elección |
|---|---|
| Next.js | 16.2.2 (App Router) |
| React | 19.2.4 |
| TypeScript | 5.x |
| Supabase JS | `@supabase/ssr` 0.10.x |
| Tailwind | v4 |
| Zod | 4.3.x |
| date-fns | 4.1.x |
| Iconos | lucide-react |
| Primitivas UI | Radix (`@radix-ui/react-slot` mínimo; más si hace falta) |
| Tests | Vitest 4.1.x + coverage-v8 |
| Rate limit | Upstash Ratelimit |
| Email | Resend |

---

## 11. Decisiones pendientes

- **Número de grupos por tamaño de torneo**: asumido 4 grupos de 4 para 16 parejas, 8 grupos de 4 para 32, 2 grupos de 4 para 8. Confirmar.
- **¿Permitir 12 parejas?** Asumido no (solo 8/16/32); pedir si hace falta.
- **Notificaciones dentro de la app** además de email: asumido sí (`notifications` table), con badge en header. Confirmar si se quiere mostrar en UI desde V1 o solo la persistencia.
- **Idioma de la UI**: asumido español (coincide con la conversación).

---

## 12. Siguiente paso

Pasar a `writing-plans` skill para producir el plan de implementación detallado a partir de este spec. El plan romperá el trabajo en tareas accionables con TDD en el dominio como pilar.
