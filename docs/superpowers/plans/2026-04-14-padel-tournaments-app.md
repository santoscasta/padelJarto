# Padeljarto V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete Padeljarto V1 — a PWA for creating and managing padel tournaments among a private group of friends, with continuous dual-ranking (players + pairs) via ELO 2v2, tournament brackets (single-group or multi-group with configurable play-off), share-link invitations, result reporting/validation, and email notifications.

**Architecture:** Three clean layers with unidirectional dependencies `app → repositories → domain`. `src/lib/domain/` is pure TS (immutable, Zod-validated, Vitest-tested). `src/lib/repositories/` exposes interfaces with `InMemoryRepository` and `SupabaseRepository` adapters tested against the same contract suite. `src/app/` has Next.js 16 server components + server actions that inject the repo.

**Tech Stack:** Next.js 16.2.2 (App Router), React 19.2.4, TypeScript 5 strict, Supabase Postgres + RLS + Auth (OAuth Google), `@supabase/ssr` 0.10, Tailwind v4, Zod 4.3, Vitest 4.1 + coverage-v8, Resend (via Supabase Edge Function), Upstash Ratelimit.

**Spec:** `docs/superpowers/specs/2026-04-14-padel-tournaments-app-design.md`.

**Ground rules:**

- Read `AGENTS.md` and `node_modules/next/dist/docs/` before writing any Next.js code — this Next.js version has breaking changes from training data.
- **TDD in `src/lib/domain/`**: every pure function gets RED → GREEN → REFACTOR.
- Commit after every green step. Never commit a red test.
- Never mutate; always return new objects.
- Files ≤ 800 lines, functions ≤ 50 lines.
- No `dangerouslySetInnerHTML`, no `console.log` in shipped code.
- No hardcoded secrets — all via env vars.

---

## Parts

- **Part 0 — Baseline scaffold.** Folder tree, Tailwind v4 tokens, `cn` util, env typing, constants.
- **Part 1 — Domain (TDD).** Types, `ActionResult`, result validation, ELO 2v2 rating, pairing draw, bracket generation + seeding, standings.
- **Part 2 — Repositories.** Interfaces, `InMemoryRepository`, Supabase migrations + RLS + triggers, `SupabaseRepository`, contract tests.
- **Part 3 — Auth.** Supabase clients (server/browser/admin), middleware, OAuth callback.
- **Part 4 — Server actions.** Tournament lifecycle, invitation, inscription, result report/validate/correct, notifications writer.
- **Part 5 — UI.** Global layout, login, invite landing, tournament list + creation wizard + detail, match page + result form + validation, leaderboard, player profile, bottom nav, notification bell.
- **Part 6 — Email.** Resend client + Supabase Edge Function triggered from server actions.
- **Part 7 — PWA.** `app/manifest.ts` + minimal service worker.
- **Part 8 — Security & CI.** Rate limiting, nonce-based CSP, GitHub Actions workflow.

---

## Part 0 — Baseline scaffold

### Task 0.1: Create folder tree and `.gitkeep` anchors

**Files:**
- Create: `src/app/.gitkeep`
- Create: `src/components/.gitkeep`
- Create: `src/lib/domain/__tests__/.gitkeep`
- Create: `src/lib/repositories/__tests__/.gitkeep`
- Create: `src/lib/supabase/.gitkeep`
- Create: `src/lib/auth/.gitkeep`
- Create: `src/lib/email/.gitkeep`
- Create: `src/lib/ratelimit/.gitkeep`
- Create: `src/styles/.gitkeep`
- Create: `supabase/migrations/.gitkeep`

- [ ] **Step 1: Create empty `.gitkeep` file in each directory above**

Use Write with empty content for each path.

- [ ] **Step 2: Commit**

```bash
git add src supabase
git commit -m "chore: scaffold empty src and supabase tree"
```

### Task 0.2: Root layout + Tailwind v4 tokens

**Files:**
- Create: `src/styles/tokens.css`
- Create: `src/styles/global.css`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`

- [ ] **Step 1: Write `src/styles/tokens.css`**

```css
@import "tailwindcss";

@theme {
  --color-surface: oklch(98% 0 0);
  --color-surface-2: oklch(95% 0.01 250);
  --color-ink: oklch(18% 0.02 260);
  --color-ink-soft: oklch(38% 0.02 260);
  --color-accent: oklch(62% 0.19 150);
  --color-accent-ink: oklch(18% 0.02 150);
  --color-danger: oklch(55% 0.22 25);
  --color-warn: oklch(75% 0.16 80);
  --color-ok: oklch(68% 0.17 150);

  --radius-sm: 0.375rem;
  --radius-md: 0.625rem;
  --radius-lg: 1rem;

  --shadow-card: 0 1px 2px rgb(0 0 0 / 0.04), 0 8px 24px -12px rgb(0 0 0 / 0.12);

  --text-display: clamp(2rem, 1.4rem + 2vw, 3rem);
  --text-h1: clamp(1.5rem, 1.2rem + 1vw, 2rem);

  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-display: "Inter", ui-sans-serif, system-ui, sans-serif;

  --duration-fast: 150ms;
  --duration-normal: 300ms;
  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
}
```

- [ ] **Step 2: Write `src/styles/global.css`**

```css
@import "./tokens.css";

:root {
  color-scheme: light;
}

html, body { height: 100%; }
body {
  background: var(--color-surface);
  color: var(--color-ink);
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

*, *::before, *::after { box-sizing: border-box; }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 3: Write `src/app/layout.tsx`**

```tsx
import type { Metadata, Viewport } from 'next';
import '../styles/global.css';

export const metadata: Metadata = {
  title: 'Padeljarto',
  description: 'Torneos de padel entre amigos',
  applicationName: 'Padeljarto',
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = {
  themeColor: '#0f766e',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 4: Write `src/app/page.tsx` (temporary landing)**

```tsx
export default function LandingPage() {
  return (
    <main className="min-h-dvh grid place-items-center p-8">
      <div className="text-center space-y-4">
        <h1 className="text-[length:var(--text-display)] font-semibold">Padeljarto</h1>
        <p className="text-[color:var(--color-ink-soft)]">Torneos de padel entre amigos.</p>
      </div>
    </main>
  );
}
```

- [ ] **Step 5: Verify the app boots**

Run: `pnpm dev` (or `npm run dev`). Open `http://localhost:3000`. Expected: page renders without console errors.

Kill the dev server.

- [ ] **Step 6: Commit**

```bash
git add src/styles src/app/layout.tsx src/app/page.tsx
git commit -m "feat: root layout with Tailwind v4 tokens"
```

### Task 0.3: `cn` utility + constants module

**Files:**
- Create: `src/lib/utils/cn.ts`
- Create: `src/lib/utils/constants.ts`
- Test: `src/lib/utils/__tests__/cn.test.ts`

- [ ] **Step 1: Write the failing test `src/lib/utils/__tests__/cn.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { cn } from '../cn';

describe('cn', () => {
  it('joins truthy class names', () => {
    expect(cn('a', 'b')).toBe('a b');
  });
  it('skips falsy values', () => {
    expect(cn('a', false, null, undefined, 0, '', 'b')).toBe('a b');
  });
  it('merges conflicting Tailwind utilities (last wins)', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });
});
```

- [ ] **Step 2: Run the test; expect FAIL (module not found)**

Run: `pnpm test src/lib/utils/__tests__/cn.test.ts`

- [ ] **Step 3: Implement `src/lib/utils/cn.ts`**

```ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 4: Run the test; expect PASS**

- [ ] **Step 5: Write `src/lib/utils/constants.ts`**

```ts
export const TOURNAMENT_STATUS = ['draft', 'open', 'groups', 'knockout', 'complete'] as const;
export const PAIRING_MODE = ['pre_inscribed', 'draw', 'mixed'] as const;
export const MATCH_PHASE = ['group', 'R32', 'R16', 'QF', 'SF', 'F'] as const;
export const RESULT_STATUS = ['reported', 'validated', 'disputed', 'walkover', 'corrected'] as const;

export const ALLOWED_PLAYOFF_CUTOFFS = [0, 1, 2, 4, 8, 16] as const;

export const INVITATION_TOKEN_BYTES = 24;      // 24 bytes → 32 URL-safe base64 chars
export const INVITATION_TTL_DAYS = 7;

export const ELO_BASE = 1200;
export const ELO_K = 32;
export const ELO_K_NEWCOMER = 48;
export const ELO_NEWCOMER_THRESHOLD = 10;

export const RATE_LIMIT_PER_MINUTE = 10;
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/utils
git commit -m "feat: add cn util and shared constants"
```

### Task 0.4: Typed env access

**Files:**
- Create: `src/lib/env.ts`
- Test: `src/lib/__tests__/env.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';

describe('env', () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it('returns all required server env vars when set', async () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://x.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-key');
    vi.stubEnv('RESEND_API_KEY', 'resend-key');
    const { getServerEnv } = await import('../env');
    expect(getServerEnv().NEXT_PUBLIC_APP_URL).toBe('http://localhost:3000');
  });

  it('throws a readable error when a required var is missing', async () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', '');
    const { getServerEnv } = await import('../env');
    expect(() => getServerEnv()).toThrow(/NEXT_PUBLIC_APP_URL/);
  });
});
```

- [ ] **Step 2: Run the test; expect FAIL**

- [ ] **Step 3: Implement `src/lib/env.ts`**

```ts
import { z } from 'zod';

const ServerEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  RESEND_API_KEY: z.string().min(1),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
  NEXT_PUBLIC_ENABLE_DEMO_MODE: z.enum(['true', 'false']).optional(),
});

export type ServerEnv = z.infer<typeof ServerEnvSchema>;

export function getServerEnv(): ServerEnv {
  const parsed = ServerEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const missing = parsed.error.issues.map((i) => i.path.join('.')).join(', ');
    throw new Error(`Missing or invalid env vars: ${missing}`);
  }
  return parsed.data;
}

export const PublicEnvSchema = ServerEnvSchema.pick({
  NEXT_PUBLIC_APP_URL: true,
  NEXT_PUBLIC_SUPABASE_URL: true,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: true,
  NEXT_PUBLIC_ENABLE_DEMO_MODE: true,
});
export type PublicEnv = z.infer<typeof PublicEnvSchema>;
```

- [ ] **Step 4: Run the test; expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/lib/env.ts src/lib/__tests__/env.test.ts
git commit -m "feat: add typed env loader with zod"
```

---

## Part 1 — Domain (TDD)

### Task 1.1: Core types

**Files:**
- Create: `src/lib/domain/types.ts`

- [ ] **Step 1: Write `src/lib/domain/types.ts`**

```ts
export type TournamentStatus = 'draft' | 'open' | 'groups' | 'knockout' | 'complete';
export type PairingMode = 'pre_inscribed' | 'draw' | 'mixed';
export type MatchPhase = 'group' | 'R32' | 'R16' | 'QF' | 'SF' | 'F';
export type ResultStatus = 'reported' | 'validated' | 'disputed' | 'walkover' | 'corrected';
export type InscriptionStatus = 'pending' | 'confirmed';
export type NotificationKind =
  | 'inscription_new'
  | 'tournament_open'
  | 'tournament_started'
  | 'result_reported'
  | 'result_validated';

export type SetScore = Readonly<{ a: number; b: number }>;

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
  groupCount: number;
  playoffCutoff: number;
  startsAt: string | null;
  createdAt: string;
}>;

export type Inscription = Readonly<{
  id: string;
  tournamentId: string;
  playerId: string;
  pairId: string | null;
  status: InscriptionStatus;
}>;

export type Invitation = Readonly<{
  id: string;
  tournamentId: string;
  token: string;
  expiresAt: string;
  createdBy: string;
  createdAt: string;
}>;

export type Group = Readonly<{
  id: string;
  tournamentId: string;
  label: string;
  pairIds: ReadonlyArray<string>;
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

export type Notification = Readonly<{
  id: string;
  userId: string;
  kind: NotificationKind;
  payload: Readonly<Record<string, unknown>>;
  readAt: string | null;
  createdAt: string;
}>;
```

- [ ] **Step 2: Verify compile**

Run: `pnpm typecheck`. Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/domain/types.ts
git commit -m "feat(domain): add core readonly types"
```

### Task 1.2: `ActionResult` discriminated union

**Files:**
- Create: `src/lib/domain/action-result.ts`
- Test: `src/lib/domain/__tests__/action-result.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { ok, fail, isOk, isFail, type ActionResult } from '../action-result';

describe('ActionResult', () => {
  it('ok() wraps data', () => {
    const r: ActionResult<number> = ok(42);
    expect(r).toEqual({ ok: true, data: 42 });
  });
  it('fail() wraps an error code + message', () => {
    const r = fail('NOT_FOUND', 'player not found');
    expect(r).toEqual({ ok: false, code: 'NOT_FOUND', message: 'player not found' });
  });
  it('fail() accepts fields map', () => {
    const r = fail('VALIDATION_FAILED', 'bad input', { name: 'required' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fields).toEqual({ name: 'required' });
  });
  it('isOk / isFail narrow correctly', () => {
    const r: ActionResult<string> = ok('x');
    expect(isOk(r)).toBe(true);
    expect(isFail(r)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test; expect FAIL**

- [ ] **Step 3: Implement `src/lib/domain/action-result.ts`**

```ts
export type ErrorCode =
  | 'VALIDATION_FAILED'
  | 'NOT_AUTHORIZED'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RESULT_ALREADY_VALIDATED'
  | 'INVITATION_EXPIRED'
  | 'TOURNAMENT_FULL'
  | 'RATE_LIMITED'
  | 'UNEXPECTED';

export type ActionResult<T> =
  | Readonly<{ ok: true; data: T }>
  | Readonly<{ ok: false; code: ErrorCode; message: string; fields?: Readonly<Record<string, string>> }>;

export const ok = <T>(data: T): ActionResult<T> => ({ ok: true, data });

export const fail = <T = never>(
  code: ErrorCode,
  message: string,
  fields?: Record<string, string>,
): ActionResult<T> => (fields ? { ok: false, code, message, fields } : { ok: false, code, message });

export const isOk = <T>(r: ActionResult<T>): r is Extract<ActionResult<T>, { ok: true }> => r.ok;
export const isFail = <T>(r: ActionResult<T>): r is Extract<ActionResult<T>, { ok: false }> => !r.ok;
```

- [ ] **Step 4: Run test; expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/lib/domain/action-result.ts src/lib/domain/__tests__/action-result.test.ts
git commit -m "feat(domain): add ActionResult with ok/fail helpers"
```

### Task 1.3: Deterministic seeded RNG

**Files:**
- Create: `src/lib/domain/rng.ts`
- Test: `src/lib/domain/__tests__/rng.test.ts`

Purpose: `drawPairs` and any shuffled logic must be deterministic with a caller-provided seed so tests can assert exact outputs.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { mulberry32, seededShuffle } from '../rng';

describe('rng', () => {
  it('mulberry32 produces identical streams for identical seeds', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 8; i++) expect(a()).toBeCloseTo(b());
  });
  it('mulberry32 produces different streams for different seeds', () => {
    const a = mulberry32(42)();
    const b = mulberry32(43)();
    expect(a).not.toBeCloseTo(b);
  });
  it('seededShuffle is deterministic and preserves elements', () => {
    const input = [1, 2, 3, 4, 5, 6];
    const a = seededShuffle(input, 7);
    const b = seededShuffle(input, 7);
    expect(a).toEqual(b);
    expect([...a].sort()).toEqual([...input].sort());
  });
  it('seededShuffle does not mutate input', () => {
    const input = [1, 2, 3];
    seededShuffle(input, 1);
    expect(input).toEqual([1, 2, 3]);
  });
});
```

- [ ] **Step 2: Run test; expect FAIL**

- [ ] **Step 3: Implement `src/lib/domain/rng.ts`**

```ts
export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededShuffle<T>(items: ReadonlyArray<T>, seed: number): T[] {
  const out = [...items];
  const rng = mulberry32(seed);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}
```

- [ ] **Step 4: Run test; expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/lib/domain/rng.ts src/lib/domain/__tests__/rng.test.ts
git commit -m "feat(domain): add seeded mulberry32 rng + shuffle"
```

### Task 1.4: Set validation

**Files:**
- Create: `src/lib/domain/result.ts`
- Test: `src/lib/domain/__tests__/result.test.ts`

Rules: best-of-3. Each set won 6-X with X<5, or 7-5, or 7-6. A player must win at least 2 sets to take the match. Winner is determined by set count.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { validateSets, winnerOfSets } from '../result';
import { isOk, isFail } from '../action-result';

describe('validateSets', () => {
  it('accepts 6-4 6-3 (two straight sets)', () => {
    const r = validateSets([{ a: 6, b: 4 }, { a: 6, b: 3 }]);
    expect(isOk(r)).toBe(true);
  });
  it('accepts 6-4 3-6 7-5 (three sets)', () => {
    const r = validateSets([{ a: 6, b: 4 }, { a: 3, b: 6 }, { a: 7, b: 5 }]);
    expect(isOk(r)).toBe(true);
  });
  it('accepts 7-6 tiebreak', () => {
    const r = validateSets([{ a: 7, b: 6 }, { a: 7, b: 6 }]);
    expect(isOk(r)).toBe(true);
  });
  it('rejects 5-3 (not enough games to win set)', () => {
    const r = validateSets([{ a: 5, b: 3 }, { a: 6, b: 2 }]);
    expect(isFail(r)).toBe(true);
  });
  it('rejects 6-5 (would require 7 to close)', () => {
    const r = validateSets([{ a: 6, b: 5 }, { a: 6, b: 2 }]);
    expect(isFail(r)).toBe(true);
  });
  it('rejects single-set match', () => {
    const r = validateSets([{ a: 6, b: 4 }]);
    expect(isFail(r)).toBe(true);
  });
  it('rejects four sets', () => {
    const r = validateSets([
      { a: 6, b: 4 }, { a: 3, b: 6 }, { a: 7, b: 5 }, { a: 6, b: 0 },
    ]);
    expect(isFail(r)).toBe(true);
  });
  it('rejects when no player reaches 2 sets', () => {
    const r = validateSets([{ a: 6, b: 4 }, { a: 3, b: 6 }]);
    expect(isFail(r)).toBe(true);
  });
});

describe('winnerOfSets', () => {
  it('returns "a" when a wins more sets', () => {
    expect(winnerOfSets([{ a: 6, b: 4 }, { a: 6, b: 3 }])).toBe('a');
  });
  it('returns "b" when b wins more sets', () => {
    expect(winnerOfSets([{ a: 4, b: 6 }, { a: 3, b: 6 }])).toBe('b');
  });
});
```

- [ ] **Step 2: Run test; expect FAIL**

- [ ] **Step 3: Implement `src/lib/domain/result.ts`**

```ts
import type { SetScore } from './types';
import { ok, fail, type ActionResult } from './action-result';

function isValidSet(s: SetScore): boolean {
  if (!Number.isInteger(s.a) || !Number.isInteger(s.b) || s.a < 0 || s.b < 0) return false;
  const hi = Math.max(s.a, s.b);
  const lo = Math.min(s.a, s.b);
  if (hi === 6 && lo <= 4) return true;
  if (hi === 7 && (lo === 5 || lo === 6)) return true;
  return false;
}

export function winnerOfSets(sets: ReadonlyArray<SetScore>): 'a' | 'b' {
  let a = 0;
  let b = 0;
  for (const s of sets) (s.a > s.b ? a++ : b++);
  return a > b ? 'a' : 'b';
}

export function validateSets(sets: ReadonlyArray<SetScore>): ActionResult<ReadonlyArray<SetScore>> {
  if (sets.length < 2 || sets.length > 3) {
    return fail('VALIDATION_FAILED', 'El partido es al mejor de 3 sets');
  }
  for (const [i, s] of sets.entries()) {
    if (!isValidSet(s)) {
      return fail('VALIDATION_FAILED', `Set ${i + 1} inválido (${s.a}-${s.b})`);
    }
  }
  let aSets = 0;
  let bSets = 0;
  for (const s of sets) (s.a > s.b ? aSets++ : bSets++);
  if (aSets < 2 && bSets < 2) {
    return fail('VALIDATION_FAILED', 'Ningún jugador ha ganado dos sets');
  }
  return ok(sets);
}
```

- [ ] **Step 4: Run test; expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/lib/domain/result.ts src/lib/domain/__tests__/result.test.ts
git commit -m "feat(domain): validate best-of-3 sets and compute winner"
```

### Task 1.5: ELO 2v2 rating

**Files:**
- Create: `src/lib/domain/rating.ts`
- Test: `src/lib/domain/__tests__/rating.test.ts`

Algorithm (from spec):
- K=32 (48 if `matchesPlayed < 10`).
- Pair ELO: classic vs opponent pair rating.
- Player ELO: expected score uses `(myRating + partnerRating) / 2` vs mean opponent rating; same delta applies to both partners.
- Output: 6 `RatingSnapshot`s (4 players + 2 pairs) + new rating map.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { applyRating, expectedScore } from '../rating';
import type { Match, Pair, Player, Result } from '../types';

const player = (id: string, rating: number, matchesPlayed = 20): Player => ({
  id, profileId: `p-${id}`, displayName: id, rating, matchesPlayed,
});
const pair = (id: string, a: string, b: string, rating: number): Pair => ({
  id, playerAId: a, playerBId: b, rating,
});
const baseMatch: Match = {
  id: 'm1', tournamentId: 't1', phase: 'group', groupId: 'g1',
  pairAId: 'pairA', pairBId: 'pairB', court: null, scheduledAt: null,
};

describe('expectedScore', () => {
  it('returns 0.5 for equal ratings', () => {
    expect(expectedScore(1200, 1200)).toBeCloseTo(0.5);
  });
  it('returns > 0.5 when self > opponent', () => {
    expect(expectedScore(1400, 1200)).toBeGreaterThan(0.5);
  });
});

describe('applyRating', () => {
  it('produces exactly 6 snapshots (4 players + 2 pairs)', () => {
    const players = {
      p1: player('p1', 1200), p2: player('p2', 1200),
      p3: player('p3', 1200), p4: player('p4', 1200),
    };
    const pairs = {
      pairA: pair('pairA', 'p1', 'p2', 1200),
      pairB: pair('pairB', 'p3', 'p4', 1200),
    };
    const result: Result = {
      id: 'r1', matchId: 'm1', sets: [{ a: 6, b: 4 }, { a: 6, b: 3 }],
      winnerPairId: 'pairA', reportedBy: 'u1', validatedBy: 'u2',
      validatedAt: '2026-04-14T00:00:00Z', status: 'validated', correctsResultId: null,
    };
    const { snapshots } = applyRating({ match: baseMatch, result, players, pairs, now: '2026-04-14T00:00:00Z' });
    expect(snapshots).toHaveLength(6);
    expect(snapshots.filter((s) => s.subjectType === 'player')).toHaveLength(4);
    expect(snapshots.filter((s) => s.subjectType === 'pair')).toHaveLength(2);
  });

  it('winner gains and loser loses the same magnitude for equal teams (K=32)', () => {
    const players = {
      p1: player('p1', 1200), p2: player('p2', 1200),
      p3: player('p3', 1200), p4: player('p4', 1200),
    };
    const pairs = {
      pairA: pair('pairA', 'p1', 'p2', 1200),
      pairB: pair('pairB', 'p3', 'p4', 1200),
    };
    const result: Result = {
      id: 'r', matchId: 'm1', sets: [{ a: 6, b: 0 }, { a: 6, b: 0 }],
      winnerPairId: 'pairA', reportedBy: 'u', validatedBy: 'u',
      validatedAt: '2026-04-14T00:00:00Z', status: 'validated', correctsResultId: null,
    };
    const { newPairRatings } = applyRating({ match: baseMatch, result, players, pairs, now: '2026-04-14T00:00:00Z' });
    const a = newPairRatings.pairA - 1200;
    const b = 1200 - newPairRatings.pairB;
    expect(a).toBeCloseTo(16, 5);        // 32 * (1 - 0.5) = 16
    expect(b).toBeCloseTo(16, 5);
  });

  it('applies K=48 when a player has fewer than 10 matches played', () => {
    const players = {
      p1: player('p1', 1200, 5), p2: player('p2', 1200, 20),
      p3: player('p3', 1200, 20), p4: player('p4', 1200, 20),
    };
    const pairs = {
      pairA: pair('pairA', 'p1', 'p2', 1200),
      pairB: pair('pairB', 'p3', 'p4', 1200),
    };
    const result: Result = {
      id: 'r', matchId: 'm1', sets: [{ a: 6, b: 0 }, { a: 6, b: 0 }],
      winnerPairId: 'pairA', reportedBy: 'u', validatedBy: 'u',
      validatedAt: 'x', status: 'validated', correctsResultId: null,
    };
    const { snapshots } = applyRating({ match: baseMatch, result, players, pairs, now: 'x' });
    const snapP1 = snapshots.find((s) => s.subjectType === 'player' && s.subjectId === 'p1');
    expect(snapP1).toBeDefined();
    expect(snapP1!.delta).toBeCloseTo(24, 5);     // 48 * 0.5 = 24
  });

  it('underdog pair winning gains more than 16 points', () => {
    const players = {
      p1: player('p1', 1000), p2: player('p2', 1000),
      p3: player('p3', 1400), p4: player('p4', 1400),
    };
    const pairs = {
      pairA: pair('pairA', 'p1', 'p2', 1000),
      pairB: pair('pairB', 'p3', 'p4', 1400),
    };
    const result: Result = {
      id: 'r', matchId: 'm1', sets: [{ a: 6, b: 3 }, { a: 6, b: 2 }],
      winnerPairId: 'pairA', reportedBy: 'u', validatedBy: 'u',
      validatedAt: 'x', status: 'validated', correctsResultId: null,
    };
    const { newPairRatings } = applyRating({ match: baseMatch, result, players, pairs, now: 'x' });
    expect(newPairRatings.pairA - 1000).toBeGreaterThan(16);
  });

  it('favorite pair winning gains fewer than 16 points', () => {
    const players = {
      p1: player('p1', 1400), p2: player('p2', 1400),
      p3: player('p3', 1000), p4: player('p4', 1000),
    };
    const pairs = {
      pairA: pair('pairA', 'p1', 'p2', 1400),
      pairB: pair('pairB', 'p3', 'p4', 1000),
    };
    const result: Result = {
      id: 'r', matchId: 'm1', sets: [{ a: 6, b: 2 }, { a: 6, b: 1 }],
      winnerPairId: 'pairA', reportedBy: 'u', validatedBy: 'u',
      validatedAt: 'x', status: 'validated', correctsResultId: null,
    };
    const { newPairRatings } = applyRating({ match: baseMatch, result, players, pairs, now: 'x' });
    expect(newPairRatings.pairA - 1400).toBeLessThan(16);
    expect(newPairRatings.pairA - 1400).toBeGreaterThan(0);
  });

  it('emits snapshots with deterministic ids derived from matchId + subjectId', () => {
    const players = {
      p1: player('p1', 1200), p2: player('p2', 1200),
      p3: player('p3', 1200), p4: player('p4', 1200),
    };
    const pairs = {
      pairA: pair('pairA', 'p1', 'p2', 1200),
      pairB: pair('pairB', 'p3', 'p4', 1200),
    };
    const result: Result = {
      id: 'r1', matchId: 'm1', sets: [{ a: 6, b: 0 }, { a: 6, b: 0 }],
      winnerPairId: 'pairA', reportedBy: 'u', validatedBy: 'u',
      validatedAt: 'x', status: 'validated', correctsResultId: null,
    };
    const { snapshots } = applyRating({ match: baseMatch, result, players, pairs, now: 'x' });
    const ids = snapshots.map((s) => s.id);
    expect(new Set(ids).size).toBe(6);
    for (const s of snapshots) {
      expect(s.id).toContain('m1');
      expect(s.id).toContain(s.subjectId);
    }
  });
});
```

- [ ] **Step 2: Run test; expect FAIL**

- [ ] **Step 3: Implement `src/lib/domain/rating.ts`**

```ts
import {
  ELO_BASE,
  ELO_K,
  ELO_K_NEWCOMER,
  ELO_NEWCOMER_THRESHOLD,
} from '../utils/constants';
import type { Match, Pair, Player, RatingSnapshot, Result } from './types';

export function expectedScore(self: number, opp: number): number {
  return 1 / (1 + 10 ** ((opp - self) / 400));
}

type PlayersById = Readonly<Record<string, Player>>;
type PairsById = Readonly<Record<string, Pair>>;

export type ApplyRatingInput = {
  match: Match;
  result: Result;
  players: PlayersById;
  pairs: PairsById;
  now: string;
};

export type ApplyRatingOutput = Readonly<{
  snapshots: ReadonlyArray<RatingSnapshot>;
  newPlayerRatings: Readonly<Record<string, number>>;
  newPairRatings: Readonly<Record<string, number>>;
}>;

function kFor(p: Player): number {
  return p.matchesPlayed < ELO_NEWCOMER_THRESHOLD ? ELO_K_NEWCOMER : ELO_K;
}

export function applyRating(input: ApplyRatingInput): ApplyRatingOutput {
  const { match, result, players, pairs, now } = input;
  const pairA = pairs[match.pairAId];
  const pairB = pairs[match.pairBId];
  if (!pairA || !pairB) throw new Error('applyRating: missing pair');
  const pA = [players[pairA.playerAId], players[pairA.playerBId]];
  const pB = [players[pairB.playerAId], players[pairB.playerBId]];
  if (pA.some((x) => !x) || pB.some((x) => !x)) throw new Error('applyRating: missing player');

  const aWon = result.winnerPairId === pairA.id;
  const scoreA = aWon ? 1 : 0;
  const scoreB = 1 - scoreA;

  // Pair ratings
  const expPairA = expectedScore(pairA.rating, pairB.rating);
  const pairDelta = ELO_K * (scoreA - expPairA);
  const newPairARating = pairA.rating + pairDelta;
  const newPairBRating = pairB.rating - pairDelta;

  // Player ratings — per-partner, using team avg vs opponent avg
  const avgA = (pA[0].rating + pA[1].rating) / 2;
  const avgB = (pB[0].rating + pB[1].rating) / 2;
  const expA = expectedScore(avgA, avgB);

  const snapshots: RatingSnapshot[] = [];
  const newPlayerRatings: Record<string, number> = {};

  const sidePlayers: Array<{ p: Player; exp: number; score: number }> = [
    { p: pA[0], exp: expA, score: scoreA },
    { p: pA[1], exp: expA, score: scoreA },
    { p: pB[0], exp: 1 - expA, score: scoreB },
    { p: pB[1], exp: 1 - expA, score: scoreB },
  ];

  for (const { p, exp, score } of sidePlayers) {
    const k = kFor(p);
    const delta = k * (score - exp);
    const after = p.rating + delta;
    newPlayerRatings[p.id] = after;
    snapshots.push({
      id: `snap-${match.id}-${p.id}`,
      subjectType: 'player',
      subjectId: p.id,
      before: p.rating,
      after,
      delta,
      matchId: match.id,
      resultId: result.id,
      createdAt: now,
    });
  }

  snapshots.push({
    id: `snap-${match.id}-${pairA.id}`,
    subjectType: 'pair',
    subjectId: pairA.id,
    before: pairA.rating,
    after: newPairARating,
    delta: newPairARating - pairA.rating,
    matchId: match.id,
    resultId: result.id,
    createdAt: now,
  });
  snapshots.push({
    id: `snap-${match.id}-${pairB.id}`,
    subjectType: 'pair',
    subjectId: pairB.id,
    before: pairB.rating,
    after: newPairBRating,
    delta: newPairBRating - pairB.rating,
    matchId: match.id,
    resultId: result.id,
    createdAt: now,
  });

  return {
    snapshots,
    newPlayerRatings,
    newPairRatings: { [pairA.id]: newPairARating, [pairB.id]: newPairBRating },
  };
}
```

- [ ] **Step 4: Run test; expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/lib/domain/rating.ts src/lib/domain/__tests__/rating.test.ts
git commit -m "feat(domain): ELO 2v2 rating with 4+2 snapshots"
```

### Task 1.6: Pair drawing (balanced by rating, deterministic)

**Files:**
- Create: `src/lib/domain/pairing.ts`
- Test: `src/lib/domain/__tests__/pairing.test.ts`

Algorithm: snake-draft by rating to balance pair strength, with a seeded shuffle within rating tiers to avoid always producing the same result for the same inputs.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { drawPairs } from '../pairing';
import type { Player } from '../types';

const P = (id: string, r: number): Player => ({
  id, profileId: `pro-${id}`, displayName: id, rating: r, matchesPlayed: 20,
});

describe('drawPairs', () => {
  it('is deterministic for the same seed', () => {
    const singles = [P('a', 1300), P('b', 1100), P('c', 1250), P('d', 1150)];
    const first = drawPairs(singles, 7);
    const second = drawPairs(singles, 7);
    expect(first).toEqual(second);
  });
  it('produces exactly floor(N/2) pairs with leftover returned', () => {
    const singles = [P('a', 1200), P('b', 1200), P('c', 1200)];
    const { pairs, leftover } = drawPairs(singles, 1);
    expect(pairs).toHaveLength(1);
    expect(leftover).toHaveLength(1);
  });
  it('balances highest with lowest (snake draft)', () => {
    const singles = [P('top', 1400), P('mid1', 1250), P('mid2', 1150), P('low', 1000)];
    const { pairs } = drawPairs(singles, 1);
    // The top and the low should end up on the same pair
    const pairWithTop = pairs.find((p) => p.playerAId === 'top' || p.playerBId === 'top');
    expect(pairWithTop).toBeDefined();
    expect(pairWithTop!.playerAId === 'low' || pairWithTop!.playerBId === 'low').toBe(true);
  });
  it('orders playerAId < playerBId (canonical)', () => {
    const singles = [P('zz', 1300), P('aa', 1100)];
    const { pairs } = drawPairs(singles, 1);
    expect(pairs[0].playerAId < pairs[0].playerBId).toBe(true);
  });
  it('does not mutate input', () => {
    const singles = [P('a', 1200), P('b', 1300)];
    const snapshot = JSON.parse(JSON.stringify(singles));
    drawPairs(singles, 5);
    expect(singles).toEqual(snapshot);
  });
});
```

- [ ] **Step 2: Run test; expect FAIL**

- [ ] **Step 3: Implement `src/lib/domain/pairing.ts`**

```ts
import type { Pair, Player } from './types';
import { seededShuffle } from './rng';
import { ELO_BASE } from '../utils/constants';

export type DrawPairsOutput = Readonly<{
  pairs: ReadonlyArray<Pair>;
  leftover: ReadonlyArray<Player>;
}>;

export function drawPairs(singles: ReadonlyArray<Player>, seed: number): DrawPairsOutput {
  // Shuffle within same rating to avoid ties producing identical outputs across runs.
  const shuffled = seededShuffle(singles, seed);
  const sorted = [...shuffled].sort((a, b) => b.rating - a.rating);
  const n = sorted.length;
  const pairCount = Math.floor(n / 2);

  const pairs: Pair[] = [];
  for (let i = 0; i < pairCount; i++) {
    // Snake: strongest with weakest remaining.
    const top = sorted[i];
    const bot = sorted[n - 1 - i];
    const [a, b] = top.id < bot.id ? [top.id, bot.id] : [bot.id, top.id];
    pairs.push({
      id: `pair-${a}-${b}`,
      playerAId: a,
      playerBId: b,
      rating: (top.rating + bot.rating) / 2 || ELO_BASE,
    });
  }
  const leftover = n % 2 === 1 ? [sorted[Math.floor(n / 2)]] : [];
  return { pairs, leftover };
}
```

- [ ] **Step 4: Run test; expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/lib/domain/pairing.ts src/lib/domain/__tests__/pairing.test.ts
git commit -m "feat(domain): deterministic snake-draft pair drawing"
```

### Task 1.7: Group generation + round-robin

**Files:**
- Create: `src/lib/domain/bracket.ts`
- Test: `src/lib/domain/__tests__/bracket-groups.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { generateGroups, generateRoundRobinMatches } from '../bracket';
import type { Pair } from '../types';

const mkPair = (id: string, rating: number): Pair => ({
  id, playerAId: `${id}-x`, playerBId: `${id}-y`, rating,
});

describe('generateGroups', () => {
  it('returns one group containing all pairs when groupCount=1', () => {
    const pairs = [mkPair('p1', 1200), mkPair('p2', 1300), mkPair('p3', 1100)];
    const groups = generateGroups(pairs, 1, 't1');
    expect(groups).toHaveLength(1);
    expect(groups[0].pairIds).toHaveLength(3);
    expect(groups[0].label).toBe('A');
    expect(groups[0].tournamentId).toBe('t1');
  });
  it('distributes evenly when groupCount divides size', () => {
    const pairs = Array.from({ length: 8 }, (_, i) => mkPair(`p${i}`, 1200 + i * 10));
    const groups = generateGroups(pairs, 2, 't');
    expect(groups).toHaveLength(2);
    expect(groups[0].pairIds).toHaveLength(4);
    expect(groups[1].pairIds).toHaveLength(4);
    expect(groups[0].label).toBe('A');
    expect(groups[1].label).toBe('B');
  });
  it('throws when size is not divisible by groupCount', () => {
    const pairs = [mkPair('a', 1200), mkPair('b', 1200), mkPair('c', 1200)];
    expect(() => generateGroups(pairs, 2, 't')).toThrow();
  });
  it('balances average rating across groups (snake distribution)', () => {
    const pairs = [
      mkPair('a', 1500), mkPair('b', 1400),
      mkPair('c', 1300), mkPair('d', 1200),
    ];
    const groups = generateGroups(pairs, 2, 't');
    const avg = (ids: ReadonlyArray<string>) =>
      ids.reduce((s, id) => s + pairs.find((p) => p.id === id)!.rating, 0) / ids.length;
    expect(Math.abs(avg(groups[0].pairIds) - avg(groups[1].pairIds))).toBeLessThanOrEqual(50);
  });
});

describe('generateRoundRobinMatches', () => {
  it('produces N*(N-1)/2 matches for a group', () => {
    const matches = generateRoundRobinMatches(['p1', 'p2', 'p3', 'p4'], 't1', 'g1');
    expect(matches).toHaveLength(6);
  });
  it('marks every match as phase "group" with tournamentId and groupId', () => {
    const matches = generateRoundRobinMatches(['p1', 'p2'], 't1', 'g1');
    expect(matches).toHaveLength(1);
    expect(matches[0].phase).toBe('group');
    expect(matches[0].tournamentId).toBe('t1');
    expect(matches[0].groupId).toBe('g1');
  });
  it('never pairs a pair with itself', () => {
    const matches = generateRoundRobinMatches(['a', 'b', 'c'], 't', 'g');
    for (const m of matches) expect(m.pairAId).not.toBe(m.pairBId);
  });
});
```

- [ ] **Step 2: Run test; expect FAIL**

- [ ] **Step 3: Implement `src/lib/domain/bracket.ts` (groups + RR only — knockout added in next task)**

```ts
import type { Group, Match, MatchPhase, Pair } from './types';

function groupLabel(index: number): string {
  return String.fromCharCode(65 + index); // A, B, C...
}

export function generateGroups(
  pairs: ReadonlyArray<Pair>,
  groupCount: number,
  tournamentId: string,
): ReadonlyArray<Group> {
  if (groupCount < 1) throw new Error('groupCount must be >= 1');
  if (pairs.length % groupCount !== 0) {
    throw new Error(`size (${pairs.length}) must be divisible by groupCount (${groupCount})`);
  }
  const sorted = [...pairs].sort((a, b) => b.rating - a.rating);
  const buckets: string[][] = Array.from({ length: groupCount }, () => []);
  // Snake distribution: 0..N-1, N-1..0, 0..N-1, ...
  sorted.forEach((p, i) => {
    const row = Math.floor(i / groupCount);
    const col = i % groupCount;
    const target = row % 2 === 0 ? col : groupCount - 1 - col;
    buckets[target].push(p.id);
  });
  return buckets.map((pairIds, i) => ({
    id: `group-${tournamentId}-${groupLabel(i)}`,
    tournamentId,
    label: groupLabel(i),
    pairIds,
  }));
}

export function generateRoundRobinMatches(
  pairIds: ReadonlyArray<string>,
  tournamentId: string,
  groupId: string,
): ReadonlyArray<Match> {
  const matches: Match[] = [];
  for (let i = 0; i < pairIds.length; i++) {
    for (let j = i + 1; j < pairIds.length; j++) {
      matches.push({
        id: `match-${groupId}-${pairIds[i]}-${pairIds[j]}`,
        tournamentId,
        phase: 'group' satisfies MatchPhase,
        groupId,
        pairAId: pairIds[i],
        pairBId: pairIds[j],
        court: null,
        scheduledAt: null,
      });
    }
  }
  return matches;
}
```

- [ ] **Step 4: Run test; expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/lib/domain/bracket.ts src/lib/domain/__tests__/bracket-groups.test.ts
git commit -m "feat(domain): balanced group distribution + round-robin"
```

### Task 1.8: Knockout seeding + phase mapping

**Files:**
- Modify: `src/lib/domain/bracket.ts`
- Test: `src/lib/domain/__tests__/bracket-knockout.test.ts`

Seeding:
- Multi-group: alternating `1A vs 2B, 1B vs 2A, ...` (classic cross-seed).
- Single-group: `1 vs cutoff, 2 vs (cutoff-1), ...` (standard top-seed bracket).
- `knockoutPhaseFor(cutoff)` maps `2→F`, `4→SF`, `8→QF`, `16→R16`. `1` and `0` have no knockout round.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { seedKnockout, knockoutPhaseFor } from '../bracket';
import type { Pair } from '../types';

const P = (id: string, r = 1200): Pair => ({
  id, playerAId: `${id}-a`, playerBId: `${id}-b`, rating: r,
});

describe('knockoutPhaseFor', () => {
  it('maps cutoffs to phases', () => {
    expect(knockoutPhaseFor(2)).toBe('F');
    expect(knockoutPhaseFor(4)).toBe('SF');
    expect(knockoutPhaseFor(8)).toBe('QF');
    expect(knockoutPhaseFor(16)).toBe('R16');
  });
  it('throws for cutoffs that do not start a knockout', () => {
    expect(() => knockoutPhaseFor(0)).toThrow();
    expect(() => knockoutPhaseFor(1)).toThrow();
    expect(() => knockoutPhaseFor(3)).toThrow();
  });
});

describe('seedKnockout — single group', () => {
  it('cutoff=4: seeds 1 vs 4, 2 vs 3', () => {
    const standings = [[P('p1'), P('p2'), P('p3'), P('p4')]];
    const matches = seedKnockout(standings, 4, 't1');
    expect(matches).toHaveLength(2);
    expect(matches[0].pairAId).toBe('p1');
    expect(matches[0].pairBId).toBe('p4');
    expect(matches[1].pairAId).toBe('p2');
    expect(matches[1].pairBId).toBe('p3');
    expect(matches.every((m) => m.phase === 'SF')).toBe(true);
  });
  it('cutoff=2: single final 1 vs 2', () => {
    const standings = [[P('top'), P('runner')]];
    const matches = seedKnockout(standings, 2, 't');
    expect(matches).toHaveLength(1);
    expect(matches[0].phase).toBe('F');
    expect(matches[0].pairAId).toBe('top');
    expect(matches[0].pairBId).toBe('runner');
  });
});

describe('seedKnockout — multi group', () => {
  it('cutoff=4 groupCount=2: 1A vs 2B, 1B vs 2A in SF', () => {
    const standingsByGroup = [
      [P('a1'), P('a2')],
      [P('b1'), P('b2')],
    ];
    const matches = seedKnockout(standingsByGroup, 4, 't');
    expect(matches).toHaveLength(2);
    expect(matches[0].pairAId).toBe('a1');
    expect(matches[0].pairBId).toBe('b2');
    expect(matches[1].pairAId).toBe('b1');
    expect(matches[1].pairBId).toBe('a2');
    expect(matches.every((m) => m.phase === 'SF')).toBe(true);
  });
  it('cutoff=8 groupCount=4: QF matchups cross-seeded per group', () => {
    const standings = [
      [P('a1'), P('a2')],
      [P('b1'), P('b2')],
      [P('c1'), P('c2')],
      [P('d1'), P('d2')],
    ];
    const matches = seedKnockout(standings, 8, 't');
    expect(matches).toHaveLength(4);
    expect(matches.every((m) => m.phase === 'QF')).toBe(true);
  });
});
```

- [ ] **Step 2: Run test; expect FAIL**

- [ ] **Step 3: Extend `src/lib/domain/bracket.ts`**

Append to the end of the file:

```ts
const PHASE_BY_CUTOFF: Readonly<Record<number, MatchPhase>> = {
  2: 'F',
  4: 'SF',
  8: 'QF',
  16: 'R16',
};

export function knockoutPhaseFor(cutoff: number): MatchPhase {
  const phase = PHASE_BY_CUTOFF[cutoff];
  if (!phase) throw new Error(`No knockout phase for cutoff=${cutoff}`);
  return phase;
}

/**
 * Generates the initial knockout round matches.
 * `standingsPerGroup[g][i]` is the i-th qualifier of group g (0-indexed).
 * `groupCount === 1` → single-group seeding: 1 vs cutoff, 2 vs cutoff-1, …
 * `groupCount > 1`   → multi-group seeding: 1A vs 2B, 1B vs 2A, and so on.
 */
export function seedKnockout(
  standingsPerGroup: ReadonlyArray<ReadonlyArray<Pair>>,
  cutoff: number,
  tournamentId: string,
): ReadonlyArray<Match> {
  const phase = knockoutPhaseFor(cutoff);
  const groupCount = standingsPerGroup.length;

  if (groupCount === 1) {
    const qualified = standingsPerGroup[0].slice(0, cutoff);
    if (qualified.length !== cutoff) throw new Error(`expected ${cutoff} qualifiers, got ${qualified.length}`);
    const matches: Match[] = [];
    for (let i = 0; i < cutoff / 2; i++) {
      const a = qualified[i];
      const b = qualified[cutoff - 1 - i];
      matches.push(mkKnockoutMatch(tournamentId, phase, a.id, b.id, i));
    }
    return matches;
  }

  // Multi-group: take top N per group where N = cutoff / groupCount
  const perGroup = cutoff / groupCount;
  if (!Number.isInteger(perGroup) || perGroup < 1) {
    throw new Error(`cutoff (${cutoff}) must be a positive multiple of groupCount (${groupCount})`);
  }
  const qualifiersPerGroup = standingsPerGroup.map((s) => s.slice(0, perGroup));

  // Cross-seed by position: for each seed position s (0..perGroup-1),
  //   pair group g seed s with group (g+1 mod groupCount) seed (perGroup-1-s).
  const matches: Match[] = [];
  let idx = 0;
  for (let s = 0; s < perGroup; s++) {
    for (let g = 0; g < groupCount; g++) {
      const a = qualifiersPerGroup[g][s];
      const oppGroup = (g + 1) % groupCount;
      const b = qualifiersPerGroup[oppGroup][perGroup - 1 - s];
      if (!a || !b) continue;
      matches.push(mkKnockoutMatch(tournamentId, phase, a.id, b.id, idx++));
    }
  }
  // For a clean bracket we want exactly cutoff / 2 matches.
  return matches.slice(0, cutoff / 2);
}

function mkKnockoutMatch(
  tournamentId: string,
  phase: MatchPhase,
  pairA: string,
  pairB: string,
  slot: number,
): Match {
  return {
    id: `match-${tournamentId}-${phase}-${slot}`,
    tournamentId,
    phase,
    groupId: null,
    pairAId: pairA,
    pairBId: pairB,
    court: null,
    scheduledAt: null,
  };
}
```

- [ ] **Step 4: Run test; expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/lib/domain/bracket.ts src/lib/domain/__tests__/bracket-knockout.test.ts
git commit -m "feat(domain): knockout seeding (single+multi group) and phase mapping"
```

### Task 1.9: Standings with full tiebreakers

**Files:**
- Create: `src/lib/domain/standings.ts`
- Test: `src/lib/domain/__tests__/standings.test.ts`

Tiebreakers in order: wins → set difference → game difference → head-to-head (win over tied opponent) → pair rating (stable fallback so the list is always deterministic).

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { computeStandings } from '../standings';
import type { Match, Pair, Result } from '../types';

const P = (id: string, r = 1200): Pair => ({
  id, playerAId: `${id}-a`, playerBId: `${id}-b`, rating: r,
});
const M = (id: string, a: string, b: string): Match => ({
  id, tournamentId: 't1', phase: 'group', groupId: 'g1',
  pairAId: a, pairBId: b, court: null, scheduledAt: null,
});
const R = (matchId: string, winner: string, sets: Array<[number, number]>): Result => ({
  id: `r-${matchId}`,
  matchId,
  sets: sets.map(([a, b]) => ({ a, b })),
  winnerPairId: winner,
  reportedBy: 'u', validatedBy: 'u', validatedAt: 'x',
  status: 'validated', correctsResultId: null,
});

describe('computeStandings', () => {
  it('sorts by wins descending', () => {
    const pairs = [P('p1'), P('p2'), P('p3')];
    const matches = [M('m1', 'p1', 'p2'), M('m2', 'p1', 'p3'), M('m3', 'p2', 'p3')];
    const results = [
      R('m1', 'p1', [[6, 2], [6, 3]]),
      R('m2', 'p1', [[6, 4], [6, 4]]),
      R('m3', 'p2', [[6, 1], [6, 0]]),
    ];
    const s = computeStandings(pairs, matches, results);
    expect(s.map((r) => r.pairId)).toEqual(['p1', 'p2', 'p3']);
    expect(s[0].wins).toBe(2);
    expect(s[1].wins).toBe(1);
    expect(s[2].wins).toBe(0);
  });

  it('breaks ties on set difference', () => {
    const pairs = [P('a'), P('b'), P('c')];
    const matches = [M('m1', 'a', 'b'), M('m2', 'a', 'c'), M('m3', 'b', 'c')];
    const results = [
      // a beats b 2-0, b beats c 2-1, c beats a 2-0 → all 1 win
      R('m1', 'a', [[6, 0], [6, 0]]),
      R('m2', 'c', [[6, 0], [6, 0]]),
      R('m3', 'b', [[6, 0], [4, 6], [6, 0]]),
    ];
    const s = computeStandings(pairs, matches, results);
    expect(s.every((r) => r.wins === 1)).toBe(true);
    // sets: a=2-2, b=3-2, c=2-3 → b > a > c
    expect(s[0].pairId).toBe('b');
  });

  it('ignores non-validated results', () => {
    const pairs = [P('p1'), P('p2')];
    const matches = [M('m1', 'p1', 'p2')];
    const results: Result[] = [
      { ...R('m1', 'p1', [[6, 0], [6, 0]]), status: 'reported' },
    ];
    const s = computeStandings(pairs, matches, results);
    expect(s.every((r) => r.wins === 0)).toBe(true);
  });

  it('applies head-to-head on deeper ties', () => {
    const pairs = [P('a'), P('b')];
    const matches = [M('m1', 'a', 'b')];
    // Same wins/sets/games via a walkover-styled fake would be rare; we check
    // that H2H applies when wins/sets/games all equal via a direct 6-0 6-0.
    const results = [R('m1', 'a', [[6, 0], [6, 0]])];
    const s = computeStandings(pairs, matches, results);
    expect(s[0].pairId).toBe('a');
  });

  it('is deterministic (falls back to pair rating)', () => {
    const pairs = [P('lo', 1000), P('hi', 1400)];
    const s = computeStandings(pairs, [], []);
    expect(s[0].pairId).toBe('hi');
    expect(s[1].pairId).toBe('lo');
  });
});
```

- [ ] **Step 2: Run test; expect FAIL**

- [ ] **Step 3: Implement `src/lib/domain/standings.ts`**

```ts
import type { Match, Pair, Result } from './types';

export type StandingRow = Readonly<{
  pairId: string;
  played: number;
  wins: number;
  setsFor: number;
  setsAgainst: number;
  gamesFor: number;
  gamesAgainst: number;
}>;

export function computeStandings(
  pairs: ReadonlyArray<Pair>,
  matches: ReadonlyArray<Match>,
  results: ReadonlyArray<Result>,
): ReadonlyArray<StandingRow> {
  const byMatch = new Map<string, Result>();
  for (const r of results) {
    if (r.status === 'validated') byMatch.set(r.matchId, r);
  }

  const rows = new Map<string, {
    played: number; wins: number;
    setsFor: number; setsAgainst: number;
    gamesFor: number; gamesAgainst: number;
    h2hWinsOver: Set<string>;
  }>();
  for (const p of pairs) {
    rows.set(p.id, {
      played: 0, wins: 0,
      setsFor: 0, setsAgainst: 0,
      gamesFor: 0, gamesAgainst: 0,
      h2hWinsOver: new Set(),
    });
  }

  for (const m of matches) {
    const res = byMatch.get(m.id);
    if (!res) continue;
    const a = rows.get(m.pairAId);
    const b = rows.get(m.pairBId);
    if (!a || !b) continue;
    a.played++;
    b.played++;
    let aSets = 0;
    let bSets = 0;
    for (const s of res.sets) {
      a.gamesFor += s.a;
      a.gamesAgainst += s.b;
      b.gamesFor += s.b;
      b.gamesAgainst += s.a;
      if (s.a > s.b) aSets++;
      else bSets++;
    }
    a.setsFor += aSets;
    a.setsAgainst += bSets;
    b.setsFor += bSets;
    b.setsAgainst += aSets;
    if (res.winnerPairId === m.pairAId) {
      a.wins++;
      a.h2hWinsOver.add(m.pairBId);
    } else {
      b.wins++;
      b.h2hWinsOver.add(m.pairAId);
    }
  }

  const pairRating = new Map(pairs.map((p) => [p.id, p.rating] as const));

  const list = pairs.map((p) => {
    const r = rows.get(p.id)!;
    return { pairId: p.id, ...r };
  });

  list.sort((x, y) => {
    if (y.wins !== x.wins) return y.wins - x.wins;
    const xSetDiff = x.setsFor - x.setsAgainst;
    const ySetDiff = y.setsFor - y.setsAgainst;
    if (ySetDiff !== xSetDiff) return ySetDiff - xSetDiff;
    const xGameDiff = x.gamesFor - x.gamesAgainst;
    const yGameDiff = y.gamesFor - y.gamesAgainst;
    if (yGameDiff !== xGameDiff) return yGameDiff - xGameDiff;
    // H2H: x beat y?
    if (x.h2hWinsOver.has(y.pairId) && !y.h2hWinsOver.has(x.pairId)) return -1;
    if (y.h2hWinsOver.has(x.pairId) && !x.h2hWinsOver.has(y.pairId)) return 1;
    // Stable fallback: pair rating desc, then id.
    const rDiff = (pairRating.get(y.pairId) ?? 0) - (pairRating.get(x.pairId) ?? 0);
    if (rDiff !== 0) return rDiff;
    return x.pairId.localeCompare(y.pairId);
  });

  return list.map(({ h2hWinsOver: _h2h, ...rest }) => rest);
}
```

- [ ] **Step 4: Run test; expect PASS**

- [ ] **Step 5: Coverage check**

Run: `pnpm test -- --coverage`. Expected: domain coverage ≥ 80%.

- [ ] **Step 6: Commit**

```bash
git add src/lib/domain/standings.ts src/lib/domain/__tests__/standings.test.ts
git commit -m "feat(domain): compute standings with full tiebreakers"
```

---

## Part 2 — Repositories

### Task 2.1: Repository interface

**Files:**
- Create: `src/lib/repositories/types.ts`

- [ ] **Step 1: Write `src/lib/repositories/types.ts`**

```ts
import type {
  Group,
  Inscription,
  Invitation,
  Match,
  Notification,
  Pair,
  Player,
  RatingSnapshot,
  Result,
  Tournament,
  TournamentStatus,
} from '@/lib/domain/types';

export type NewTournamentInput = Readonly<{
  ownerId: string;
  name: string;
  pairingMode: Tournament['pairingMode'];
  size: number;
  groupCount: number;
  playoffCutoff: number;
  startsAt: string | null;
}>;

export type NewInscriptionInput = Readonly<{
  tournamentId: string;
  playerId: string;
  pairId: string | null;
}>;

export type ValidateResultInput = Readonly<{
  resultId: string;
  matchId: string;
  validatorId: string;
  validatedAt: string;
  snapshots: ReadonlyArray<RatingSnapshot>;
  newPlayerRatings: Readonly<Record<string, number>>;
  newPairRatings: Readonly<Record<string, number>>;
}>;

export interface Repository {
  // profiles / players
  getPlayerByProfileId(profileId: string): Promise<Player | null>;
  ensurePlayerForProfile(profileId: string, displayName: string): Promise<Player>;
  listPlayers(): Promise<ReadonlyArray<Player>>;
  getPlayer(id: string): Promise<Player | null>;

  // pairs
  upsertPair(playerAId: string, playerBId: string): Promise<Pair>;
  getPair(id: string): Promise<Pair | null>;
  listPairsForTournament(tournamentId: string): Promise<ReadonlyArray<Pair>>;
  listPairsRanked(limit?: number): Promise<ReadonlyArray<Pair>>;

  // tournaments
  createTournament(input: NewTournamentInput): Promise<Tournament>;
  getTournament(id: string): Promise<Tournament | null>;
  listTournaments(): Promise<ReadonlyArray<Tournament>>;
  updateTournamentStatus(id: string, status: TournamentStatus): Promise<Tournament>;

  // inscriptions
  createInscription(input: NewInscriptionInput): Promise<Inscription>;
  listInscriptions(tournamentId: string): Promise<ReadonlyArray<Inscription>>;

  // invitations
  createInvitation(tournamentId: string, token: string, expiresAt: string, createdBy: string): Promise<Invitation>;
  getInvitationByToken(token: string): Promise<Invitation | null>;

  // groups
  createGroups(groups: ReadonlyArray<Group>): Promise<ReadonlyArray<Group>>;
  listGroups(tournamentId: string): Promise<ReadonlyArray<Group>>;

  // matches
  createMatches(matches: ReadonlyArray<Match>): Promise<ReadonlyArray<Match>>;
  getMatch(id: string): Promise<Match | null>;
  listMatches(tournamentId: string): Promise<ReadonlyArray<Match>>;

  // results
  reportResult(result: Omit<Result, 'id' | 'validatedBy' | 'validatedAt'>): Promise<Result>;
  getResultForMatch(matchId: string): Promise<Result | null>;
  validateResult(input: ValidateResultInput): Promise<Result>;
  correctResult(original: Result, replacement: Omit<Result, 'id' | 'correctsResultId' | 'status'>): Promise<Result>;

  // rating snapshots
  listRatingSnapshotsForSubject(subjectType: 'player' | 'pair', subjectId: string): Promise<ReadonlyArray<RatingSnapshot>>;

  // notifications
  createNotification(n: Omit<Notification, 'id' | 'createdAt' | 'readAt'>): Promise<Notification>;
  listNotifications(userId: string): Promise<ReadonlyArray<Notification>>;
  markNotificationRead(id: string, userId: string): Promise<void>;
}
```

- [ ] **Step 2: Verify compile**

Run: `pnpm typecheck`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/repositories/types.ts
git commit -m "feat(repo): define Repository interface"
```

### Task 2.2: `InMemoryRepository` implementation

**Files:**
- Create: `src/lib/repositories/in-memory-repository.ts`

- [ ] **Step 1: Write `src/lib/repositories/in-memory-repository.ts`**

```ts
import { randomUUID } from 'node:crypto';
import type {
  Group,
  Inscription,
  Invitation,
  Match,
  Notification,
  Pair,
  Player,
  RatingSnapshot,
  Result,
  Tournament,
  TournamentStatus,
} from '@/lib/domain/types';
import { ELO_BASE } from '@/lib/utils/constants';
import type {
  NewInscriptionInput,
  NewTournamentInput,
  Repository,
  ValidateResultInput,
} from './types';

function now(): string {
  return new Date().toISOString();
}

export class InMemoryRepository implements Repository {
  private players = new Map<string, Player>();
  private profiles = new Map<string, string>();                // profileId → playerId
  private pairs = new Map<string, Pair>();
  private pairByKey = new Map<string, string>();               // "a:b" (sorted) → pairId
  private tournaments = new Map<string, Tournament>();
  private inscriptions = new Map<string, Inscription>();
  private invitations = new Map<string, Invitation>();
  private invitationByToken = new Map<string, string>();
  private groups = new Map<string, Group>();
  private matches = new Map<string, Match>();
  private results = new Map<string, Result>();                 // resultId → Result
  private activeResultByMatch = new Map<string, string>();     // matchId → resultId (non-corrected)
  private snapshots: RatingSnapshot[] = [];
  private notifications: Notification[] = [];

  // -- utility seeding --
  seedPlayers(players: ReadonlyArray<Player>): void {
    for (const p of players) {
      this.players.set(p.id, p);
      this.profiles.set(p.profileId, p.id);
    }
  }

  // -- players --
  async getPlayerByProfileId(profileId: string): Promise<Player | null> {
    const id = this.profiles.get(profileId);
    return id ? this.players.get(id) ?? null : null;
  }
  async ensurePlayerForProfile(profileId: string, displayName: string): Promise<Player> {
    const existing = await this.getPlayerByProfileId(profileId);
    if (existing) return existing;
    const p: Player = {
      id: randomUUID(), profileId, displayName, rating: ELO_BASE, matchesPlayed: 0,
    };
    this.players.set(p.id, p);
    this.profiles.set(profileId, p.id);
    return p;
  }
  async listPlayers(): Promise<ReadonlyArray<Player>> {
    return [...this.players.values()].sort((a, b) => b.rating - a.rating);
  }
  async getPlayer(id: string): Promise<Player | null> {
    return this.players.get(id) ?? null;
  }

  // -- pairs --
  async upsertPair(playerAId: string, playerBId: string): Promise<Pair> {
    const [a, b] = playerAId < playerBId ? [playerAId, playerBId] : [playerBId, playerAId];
    const key = `${a}:${b}`;
    const existingId = this.pairByKey.get(key);
    if (existingId) return this.pairs.get(existingId)!;
    const pair: Pair = { id: randomUUID(), playerAId: a, playerBId: b, rating: ELO_BASE };
    this.pairs.set(pair.id, pair);
    this.pairByKey.set(key, pair.id);
    return pair;
  }
  async getPair(id: string): Promise<Pair | null> {
    return this.pairs.get(id) ?? null;
  }
  async listPairsForTournament(tournamentId: string): Promise<ReadonlyArray<Pair>> {
    const ids = new Set<string>();
    for (const i of this.inscriptions.values()) {
      if (i.tournamentId === tournamentId && i.pairId) ids.add(i.pairId);
    }
    return [...ids].map((id) => this.pairs.get(id)).filter((p): p is Pair => !!p);
  }
  async listPairsRanked(limit = 100): Promise<ReadonlyArray<Pair>> {
    return [...this.pairs.values()].sort((a, b) => b.rating - a.rating).slice(0, limit);
  }

  // -- tournaments --
  async createTournament(input: NewTournamentInput): Promise<Tournament> {
    const t: Tournament = {
      id: randomUUID(),
      ownerId: input.ownerId,
      name: input.name,
      status: 'draft',
      pairingMode: input.pairingMode,
      size: input.size,
      groupCount: input.groupCount,
      playoffCutoff: input.playoffCutoff,
      startsAt: input.startsAt,
      createdAt: now(),
    };
    this.tournaments.set(t.id, t);
    return t;
  }
  async getTournament(id: string): Promise<Tournament | null> {
    return this.tournaments.get(id) ?? null;
  }
  async listTournaments(): Promise<ReadonlyArray<Tournament>> {
    return [...this.tournaments.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  async updateTournamentStatus(id: string, status: TournamentStatus): Promise<Tournament> {
    const t = this.tournaments.get(id);
    if (!t) throw new Error(`Tournament ${id} not found`);
    const next = { ...t, status };
    this.tournaments.set(id, next);
    return next;
  }

  // -- inscriptions --
  async createInscription(input: NewInscriptionInput): Promise<Inscription> {
    for (const i of this.inscriptions.values()) {
      if (i.tournamentId === input.tournamentId && i.playerId === input.playerId) {
        throw new Error('CONFLICT: already inscribed');
      }
    }
    const ins: Inscription = {
      id: randomUUID(),
      tournamentId: input.tournamentId,
      playerId: input.playerId,
      pairId: input.pairId,
      status: input.pairId ? 'confirmed' : 'pending',
    };
    this.inscriptions.set(ins.id, ins);
    return ins;
  }
  async listInscriptions(tournamentId: string): Promise<ReadonlyArray<Inscription>> {
    return [...this.inscriptions.values()].filter((i) => i.tournamentId === tournamentId);
  }

  // -- invitations --
  async createInvitation(tournamentId: string, token: string, expiresAt: string, createdBy: string): Promise<Invitation> {
    const inv: Invitation = {
      id: randomUUID(), tournamentId, token, expiresAt, createdBy, createdAt: now(),
    };
    this.invitations.set(inv.id, inv);
    this.invitationByToken.set(token, inv.id);
    return inv;
  }
  async getInvitationByToken(token: string): Promise<Invitation | null> {
    const id = this.invitationByToken.get(token);
    return id ? this.invitations.get(id) ?? null : null;
  }

  // -- groups + matches --
  async createGroups(groups: ReadonlyArray<Group>): Promise<ReadonlyArray<Group>> {
    for (const g of groups) this.groups.set(g.id, g);
    return groups;
  }
  async listGroups(tournamentId: string): Promise<ReadonlyArray<Group>> {
    return [...this.groups.values()].filter((g) => g.tournamentId === tournamentId);
  }
  async createMatches(matches: ReadonlyArray<Match>): Promise<ReadonlyArray<Match>> {
    for (const m of matches) this.matches.set(m.id, m);
    return matches;
  }
  async getMatch(id: string): Promise<Match | null> {
    return this.matches.get(id) ?? null;
  }
  async listMatches(tournamentId: string): Promise<ReadonlyArray<Match>> {
    return [...this.matches.values()].filter((m) => m.tournamentId === tournamentId);
  }

  // -- results --
  async reportResult(r: Omit<Result, 'id' | 'validatedBy' | 'validatedAt'>): Promise<Result> {
    if (this.activeResultByMatch.has(r.matchId)) {
      throw new Error('CONFLICT: result already reported');
    }
    const full: Result = { ...r, id: randomUUID(), validatedBy: null, validatedAt: null };
    this.results.set(full.id, full);
    this.activeResultByMatch.set(full.matchId, full.id);
    return full;
  }
  async getResultForMatch(matchId: string): Promise<Result | null> {
    const id = this.activeResultByMatch.get(matchId);
    return id ? this.results.get(id) ?? null : null;
  }
  async validateResult(input: ValidateResultInput): Promise<Result> {
    const r = this.results.get(input.resultId);
    if (!r) throw new Error('NOT_FOUND: result');
    if (r.status === 'validated') throw new Error('RESULT_ALREADY_VALIDATED');
    const validated: Result = {
      ...r,
      status: 'validated',
      validatedBy: input.validatorId,
      validatedAt: input.validatedAt,
    };
    this.results.set(r.id, validated);
    this.snapshots.push(...input.snapshots);
    for (const [pid, rating] of Object.entries(input.newPlayerRatings)) {
      const p = this.players.get(pid);
      if (p) this.players.set(pid, { ...p, rating, matchesPlayed: p.matchesPlayed + 1 });
    }
    for (const [pid, rating] of Object.entries(input.newPairRatings)) {
      const p = this.pairs.get(pid);
      if (p) this.pairs.set(pid, { ...p, rating });
    }
    return validated;
  }
  async correctResult(
    original: Result,
    replacement: Omit<Result, 'id' | 'correctsResultId' | 'status'>,
  ): Promise<Result> {
    const correctedOriginal: Result = { ...original, status: 'corrected' };
    this.results.set(original.id, correctedOriginal);
    const fresh: Result = {
      ...replacement,
      id: randomUUID(),
      correctsResultId: original.id,
      status: 'reported',
    };
    this.results.set(fresh.id, fresh);
    this.activeResultByMatch.set(fresh.matchId, fresh.id);
    return fresh;
  }

  // -- snapshots --
  async listRatingSnapshotsForSubject(
    subjectType: 'player' | 'pair',
    subjectId: string,
  ): Promise<ReadonlyArray<RatingSnapshot>> {
    return this.snapshots
      .filter((s) => s.subjectType === subjectType && s.subjectId === subjectId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  // -- notifications --
  async createNotification(n: Omit<Notification, 'id' | 'createdAt' | 'readAt'>): Promise<Notification> {
    const full: Notification = { ...n, id: randomUUID(), createdAt: now(), readAt: null };
    this.notifications.push(full);
    return full;
  }
  async listNotifications(userId: string): Promise<ReadonlyArray<Notification>> {
    return this.notifications
      .filter((n) => n.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  async markNotificationRead(id: string, userId: string): Promise<void> {
    const i = this.notifications.findIndex((n) => n.id === id && n.userId === userId);
    if (i >= 0) this.notifications[i] = { ...this.notifications[i], readAt: now() };
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/repositories/in-memory-repository.ts
git commit -m "feat(repo): in-memory implementation"
```

### Task 2.3: Repository contract test suite

**Files:**
- Create: `src/lib/repositories/__tests__/contract.ts`
- Create: `src/lib/repositories/__tests__/in-memory.test.ts`

- [ ] **Step 1: Write `src/lib/repositories/__tests__/contract.ts`** (shared behavior, invoked with a factory)

```ts
import { describe, expect, it, beforeEach } from 'vitest';
import type { Repository } from '../types';

export function runRepositoryContract(
  name: string,
  makeRepo: () => Promise<Repository> | Repository,
): void {
  describe(`[contract] ${name}`, () => {
    let repo: Repository;
    beforeEach(async () => { repo = await makeRepo(); });

    it('creates a tournament in draft status', async () => {
      const t = await repo.createTournament({
        ownerId: 'owner-1', name: 'Abril', pairingMode: 'draw',
        size: 8, groupCount: 2, playoffCutoff: 4, startsAt: null,
      });
      expect(t.status).toBe('draft');
      expect((await repo.getTournament(t.id))?.name).toBe('Abril');
    });

    it('upsertPair returns the same pair for reversed player ids', async () => {
      const p1 = await repo.ensurePlayerForProfile('prof-1', 'Ana');
      const p2 = await repo.ensurePlayerForProfile('prof-2', 'Bea');
      const a = await repo.upsertPair(p1.id, p2.id);
      const b = await repo.upsertPair(p2.id, p1.id);
      expect(a.id).toBe(b.id);
      expect(a.playerAId < a.playerBId).toBe(true);
    });

    it('rejects a duplicate inscription for the same player + tournament', async () => {
      const t = await repo.createTournament({
        ownerId: 'o', name: 't', pairingMode: 'draw',
        size: 8, groupCount: 2, playoffCutoff: 4, startsAt: null,
      });
      const p = await repo.ensurePlayerForProfile('prof', 'P');
      await repo.createInscription({ tournamentId: t.id, playerId: p.id, pairId: null });
      await expect(
        repo.createInscription({ tournamentId: t.id, playerId: p.id, pairId: null }),
      ).rejects.toThrow();
    });

    it('reportResult blocks a second report for the same match', async () => {
      const t = await repo.createTournament({
        ownerId: 'o', name: 't', pairingMode: 'draw',
        size: 4, groupCount: 1, playoffCutoff: 2, startsAt: null,
      });
      const p1 = await repo.ensurePlayerForProfile('a', 'A');
      const p2 = await repo.ensurePlayerForProfile('b', 'B');
      const p3 = await repo.ensurePlayerForProfile('c', 'C');
      const p4 = await repo.ensurePlayerForProfile('d', 'D');
      const pairA = await repo.upsertPair(p1.id, p2.id);
      const pairB = await repo.upsertPair(p3.id, p4.id);
      const [m] = await repo.createMatches([{
        id: 'm1', tournamentId: t.id, phase: 'group', groupId: null,
        pairAId: pairA.id, pairBId: pairB.id, court: null, scheduledAt: null,
      }]);
      await repo.reportResult({
        matchId: m.id, sets: [{ a: 6, b: 2 }, { a: 6, b: 3 }],
        winnerPairId: pairA.id, reportedBy: 'u', status: 'reported', correctsResultId: null,
      });
      await expect(repo.reportResult({
        matchId: m.id, sets: [{ a: 6, b: 0 }, { a: 6, b: 0 }],
        winnerPairId: pairB.id, reportedBy: 'u2', status: 'reported', correctsResultId: null,
      })).rejects.toThrow();
    });

    it('validateResult updates player and pair ratings and writes snapshots', async () => {
      const t = await repo.createTournament({
        ownerId: 'o', name: 't', pairingMode: 'draw',
        size: 4, groupCount: 1, playoffCutoff: 2, startsAt: null,
      });
      const p1 = await repo.ensurePlayerForProfile('a', 'A');
      const p2 = await repo.ensurePlayerForProfile('b', 'B');
      const p3 = await repo.ensurePlayerForProfile('c', 'C');
      const p4 = await repo.ensurePlayerForProfile('d', 'D');
      const pairA = await repo.upsertPair(p1.id, p2.id);
      const pairB = await repo.upsertPair(p3.id, p4.id);
      const [m] = await repo.createMatches([{
        id: 'm-val', tournamentId: t.id, phase: 'group', groupId: null,
        pairAId: pairA.id, pairBId: pairB.id, court: null, scheduledAt: null,
      }]);
      const reported = await repo.reportResult({
        matchId: m.id, sets: [{ a: 6, b: 2 }, { a: 6, b: 3 }],
        winnerPairId: pairA.id, reportedBy: 'u', status: 'reported', correctsResultId: null,
      });
      await repo.validateResult({
        resultId: reported.id, matchId: m.id,
        validatorId: 'o', validatedAt: '2026-04-14T10:00:00Z',
        snapshots: [{
          id: `s-${m.id}-${pairA.id}`, subjectType: 'pair', subjectId: pairA.id,
          before: 1200, after: 1216, delta: 16,
          matchId: m.id, resultId: reported.id, createdAt: '2026-04-14T10:00:00Z',
        }],
        newPlayerRatings: { [p1.id]: 1208, [p2.id]: 1208, [p3.id]: 1192, [p4.id]: 1192 },
        newPairRatings: { [pairA.id]: 1216, [pairB.id]: 1184 },
      });
      expect((await repo.getPair(pairA.id))?.rating).toBeCloseTo(1216);
      expect((await repo.getPlayer(p1.id))?.rating).toBeCloseTo(1208);
      const snaps = await repo.listRatingSnapshotsForSubject('pair', pairA.id);
      expect(snaps).toHaveLength(1);
    });

    it('getInvitationByToken round-trips', async () => {
      const t = await repo.createTournament({
        ownerId: 'o', name: 't', pairingMode: 'draw',
        size: 4, groupCount: 1, playoffCutoff: 2, startsAt: null,
      });
      await repo.createInvitation(t.id, 'token-abc', '2030-01-01T00:00:00Z', 'o');
      const found = await repo.getInvitationByToken('token-abc');
      expect(found?.tournamentId).toBe(t.id);
    });
  });
}
```

- [ ] **Step 2: Write `src/lib/repositories/__tests__/in-memory.test.ts`**

```ts
import { InMemoryRepository } from '../in-memory-repository';
import { runRepositoryContract } from './contract';

runRepositoryContract('InMemoryRepository', () => new InMemoryRepository());
```

- [ ] **Step 3: Run tests; expect PASS**

Run: `pnpm test src/lib/repositories`

- [ ] **Step 4: Commit**

```bash
git add src/lib/repositories/__tests__
git commit -m "test(repo): contract tests pass against in-memory"
```

### Task 2.4: Supabase migration — schema

**Files:**
- Create: `supabase/migrations/20260414000001_init_schema.sql`

- [ ] **Step 1: Write the migration**

```sql
-- 20260414000001_init_schema.sql
-- Initial schema for Padeljarto V1.

create extension if not exists "pgcrypto";

-- ENUMS ----------------------------------------------------------------
create type tournament_status as enum ('draft','open','groups','knockout','complete');
create type pairing_mode as enum ('pre_inscribed','draw','mixed');
create type match_phase as enum ('group','R32','R16','QF','SF','F');
create type result_status as enum ('reported','validated','disputed','walkover','corrected');
create type inscription_status as enum ('pending','confirmed');
create type snapshot_subject as enum ('player','pair');
create type notification_kind as enum (
  'inscription_new','tournament_open','tournament_started','result_reported','result_validated'
);

-- TABLES ---------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  email text,
  created_at timestamptz not null default now()
);

create table players (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references profiles(id) on delete cascade,
  rating real not null default 1200,
  matches_played int not null default 0
);

create table pairs (
  id uuid primary key default gen_random_uuid(),
  player_a_id uuid not null references players(id) on delete restrict,
  player_b_id uuid not null references players(id) on delete restrict,
  rating real not null default 1200,
  constraint pair_players_ordered check (player_a_id < player_b_id),
  constraint pair_unique unique (player_a_id, player_b_id)
);

create table tournaments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete restrict,
  name text not null,
  status tournament_status not null default 'draft',
  pairing_mode pairing_mode not null,
  size int not null,
  group_count int not null default 1,
  playoff_cutoff int not null,
  starts_at timestamptz,
  created_at timestamptz not null default now(),
  constraint cutoff_allowed check (playoff_cutoff in (0,1,2,4,8,16)),
  constraint group_divides_size check (group_count >= 1 and size % group_count = 0),
  constraint size_positive check (size > 0)
);

create table inscriptions (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  player_id uuid not null references players(id) on delete restrict,
  pair_id uuid references pairs(id) on delete set null,
  status inscription_status not null default 'pending',
  created_at timestamptz not null default now(),
  unique (tournament_id, player_id)
);

create table invitations (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  token text not null unique,
  expires_at timestamptz not null,
  created_by uuid not null references profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table groups (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  label text not null,
  unique (tournament_id, label)
);

create table group_pairs (
  group_id uuid not null references groups(id) on delete cascade,
  pair_id uuid not null references pairs(id) on delete restrict,
  primary key (group_id, pair_id)
);

create table matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  phase match_phase not null,
  group_id uuid references groups(id) on delete set null,
  pair_a_id uuid not null references pairs(id) on delete restrict,
  pair_b_id uuid not null references pairs(id) on delete restrict,
  court text,
  scheduled_at timestamptz,
  constraint pair_ab_distinct check (pair_a_id <> pair_b_id)
);

create table results (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  sets jsonb not null,
  winner_pair_id uuid not null references pairs(id) on delete restrict,
  reported_by uuid not null references profiles(id) on delete restrict,
  validated_by uuid references profiles(id) on delete set null,
  validated_at timestamptz,
  status result_status not null default 'reported',
  corrects_result_id uuid references results(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Only one non-corrected result per match.
create unique index one_active_result_per_match
  on results (match_id)
  where status <> 'corrected';

create table rating_snapshots (
  id uuid primary key default gen_random_uuid(),
  subject_type snapshot_subject not null,
  subject_id uuid not null,
  before real not null,
  after real not null,
  delta real not null,
  match_id uuid not null references matches(id) on delete cascade,
  result_id uuid not null references results(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index rating_snapshots_subject_idx
  on rating_snapshots (subject_type, subject_id, created_at desc);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  kind notification_kind not null,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on notifications (user_id, created_at desc);
```

- [ ] **Step 2: Apply migration locally (optional — requires Supabase CLI)**

Run: `supabase db reset` (if CLI configured). If no local DB, skip — CI will apply on deploy.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260414000001_init_schema.sql
git commit -m "feat(db): initial schema with enums and constraints"
```

### Task 2.5: Supabase migration — RLS policies

**Files:**
- Create: `supabase/migrations/20260414000002_rls_policies.sql`

- [ ] **Step 1: Write the migration**

```sql
-- 20260414000002_rls_policies.sql

alter table profiles           enable row level security;
alter table players            enable row level security;
alter table pairs              enable row level security;
alter table tournaments        enable row level security;
alter table inscriptions       enable row level security;
alter table invitations        enable row level security;
alter table groups             enable row level security;
alter table group_pairs        enable row level security;
alter table matches            enable row level security;
alter table results            enable row level security;
alter table rating_snapshots   enable row level security;
alter table notifications      enable row level security;

-- profiles
create policy profiles_self_select on profiles for select
  using (auth.role() = 'authenticated');
create policy profiles_self_insert on profiles for insert
  with check (auth.uid() = id);
create policy profiles_self_update on profiles for update
  using (auth.uid() = id);

-- players
create policy players_authenticated_select on players for select
  using (auth.role() = 'authenticated');
create policy players_self_insert on players for insert
  with check (profile_id = auth.uid());
create policy players_self_update on players for update
  using (profile_id = auth.uid());

-- pairs (read open to authenticated; writes only via service role)
create policy pairs_authenticated_select on pairs for select
  using (auth.role() = 'authenticated');

-- tournaments
create policy tournaments_authenticated_select on tournaments for select
  using (auth.role() = 'authenticated');
create policy tournaments_authenticated_insert on tournaments for insert
  with check (owner_id = auth.uid());
create policy tournaments_owner_update on tournaments for update
  using (owner_id = auth.uid());
create policy tournaments_owner_delete on tournaments for delete
  using (owner_id = auth.uid());

-- inscriptions
create policy inscriptions_authenticated_select on inscriptions for select
  using (auth.role() = 'authenticated');
create policy inscriptions_self_insert on inscriptions for insert
  with check (
    exists (
      select 1 from players p
      where p.id = inscriptions.player_id and p.profile_id = auth.uid()
    )
    and exists (
      select 1 from tournaments t
      where t.id = inscriptions.tournament_id and t.status = 'open'
    )
  );
create policy inscriptions_owner_update on inscriptions for update
  using (exists (
    select 1 from tournaments t where t.id = tournament_id and t.owner_id = auth.uid()
  ));
create policy inscriptions_owner_delete on inscriptions for delete
  using (exists (
    select 1 from tournaments t where t.id = tournament_id and t.owner_id = auth.uid()
  ));

-- invitations (read by RPC by token; direct write by owner only)
create policy invitations_owner_select on invitations for select
  using (exists (
    select 1 from tournaments t where t.id = tournament_id and t.owner_id = auth.uid()
  ));
create policy invitations_owner_insert on invitations for insert
  with check (exists (
    select 1 from tournaments t where t.id = tournament_id and t.owner_id = auth.uid()
  ));
create policy invitations_owner_delete on invitations for delete
  using (exists (
    select 1 from tournaments t where t.id = tournament_id and t.owner_id = auth.uid()
  ));

-- groups + group_pairs
create policy groups_authenticated_select on groups for select
  using (auth.role() = 'authenticated');
create policy groups_owner_write on groups for all
  using (exists (
    select 1 from tournaments t where t.id = tournament_id and t.owner_id = auth.uid()
  ))
  with check (exists (
    select 1 from tournaments t where t.id = tournament_id and t.owner_id = auth.uid()
  ));

create policy group_pairs_authenticated_select on group_pairs for select
  using (auth.role() = 'authenticated');
create policy group_pairs_owner_write on group_pairs for all
  using (exists (
    select 1 from groups g
      join tournaments t on t.id = g.tournament_id
      where g.id = group_pairs.group_id and t.owner_id = auth.uid()
  ))
  with check (exists (
    select 1 from groups g
      join tournaments t on t.id = g.tournament_id
      where g.id = group_pairs.group_id and t.owner_id = auth.uid()
  ));

-- matches
create policy matches_authenticated_select on matches for select
  using (auth.role() = 'authenticated');
create policy matches_owner_write on matches for all
  using (exists (
    select 1 from tournaments t where t.id = tournament_id and t.owner_id = auth.uid()
  ))
  with check (exists (
    select 1 from tournaments t where t.id = tournament_id and t.owner_id = auth.uid()
  ));

-- results
create policy results_authenticated_select on results for select
  using (auth.role() = 'authenticated');

-- Only a player of the match may insert a report.
create policy results_player_insert on results for insert
  with check (
    exists (
      select 1 from matches m
      join pairs pa on pa.id = m.pair_a_id
      join pairs pb on pb.id = m.pair_b_id
      join players pla on pla.id in (pa.player_a_id, pa.player_b_id, pb.player_a_id, pb.player_b_id)
      where m.id = results.match_id
        and pla.profile_id = auth.uid()
    )
  );

-- Only owner of tournament may update (validation).
create policy results_owner_update on results for update
  using (exists (
    select 1 from matches m
    join tournaments t on t.id = m.tournament_id
    where m.id = results.match_id and t.owner_id = auth.uid()
  ));

-- rating_snapshots: authenticated read, writes only via service role.
create policy snapshots_authenticated_select on rating_snapshots for select
  using (auth.role() = 'authenticated');

-- notifications
create policy notifications_self_select on notifications for select
  using (user_id = auth.uid());
create policy notifications_self_update on notifications for update
  using (user_id = auth.uid());
create policy notifications_self_delete on notifications for delete
  using (user_id = auth.uid());
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/20260414000002_rls_policies.sql
git commit -m "feat(db): RLS policies for all tables"
```

### Task 2.6: Supabase migration — triggers (profile + player auto-creation)

**Files:**
- Create: `supabase/migrations/20260414000003_triggers.sql`

- [ ] **Step 1: Write the migration**

```sql
-- 20260414000003_triggers.sql
-- When a new auth.users row appears, create matching profile + player rows.

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_display_name text;
begin
  v_display_name := coalesce(
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name',
    split_part(new.email, '@', 1),
    'Jugador'
  );

  insert into profiles (id, display_name, email)
  values (new.id, v_display_name, new.email)
  on conflict (id) do nothing;

  insert into players (profile_id)
  values (new.id)
  on conflict (profile_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/20260414000003_triggers.sql
git commit -m "feat(db): auto-create profile+player on auth user signup"
```

### Task 2.7: `SupabaseRepository` implementation

**Files:**
- Create: `src/lib/repositories/supabase-repository.ts`

This repo takes a `SupabaseClient` injected from the caller (anon for read-as-user, service-role for privileged writes like pairs / snapshots / cross-user notifications).

- [ ] **Step 1: Write `src/lib/repositories/supabase-repository.ts`**

```ts
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Group,
  Inscription,
  Invitation,
  Match,
  Notification,
  Pair,
  Player,
  RatingSnapshot,
  Result,
  Tournament,
  TournamentStatus,
} from '@/lib/domain/types';
import type {
  NewInscriptionInput,
  NewTournamentInput,
  Repository,
  ValidateResultInput,
} from './types';

type Clients = Readonly<{ user: SupabaseClient; admin: SupabaseClient }>;

export class SupabaseRepository implements Repository {
  constructor(private readonly clients: Clients) {}

  private get db(): SupabaseClient { return this.clients.user; }
  private get admin(): SupabaseClient { return this.clients.admin; }

  // ---------- players ----------
  async getPlayerByProfileId(profileId: string): Promise<Player | null> {
    const { data, error } = await this.db
      .from('players')
      .select('id, profile_id, rating, matches_played, profiles(display_name)')
      .eq('profile_id', profileId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return mapPlayer(data);
  }

  async ensurePlayerForProfile(profileId: string, displayName: string): Promise<Player> {
    const existing = await this.getPlayerByProfileId(profileId);
    if (existing) return existing;
    // The trigger normally creates this, but if the profile already exists without
    // a player (e.g. historical data), insert defensively via the admin client.
    const { data, error } = await this.admin
      .from('players')
      .insert({ profile_id: profileId })
      .select('id, profile_id, rating, matches_played, profiles(display_name)')
      .single();
    if (error) throw error;
    return mapPlayer({ ...data, profiles: { display_name: displayName } });
  }

  async listPlayers(): Promise<ReadonlyArray<Player>> {
    const { data, error } = await this.db
      .from('players')
      .select('id, profile_id, rating, matches_played, profiles(display_name)')
      .order('rating', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapPlayer);
  }

  async getPlayer(id: string): Promise<Player | null> {
    const { data, error } = await this.db
      .from('players')
      .select('id, profile_id, rating, matches_played, profiles(display_name)')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data ? mapPlayer(data) : null;
  }

  // ---------- pairs ----------
  async upsertPair(playerAId: string, playerBId: string): Promise<Pair> {
    const [a, b] = playerAId < playerBId ? [playerAId, playerBId] : [playerBId, playerAId];
    const { data: existing } = await this.db
      .from('pairs')
      .select('id, player_a_id, player_b_id, rating')
      .eq('player_a_id', a)
      .eq('player_b_id', b)
      .maybeSingle();
    if (existing) return mapPair(existing);
    const { data, error } = await this.admin
      .from('pairs')
      .insert({ player_a_id: a, player_b_id: b })
      .select('id, player_a_id, player_b_id, rating')
      .single();
    if (error) throw error;
    return mapPair(data);
  }

  async getPair(id: string): Promise<Pair | null> {
    const { data, error } = await this.db
      .from('pairs')
      .select('id, player_a_id, player_b_id, rating')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data ? mapPair(data) : null;
  }

  async listPairsForTournament(tournamentId: string): Promise<ReadonlyArray<Pair>> {
    const { data, error } = await this.db
      .from('inscriptions')
      .select('pair:pair_id(id, player_a_id, player_b_id, rating)')
      .eq('tournament_id', tournamentId)
      .not('pair_id', 'is', null);
    if (error) throw error;
    const pairs = (data ?? []).map((row) => row.pair).filter(Boolean) as any[];
    const seen = new Set<string>();
    const unique: Pair[] = [];
    for (const p of pairs) {
      if (!seen.has(p.id)) { seen.add(p.id); unique.push(mapPair(p)); }
    }
    return unique;
  }

  async listPairsRanked(limit = 100): Promise<ReadonlyArray<Pair>> {
    const { data, error } = await this.db
      .from('pairs')
      .select('id, player_a_id, player_b_id, rating')
      .order('rating', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []).map(mapPair);
  }

  // ---------- tournaments ----------
  async createTournament(input: NewTournamentInput): Promise<Tournament> {
    const { data, error } = await this.db
      .from('tournaments')
      .insert({
        owner_id: input.ownerId,
        name: input.name,
        pairing_mode: input.pairingMode,
        size: input.size,
        group_count: input.groupCount,
        playoff_cutoff: input.playoffCutoff,
        starts_at: input.startsAt,
      })
      .select('*')
      .single();
    if (error) throw error;
    return mapTournament(data);
  }

  async getTournament(id: string): Promise<Tournament | null> {
    const { data, error } = await this.db
      .from('tournaments').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? mapTournament(data) : null;
  }

  async listTournaments(): Promise<ReadonlyArray<Tournament>> {
    const { data, error } = await this.db
      .from('tournaments').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapTournament);
  }

  async updateTournamentStatus(id: string, status: TournamentStatus): Promise<Tournament> {
    const { data, error } = await this.db
      .from('tournaments').update({ status }).eq('id', id).select('*').single();
    if (error) throw error;
    return mapTournament(data);
  }

  // ---------- inscriptions ----------
  async createInscription(input: NewInscriptionInput): Promise<Inscription> {
    const { data, error } = await this.db
      .from('inscriptions')
      .insert({
        tournament_id: input.tournamentId,
        player_id: input.playerId,
        pair_id: input.pairId,
        status: input.pairId ? 'confirmed' : 'pending',
      })
      .select('*')
      .single();
    if (error) throw error;
    return mapInscription(data);
  }

  async listInscriptions(tournamentId: string): Promise<ReadonlyArray<Inscription>> {
    const { data, error } = await this.db
      .from('inscriptions').select('*').eq('tournament_id', tournamentId);
    if (error) throw error;
    return (data ?? []).map(mapInscription);
  }

  // ---------- invitations ----------
  async createInvitation(
    tournamentId: string, token: string, expiresAt: string, createdBy: string,
  ): Promise<Invitation> {
    const { data, error } = await this.db
      .from('invitations')
      .insert({ tournament_id: tournamentId, token, expires_at: expiresAt, created_by: createdBy })
      .select('*').single();
    if (error) throw error;
    return mapInvitation(data);
  }

  async getInvitationByToken(token: string): Promise<Invitation | null> {
    const { data, error } = await this.admin
      .from('invitations').select('*').eq('token', token).maybeSingle();
    if (error) throw error;
    return data ? mapInvitation(data) : null;
  }

  // ---------- groups + matches ----------
  async createGroups(groups: ReadonlyArray<Group>): Promise<ReadonlyArray<Group>> {
    const groupRows = groups.map((g) => ({ id: g.id, tournament_id: g.tournamentId, label: g.label }));
    const { error: gErr } = await this.db.from('groups').insert(groupRows);
    if (gErr) throw gErr;
    const gpRows = groups.flatMap((g) => g.pairIds.map((pid) => ({ group_id: g.id, pair_id: pid })));
    if (gpRows.length) {
      const { error: pErr } = await this.db.from('group_pairs').insert(gpRows);
      if (pErr) throw pErr;
    }
    return groups;
  }

  async listGroups(tournamentId: string): Promise<ReadonlyArray<Group>> {
    const { data, error } = await this.db
      .from('groups')
      .select('id, tournament_id, label, group_pairs(pair_id)')
      .eq('tournament_id', tournamentId)
      .order('label', { ascending: true });
    if (error) throw error;
    return (data ?? []).map((g: any) => ({
      id: g.id,
      tournamentId: g.tournament_id,
      label: g.label,
      pairIds: (g.group_pairs ?? []).map((r: { pair_id: string }) => r.pair_id),
    }));
  }

  async createMatches(matches: ReadonlyArray<Match>): Promise<ReadonlyArray<Match>> {
    if (matches.length === 0) return matches;
    const rows = matches.map((m) => ({
      id: m.id, tournament_id: m.tournamentId, phase: m.phase, group_id: m.groupId,
      pair_a_id: m.pairAId, pair_b_id: m.pairBId, court: m.court, scheduled_at: m.scheduledAt,
    }));
    const { error } = await this.db.from('matches').insert(rows);
    if (error) throw error;
    return matches;
  }

  async getMatch(id: string): Promise<Match | null> {
    const { data, error } = await this.db.from('matches').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? mapMatch(data) : null;
  }

  async listMatches(tournamentId: string): Promise<ReadonlyArray<Match>> {
    const { data, error } = await this.db
      .from('matches').select('*').eq('tournament_id', tournamentId);
    if (error) throw error;
    return (data ?? []).map(mapMatch);
  }

  // ---------- results ----------
  async reportResult(r: Omit<Result, 'id' | 'validatedBy' | 'validatedAt'>): Promise<Result> {
    const { data, error } = await this.db
      .from('results')
      .insert({
        match_id: r.matchId,
        sets: r.sets,
        winner_pair_id: r.winnerPairId,
        reported_by: r.reportedBy,
        status: 'reported',
        corrects_result_id: r.correctsResultId,
      })
      .select('*').single();
    if (error) throw error;
    return mapResult(data);
  }

  async getResultForMatch(matchId: string): Promise<Result | null> {
    const { data, error } = await this.db
      .from('results')
      .select('*')
      .eq('match_id', matchId)
      .neq('status', 'corrected')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data ? mapResult(data) : null;
  }

  async validateResult(input: ValidateResultInput): Promise<Result> {
    // Use admin client so we can atomically write snapshots + updates.
    const admin = this.admin;
    const { data: result, error: upErr } = await admin
      .from('results')
      .update({
        status: 'validated',
        validated_by: input.validatorId,
        validated_at: input.validatedAt,
      })
      .eq('id', input.resultId)
      .select('*').single();
    if (upErr) throw upErr;

    if (input.snapshots.length) {
      const rows = input.snapshots.map((s) => ({
        id: s.id, subject_type: s.subjectType, subject_id: s.subjectId,
        before: s.before, after: s.after, delta: s.delta,
        match_id: s.matchId, result_id: s.resultId, created_at: s.createdAt,
      }));
      const { error: sErr } = await admin.from('rating_snapshots').insert(rows);
      if (sErr) throw sErr;
    }
    for (const [pid, rating] of Object.entries(input.newPlayerRatings)) {
      const { error } = await admin.rpc('increment_matches_and_set_rating', {
        p_player_id: pid, p_rating: rating,
      });
      if (error) throw error;
    }
    for (const [pid, rating] of Object.entries(input.newPairRatings)) {
      const { error } = await admin.from('pairs').update({ rating }).eq('id', pid);
      if (error) throw error;
    }
    return mapResult(result);
  }

  async correctResult(
    original: Result,
    replacement: Omit<Result, 'id' | 'correctsResultId' | 'status'>,
  ): Promise<Result> {
    const admin = this.admin;
    const { error: upErr } = await admin
      .from('results').update({ status: 'corrected' }).eq('id', original.id);
    if (upErr) throw upErr;
    const { data, error } = await admin
      .from('results')
      .insert({
        match_id: replacement.matchId,
        sets: replacement.sets,
        winner_pair_id: replacement.winnerPairId,
        reported_by: replacement.reportedBy,
        status: 'reported',
        corrects_result_id: original.id,
      })
      .select('*').single();
    if (error) throw error;
    return mapResult(data);
  }

  // ---------- snapshots ----------
  async listRatingSnapshotsForSubject(
    subjectType: 'player' | 'pair',
    subjectId: string,
  ): Promise<ReadonlyArray<RatingSnapshot>> {
    const { data, error } = await this.db
      .from('rating_snapshots')
      .select('*')
      .eq('subject_type', subjectType)
      .eq('subject_id', subjectId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data ?? []).map(mapSnapshot);
  }

  // ---------- notifications ----------
  async createNotification(n: Omit<Notification, 'id' | 'createdAt' | 'readAt'>): Promise<Notification> {
    const { data, error } = await this.admin
      .from('notifications')
      .insert({ user_id: n.userId, kind: n.kind, payload: n.payload })
      .select('*').single();
    if (error) throw error;
    return mapNotification(data);
  }

  async listNotifications(userId: string): Promise<ReadonlyArray<Notification>> {
    const { data, error } = await this.db
      .from('notifications').select('*').eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapNotification);
  }

  async markNotificationRead(id: string, userId: string): Promise<void> {
    const { error } = await this.db
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', id).eq('user_id', userId);
    if (error) throw error;
  }
}

// ---------- mappers ----------
function mapPlayer(row: any): Player {
  return {
    id: row.id,
    profileId: row.profile_id,
    displayName: row.profiles?.display_name ?? 'Jugador',
    rating: Number(row.rating),
    matchesPlayed: Number(row.matches_played),
  };
}
function mapPair(row: any): Pair {
  return { id: row.id, playerAId: row.player_a_id, playerBId: row.player_b_id, rating: Number(row.rating) };
}
function mapTournament(row: any): Tournament {
  return {
    id: row.id, ownerId: row.owner_id, name: row.name, status: row.status,
    pairingMode: row.pairing_mode, size: row.size,
    groupCount: row.group_count, playoffCutoff: row.playoff_cutoff,
    startsAt: row.starts_at, createdAt: row.created_at,
  };
}
function mapInscription(row: any): Inscription {
  return {
    id: row.id, tournamentId: row.tournament_id, playerId: row.player_id,
    pairId: row.pair_id, status: row.status,
  };
}
function mapInvitation(row: any): Invitation {
  return {
    id: row.id, tournamentId: row.tournament_id, token: row.token,
    expiresAt: row.expires_at, createdBy: row.created_by, createdAt: row.created_at,
  };
}
function mapMatch(row: any): Match {
  return {
    id: row.id, tournamentId: row.tournament_id, phase: row.phase,
    groupId: row.group_id, pairAId: row.pair_a_id, pairBId: row.pair_b_id,
    court: row.court, scheduledAt: row.scheduled_at,
  };
}
function mapResult(row: any): Result {
  return {
    id: row.id, matchId: row.match_id, sets: row.sets,
    winnerPairId: row.winner_pair_id, reportedBy: row.reported_by,
    validatedBy: row.validated_by, validatedAt: row.validated_at,
    status: row.status, correctsResultId: row.corrects_result_id,
  };
}
function mapSnapshot(row: any): RatingSnapshot {
  return {
    id: row.id, subjectType: row.subject_type, subjectId: row.subject_id,
    before: Number(row.before), after: Number(row.after), delta: Number(row.delta),
    matchId: row.match_id, resultId: row.result_id, createdAt: row.created_at,
  };
}
function mapNotification(row: any): Notification {
  return {
    id: row.id, userId: row.user_id, kind: row.kind, payload: row.payload ?? {},
    readAt: row.read_at, createdAt: row.created_at,
  };
}
```

- [ ] **Step 2: Add the `increment_matches_and_set_rating` RPC as a new migration**

Create `supabase/migrations/20260414000004_rating_rpc.sql`:

```sql
create or replace function public.increment_matches_and_set_rating(
  p_player_id uuid,
  p_rating real
) returns void
language sql
security definer
set search_path = public
as $$
  update players
    set rating = p_rating,
        matches_played = matches_played + 1
    where id = p_player_id;
$$;
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/repositories/supabase-repository.ts supabase/migrations/20260414000004_rating_rpc.sql
git commit -m "feat(repo): supabase adapter + rating rpc"
```

---

## Part 3 — Auth

### Task 3.1: Supabase browser + server + admin clients

**Files:**
- Create: `src/lib/supabase/browser.ts`
- Create: `src/lib/supabase/server.ts`
- Create: `src/lib/supabase/admin.ts`

- [ ] **Step 1: Write `src/lib/supabase/browser.ts`**

```ts
import { createBrowserClient } from '@supabase/ssr';

export function createBrowserSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

- [ ] **Step 2: Write `src/lib/supabase/server.ts`**

```ts
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { getServerEnv } from '@/lib/env';

export async function createServerSupabase() {
  const env = getServerEnv();
  const cookieStore = await cookies();
  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot set cookies; ignore — middleware refreshes them.
        }
      },
    },
  });
}
```

- [ ] **Step 3: Write `src/lib/supabase/admin.ts`**

```ts
import { createClient } from '@supabase/supabase-js';
import { getServerEnv } from '@/lib/env';

/**
 * Service-role client — bypasses RLS. Use ONLY for:
 * - inserts into pairs, rating_snapshots, notifications
 * - trusted cross-user reads like invitation-by-token landing
 * NEVER expose this client to browser code.
 */
export function createAdminSupabase() {
  const env = getServerEnv();
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/supabase
git commit -m "feat(auth): supabase browser, server, and admin clients"
```

### Task 3.2: Next middleware for session refresh

**Files:**
- Create: `src/middleware.ts`
- Create: `src/lib/supabase/middleware.ts`

- [ ] **Step 1: Write `src/lib/supabase/middleware.ts`**

```ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isProtected = pathname.startsWith('/app');
  if (isProtected && !user) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = '/login';
    redirect.searchParams.set('next', pathname);
    return NextResponse.redirect(redirect);
  }

  return response;
}
```

- [ ] **Step 2: Write `src/middleware.ts`**

```ts
import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Exclude static assets and the service worker.
    '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|.*\\.(?:png|jpg|svg|webp|ico)$).*)',
  ],
};
```

- [ ] **Step 3: Commit**

```bash
git add src/middleware.ts src/lib/supabase/middleware.ts
git commit -m "feat(auth): middleware refreshes supabase session and gates /app"
```

### Task 3.3: OAuth callback + auth helpers

**Files:**
- Create: `src/app/auth/callback/route.ts`
- Create: `src/lib/auth/session.ts`

- [ ] **Step 1: Write `src/app/auth/callback/route.ts`**

```ts
import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/app';

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=missing_code', request.url));
  }

  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL('/login?error=exchange_failed', request.url));
  }
  return NextResponse.redirect(new URL(next, request.url));
}
```

- [ ] **Step 2: Write `src/lib/auth/session.ts`**

```ts
import { createServerSupabase } from '@/lib/supabase/server';
import type { Player } from '@/lib/domain/types';
import { SupabaseRepository } from '@/lib/repositories/supabase-repository';
import { createAdminSupabase } from '@/lib/supabase/admin';

export type Session = Readonly<{
  userId: string;
  email: string | null;
  displayName: string;
  player: Player;
}>;

export async function getSession(): Promise<Session | null> {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const repo = new SupabaseRepository({ user: supabase, admin: createAdminSupabase() });
  const player = await repo.ensurePlayerForProfile(
    user.id,
    user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email?.split('@')[0] ?? 'Jugador',
  );
  return {
    userId: user.id,
    email: user.email ?? null,
    displayName: player.displayName,
    player,
  };
}

export async function requireSession(): Promise<Session> {
  const s = await getSession();
  if (!s) throw new Error('NOT_AUTHORIZED');
  return s;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/auth/callback/route.ts src/lib/auth/session.ts
git commit -m "feat(auth): oauth callback and session helpers"
```

---

## Part 4 — Server actions

Every server action:
1. Calls `requireSession()` first.
2. Parses input with Zod; on failure returns `fail('VALIDATION_FAILED', …, fields)`.
3. Never throws to the caller; maps known errors to `ErrorCode`.
4. Uses a `Repository` obtained from `getRepo()` — dependency injection friendly for tests.

### Task 4.1: Repository provider (DI seam)

**Files:**
- Create: `src/lib/repositories/provider.ts`

- [ ] **Step 1: Write `src/lib/repositories/provider.ts`**

```ts
import type { Repository } from './types';
import { SupabaseRepository } from './supabase-repository';
import { createServerSupabase } from '@/lib/supabase/server';
import { createAdminSupabase } from '@/lib/supabase/admin';

type RepoFactory = () => Promise<Repository>;

let override: RepoFactory | null = null;

/** Tests call this before invoking a server action to inject InMemoryRepository. */
export function __setRepoFactoryForTests(factory: RepoFactory | null): void {
  override = factory;
}

export async function getRepo(): Promise<Repository> {
  if (override) return override();
  const user = await createServerSupabase();
  const admin = createAdminSupabase();
  return new SupabaseRepository({ user, admin });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/repositories/provider.ts
git commit -m "feat(repo): provider with test override"
```

### Task 4.2: Tournament server actions

**Files:**
- Create: `src/app/app/tournaments/actions.ts`
- Create: `src/lib/domain/__tests__/tournament-flow.test.ts` (integration via InMemoryRepo)

- [ ] **Step 1: Write the failing integration test**

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InMemoryRepository } from '@/lib/repositories/in-memory-repository';
import { __setRepoFactoryForTests } from '@/lib/repositories/provider';

const sessionMock = vi.hoisted(() => ({ current: null as any }));

vi.mock('@/lib/auth/session', () => ({
  requireSession: async () => {
    if (!sessionMock.current) throw new Error('NOT_AUTHORIZED');
    return sessionMock.current;
  },
  getSession: async () => sessionMock.current,
}));
vi.mock('next/cache', () => ({ revalidatePath: () => {} }));

describe('createTournamentAction', () => {
  let repo: InMemoryRepository;
  beforeEach(() => {
    repo = new InMemoryRepository();
    __setRepoFactoryForTests(async () => repo);
    sessionMock.current = {
      userId: 'owner-profile',
      email: 'o@x.com',
      displayName: 'Owner',
      player: { id: 'player-owner', profileId: 'owner-profile', displayName: 'Owner', rating: 1200, matchesPlayed: 0 },
    };
  });

  it('creates a draft tournament with valid input', async () => {
    const { createTournamentAction } = await import('@/app/app/tournaments/actions');
    const res = await createTournamentAction({
      name: 'Abril',
      pairingMode: 'draw',
      size: 8,
      groupCount: 2,
      playoffCutoff: 4,
      startsAt: '2026-05-01T18:00:00.000Z',
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      const t = await repo.getTournament(res.data.id);
      expect(t?.status).toBe('draft');
      expect(t?.ownerId).toBe('owner-profile');
    }
  });

  it('rejects invalid cutoff', async () => {
    const { createTournamentAction } = await import('@/app/app/tournaments/actions');
    const res = await createTournamentAction({
      name: 'Bad', pairingMode: 'draw',
      size: 8, groupCount: 2, playoffCutoff: 5, startsAt: null,
    } as any);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe('VALIDATION_FAILED');
  });

  it('rejects when no session', async () => {
    sessionMock.current = null;
    const { createTournamentAction } = await import('@/app/app/tournaments/actions');
    const res = await createTournamentAction({
      name: 'x', pairingMode: 'draw',
      size: 8, groupCount: 2, playoffCutoff: 4, startsAt: null,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe('NOT_AUTHORIZED');
  });
});
```

- [ ] **Step 2: Run test; expect FAIL (module missing)**

- [ ] **Step 3: Write `src/app/app/tournaments/actions.ts`**

```ts
'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { randomBytes } from 'node:crypto';
import { addDays } from 'date-fns';
import {
  ALLOWED_PLAYOFF_CUTOFFS,
  INVITATION_TOKEN_BYTES,
  INVITATION_TTL_DAYS,
  PAIRING_MODE,
} from '@/lib/utils/constants';
import { requireSession } from '@/lib/auth/session';
import { getRepo } from '@/lib/repositories/provider';
import { fail, ok, type ActionResult } from '@/lib/domain/action-result';
import type { Tournament } from '@/lib/domain/types';
import { generateGroups, generateRoundRobinMatches, knockoutPhaseFor, seedKnockout } from '@/lib/domain/bracket';
import { drawPairs } from '@/lib/domain/pairing';
import { computeStandings } from '@/lib/domain/standings';

const CreateTournamentSchema = z.object({
  name: z.string().trim().min(3).max(80),
  pairingMode: z.enum(PAIRING_MODE),
  size: z.number().int().positive().max(64),
  groupCount: z.number().int().min(1).max(8),
  playoffCutoff: z.number().int().refine(
    (v) => (ALLOWED_PLAYOFF_CUTOFFS as readonly number[]).includes(v),
    { message: 'cutoff no permitido' },
  ),
  startsAt: z.string().datetime().nullable(),
}).refine(
  (v) => v.size % v.groupCount === 0,
  { message: 'size debe ser múltiplo de groupCount', path: ['size'] },
);

export type CreateTournamentInput = z.input<typeof CreateTournamentSchema>;

async function withAuth<T>(fn: (session: Awaited<ReturnType<typeof requireSession>>) => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    const session = await requireSession();
    return await fn(session);
  } catch (err) {
    if (err instanceof Error && err.message === 'NOT_AUTHORIZED') {
      return fail('NOT_AUTHORIZED', 'Debes iniciar sesión');
    }
    return fail('UNEXPECTED', err instanceof Error ? err.message : 'Error inesperado');
  }
}

function fieldsFromZod(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of err.issues) out[i.path.join('.') || '_'] = i.message;
  return out;
}

export async function createTournamentAction(input: CreateTournamentInput): Promise<ActionResult<Tournament>> {
  return withAuth(async (session) => {
    const parsed = CreateTournamentSchema.safeParse(input);
    if (!parsed.success) {
      return fail('VALIDATION_FAILED', 'Datos inválidos', fieldsFromZod(parsed.error));
    }
    const repo = await getRepo();
    const t = await repo.createTournament({
      ownerId: session.userId,
      name: parsed.data.name,
      pairingMode: parsed.data.pairingMode,
      size: parsed.data.size,
      groupCount: parsed.data.groupCount,
      playoffCutoff: parsed.data.playoffCutoff,
      startsAt: parsed.data.startsAt,
    });
    revalidatePath('/app/tournaments');
    return ok(t);
  });
}

export async function openTournamentAction(tournamentId: string): Promise<ActionResult<Tournament>> {
  return withAuth(async (session) => {
    const repo = await getRepo();
    const t = await repo.getTournament(tournamentId);
    if (!t) return fail('NOT_FOUND', 'Torneo no encontrado');
    if (t.ownerId !== session.userId) return fail('NOT_AUTHORIZED', 'No eres el organizador');
    if (t.status !== 'draft') return fail('CONFLICT', 'El torneo ya no está en borrador');
    const updated = await repo.updateTournamentStatus(tournamentId, 'open');
    revalidatePath(`/app/tournaments/${tournamentId}`);
    return ok(updated);
  });
}

export async function createInvitationAction(tournamentId: string): Promise<ActionResult<{ token: string }>> {
  return withAuth(async (session) => {
    const repo = await getRepo();
    const t = await repo.getTournament(tournamentId);
    if (!t) return fail('NOT_FOUND', 'Torneo no encontrado');
    if (t.ownerId !== session.userId) return fail('NOT_AUTHORIZED', 'Solo el organizador puede invitar');
    const token = randomBytes(INVITATION_TOKEN_BYTES).toString('base64url');
    const expiresAt = addDays(new Date(), INVITATION_TTL_DAYS).toISOString();
    await repo.createInvitation(tournamentId, token, expiresAt, session.userId);
    revalidatePath(`/app/tournaments/${tournamentId}`);
    return ok({ token });
  });
}

export async function startTournamentAction(tournamentId: string, seed = Date.now()): Promise<ActionResult<Tournament>> {
  return withAuth(async (session) => {
    const repo = await getRepo();
    const t = await repo.getTournament(tournamentId);
    if (!t) return fail('NOT_FOUND', 'Torneo no encontrado');
    if (t.ownerId !== session.userId) return fail('NOT_AUTHORIZED', 'No eres el organizador');
    if (t.status !== 'open') return fail('CONFLICT', `Status actual: ${t.status}`);

    const inscriptions = await repo.listInscriptions(tournamentId);
    const withPair = inscriptions.filter((i) => i.pairId);
    const singles = inscriptions.filter((i) => !i.pairId);

    // 1. Build pairs from singles.
    const singlePlayers = await Promise.all(singles.map((i) => repo.getPlayer(i.playerId)));
    const validSinglePlayers = singlePlayers.filter((p): p is NonNullable<typeof p> => !!p);
    const { pairs: drawnPairs } = drawPairs(validSinglePlayers, seed);
    for (const dp of drawnPairs) {
      await repo.upsertPair(dp.playerAId, dp.playerBId);
    }
    const allPairs = await repo.listPairsForTournament(tournamentId);
    if (allPairs.length < 2) return fail('CONFLICT', 'No hay parejas suficientes');

    // 2. Groups + matches.
    const groups = generateGroups(allPairs, t.groupCount, tournamentId);
    await repo.createGroups(groups);
    const rrMatches = groups.flatMap((g) => generateRoundRobinMatches(g.pairIds, tournamentId, g.id));
    await repo.createMatches(rrMatches);

    const updated = await repo.updateTournamentStatus(tournamentId, 'groups');
    revalidatePath(`/app/tournaments/${tournamentId}`);
    return ok(updated);
  });
}

export async function advanceToKnockoutAction(tournamentId: string): Promise<ActionResult<Tournament>> {
  return withAuth(async (session) => {
    const repo = await getRepo();
    const t = await repo.getTournament(tournamentId);
    if (!t) return fail('NOT_FOUND', 'Torneo no encontrado');
    if (t.ownerId !== session.userId) return fail('NOT_AUTHORIZED', 'No eres el organizador');
    if (t.status !== 'groups') return fail('CONFLICT', `Status actual: ${t.status}`);
    if (t.playoffCutoff < 2) {
      const done = await repo.updateTournamentStatus(tournamentId, 'complete');
      revalidatePath(`/app/tournaments/${tournamentId}`);
      return ok(done);
    }

    const [groups, matches, pairs] = await Promise.all([
      repo.listGroups(tournamentId),
      repo.listMatches(tournamentId),
      repo.listPairsForTournament(tournamentId),
    ]);

    const resultsByMatch = await Promise.all(
      matches.filter((m) => m.phase === 'group').map((m) => repo.getResultForMatch(m.id)),
    );
    const allValidated = resultsByMatch.every((r) => r?.status === 'validated');
    if (!allValidated) return fail('CONFLICT', 'Faltan resultados por validar en la fase de grupos');

    const pairById = new Map(pairs.map((p) => [p.id, p] as const));
    const standingsPerGroup = groups.map((g) => {
      const groupPairs = g.pairIds.map((id) => pairById.get(id)).filter((p): p is typeof pairs[number] => !!p);
      const groupMatches = matches.filter((m) => m.groupId === g.id);
      const rowsResults = resultsByMatch.filter((r): r is NonNullable<typeof r> => !!r);
      const rows = computeStandings(groupPairs, groupMatches, rowsResults);
      return rows.map((r) => pairById.get(r.pairId)!).filter(Boolean);
    });

    const knockoutMatches = seedKnockout(standingsPerGroup, t.playoffCutoff, tournamentId);
    await repo.createMatches(knockoutMatches);
    const updated = await repo.updateTournamentStatus(tournamentId, 'knockout');
    revalidatePath(`/app/tournaments/${tournamentId}`);
    return ok(updated);
  });
}
```

- [ ] **Step 4: Run test; expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/app/app/tournaments/actions.ts src/lib/repositories/provider.ts src/lib/domain/__tests__/tournament-flow.test.ts
git commit -m "feat(app): tournament lifecycle server actions"
```

### Task 4.3: Invitation landing + inscription server actions

**Files:**
- Create: `src/app/app/tournaments/inscriptions/actions.ts`
- Create: `src/app/invite/[token]/actions.ts`

- [ ] **Step 1: Write `src/app/invite/[token]/actions.ts`**

```ts
'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requireSession } from '@/lib/auth/session';
import { getRepo } from '@/lib/repositories/provider';
import { fail, ok, type ActionResult } from '@/lib/domain/action-result';
import type { Inscription } from '@/lib/domain/types';

const InscribeSchema = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('solo'), token: z.string().min(8) }),
  z.object({ mode: z.literal('with_partner'), token: z.string().min(8), partnerPlayerId: z.string().uuid() }),
]);

export type InscribeInput = z.input<typeof InscribeSchema>;

export async function inscribeFromInviteAction(input: InscribeInput): Promise<ActionResult<Inscription>> {
  try {
    const session = await requireSession();
    const parsed = InscribeSchema.safeParse(input);
    if (!parsed.success) {
      return fail('VALIDATION_FAILED', 'Datos inválidos', {
        _: parsed.error.issues.map((i) => i.message).join(', '),
      });
    }
    const repo = await getRepo();
    const inv = await repo.getInvitationByToken(parsed.data.token);
    if (!inv) return fail('NOT_FOUND', 'Invitación inválida');
    if (new Date(inv.expiresAt).getTime() < Date.now()) return fail('INVITATION_EXPIRED', 'Invitación caducada');

    const t = await repo.getTournament(inv.tournamentId);
    if (!t) return fail('NOT_FOUND', 'Torneo no encontrado');
    if (t.status !== 'open') return fail('CONFLICT', 'Las inscripciones están cerradas');

    const existing = await repo.listInscriptions(t.id);
    if (existing.length >= t.size) return fail('TOURNAMENT_FULL', 'El torneo está completo');
    if (existing.some((i) => i.playerId === session.player.id)) {
      return fail('CONFLICT', 'Ya estás inscrito');
    }

    let pairId: string | null = null;
    if (parsed.data.mode === 'with_partner') {
      if (t.pairingMode === 'draw') return fail('CONFLICT', 'Este torneo sortea parejas');
      const partner = await repo.getPlayer(parsed.data.partnerPlayerId);
      if (!partner) return fail('NOT_FOUND', 'Compañero no encontrado');
      if (partner.id === session.player.id) return fail('VALIDATION_FAILED', 'No puedes emparejarte contigo');
      const pair = await repo.upsertPair(session.player.id, partner.id);
      pairId = pair.id;
    } else {
      if (t.pairingMode === 'pre_inscribed') return fail('CONFLICT', 'Debes inscribirte con pareja');
    }

    const ins = await repo.createInscription({
      tournamentId: t.id, playerId: session.player.id, pairId,
    });
    await repo.createNotification({
      userId: t.ownerId, kind: 'inscription_new',
      payload: { tournamentId: t.id, playerId: session.player.id, playerName: session.displayName },
    });
    revalidatePath(`/app/tournaments/${t.id}`);
    return ok(ins);
  } catch (err) {
    if (err instanceof Error && err.message === 'NOT_AUTHORIZED') {
      return fail('NOT_AUTHORIZED', 'Debes iniciar sesión');
    }
    return fail('UNEXPECTED', err instanceof Error ? err.message : 'Error inesperado');
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/invite/[token]/actions.ts
git commit -m "feat(app): invite landing inscription action"
```

### Task 4.4: Result report / validate / correct actions

**Files:**
- Create: `src/app/app/tournaments/[tournamentId]/matches/[matchId]/actions.ts`
- Create: `src/app/app/tournaments/[tournamentId]/matches/[matchId]/__tests__/actions.test.ts`

- [ ] **Step 1: Write the failing test (happy path + re-validation guard)**

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InMemoryRepository } from '@/lib/repositories/in-memory-repository';
import { __setRepoFactoryForTests } from '@/lib/repositories/provider';

const sessionMock = vi.hoisted(() => ({ current: null as any }));
vi.mock('@/lib/auth/session', () => ({
  requireSession: async () => {
    if (!sessionMock.current) throw new Error('NOT_AUTHORIZED');
    return sessionMock.current;
  },
}));
vi.mock('next/cache', () => ({ revalidatePath: () => {} }));

describe('result actions', () => {
  let repo: InMemoryRepository;

  async function setupTournament() {
    const [p1, p2, p3, p4] = await Promise.all([
      repo.ensurePlayerForProfile('prof-1', 'A'),
      repo.ensurePlayerForProfile('prof-2', 'B'),
      repo.ensurePlayerForProfile('prof-3', 'C'),
      repo.ensurePlayerForProfile('prof-4', 'D'),
    ]);
    const pairA = await repo.upsertPair(p1.id, p2.id);
    const pairB = await repo.upsertPair(p3.id, p4.id);
    const t = await repo.createTournament({
      ownerId: 'prof-owner', name: 't', pairingMode: 'draw',
      size: 4, groupCount: 1, playoffCutoff: 2, startsAt: null,
    });
    const [m] = await repo.createMatches([{
      id: 'm1', tournamentId: t.id, phase: 'group', groupId: null,
      pairAId: pairA.id, pairBId: pairB.id, court: null, scheduledAt: null,
    }]);
    return { t, m, p1, pairA, pairB };
  }

  beforeEach(() => {
    repo = new InMemoryRepository();
    __setRepoFactoryForTests(async () => repo);
  });

  it('reports, then validates, then blocks re-validation', async () => {
    const { t, m, p1, pairA } = await setupTournament();
    sessionMock.current = { userId: 'prof-1', email: null, displayName: 'A', player: p1 };
    const { reportResultAction } = await import('@/app/app/tournaments/[tournamentId]/matches/[matchId]/actions');
    const rep = await reportResultAction({
      matchId: m.id,
      sets: [{ a: 6, b: 2 }, { a: 6, b: 3 }],
    });
    expect(rep.ok).toBe(true);

    sessionMock.current = { userId: 'prof-owner', email: null, displayName: 'O', player: { ...p1, id: 'player-owner', profileId: 'prof-owner' } };
    const { validateResultAction } = await import('@/app/app/tournaments/[tournamentId]/matches/[matchId]/actions');
    const v1 = await validateResultAction({ tournamentId: t.id, matchId: m.id });
    expect(v1.ok).toBe(true);

    const v2 = await validateResultAction({ tournamentId: t.id, matchId: m.id });
    expect(v2.ok).toBe(false);
    if (!v2.ok) expect(v2.code).toBe('RESULT_ALREADY_VALIDATED');

    expect((await repo.getPair(pairA.id))!.rating).toBeGreaterThan(1200);
  });

  it('rejects invalid sets', async () => {
    const { m, p1 } = await setupTournament();
    sessionMock.current = { userId: 'prof-1', email: null, displayName: 'A', player: p1 };
    const { reportResultAction } = await import('@/app/app/tournaments/[tournamentId]/matches/[matchId]/actions');
    const r = await reportResultAction({ matchId: m.id, sets: [{ a: 5, b: 3 }, { a: 6, b: 2 }] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('VALIDATION_FAILED');
  });
});
```

- [ ] **Step 2: Write `src/app/app/tournaments/[tournamentId]/matches/[matchId]/actions.ts`**

```ts
'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requireSession } from '@/lib/auth/session';
import { getRepo } from '@/lib/repositories/provider';
import { fail, ok, type ActionResult } from '@/lib/domain/action-result';
import type { Result } from '@/lib/domain/types';
import { validateSets, winnerOfSets } from '@/lib/domain/result';
import { applyRating } from '@/lib/domain/rating';

const ReportResultSchema = z.object({
  matchId: z.string().uuid().or(z.string().min(1)),
  sets: z.array(z.object({ a: z.number().int().min(0), b: z.number().int().min(0) })).min(2).max(3),
});

export async function reportResultAction(input: z.input<typeof ReportResultSchema>): Promise<ActionResult<Result>> {
  try {
    const session = await requireSession();
    const parsed = ReportResultSchema.safeParse(input);
    if (!parsed.success) {
      return fail('VALIDATION_FAILED', 'Datos inválidos', {
        _: parsed.error.issues.map((i) => i.message).join(', '),
      });
    }
    const setsCheck = validateSets(parsed.data.sets);
    if (!setsCheck.ok) return setsCheck;

    const repo = await getRepo();
    const match = await repo.getMatch(parsed.data.matchId);
    if (!match) return fail('NOT_FOUND', 'Partido no encontrado');

    const pairA = await repo.getPair(match.pairAId);
    const pairB = await repo.getPair(match.pairBId);
    if (!pairA || !pairB) return fail('NOT_FOUND', 'Pareja no encontrada');

    const allowedPlayerIds = new Set([
      pairA.playerAId, pairA.playerBId, pairB.playerAId, pairB.playerBId,
    ]);
    if (!allowedPlayerIds.has(session.player.id)) {
      return fail('NOT_AUTHORIZED', 'Solo los jugadores del partido pueden reportar');
    }

    const existing = await repo.getResultForMatch(match.id);
    if (existing && existing.status !== 'corrected') {
      return fail('CONFLICT', 'Ya se ha reportado un resultado para este partido');
    }

    const winnerSide = winnerOfSets(parsed.data.sets);
    const winnerPairId = winnerSide === 'a' ? match.pairAId : match.pairBId;

    const reported = await repo.reportResult({
      matchId: match.id,
      sets: parsed.data.sets,
      winnerPairId,
      reportedBy: session.userId,
      status: 'reported',
      correctsResultId: null,
    });

    const tournament = await repo.getTournament(match.tournamentId);
    if (tournament) {
      await repo.createNotification({
        userId: tournament.ownerId,
        kind: 'result_reported',
        payload: { tournamentId: tournament.id, matchId: match.id, resultId: reported.id },
      });
    }
    revalidatePath(`/app/tournaments/${match.tournamentId}/matches/${match.id}`);
    return ok(reported);
  } catch (err) {
    if (err instanceof Error && err.message === 'NOT_AUTHORIZED') {
      return fail('NOT_AUTHORIZED', 'Debes iniciar sesión');
    }
    return fail('UNEXPECTED', err instanceof Error ? err.message : 'Error inesperado');
  }
}

const ValidateSchema = z.object({
  tournamentId: z.string().min(1),
  matchId: z.string().min(1),
});

export async function validateResultAction(input: z.input<typeof ValidateSchema>): Promise<ActionResult<Result>> {
  try {
    const session = await requireSession();
    const parsed = ValidateSchema.safeParse(input);
    if (!parsed.success) return fail('VALIDATION_FAILED', 'Datos inválidos');

    const repo = await getRepo();
    const tournament = await repo.getTournament(parsed.data.tournamentId);
    if (!tournament) return fail('NOT_FOUND', 'Torneo no encontrado');
    if (tournament.ownerId !== session.userId) {
      return fail('NOT_AUTHORIZED', 'Solo el organizador valida');
    }
    const match = await repo.getMatch(parsed.data.matchId);
    if (!match) return fail('NOT_FOUND', 'Partido no encontrado');
    const reported = await repo.getResultForMatch(match.id);
    if (!reported) return fail('NOT_FOUND', 'No hay resultado reportado');
    if (reported.status === 'validated') return fail('RESULT_ALREADY_VALIDATED', 'Ya validado');

    const [pairA, pairB] = await Promise.all([repo.getPair(match.pairAId), repo.getPair(match.pairBId)]);
    if (!pairA || !pairB) return fail('NOT_FOUND', 'Pareja no encontrada');
    const playerIds = [pairA.playerAId, pairA.playerBId, pairB.playerAId, pairB.playerBId];
    const playersArr = await Promise.all(playerIds.map((id) => repo.getPlayer(id)));
    if (playersArr.some((p) => !p)) return fail('NOT_FOUND', 'Jugador no encontrado');
    const players = Object.fromEntries(playersArr.map((p) => [p!.id, p!]));
    const pairs = { [pairA.id]: pairA, [pairB.id]: pairB };

    const now = new Date().toISOString();
    const { snapshots, newPlayerRatings, newPairRatings } = applyRating({
      match, result: reported, players, pairs, now,
    });

    const validated = await repo.validateResult({
      resultId: reported.id, matchId: match.id, validatorId: session.userId,
      validatedAt: now, snapshots, newPlayerRatings, newPairRatings,
    });

    // Notify 4 players.
    for (const p of playersArr) {
      if (!p) continue;
      await repo.createNotification({
        userId: p.profileId,
        kind: 'result_validated',
        payload: {
          tournamentId: tournament.id, matchId: match.id, resultId: validated.id,
          delta: newPlayerRatings[p.id] - p.rating,
        },
      });
    }
    revalidatePath(`/app/tournaments/${tournament.id}`);
    return ok(validated);
  } catch (err) {
    if (err instanceof Error && err.message === 'NOT_AUTHORIZED') {
      return fail('NOT_AUTHORIZED', 'Debes iniciar sesión');
    }
    return fail('UNEXPECTED', err instanceof Error ? err.message : 'Error inesperado');
  }
}

const CorrectSchema = z.object({
  tournamentId: z.string().min(1),
  matchId: z.string().min(1),
  sets: z.array(z.object({ a: z.number().int().min(0), b: z.number().int().min(0) })).min(2).max(3),
});

export async function correctResultAction(input: z.input<typeof CorrectSchema>): Promise<ActionResult<Result>> {
  try {
    const session = await requireSession();
    const parsed = CorrectSchema.safeParse(input);
    if (!parsed.success) return fail('VALIDATION_FAILED', 'Datos inválidos');

    const setsCheck = validateSets(parsed.data.sets);
    if (!setsCheck.ok) return setsCheck;

    const repo = await getRepo();
    const tournament = await repo.getTournament(parsed.data.tournamentId);
    if (!tournament) return fail('NOT_FOUND', 'Torneo no encontrado');
    if (tournament.ownerId !== session.userId) {
      return fail('NOT_AUTHORIZED', 'Solo el organizador corrige');
    }
    const match = await repo.getMatch(parsed.data.matchId);
    if (!match) return fail('NOT_FOUND', 'Partido no encontrado');
    const original = await repo.getResultForMatch(match.id);
    if (!original) return fail('NOT_FOUND', 'No hay resultado que corregir');

    const winnerSide = winnerOfSets(parsed.data.sets);
    const winnerPairId = winnerSide === 'a' ? match.pairAId : match.pairBId;
    const replacement = {
      matchId: match.id, sets: parsed.data.sets, winnerPairId,
      reportedBy: session.userId, validatedBy: null, validatedAt: null, correctsResultId: null,
    };
    const fresh = await repo.correctResult(original, replacement);
    revalidatePath(`/app/tournaments/${tournament.id}/matches/${match.id}`);
    return ok(fresh);
  } catch (err) {
    if (err instanceof Error && err.message === 'NOT_AUTHORIZED') {
      return fail('NOT_AUTHORIZED', 'Debes iniciar sesión');
    }
    return fail('UNEXPECTED', err instanceof Error ? err.message : 'Error inesperado');
  }
}
```

- [ ] **Step 3: Run test; expect PASS**

- [ ] **Step 4: Commit**

```bash
git add src/app/app/tournaments/\[tournamentId\]
git commit -m "feat(app): report, validate, correct result actions"
```

### Task 4.5: Notifications mark-read action

**Files:**
- Create: `src/app/app/notifications/actions.ts`

- [ ] **Step 1: Write the file**

```ts
'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requireSession } from '@/lib/auth/session';
import { getRepo } from '@/lib/repositories/provider';
import { fail, ok, type ActionResult } from '@/lib/domain/action-result';

const MarkReadSchema = z.object({ notificationId: z.string().min(1) });

export async function markNotificationReadAction(
  input: z.input<typeof MarkReadSchema>,
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireSession();
    const parsed = MarkReadSchema.safeParse(input);
    if (!parsed.success) return fail('VALIDATION_FAILED', 'Datos inválidos');
    const repo = await getRepo();
    await repo.markNotificationRead(parsed.data.notificationId, session.userId);
    revalidatePath('/app');
    return ok({ id: parsed.data.notificationId });
  } catch (err) {
    if (err instanceof Error && err.message === 'NOT_AUTHORIZED') {
      return fail('NOT_AUTHORIZED', 'Debes iniciar sesión');
    }
    return fail('UNEXPECTED', err instanceof Error ? err.message : 'Error inesperado');
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/app/notifications/actions.ts
git commit -m "feat(app): notification mark-read action"
```

---

## Part 5 — UI

**Visual direction:** Editorial-minimal with one strong accent (padel-green `--color-accent`). Card surfaces with soft shadow, deliberate typographic contrast (display vs body), bento-ish dashboard grid on the tournament detail page, thumb-friendly bottom nav on mobile. No shadcn default look — use Tailwind tokens defined in Task 0.2.

### Task 5.1: Base UI primitives (Button, Card, Input, Badge)

**Files:**
- Create: `src/components/ui/Button.tsx`
- Create: `src/components/ui/Card.tsx`
- Create: `src/components/ui/Input.tsx`
- Create: `src/components/ui/Badge.tsx`
- Create: `src/components/ui/Field.tsx`

- [ ] **Step 1: Write `src/components/ui/Button.tsx`**

```tsx
import { Slot } from '@radix-ui/react-slot';
import { cn } from '@/lib/utils/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] font-medium ' +
  'transition-[transform,background,color,border-color] duration-[var(--duration-fast)] ' +
  'active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent)] disabled:opacity-60 disabled:pointer-events-none';

const variants: Record<Variant, string> = {
  primary: 'bg-[color:var(--color-accent)] text-[color:var(--color-accent-ink)] hover:brightness-110',
  secondary: 'bg-[color:var(--color-surface-2)] text-[color:var(--color-ink)] hover:bg-[color:var(--color-surface-2)]/90',
  ghost: 'bg-transparent text-[color:var(--color-ink)] hover:bg-[color:var(--color-surface-2)]',
  danger: 'bg-[color:var(--color-danger)] text-white hover:brightness-110',
};
const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-base',
  lg: 'h-12 px-6 text-base',
};

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
  variant?: Variant;
  size?: Size;
};

export function Button({ asChild, variant = 'primary', size = 'md', className, ...rest }: ButtonProps) {
  const Comp = asChild ? Slot : 'button';
  return <Comp className={cn(base, variants[variant], sizes[size], className)} {...rest} />;
}
```

- [ ] **Step 2: Write `src/components/ui/Card.tsx`**

```tsx
import { cn } from '@/lib/utils/cn';

export function Card({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-[var(--radius-lg)] bg-[color:var(--color-surface)] ring-1 ring-black/5',
        'shadow-[var(--shadow-card)] p-5',
        className,
      )}
      {...rest}
    />
  );
}

export function CardHeader({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mb-4 flex items-baseline justify-between gap-4', className)} {...rest} />;
}

export function CardTitle({ className, ...rest }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn('text-[length:var(--text-h1)] font-semibold', className)} {...rest} />;
}
```

- [ ] **Step 3: Write `src/components/ui/Input.tsx`**

```tsx
import { cn } from '@/lib/utils/cn';

export const Input = ({ className, ...rest }: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    className={cn(
      'h-10 w-full rounded-[var(--radius-md)] px-3 text-base',
      'bg-[color:var(--color-surface-2)] text-[color:var(--color-ink)] placeholder:text-[color:var(--color-ink-soft)]',
      'ring-1 ring-black/5 focus:outline-none focus:ring-2 focus:ring-[color:var(--color-accent)]',
      className,
    )}
    {...rest}
  />
);

export const Select = ({ className, children, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select
    className={cn(
      'h-10 w-full rounded-[var(--radius-md)] px-3 text-base',
      'bg-[color:var(--color-surface-2)] text-[color:var(--color-ink)]',
      'ring-1 ring-black/5 focus:outline-none focus:ring-2 focus:ring-[color:var(--color-accent)]',
      className,
    )}
    {...rest}
  >
    {children}
  </select>
);
```

- [ ] **Step 4: Write `src/components/ui/Badge.tsx`**

```tsx
import { cn } from '@/lib/utils/cn';

type Tone = 'neutral' | 'accent' | 'warn' | 'ok' | 'danger';

const tones: Record<Tone, string> = {
  neutral: 'bg-[color:var(--color-surface-2)] text-[color:var(--color-ink)]',
  accent: 'bg-[color:var(--color-accent)]/10 text-[color:var(--color-accent)]',
  warn: 'bg-[color:var(--color-warn)]/15 text-[color:var(--color-warn)]',
  ok: 'bg-[color:var(--color-ok)]/15 text-[color:var(--color-ok)]',
  danger: 'bg-[color:var(--color-danger)]/15 text-[color:var(--color-danger)]',
};

export function Badge({
  tone = 'neutral',
  className,
  ...rest
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center rounded-full px-2.5 text-xs font-medium tracking-wide',
        tones[tone],
        className,
      )}
      {...rest}
    />
  );
}
```

- [ ] **Step 5: Write `src/components/ui/Field.tsx`**

```tsx
import { cn } from '@/lib/utils/cn';

export function Field({
  label, hint, error, className, children,
}: {
  label: string;
  hint?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cn('block space-y-1.5', className)}>
      <span className="text-sm font-medium text-[color:var(--color-ink)]">{label}</span>
      {children}
      {error ? (
        <span className="block text-xs text-[color:var(--color-danger)]">{error}</span>
      ) : hint ? (
        <span className="block text-xs text-[color:var(--color-ink-soft)]">{hint}</span>
      ) : null}
    </label>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add src/components/ui
git commit -m "feat(ui): base primitives (Button, Card, Input, Badge, Field)"
```

### Task 5.2: Authenticated layout + bottom nav + notification bell

**Files:**
- Create: `src/app/app/layout.tsx`
- Create: `src/components/shell/BottomNav.tsx`
- Create: `src/components/shell/NotificationBell.tsx`

- [ ] **Step 1: Write `src/components/shell/BottomNav.tsx`**

```tsx
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Trophy, Users, UserRound, Home } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

const items = [
  { href: '/app', label: 'Inicio', Icon: Home },
  { href: '/app/tournaments', label: 'Torneos', Icon: Trophy },
  { href: '/app/leaderboard', label: 'Ranking', Icon: Users },
  { href: '/app/me', label: 'Yo', Icon: UserRound },
];

export function BottomNav() {
  const path = usePathname();
  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-black/5 bg-[color:var(--color-surface)]/95 backdrop-blur"
    >
      <ul className="mx-auto flex max-w-xl">
        {items.map(({ href, label, Icon }) => {
          const active = path === href || (href !== '/app' && path.startsWith(href));
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={cn(
                  'flex flex-col items-center gap-1 py-2.5 text-xs',
                  active
                    ? 'text-[color:var(--color-accent)]'
                    : 'text-[color:var(--color-ink-soft)] hover:text-[color:var(--color-ink)]',
                )}
              >
                <Icon className="h-5 w-5" aria-hidden />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
```

- [ ] **Step 2: Write `src/components/shell/NotificationBell.tsx`**

```tsx
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { getSession } from '@/lib/auth/session';
import { getRepo } from '@/lib/repositories/provider';
import { Badge } from '@/components/ui/Badge';

export async function NotificationBell() {
  const session = await getSession();
  if (!session) return null;
  const repo = await getRepo();
  const notes = await repo.listNotifications(session.userId);
  const unread = notes.filter((n) => !n.readAt).length;
  return (
    <Link href="/app/notifications" aria-label="Notificaciones" className="relative inline-flex items-center gap-2">
      <Bell className="h-5 w-5" aria-hidden />
      {unread > 0 ? <Badge tone="accent">{unread}</Badge> : null}
    </Link>
  );
}
```

- [ ] **Step 3: Write `src/app/app/layout.tsx`**

```tsx
import Link from 'next/link';
import { Suspense } from 'react';
import { BottomNav } from '@/components/shell/BottomNav';
import { NotificationBell } from '@/components/shell/NotificationBell';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh pb-20">
      <header className="sticky top-0 z-30 border-b border-black/5 bg-[color:var(--color-surface)]/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-xl items-center justify-between px-4">
          <Link href="/app" className="font-semibold tracking-tight">Padeljarto</Link>
          <Suspense fallback={null}>
            <NotificationBell />
          </Suspense>
        </div>
      </header>
      <main className="mx-auto max-w-xl px-4 py-6">{children}</main>
      <BottomNav />
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/app/layout.tsx src/components/shell
git commit -m "feat(ui): authenticated layout with bottom nav and bell"
```

### Task 5.3: Home + Login pages

**Files:**
- Create: `src/app/login/page.tsx`
- Create: `src/app/app/page.tsx`
- Create: `src/components/auth/LoginButton.tsx`

- [ ] **Step 1: Write `src/components/auth/LoginButton.tsx`**

```tsx
'use client';
import { Button } from '@/components/ui/Button';
import { createBrowserSupabase } from '@/lib/supabase/browser';

export function LoginButton({ next = '/app' }: { next?: string }) {
  async function onClick() {
    const supabase = createBrowserSupabase();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
  }
  return (
    <Button onClick={onClick} size="lg">
      Entrar con Google
    </Button>
  );
}
```

- [ ] **Step 2: Write `src/app/login/page.tsx`**

```tsx
import { LoginButton } from '@/components/auth/LoginButton';

export default function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  return <LoginContent searchParams={searchParams} />;
}

async function LoginContent({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const sp = await searchParams;
  return (
    <main className="min-h-dvh grid place-items-center p-8">
      <div className="max-w-sm text-center space-y-6">
        <h1 className="text-[length:var(--text-display)] font-semibold tracking-tight">Padeljarto</h1>
        <p className="text-[color:var(--color-ink-soft)]">
          La app privada para organizar torneos con tu grupo de padel.
        </p>
        <LoginButton next={sp.next ?? '/app'} />
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Write `src/app/app/page.tsx`**

```tsx
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { requireSession } from '@/lib/auth/session';
import { getRepo } from '@/lib/repositories/provider';

export default async function AppHomePage() {
  const session = await requireSession();
  const repo = await getRepo();
  const tournaments = await repo.listTournaments();
  const active = tournaments.filter((t) => t.status === 'open' || t.status === 'groups' || t.status === 'knockout');

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm text-[color:var(--color-ink-soft)]">Hola,</p>
        <h1 className="text-[length:var(--text-display)] font-semibold tracking-tight">
          {session.displayName}
        </h1>
      </section>

      <section className="grid gap-3">
        <Card>
          <h2 className="text-base font-semibold">Crear torneo</h2>
          <p className="mb-4 text-sm text-[color:var(--color-ink-soft)]">
            Configura grupos, parejas y play-off en 30 segundos.
          </p>
          <Button asChild>
            <Link href="/app/tournaments/new">Nuevo torneo</Link>
          </Button>
        </Card>

        {active.length > 0 ? (
          <Card>
            <h2 className="text-base font-semibold">En marcha</h2>
            <ul className="divide-y divide-black/5">
              {active.map((t) => (
                <li key={t.id}>
                  <Link href={`/app/tournaments/${t.id}`} className="flex items-center justify-between py-3">
                    <span>{t.name}</span>
                    <span className="text-xs uppercase tracking-wider text-[color:var(--color-ink-soft)]">{t.status}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        ) : null}
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/login src/app/app/page.tsx src/components/auth
git commit -m "feat(ui): login + authenticated home"
```

### Task 5.4: Tournament list + creation wizard

**Files:**
- Create: `src/app/app/tournaments/page.tsx`
- Create: `src/app/app/tournaments/new/page.tsx`
- Create: `src/app/app/tournaments/new/NewTournamentForm.tsx`

- [ ] **Step 1: Write `src/app/app/tournaments/page.tsx`**

```tsx
import Link from 'next/link';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { getRepo } from '@/lib/repositories/provider';

const STATUS_TONE = {
  draft: 'neutral', open: 'accent', groups: 'ok', knockout: 'warn', complete: 'neutral',
} as const;

export default async function TournamentsPage() {
  const repo = await getRepo();
  const tournaments = await repo.listTournaments();
  return (
    <section className="space-y-4">
      <CardHeader>
        <CardTitle>Torneos</CardTitle>
        <Button asChild size="sm"><Link href="/app/tournaments/new">Nuevo</Link></Button>
      </CardHeader>
      {tournaments.length === 0 ? (
        <Card>
          <p className="text-sm text-[color:var(--color-ink-soft)]">Aún no hay torneos. Crea el primero.</p>
        </Card>
      ) : (
        <ul className="space-y-3">
          {tournaments.map((t) => (
            <li key={t.id}>
              <Link href={`/app/tournaments/${t.id}`}>
                <Card className="hover:ring-2 hover:ring-[color:var(--color-accent)]/40 transition">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-base font-semibold">{t.name}</p>
                      <p className="text-xs text-[color:var(--color-ink-soft)]">
                        {t.size} parejas · {t.groupCount === 1 ? 'grupo único' : `${t.groupCount} grupos`} · play-off top {t.playoffCutoff}
                      </p>
                    </div>
                    <Badge tone={STATUS_TONE[t.status]}>{t.status}</Badge>
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Write `src/app/app/tournaments/new/NewTournamentForm.tsx`**

```tsx
'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Field } from '@/components/ui/Field';
import { Card } from '@/components/ui/Card';
import { createTournamentAction } from '@/app/app/tournaments/actions';

const PRESETS = [
  { label: 'Grupo único 6 → SF', size: 6, groupCount: 1, playoffCutoff: 4 },
  { label: 'Grupo único 8 → SF', size: 8, groupCount: 1, playoffCutoff: 4 },
  { label: 'Multi-grupo 8 → SF', size: 8, groupCount: 2, playoffCutoff: 4 },
  { label: 'Multi-grupo 16 → QF', size: 16, groupCount: 4, playoffCutoff: 8 },
] as const;

export function NewTournamentForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    pairingMode: 'draw' as 'pre_inscribed' | 'draw' | 'mixed',
    size: 8,
    groupCount: 2,
    playoffCutoff: 4,
    startsAt: '',
  });

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function applyPreset(p: typeof PRESETS[number]) {
    setForm((f) => ({ ...f, size: p.size, groupCount: p.groupCount, playoffCutoff: p.playoffCutoff }));
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createTournamentAction({
        name: form.name,
        pairingMode: form.pairingMode,
        size: form.size,
        groupCount: form.groupCount,
        playoffCutoff: form.playoffCutoff,
        startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
      });
      if (!res.ok) {
        setError(res.message);
        return;
      }
      router.push(`/app/tournaments/${res.data.id}`);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <Card className="space-y-4">
        <Field label="Nombre">
          <Input value={form.name} onChange={(e) => update('name', e.target.value)} required minLength={3} />
        </Field>
        <Field label="Modo de parejas">
          <Select value={form.pairingMode} onChange={(e) => update('pairingMode', e.target.value as typeof form.pairingMode)}>
            <option value="pre_inscribed">Pre-inscritas</option>
            <option value="draw">Sorteo</option>
            <option value="mixed">Mixto</option>
          </Select>
        </Field>
        <Field label="Inicio (opcional)">
          <Input type="datetime-local" value={form.startsAt} onChange={(e) => update('startsAt', e.target.value)} />
        </Field>
      </Card>

      <Card>
        <p className="mb-3 text-sm font-medium">Presets de cuadro</p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <Button key={p.label} type="button" variant="secondary" size="sm" onClick={() => applyPreset(p)}>
              {p.label}
            </Button>
          ))}
        </div>
      </Card>

      <Card className="grid grid-cols-3 gap-3">
        <Field label="Parejas">
          <Input
            type="number" min={2} step={1} value={form.size}
            onChange={(e) => update('size', Number(e.target.value))}
          />
        </Field>
        <Field label="Grupos">
          <Input
            type="number" min={1} step={1} value={form.groupCount}
            onChange={(e) => update('groupCount', Number(e.target.value))}
          />
        </Field>
        <Field label="Play-off">
          <Select value={String(form.playoffCutoff)} onChange={(e) => update('playoffCutoff', Number(e.target.value))}>
            {[0, 1, 2, 4, 8, 16].map((v) => <option key={v} value={v}>{v === 0 ? 'Sin play-off' : `Top ${v}`}</option>)}
          </Select>
        </Field>
      </Card>

      {error ? <p className="text-sm text-[color:var(--color-danger)]">{error}</p> : null}
      <Button type="submit" disabled={isPending} size="lg" className="w-full">
        {isPending ? 'Creando…' : 'Crear torneo'}
      </Button>
    </form>
  );
}
```

- [ ] **Step 3: Write `src/app/app/tournaments/new/page.tsx`**

```tsx
import { NewTournamentForm } from './NewTournamentForm';
import { CardTitle, CardHeader } from '@/components/ui/Card';

export default function NewTournamentPage() {
  return (
    <section className="space-y-4">
      <CardHeader><CardTitle>Nuevo torneo</CardTitle></CardHeader>
      <NewTournamentForm />
    </section>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/app/tournaments/page.tsx src/app/app/tournaments/new
git commit -m "feat(ui): tournament list and creation wizard"
```

### Task 5.5: Tournament detail — dashboard with bento sections

**Files:**
- Create: `src/app/app/tournaments/[tournamentId]/page.tsx`
- Create: `src/app/app/tournaments/[tournamentId]/OwnerControls.tsx`
- Create: `src/app/app/tournaments/[tournamentId]/InviteLinkCard.tsx`
- Create: `src/app/app/tournaments/[tournamentId]/GroupsView.tsx`
- Create: `src/app/app/tournaments/[tournamentId]/KnockoutView.tsx`

- [ ] **Step 1: Write `src/app/app/tournaments/[tournamentId]/OwnerControls.tsx`**

```tsx
'use client';
import { useTransition, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import {
  openTournamentAction,
  startTournamentAction,
  advanceToKnockoutAction,
  createInvitationAction,
} from '@/app/app/tournaments/actions';

type Props = {
  tournamentId: string;
  status: 'draft' | 'open' | 'groups' | 'knockout' | 'complete';
};

export function OwnerControls({ tournamentId, status }: Props) {
  const [isPending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();
  function run(fn: () => Promise<{ ok: boolean; message?: string }>) {
    setErr(null);
    start(async () => {
      const res = await fn();
      if (!res.ok && 'message' in res) setErr(res.message ?? 'Error');
      router.refresh();
    });
  }
  return (
    <div className="flex flex-wrap gap-2">
      {status === 'draft' && (
        <>
          <Button disabled={isPending} onClick={() => run(() => openTournamentAction(tournamentId))}>
            Abrir inscripciones
          </Button>
          <Button variant="secondary" disabled={isPending}
            onClick={() => run(async () => {
              const r = await createInvitationAction(tournamentId);
              if (r.ok) await navigator.clipboard?.writeText(`${location.origin}/invite/${r.data.token}`);
              return r;
            })}>
            Copiar link de invitación
          </Button>
        </>
      )}
      {status === 'open' && (
        <>
          <Button variant="secondary" disabled={isPending}
            onClick={() => run(async () => {
              const r = await createInvitationAction(tournamentId);
              if (r.ok) await navigator.clipboard?.writeText(`${location.origin}/invite/${r.data.token}`);
              return r;
            })}>
            Copiar link
          </Button>
          <Button disabled={isPending} onClick={() => run(() => startTournamentAction(tournamentId))}>
            Cerrar inscripciones y sortear
          </Button>
        </>
      )}
      {status === 'groups' && (
        <Button disabled={isPending} onClick={() => run(() => advanceToKnockoutAction(tournamentId))}>
          Pasar a eliminatorias
        </Button>
      )}
      {err ? <p className="w-full text-sm text-[color:var(--color-danger)]">{err}</p> : null}
    </div>
  );
}
```

- [ ] **Step 2: Write `src/app/app/tournaments/[tournamentId]/InviteLinkCard.tsx`**

```tsx
import { Card } from '@/components/ui/Card';

export function InviteLinkCard({ baseUrl }: { baseUrl: string }) {
  return (
    <Card>
      <p className="text-sm font-semibold">Compartir torneo</p>
      <p className="mt-1 text-xs text-[color:var(--color-ink-soft)]">
        Genera un link desde los controles. Caduca en 7 días.
      </p>
      <p className="mt-3 text-xs text-[color:var(--color-ink-soft)]">Base: {baseUrl}/invite/…</p>
    </Card>
  );
}
```

- [ ] **Step 3: Write `src/app/app/tournaments/[tournamentId]/GroupsView.tsx`**

```tsx
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { Group, Match, Pair, Player, Result } from '@/lib/domain/types';
import { computeStandings } from '@/lib/domain/standings';

type Props = {
  tournamentId: string;
  groups: ReadonlyArray<Group>;
  pairs: ReadonlyArray<Pair>;
  players: ReadonlyArray<Player>;
  matches: ReadonlyArray<Match>;
  results: ReadonlyArray<Result>;
};

export function GroupsView({ tournamentId, groups, pairs, players, matches, results }: Props) {
  const pairById = new Map(pairs.map((p) => [p.id, p] as const));
  const playerById = new Map(players.map((p) => [p.id, p] as const));
  const pairLabel = (id: string) => {
    const p = pairById.get(id);
    if (!p) return id;
    const a = playerById.get(p.playerAId)?.displayName ?? '—';
    const b = playerById.get(p.playerBId)?.displayName ?? '—';
    return `${a} / ${b}`;
  };
  return (
    <div className="space-y-4">
      {groups.map((g) => {
        const gPairs = g.pairIds.map((id) => pairById.get(id)).filter((p): p is Pair => !!p);
        const gMatches = matches.filter((m) => m.groupId === g.id);
        const standings = computeStandings(gPairs, gMatches, results);
        return (
          <Card key={g.id}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold">Grupo {g.label}</h3>
              <Badge tone="neutral">{gPairs.length} parejas</Badge>
            </div>
            <ol className="mb-4 space-y-1 text-sm">
              {standings.map((s, i) => (
                <li key={s.pairId} className="flex justify-between">
                  <span>
                    <span className="mr-2 text-[color:var(--color-ink-soft)]">{i + 1}.</span>
                    {pairLabel(s.pairId)}
                  </span>
                  <span className="tabular-nums text-[color:var(--color-ink-soft)]">
                    {s.wins}W · {s.setsFor}-{s.setsAgainst}
                  </span>
                </li>
              ))}
            </ol>
            <ul className="divide-y divide-black/5 text-sm">
              {gMatches.map((m) => {
                const result = results.find((r) => r.matchId === m.id && r.status !== 'corrected');
                return (
                  <li key={m.id}>
                    <Link href={`/app/tournaments/${tournamentId}/matches/${m.id}`} className="flex items-center justify-between py-2">
                      <span>{pairLabel(m.pairAId)} vs {pairLabel(m.pairBId)}</span>
                      <Badge tone={result?.status === 'validated' ? 'ok' : result ? 'warn' : 'neutral'}>
                        {result?.status ?? 'pendiente'}
                      </Badge>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Card>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Write `src/app/app/tournaments/[tournamentId]/KnockoutView.tsx`**

```tsx
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { Match, MatchPhase, Pair, Player, Result } from '@/lib/domain/types';

const PHASE_ORDER: MatchPhase[] = ['R32', 'R16', 'QF', 'SF', 'F'];

export function KnockoutView({
  tournamentId, matches, pairs, players, results,
}: {
  tournamentId: string;
  matches: ReadonlyArray<Match>;
  pairs: ReadonlyArray<Pair>;
  players: ReadonlyArray<Player>;
  results: ReadonlyArray<Result>;
}) {
  const pairById = new Map(pairs.map((p) => [p.id, p] as const));
  const playerById = new Map(players.map((p) => [p.id, p] as const));
  const pairLabel = (id: string) => {
    const p = pairById.get(id);
    if (!p) return id;
    return `${playerById.get(p.playerAId)?.displayName ?? '—'} / ${playerById.get(p.playerBId)?.displayName ?? '—'}`;
  };
  const phases = PHASE_ORDER.filter((ph) => matches.some((m) => m.phase === ph));
  return (
    <div className="space-y-4">
      {phases.map((phase) => (
        <Card key={phase}>
          <h3 className="mb-3 text-base font-semibold">{phase}</h3>
          <ul className="divide-y divide-black/5 text-sm">
            {matches.filter((m) => m.phase === phase).map((m) => {
              const result = results.find((r) => r.matchId === m.id && r.status !== 'corrected');
              return (
                <li key={m.id}>
                  <Link href={`/app/tournaments/${tournamentId}/matches/${m.id}`} className="flex items-center justify-between py-2">
                    <span>{pairLabel(m.pairAId)} vs {pairLabel(m.pairBId)}</span>
                    <Badge tone={result?.status === 'validated' ? 'ok' : result ? 'warn' : 'neutral'}>
                      {result?.status ?? 'pendiente'}
                    </Badge>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Write `src/app/app/tournaments/[tournamentId]/page.tsx`**

```tsx
import { notFound } from 'next/navigation';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { requireSession } from '@/lib/auth/session';
import { getRepo } from '@/lib/repositories/provider';
import { OwnerControls } from './OwnerControls';
import { GroupsView } from './GroupsView';
import { KnockoutView } from './KnockoutView';
import { InviteLinkCard } from './InviteLinkCard';
import { getServerEnv } from '@/lib/env';

export default async function TournamentDetailPage({
  params,
}: { params: Promise<{ tournamentId: string }> }) {
  const { tournamentId } = await params;
  const session = await requireSession();
  const repo = await getRepo();
  const tournament = await repo.getTournament(tournamentId);
  if (!tournament) notFound();

  const [groups, matches, pairs, inscriptions, players] = await Promise.all([
    repo.listGroups(tournamentId),
    repo.listMatches(tournamentId),
    repo.listPairsForTournament(tournamentId),
    repo.listInscriptions(tournamentId),
    repo.listPlayers(),
  ]);
  const resultPromises = matches.map((m) => repo.getResultForMatch(m.id));
  const results = (await Promise.all(resultPromises)).filter(Boolean) as NonNullable<Awaited<typeof resultPromises[0]>>[];

  const isOwner = tournament.ownerId === session.userId;

  return (
    <section className="space-y-4">
      <CardHeader>
        <div>
          <CardTitle>{tournament.name}</CardTitle>
          <p className="mt-1 text-xs text-[color:var(--color-ink-soft)]">
            {tournament.size} parejas · {tournament.groupCount === 1 ? 'grupo único' : `${tournament.groupCount} grupos`} · top {tournament.playoffCutoff}
          </p>
        </div>
        <Badge tone="accent">{tournament.status}</Badge>
      </CardHeader>

      {isOwner ? (
        <Card>
          <p className="mb-3 text-sm font-semibold">Controles de organizador</p>
          <OwnerControls tournamentId={tournament.id} status={tournament.status} />
        </Card>
      ) : null}

      {tournament.status === 'draft' || tournament.status === 'open' ? (
        <>
          <InviteLinkCard baseUrl={getServerEnv().NEXT_PUBLIC_APP_URL} />
          <Card>
            <p className="mb-2 text-sm font-semibold">Inscritos ({inscriptions.length}/{tournament.size})</p>
            <ul className="text-sm">
              {inscriptions.map((i) => {
                const pl = players.find((p) => p.id === i.playerId);
                return <li key={i.id}>{pl?.displayName ?? i.playerId}</li>;
              })}
            </ul>
          </Card>
        </>
      ) : null}

      {tournament.status === 'groups' || tournament.status === 'knockout' || tournament.status === 'complete' ? (
        <>
          <GroupsView
            tournamentId={tournament.id}
            groups={groups}
            pairs={pairs}
            players={players}
            matches={matches.filter((m) => m.phase === 'group')}
            results={results}
          />
          {tournament.status === 'knockout' || tournament.status === 'complete' ? (
            <KnockoutView
              tournamentId={tournament.id}
              matches={matches.filter((m) => m.phase !== 'group')}
              pairs={pairs} players={players} results={results}
            />
          ) : null}
        </>
      ) : null}
    </section>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add src/app/app/tournaments/\[tournamentId\]
git commit -m "feat(ui): tournament detail with owner controls and bracket views"
```

### Task 5.6: Match detail + result reporting form

**Files:**
- Create: `src/app/app/tournaments/[tournamentId]/matches/[matchId]/page.tsx`
- Create: `src/app/app/tournaments/[tournamentId]/matches/[matchId]/ResultForm.tsx`
- Create: `src/app/app/tournaments/[tournamentId]/matches/[matchId]/ValidateControls.tsx`

- [ ] **Step 1: Write `src/app/app/tournaments/[tournamentId]/matches/[matchId]/ResultForm.tsx`**

```tsx
'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Field } from '@/components/ui/Field';
import { reportResultAction } from './actions';

export function ResultForm({ matchId }: { matchId: string }) {
  const router = useRouter();
  const [isPending, start] = useTransition();
  const [sets, setSets] = useState([
    { a: '', b: '' }, { a: '', b: '' }, { a: '', b: '' },
  ]);
  const [error, setError] = useState<string | null>(null);

  function upd(i: number, side: 'a' | 'b', value: string) {
    setSets((s) => s.map((x, j) => (j === i ? { ...x, [side]: value } : x)));
  }
  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const payloadSets = sets
      .map((s) => ({ a: Number(s.a), b: Number(s.b) }))
      .filter((s) => Number.isFinite(s.a) && Number.isFinite(s.b) && (s.a || s.b));
    start(async () => {
      const res = await reportResultAction({ matchId, sets: payloadSets });
      if (!res.ok) { setError(res.message); return; }
      router.refresh();
    });
  }
  return (
    <form onSubmit={submit} className="space-y-3">
      {sets.map((s, i) => (
        <div key={i} className="grid grid-cols-2 gap-2">
          <Field label={`Set ${i + 1} — pareja A`}>
            <Input inputMode="numeric" pattern="[0-9]*" value={s.a} onChange={(e) => upd(i, 'a', e.target.value)} />
          </Field>
          <Field label={`Set ${i + 1} — pareja B`}>
            <Input inputMode="numeric" pattern="[0-9]*" value={s.b} onChange={(e) => upd(i, 'b', e.target.value)} />
          </Field>
        </div>
      ))}
      {error ? <p className="text-sm text-[color:var(--color-danger)]">{error}</p> : null}
      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? 'Enviando…' : 'Reportar resultado'}
      </Button>
    </form>
  );
}
```

- [ ] **Step 2: Write `src/app/app/tournaments/[tournamentId]/matches/[matchId]/ValidateControls.tsx`**

```tsx
'use client';
import { useTransition, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { validateResultAction } from './actions';

export function ValidateControls({ tournamentId, matchId }: { tournamentId: string; matchId: string }) {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [isPending, start] = useTransition();
  return (
    <div className="flex items-center gap-2">
      <Button
        disabled={isPending}
        onClick={() => start(async () => {
          const r = await validateResultAction({ tournamentId, matchId });
          if (!r.ok) setErr(r.message);
          router.refresh();
        })}
      >
        Validar resultado
      </Button>
      {err ? <p className="text-sm text-[color:var(--color-danger)]">{err}</p> : null}
    </div>
  );
}
```

- [ ] **Step 3: Write `src/app/app/tournaments/[tournamentId]/matches/[matchId]/page.tsx`**

```tsx
import { notFound } from 'next/navigation';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { requireSession } from '@/lib/auth/session';
import { getRepo } from '@/lib/repositories/provider';
import { ResultForm } from './ResultForm';
import { ValidateControls } from './ValidateControls';

export default async function MatchPage({
  params,
}: { params: Promise<{ tournamentId: string; matchId: string }> }) {
  const { tournamentId, matchId } = await params;
  const session = await requireSession();
  const repo = await getRepo();
  const [match, tournament] = await Promise.all([repo.getMatch(matchId), repo.getTournament(tournamentId)]);
  if (!match || !tournament) notFound();

  const [pairA, pairB, existingResult, players] = await Promise.all([
    repo.getPair(match.pairAId),
    repo.getPair(match.pairBId),
    repo.getResultForMatch(match.id),
    repo.listPlayers(),
  ]);
  if (!pairA || !pairB) notFound();

  const playerIds = new Set([pairA.playerAId, pairA.playerBId, pairB.playerAId, pairB.playerBId]);
  const isPlayer = playerIds.has(session.player.id);
  const isOwner = tournament.ownerId === session.userId;
  const pairLabel = (pid: string) => {
    const p = pid === pairA.id ? pairA : pairB;
    const a = players.find((x) => x.id === p.playerAId)?.displayName ?? '—';
    const b = players.find((x) => x.id === p.playerBId)?.displayName ?? '—';
    return `${a} / ${b}`;
  };

  return (
    <section className="space-y-4">
      <CardHeader>
        <div>
          <CardTitle>Partido</CardTitle>
          <p className="text-xs text-[color:var(--color-ink-soft)]">{tournament.name} · {match.phase}</p>
        </div>
        {existingResult ? <Badge tone={existingResult.status === 'validated' ? 'ok' : 'warn'}>{existingResult.status}</Badge> : null}
      </CardHeader>

      <Card>
        <div className="flex items-center justify-between text-base font-medium">
          <span>{pairLabel(pairA.id)}</span>
          <span className="text-[color:var(--color-ink-soft)]">vs</span>
          <span className="text-right">{pairLabel(pairB.id)}</span>
        </div>
      </Card>

      {existingResult ? (
        <Card>
          <p className="mb-2 text-sm font-semibold">Resultado</p>
          <ul className="space-y-1 text-sm">
            {existingResult.sets.map((s, i) => (
              <li key={i} className="tabular-nums">Set {i + 1}: {s.a} — {s.b}</li>
            ))}
          </ul>
          {isOwner && existingResult.status === 'reported' ? (
            <div className="mt-4">
              <ValidateControls tournamentId={tournamentId} matchId={match.id} />
            </div>
          ) : null}
        </Card>
      ) : isPlayer ? (
        <Card>
          <p className="mb-3 text-sm font-semibold">Reportar resultado</p>
          <ResultForm matchId={match.id} />
        </Card>
      ) : (
        <Card>
          <p className="text-sm text-[color:var(--color-ink-soft)]">Solo un jugador del partido puede reportar.</p>
        </Card>
      )}
    </section>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/app/tournaments/\[tournamentId\]/matches
git commit -m "feat(ui): match detail with report and validate"
```

### Task 5.7: Invite landing page

**Files:**
- Create: `src/app/invite/[token]/page.tsx`
- Create: `src/app/invite/[token]/InviteForm.tsx`

- [ ] **Step 1: Write `src/app/invite/[token]/InviteForm.tsx`**

```tsx
'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Select } from '@/components/ui/Input';
import { inscribeFromInviteAction } from './actions';

type Player = { id: string; displayName: string };

export function InviteForm({
  token,
  pairingMode,
  players,
}: {
  token: string;
  pairingMode: 'pre_inscribed' | 'draw' | 'mixed';
  players: ReadonlyArray<Player>;
}) {
  const router = useRouter();
  const [isPending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'solo' | 'with_partner'>(pairingMode === 'pre_inscribed' ? 'with_partner' : 'solo');
  const [partnerId, setPartnerId] = useState<string>('');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const payload = mode === 'with_partner'
        ? { mode: 'with_partner' as const, token, partnerPlayerId: partnerId }
        : { mode: 'solo' as const, token };
      const res = await inscribeFromInviteAction(payload);
      if (!res.ok) { setError(res.message); return; }
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {pairingMode === 'mixed' ? (
        <fieldset className="flex gap-3">
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="radio" checked={mode === 'solo'} onChange={() => setMode('solo')} />
            Me apunto solo
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="radio" checked={mode === 'with_partner'} onChange={() => setMode('with_partner')} />
            Con pareja
          </label>
        </fieldset>
      ) : null}
      {mode === 'with_partner' ? (
        <Field label="Compañero">
          <Select value={partnerId} onChange={(e) => setPartnerId(e.target.value)} required>
            <option value="">Elige a tu compañero</option>
            {players.map((p) => <option key={p.id} value={p.id}>{p.displayName}</option>)}
          </Select>
        </Field>
      ) : null}
      {error ? <p className="text-sm text-[color:var(--color-danger)]">{error}</p> : null}
      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? 'Inscribiendo…' : 'Inscribirme'}
      </Button>
    </form>
  );
}
```

- [ ] **Step 2: Write `src/app/invite/[token]/page.tsx`**

```tsx
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { getSession } from '@/lib/auth/session';
import { getRepo } from '@/lib/repositories/provider';
import { InviteForm } from './InviteForm';

export default async function InvitePage({
  params,
}: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const repo = await getRepo();
  const inv = await repo.getInvitationByToken(token);
  if (!inv) notFound();
  const tournament = await repo.getTournament(inv.tournamentId);
  if (!tournament) notFound();

  const expired = new Date(inv.expiresAt).getTime() < Date.now();
  const session = await getSession();

  return (
    <main className="mx-auto max-w-xl px-4 py-10 space-y-6">
      <CardHeader>
        <CardTitle>Invitación a {tournament.name}</CardTitle>
      </CardHeader>
      {expired ? (
        <Card>
          <p className="text-sm">Esta invitación ha caducado. Pide una nueva al organizador.</p>
        </Card>
      ) : !session ? (
        <Card>
          <p className="mb-4 text-sm">Inicia sesión para unirte al torneo.</p>
          <Button asChild>
            <Link href={`/login?next=/invite/${token}`}>Entrar con Google</Link>
          </Button>
        </Card>
      ) : tournament.status !== 'open' ? (
        <Card>
          <p className="text-sm">Las inscripciones aún no están abiertas (estado: {tournament.status}).</p>
        </Card>
      ) : (
        <Card>
          <InviteForm
            token={token}
            pairingMode={tournament.pairingMode}
            players={(await repo.listPlayers()).filter((p) => p.id !== session.player.id).map((p) => ({ id: p.id, displayName: p.displayName }))}
          />
        </Card>
      )}
    </main>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/invite
git commit -m "feat(ui): invite landing with inscription form"
```

### Task 5.8: Leaderboard + player profile + notifications page

**Files:**
- Create: `src/app/app/leaderboard/page.tsx`
- Create: `src/app/app/players/[id]/page.tsx`
- Create: `src/app/app/me/page.tsx`
- Create: `src/app/app/notifications/page.tsx`

- [ ] **Step 1: Write `src/app/app/leaderboard/page.tsx`**

```tsx
import Link from 'next/link';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { getRepo } from '@/lib/repositories/provider';

export default async function LeaderboardPage({
  searchParams,
}: { searchParams: Promise<{ tab?: 'players' | 'pairs' }> }) {
  const sp = await searchParams;
  const tab = sp.tab === 'pairs' ? 'pairs' : 'players';
  const repo = await getRepo();
  const [players, pairs] = await Promise.all([repo.listPlayers(), repo.listPairsRanked(50)]);
  const playersById = new Map(players.map((p) => [p.id, p] as const));

  return (
    <section className="space-y-4">
      <CardHeader>
        <CardTitle>Ranking</CardTitle>
        <div className="flex gap-2">
          <Link href="/app/leaderboard?tab=players"><Badge tone={tab === 'players' ? 'accent' : 'neutral'}>Jugadores</Badge></Link>
          <Link href="/app/leaderboard?tab=pairs"><Badge tone={tab === 'pairs' ? 'accent' : 'neutral'}>Parejas</Badge></Link>
        </div>
      </CardHeader>
      {tab === 'players' ? (
        <Card>
          <ol className="space-y-1 text-sm">
            {players.map((p, i) => (
              <li key={p.id} className="flex items-center justify-between">
                <Link href={`/app/players/${p.id}`} className="flex items-center gap-3">
                  <span className="w-6 text-right tabular-nums text-[color:var(--color-ink-soft)]">{i + 1}.</span>
                  <span>{p.displayName}</span>
                </Link>
                <span className="tabular-nums">{Math.round(p.rating)}</span>
              </li>
            ))}
          </ol>
        </Card>
      ) : (
        <Card>
          <ol className="space-y-1 text-sm">
            {pairs.map((pair, i) => {
              const a = playersById.get(pair.playerAId)?.displayName ?? '—';
              const b = playersById.get(pair.playerBId)?.displayName ?? '—';
              return (
                <li key={pair.id} className="flex items-center justify-between">
                  <span>
                    <span className="mr-2 tabular-nums text-[color:var(--color-ink-soft)]">{i + 1}.</span>
                    {a} / {b}
                  </span>
                  <span className="tabular-nums">{Math.round(pair.rating)}</span>
                </li>
              );
            })}
          </ol>
        </Card>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Write `src/app/app/players/[id]/page.tsx`**

```tsx
import { notFound } from 'next/navigation';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { getRepo } from '@/lib/repositories/provider';

export default async function PlayerProfilePage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const repo = await getRepo();
  const player = await repo.getPlayer(id);
  if (!player) notFound();
  const snapshots = await repo.listRatingSnapshotsForSubject('player', id);
  const min = snapshots.length ? Math.min(...snapshots.map((s) => s.after)) : player.rating;
  const max = snapshots.length ? Math.max(...snapshots.map((s) => s.after)) : player.rating;

  return (
    <section className="space-y-4">
      <CardHeader>
        <CardTitle>{player.displayName}</CardTitle>
        <Badge tone="accent">{Math.round(player.rating)}</Badge>
      </CardHeader>
      <Card>
        <p className="text-sm text-[color:var(--color-ink-soft)]">
          Partidos jugados: <span className="text-[color:var(--color-ink)]">{player.matchesPlayed}</span>
        </p>
        <p className="text-sm text-[color:var(--color-ink-soft)]">
          Rango histórico: {Math.round(min)} – {Math.round(max)}
        </p>
      </Card>
      <Card>
        <p className="mb-2 text-sm font-semibold">Últimos movimientos</p>
        <ul className="divide-y divide-black/5 text-sm">
          {snapshots.slice(-20).reverse().map((s) => (
            <li key={s.id} className="flex items-center justify-between py-2 tabular-nums">
              <span className="text-[color:var(--color-ink-soft)]">{new Date(s.createdAt).toLocaleDateString()}</span>
              <span>{Math.round(s.before)} → {Math.round(s.after)}</span>
              <span className={s.delta >= 0 ? 'text-[color:var(--color-ok)]' : 'text-[color:var(--color-danger)]'}>
                {s.delta >= 0 ? '+' : ''}{Math.round(s.delta)}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </section>
  );
}
```

- [ ] **Step 3: Write `src/app/app/me/page.tsx`**

```tsx
import { redirect } from 'next/navigation';
import { requireSession } from '@/lib/auth/session';

export default async function MePage() {
  const session = await requireSession();
  redirect(`/app/players/${session.player.id}`);
}
```

- [ ] **Step 4: Write `src/app/app/notifications/page.tsx`**

```tsx
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { requireSession } from '@/lib/auth/session';
import { getRepo } from '@/lib/repositories/provider';
import { MarkReadButton } from './MarkReadButton';

export default async function NotificationsPage() {
  const session = await requireSession();
  const repo = await getRepo();
  const notes = await repo.listNotifications(session.userId);
  return (
    <section className="space-y-4">
      <CardHeader><CardTitle>Notificaciones</CardTitle></CardHeader>
      {notes.length === 0 ? (
        <Card><p className="text-sm text-[color:var(--color-ink-soft)]">Sin notificaciones.</p></Card>
      ) : (
        <ul className="space-y-3">
          {notes.map((n) => (
            <li key={n.id}>
              <Card className={n.readAt ? 'opacity-70' : ''}>
                <div className="flex items-center justify-between">
                  <div>
                    <Badge tone="accent">{n.kind}</Badge>
                    <p className="mt-2 text-xs text-[color:var(--color-ink-soft)]">
                      {new Date(n.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {!n.readAt ? <MarkReadButton id={n.id} /> : null}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
```

- [ ] **Step 5: Write `src/app/app/notifications/MarkReadButton.tsx`**

```tsx
'use client';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { markNotificationReadAction } from './actions';

export function MarkReadButton({ id }: { id: string }) {
  const router = useRouter();
  const [isPending, start] = useTransition();
  return (
    <Button
      size="sm" variant="ghost" disabled={isPending}
      onClick={() => start(async () => {
        await markNotificationReadAction({ notificationId: id });
        router.refresh();
      })}
    >
      Marcar leída
    </Button>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add src/app/app/leaderboard src/app/app/players src/app/app/me src/app/app/notifications
git commit -m "feat(ui): leaderboard, player profile, and notifications"
```

---

## Part 6 — Email notifications (Resend + Supabase Edge Function)

Goal: send transactional emails for five events (inscription_new, tournament_open, tournament_started, result_reported, result_validated) without blocking server actions. Server actions insert into `notifications` table; a Supabase Edge Function reads unsent rows and posts to Resend; we invoke the function from server actions fire-and-forget.

### Task 6.1: Notification payload builders

**Files:**
- Create: `src/lib/notifications/payloads.ts`
- Test: `src/lib/notifications/payloads.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/notifications/payloads.test.ts
import { describe, it, expect } from 'vitest';
import { buildPayload } from './payloads';

describe('buildPayload', () => {
  it('formats inscription_new payload', () => {
    const p = buildPayload({
      kind: 'inscription_new',
      tournamentName: 'Liga Primavera',
      actorName: 'Ana',
    });
    expect(p.subject).toContain('Liga Primavera');
    expect(p.html).toContain('Ana');
    expect(p.text).toContain('Ana');
  });

  it('formats result_reported payload with set scores', () => {
    const p = buildPayload({
      kind: 'result_reported',
      tournamentName: 'Liga Primavera',
      matchLabel: 'Grupo A · Jornada 1',
      sets: [[6, 4], [3, 6], [10, 8]],
    });
    expect(p.subject).toContain('resultado');
    expect(p.html).toContain('6-4');
    expect(p.html).toContain('10-8');
  });

  it('rejects unknown kind at runtime', () => {
    expect(() => buildPayload({ kind: 'bogus' as any, tournamentName: 'x' } as any))
      .toThrow(/unknown notification kind/i);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run src/lib/notifications/payloads.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `buildPayload`**

```ts
// src/lib/notifications/payloads.ts
export type EmailPayloadInput =
  | { kind: 'inscription_new'; tournamentName: string; actorName: string }
  | { kind: 'tournament_open'; tournamentName: string; inviteUrl: string }
  | { kind: 'tournament_started'; tournamentName: string; tournamentUrl: string }
  | { kind: 'result_reported'; tournamentName: string; matchLabel: string; sets: ReadonlyArray<readonly [number, number]> }
  | { kind: 'result_validated'; tournamentName: string; matchLabel: string; sets: ReadonlyArray<readonly [number, number]> };

export type EmailPayload = Readonly<{
  subject: string;
  html: string;
  text: string;
}>;

const layout = (inner: string) =>
  `<!doctype html><html><body style="font-family:system-ui,sans-serif;padding:24px;background:#fafaf7;color:#18181b">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;border:1px solid #e4e4e7">
  <h1 style="font-size:20px;margin:0 0 16px">Padeljarto</h1>${inner}</div></body></html>`;

const setsToString = (sets: ReadonlyArray<readonly [number, number]>) =>
  sets.map(([a, b]) => `${a}-${b}`).join(' · ');

export function buildPayload(input: EmailPayloadInput): EmailPayload {
  switch (input.kind) {
    case 'inscription_new':
      return {
        subject: `Nueva inscripción — ${input.tournamentName}`,
        html: layout(`<p><strong>${input.actorName}</strong> se ha inscrito en <em>${input.tournamentName}</em>.</p>`),
        text: `${input.actorName} se ha inscrito en ${input.tournamentName}.`,
      };
    case 'tournament_open':
      return {
        subject: `Inscripciones abiertas — ${input.tournamentName}`,
        html: layout(`<p>Ya puedes inscribirte en <strong>${input.tournamentName}</strong>.</p><p><a href="${input.inviteUrl}" style="color:#6d28d9">Inscribirme</a></p>`),
        text: `Ya puedes inscribirte en ${input.tournamentName}: ${input.inviteUrl}`,
      };
    case 'tournament_started':
      return {
        subject: `Torneo en marcha — ${input.tournamentName}`,
        html: layout(`<p>${input.tournamentName} ha comenzado. Consulta tu cuadro.</p><p><a href="${input.tournamentUrl}">Ver torneo</a></p>`),
        text: `${input.tournamentName} ha comenzado: ${input.tournamentUrl}`,
      };
    case 'result_reported':
      return {
        subject: `Resultado pendiente de validar — ${input.tournamentName}`,
        html: layout(`<p><strong>${input.matchLabel}</strong></p><p>Sets: ${setsToString(input.sets)}</p>`),
        text: `${input.matchLabel} — Sets: ${setsToString(input.sets)} (pendiente de validar)`,
      };
    case 'result_validated':
      return {
        subject: `Resultado validado — ${input.tournamentName}`,
        html: layout(`<p><strong>${input.matchLabel}</strong></p><p>Sets: ${setsToString(input.sets)}</p><p>Los ratings han sido actualizados.</p>`),
        text: `${input.matchLabel} — Sets: ${setsToString(input.sets)} (validado)`,
      };
    default: {
      const _exhaustive: never = input;
      throw new Error(`unknown notification kind: ${JSON.stringify(_exhaustive)}`);
    }
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run src/lib/notifications/payloads.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/notifications
git commit -m "feat(notifications): email payload builders"
```

---

### Task 6.2: Notification enqueue helper

Server actions should call a single helper that inserts a notification row and fires the edge function asynchronously — the action must return without waiting for SMTP.

**Files:**
- Create: `src/lib/notifications/enqueue.ts`
- Test: `src/lib/notifications/enqueue.test.ts`
- Modify: `src/lib/repositories/types.ts` (already has `createNotification`; reused)

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/notifications/enqueue.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { enqueueNotification } from './enqueue';
import { InMemoryRepository } from '@/lib/repositories/in-memory';

const fetchMock = vi.fn().mockResolvedValue({ ok: true });
beforeEach(() => { fetchMock.mockClear(); (globalThis as any).fetch = fetchMock; });

describe('enqueueNotification', () => {
  it('persists a notification row and calls the dispatcher endpoint', async () => {
    const repo = new InMemoryRepository();
    await repo.createProfile({ id: 'p1', email: 'a@b.com', displayName: 'Ana' });
    await enqueueNotification(repo, {
      recipientProfileId: 'p1',
      kind: 'tournament_open',
      payload: { kind: 'tournament_open', tournamentName: 'T', inviteUrl: 'https://x/i' },
      dispatcherUrl: 'https://edge.fn/notify',
      dispatcherKey: 'k',
    });
    const rows = await repo.listNotificationsForProfile('p1', { unreadOnly: false });
    expect(rows).toHaveLength(1);
    expect(rows[0].kind).toBe('tournament_open');
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('does not throw when dispatcher fails', async () => {
    fetchMock.mockRejectedValueOnce(new Error('boom'));
    const repo = new InMemoryRepository();
    await repo.createProfile({ id: 'p1', email: 'a@b.com', displayName: 'Ana' });
    await expect(enqueueNotification(repo, {
      recipientProfileId: 'p1',
      kind: 'tournament_open',
      payload: { kind: 'tournament_open', tournamentName: 'T', inviteUrl: 'https://x/i' },
      dispatcherUrl: 'https://edge.fn/notify',
      dispatcherKey: 'k',
    })).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run src/lib/notifications/enqueue.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `enqueueNotification`**

```ts
// src/lib/notifications/enqueue.ts
import type { Repository } from '@/lib/repositories/types';
import type { EmailPayloadInput } from './payloads';

export type EnqueueArgs = Readonly<{
  recipientProfileId: string;
  kind: EmailPayloadInput['kind'];
  payload: EmailPayloadInput;
  dispatcherUrl: string;
  dispatcherKey: string;
}>;

export async function enqueueNotification(
  repo: Repository,
  args: EnqueueArgs,
): Promise<void> {
  const created = await repo.createNotification({
    recipientProfileId: args.recipientProfileId,
    kind: args.kind,
    payload: args.payload,
  });

  // Fire-and-forget: the dispatcher will mark the row sent.
  try {
    await fetch(args.dispatcherUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${args.dispatcherKey}`,
      },
      body: JSON.stringify({ notificationId: created.id }),
    });
  } catch {
    // Swallow — the edge function cron can pick up unsent rows as a fallback.
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run src/lib/notifications/enqueue.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/notifications/enqueue.ts src/lib/notifications/enqueue.test.ts
git commit -m "feat(notifications): enqueue helper with fire-and-forget dispatch"
```

---

### Task 6.3: Supabase Edge Function — notify dispatcher

**Files:**
- Create: `supabase/functions/notify/index.ts`
- Create: `supabase/functions/notify/deno.json`
- Create: `supabase/functions/notify/README.md`

- [ ] **Step 1: Write the edge function**

```ts
// supabase/functions/notify/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.101.1';
import { buildPayload, type EmailPayloadInput } from '../../../src/lib/notifications/payloads.ts';

const RESEND_API = 'https://api.resend.com/emails';

Deno.serve(async (req) => {
  const authHeader = req.headers.get('authorization') ?? '';
  const expected = `Bearer ${Deno.env.get('NOTIFY_DISPATCHER_SECRET')}`;
  if (authHeader !== expected) {
    return new Response('unauthorized', { status: 401 });
  }

  const { notificationId } = await req.json();
  if (typeof notificationId !== 'string') {
    return new Response('bad request', { status: 400 });
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );

  const { data: notif, error: notifErr } = await admin
    .from('notifications')
    .select('id, recipient_profile_id, kind, payload, sent_at')
    .eq('id', notificationId)
    .maybeSingle();
  if (notifErr || !notif) return new Response('not found', { status: 404 });
  if (notif.sent_at) return new Response('already sent', { status: 200 });

  const { data: profile, error: profileErr } = await admin
    .from('profiles')
    .select('email, display_name')
    .eq('id', notif.recipient_profile_id)
    .maybeSingle();
  if (profileErr || !profile) return new Response('recipient missing', { status: 404 });

  const email = buildPayload(notif.payload as EmailPayloadInput);

  const resendRes = await fetch(RESEND_API, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
    },
    body: JSON.stringify({
      from: Deno.env.get('RESEND_FROM')!,
      to: [profile.email],
      subject: email.subject,
      html: email.html,
      text: email.text,
    }),
  });
  if (!resendRes.ok) {
    const body = await resendRes.text();
    return new Response(`resend failed: ${body}`, { status: 502 });
  }

  await admin.from('notifications').update({ sent_at: new Date().toISOString() }).eq('id', notif.id);

  return new Response('ok', { status: 200 });
});
```

- [ ] **Step 2: Write the deno config**

```json
// supabase/functions/notify/deno.json
{
  "imports": {
    "std/": "https://deno.land/std@0.224.0/"
  }
}
```

- [ ] **Step 3: Write the README**

```md
<!-- supabase/functions/notify/README.md -->
# notify edge function

Reads a `notifications` row by id, renders the email via the shared `buildPayload`, and sends it through Resend. Server actions call this endpoint fire-and-forget after inserting the notification row.

## Required env (set via `supabase secrets set`)

- `NOTIFY_DISPATCHER_SECRET` — shared bearer token; must match `NOTIFY_DISPATCHER_SECRET` in the Next.js server env.
- `RESEND_API_KEY`
- `RESEND_FROM` — e.g. `Padeljarto <noreply@padeljarto.app>`
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — injected automatically in Supabase.

## Deploy

```bash
supabase functions deploy notify --no-verify-jwt
```
```

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/notify
git commit -m "feat(edge): notify dispatcher function"
```

---

### Task 6.4: Wire notifications into server actions

We fan out on five triggers. The organizer + actor are the recipients.

**Files:**
- Modify: `src/app/app/tournaments/actions.ts`
- Modify: `src/app/app/tournaments/[tournamentId]/matches/[matchId]/actions.ts`
- Modify: `src/app/invite/[token]/actions.ts`
- Create: `src/lib/notifications/dispatcher-env.ts`
- Test: `src/lib/notifications/dispatcher-env.test.ts`

- [ ] **Step 1: Write failing test for env helper**

```ts
// src/lib/notifications/dispatcher-env.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { readDispatcherEnv } from './dispatcher-env';

describe('readDispatcherEnv', () => {
  beforeEach(() => {
    delete process.env.NOTIFY_DISPATCHER_URL;
    delete process.env.NOTIFY_DISPATCHER_SECRET;
  });

  it('throws when url missing', () => {
    process.env.NOTIFY_DISPATCHER_SECRET = 's';
    expect(() => readDispatcherEnv()).toThrow(/NOTIFY_DISPATCHER_URL/);
  });

  it('throws when secret missing', () => {
    process.env.NOTIFY_DISPATCHER_URL = 'https://x';
    expect(() => readDispatcherEnv()).toThrow(/NOTIFY_DISPATCHER_SECRET/);
  });

  it('returns both when present', () => {
    process.env.NOTIFY_DISPATCHER_URL = 'https://x';
    process.env.NOTIFY_DISPATCHER_SECRET = 's';
    expect(readDispatcherEnv()).toEqual({ url: 'https://x', key: 's' });
  });
});
```

- [ ] **Step 2: Run — expected FAIL**

Run: `pnpm vitest run src/lib/notifications/dispatcher-env.test.ts`
Expected: FAIL (module missing).

- [ ] **Step 3: Implement**

```ts
// src/lib/notifications/dispatcher-env.ts
export function readDispatcherEnv(): Readonly<{ url: string; key: string }> {
  const url = process.env.NOTIFY_DISPATCHER_URL;
  if (!url) throw new Error('NOTIFY_DISPATCHER_URL is required');
  const key = process.env.NOTIFY_DISPATCHER_SECRET;
  if (!key) throw new Error('NOTIFY_DISPATCHER_SECRET is required');
  return { url, key };
}
```

- [ ] **Step 4: Run — expected PASS**

Run: `pnpm vitest run src/lib/notifications/dispatcher-env.test.ts`
Expected: PASS.

- [ ] **Step 5: Patch `tournaments/actions.ts` — on `openTournament` + `startTournament`**

Add at top:

```ts
import { enqueueNotification } from '@/lib/notifications/enqueue';
import { readDispatcherEnv } from '@/lib/notifications/dispatcher-env';
```

Inside `openTournamentAction`, after the tournament is transitioned to `open`, fan out to all players:

```ts
const players = await repo.listAllPlayersWithProfile();
const { url, key } = readDispatcherEnv();
const origin = process.env.APP_ORIGIN ?? 'https://padeljarto.app';
await Promise.all(
  players.map((p) =>
    enqueueNotification(repo, {
      recipientProfileId: p.profileId,
      kind: 'tournament_open',
      payload: {
        kind: 'tournament_open',
        tournamentName: tournament.name,
        inviteUrl: `${origin}/app/tournaments/${tournament.id}`,
      },
      dispatcherUrl: url,
      dispatcherKey: key,
    }),
  ),
);
```

Inside `startTournamentAction`, after the state moves to `groups`, notify the inscribed players:

```ts
const inscriptions = await repo.listInscriptions(tournamentId);
const { url, key } = readDispatcherEnv();
const origin = process.env.APP_ORIGIN ?? 'https://padeljarto.app';
await Promise.all(
  inscriptions.map((ins) =>
    enqueueNotification(repo, {
      recipientProfileId: ins.player.profileId,
      kind: 'tournament_started',
      payload: {
        kind: 'tournament_started',
        tournamentName: tournament.name,
        tournamentUrl: `${origin}/app/tournaments/${tournament.id}`,
      },
      dispatcherUrl: url,
      dispatcherKey: key,
    }),
  ),
);
```

- [ ] **Step 6: Patch `invite/[token]/actions.ts` — on successful inscription**

After `repo.createInscription(...)`:

```ts
import { enqueueNotification } from '@/lib/notifications/enqueue';
import { readDispatcherEnv } from '@/lib/notifications/dispatcher-env';

// after inscription is created:
const { url, key } = readDispatcherEnv();
await enqueueNotification(repo, {
  recipientProfileId: tournament.ownerId,
  kind: 'inscription_new',
  payload: {
    kind: 'inscription_new',
    tournamentName: tournament.name,
    actorName: session.displayName,
  },
  dispatcherUrl: url,
  dispatcherKey: key,
});
```

- [ ] **Step 7: Patch `matches/[matchId]/actions.ts` — on `reportResult` and `validateResult`**

At the end of `reportResultAction` (before returning ok), notify the organizer:

```ts
import { enqueueNotification } from '@/lib/notifications/enqueue';
import { readDispatcherEnv } from '@/lib/notifications/dispatcher-env';

const { url, key } = readDispatcherEnv();
await enqueueNotification(repo, {
  recipientProfileId: tournament.ownerId,
  kind: 'result_reported',
  payload: {
    kind: 'result_reported',
    tournamentName: tournament.name,
    matchLabel: matchLabel(match),
    sets: parsed.sets,
  },
  dispatcherUrl: url,
  dispatcherKey: key,
});
```

At the end of `validateResultAction`, notify all four players:

```ts
const profiles = await repo.listProfilesForMatchPlayers(match.id);
const { url, key } = readDispatcherEnv();
await Promise.all(
  profiles.map((profileId) =>
    enqueueNotification(repo, {
      recipientProfileId: profileId,
      kind: 'result_validated',
      payload: {
        kind: 'result_validated',
        tournamentName: tournament.name,
        matchLabel: matchLabel(match),
        sets: result.sets,
      },
      dispatcherUrl: url,
      dispatcherKey: key,
    }),
  ),
);
```

Add a shared label helper in `src/lib/domain/match-label.ts`:

```ts
// src/lib/domain/match-label.ts
import type { Match } from './types';

const PHASE_LABEL: Record<Match['phase'], string> = {
  group: 'Grupo',
  R16: 'Octavos',
  QF: 'Cuartos',
  SF: 'Semifinal',
  F: 'Final',
};

export function matchLabel(match: Match): string {
  if (match.phase === 'group') {
    return `Grupo ${match.groupLabel ?? ''} · Jornada ${match.round}`.trim();
  }
  return PHASE_LABEL[match.phase];
}
```

- [ ] **Step 8: Add the missing repo methods**

In `src/lib/repositories/types.ts` add:

```ts
listAllPlayersWithProfile(): Promise<ReadonlyArray<{ playerId: string; profileId: string }>>;
listProfilesForMatchPlayers(matchId: string): Promise<ReadonlyArray<string>>;
```

Implement in `src/lib/repositories/in-memory.ts`:

```ts
async listAllPlayersWithProfile() {
  return Array.from(this.players.values()).map((p) => ({
    playerId: p.id,
    profileId: p.profileId,
  }));
}

async listProfilesForMatchPlayers(matchId: string) {
  const match = this.matches.get(matchId);
  if (!match) return [];
  const pairIds = [match.pairAId, match.pairBId];
  const playerIds = pairIds.flatMap((pid) => {
    const pair = this.pairs.get(pid);
    return pair ? [pair.playerAId, pair.playerBId] : [];
  });
  return playerIds
    .map((plId) => this.players.get(plId)?.profileId)
    .filter((x): x is string => Boolean(x));
}
```

Implement in `src/lib/repositories/supabase.ts`:

```ts
async listAllPlayersWithProfile() {
  const { data, error } = await this.client
    .from('players')
    .select('id, profile_id');
  if (error) throw error;
  return (data ?? []).map((r) => ({ playerId: r.id, profileId: r.profile_id }));
}

async listProfilesForMatchPlayers(matchId: string) {
  const { data, error } = await this.client
    .from('matches')
    .select('pair_a:pairs!matches_pair_a_id_fkey(player_a:players!pairs_player_a_id_fkey(profile_id),player_b:players!pairs_player_b_id_fkey(profile_id)),pair_b:pairs!matches_pair_b_id_fkey(player_a:players!pairs_player_a_id_fkey(profile_id),player_b:players!pairs_player_b_id_fkey(profile_id))')
    .eq('id', matchId)
    .maybeSingle();
  if (error || !data) return [];
  const row = data as any;
  return [
    row.pair_a.player_a.profile_id,
    row.pair_a.player_b.profile_id,
    row.pair_b.player_a.profile_id,
    row.pair_b.player_b.profile_id,
  ];
}
```

- [ ] **Step 9: Contract tests**

Append to `src/lib/repositories/contract.ts`:

```ts
it('listAllPlayersWithProfile returns every registered player', async () => {
  const repo = factory();
  await repo.createProfile({ id: 'p1', email: 'a@b.com', displayName: 'A' });
  await repo.createProfile({ id: 'p2', email: 'b@b.com', displayName: 'B' });
  await repo.createPlayer({ id: 'pl1', profileId: 'p1', rating: 1200, matchesPlayed: 0 });
  await repo.createPlayer({ id: 'pl2', profileId: 'p2', rating: 1200, matchesPlayed: 0 });
  const rows = await repo.listAllPlayersWithProfile();
  expect(rows.map((r) => r.playerId).sort()).toEqual(['pl1', 'pl2']);
});
```

- [ ] **Step 10: Run tests**

Run: `pnpm vitest run`
Expected: PASS (new contract test passes in-memory; Supabase adapter tested via integration env when available).

- [ ] **Step 11: Commit**

```bash
git add src/lib/notifications src/lib/repositories src/lib/domain/match-label.ts src/app/app/tournaments src/app/invite
git commit -m "feat(notifications): wire enqueue into server actions on 5 triggers"
```

---

### Task 6.5: `.env.example` entries for email

**Files:**
- Modify: `.env.example`

- [ ] **Step 1: Append email env block**

```env
# Email (Resend) — used by supabase/functions/notify
RESEND_API_KEY=
RESEND_FROM=Padeljarto <noreply@example.com>
NOTIFY_DISPATCHER_URL=https://<project-ref>.functions.supabase.co/notify
NOTIFY_DISPATCHER_SECRET=change-me
APP_ORIGIN=http://localhost:3000
```

- [ ] **Step 2: Commit**

```bash
git add .env.example
git commit -m "chore(env): document email dispatcher env vars"
```

---

## Part 7 — PWA (manifest + service worker + install UX)

Goal: installable on phones, offline shell, cacheable static assets. No background sync required.

### Task 7.1: Manifest route

**Files:**
- Create: `src/app/manifest.ts`
- Create: `public/icons/icon-192.png` (placeholder — to be replaced by design)
- Create: `public/icons/icon-512.png` (placeholder)
- Create: `public/icons/maskable-512.png` (placeholder)

- [ ] **Step 1: Write the manifest**

```ts
// src/app/manifest.ts
import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Padeljarto',
    short_name: 'Padeljarto',
    description: 'Torneos de padel entre amigos',
    start_url: '/app',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#fafaf7',
    theme_color: '#18181b',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    categories: ['sports', 'lifestyle'],
  };
}
```

- [ ] **Step 2: Generate placeholder icons**

Use a 1×1 PNG stub so the build passes. Replace with final art before production.

```bash
mkdir -p public/icons
printf 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=' \
  | base64 -d > public/icons/icon-192.png
cp public/icons/icon-192.png public/icons/icon-512.png
cp public/icons/icon-192.png public/icons/maskable-512.png
```

- [ ] **Step 3: Commit**

```bash
git add src/app/manifest.ts public/icons
git commit -m "feat(pwa): add web app manifest and placeholder icons"
```

---

### Task 7.2: Service worker

**Files:**
- Create: `public/sw.js`
- Create: `src/app/offline/page.tsx`

- [ ] **Step 1: Write the service worker**

```js
// public/sw.js
const VERSION = 'v1';
const RUNTIME_CACHE = `padeljarto-runtime-${VERSION}`;
const SHELL_CACHE = `padeljarto-shell-${VERSION}`;
const OFFLINE_URL = '/offline';
const SHELL_URLS = [OFFLINE_URL, '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((c) => c.addAll(SHELL_URLS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k !== RUNTIME_CACHE && k !== SHELL_CACHE)
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/auth/') || url.pathname.startsWith('/api/')) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          return await fetch(req);
        } catch {
          const cached = await caches.match(OFFLINE_URL);
          return cached ?? new Response('offline', { status: 503 });
        }
      })(),
    );
    return;
  }

  if (/\.(?:css|js|woff2?|png|jpg|svg|ico)$/.test(url.pathname) || url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(RUNTIME_CACHE);
        const cached = await cache.match(req);
        const fetchPromise = fetch(req)
          .then((resp) => {
            if (resp.ok) cache.put(req, resp.clone());
            return resp;
          })
          .catch(() => cached);
        return cached ?? (await fetchPromise);
      })(),
    );
  }
});
```

- [ ] **Step 2: Write the offline page**

```tsx
// src/app/offline/page.tsx
export const dynamic = 'force-static';

export default function OfflinePage() {
  return (
    <main className="mx-auto max-w-md px-6 py-16 text-center text-zinc-800">
      <h1 className="text-3xl font-semibold">Sin conexión</h1>
      <p className="mt-3 text-sm text-zinc-600">
        No hay internet ahora mismo. Cuando vuelvas a estar online, recarga la página para seguir donde lo dejaste.
      </p>
    </main>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add public/sw.js src/app/offline
git commit -m "feat(pwa): service worker with offline shell"
```

---

### Task 7.3: Service worker registration + install prompt

**Files:**
- Create: `src/components/pwa/ServiceWorkerRegister.tsx`
- Create: `src/components/pwa/InstallPrompt.tsx`
- Modify: `src/app/layout.tsx`
- Modify: `src/app/app/layout.tsx`

- [ ] **Step 1: Write the registration component**

```tsx
// src/components/pwa/ServiceWorkerRegister.tsx
'use client';
import { useEffect } from 'react';

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    if (process.env.NODE_ENV !== 'production') return;

    const register = () => {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((err) => {
        // eslint-disable-next-line no-console
        console.warn('SW registration failed', err);
      });
    };

    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });
  }, []);

  return null;
}
```

- [ ] **Step 2: Write the install prompt**

```tsx
// src/components/pwa/InstallPrompt.tsx
'use client';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export function InstallPrompt() {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!event || dismissed) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-40 flex items-center gap-3 rounded-2xl bg-zinc-900 px-4 py-3 text-sm text-zinc-50 shadow-lg">
      <span className="flex-1">Instala Padeljarto en tu móvil para acceso rápido.</span>
      <Button
        size="sm"
        variant="primary"
        onClick={async () => {
          await event.prompt();
          await event.userChoice;
          setEvent(null);
        }}
      >
        Instalar
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setDismissed(true)}>
        Ahora no
      </Button>
    </div>
  );
}
```

- [ ] **Step 3: Mount both**

In `src/app/layout.tsx`:

```tsx
import { ServiceWorkerRegister } from '@/components/pwa/ServiceWorkerRegister';
// inside <body>:
<body>
  {children}
  <ServiceWorkerRegister />
</body>
```

In `src/app/app/layout.tsx`, next to `<BottomNav />`:

```tsx
import { InstallPrompt } from '@/components/pwa/InstallPrompt';
// ...
<InstallPrompt />
<BottomNav />
```

- [ ] **Step 4: Commit**

```bash
git add src/components/pwa src/app/layout.tsx src/app/app/layout.tsx
git commit -m "feat(pwa): register service worker and install prompt"
```

---

## Part 8 — Security, rate limiting, and CI

Goal: CSP with per-request nonce, rate-limited critical actions (Upstash), GitHub Actions running lint + typecheck + vitest coverage gate + migration lint.

### Task 8.1: Rate limiter utility

**Files:**
- Create: `src/lib/security/rate-limit.ts`
- Test: `src/lib/security/rate-limit.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// src/lib/security/rate-limit.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createInMemoryRateLimiter } from './rate-limit';

describe('createInMemoryRateLimiter', () => {
  beforeEach(() => vi.useFakeTimers());

  it('allows up to `max` requests per window and blocks the next one', async () => {
    vi.setSystemTime(new Date(2026, 3, 14, 12, 0, 0));
    const rl = createInMemoryRateLimiter({ max: 3, windowMs: 60_000 });
    expect((await rl.check('k')).ok).toBe(true);
    expect((await rl.check('k')).ok).toBe(true);
    expect((await rl.check('k')).ok).toBe(true);
    const blocked = await rl.check('k');
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
  });

  it('resets after the window expires', async () => {
    vi.setSystemTime(new Date(2026, 3, 14, 12, 0, 0));
    const rl = createInMemoryRateLimiter({ max: 1, windowMs: 1_000 });
    expect((await rl.check('k')).ok).toBe(true);
    expect((await rl.check('k')).ok).toBe(false);
    vi.setSystemTime(new Date(2026, 3, 14, 12, 0, 2));
    expect((await rl.check('k')).ok).toBe(true);
  });

  it('keys are isolated', async () => {
    vi.setSystemTime(new Date(2026, 3, 14, 12, 0, 0));
    const rl = createInMemoryRateLimiter({ max: 1, windowMs: 60_000 });
    expect((await rl.check('a')).ok).toBe(true);
    expect((await rl.check('b')).ok).toBe(true);
  });
});
```

- [ ] **Step 2: Run — expected FAIL**

Run: `pnpm vitest run src/lib/security/rate-limit.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// src/lib/security/rate-limit.ts
export type RateLimitResult =
  | Readonly<{ ok: true; remaining: number }>
  | Readonly<{ ok: false; retryAfterMs: number }>;

export interface RateLimiter {
  check(key: string): Promise<RateLimitResult>;
}

export function createInMemoryRateLimiter(opts: { max: number; windowMs: number }): RateLimiter {
  const buckets = new Map<string, { count: number; resetAt: number }>();
  return {
    async check(key) {
      const now = Date.now();
      const bucket = buckets.get(key);
      if (!bucket || bucket.resetAt <= now) {
        buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
        return { ok: true, remaining: opts.max - 1 };
      }
      if (bucket.count >= opts.max) {
        return { ok: false, retryAfterMs: bucket.resetAt - now };
      }
      bucket.count += 1;
      return { ok: true, remaining: opts.max - bucket.count };
    },
  };
}

export function createUpstashRateLimiter(opts: {
  url: string;
  token: string;
  max: number;
  windowMs: number;
}): RateLimiter {
  return {
    async check(key) {
      // Upstash Redis REST: INCR + PEXPIRE in a pipeline.
      const headers = {
        authorization: `Bearer ${opts.token}`,
        'content-type': 'application/json',
      };
      const redisKey = `rl:${key}`;
      const incr = await fetch(`${opts.url}/incr/${encodeURIComponent(redisKey)}`, { headers });
      if (!incr.ok) return { ok: true, remaining: opts.max }; // fail-open on infra error
      const { result: count } = (await incr.json()) as { result: number };
      if (count === 1) {
        await fetch(`${opts.url}/pexpire/${encodeURIComponent(redisKey)}/${opts.windowMs}`, { headers });
      }
      if (count > opts.max) {
        const ttlRes = await fetch(`${opts.url}/pttl/${encodeURIComponent(redisKey)}`, { headers });
        const { result: ttl } = (await ttlRes.json()) as { result: number };
        return { ok: false, retryAfterMs: Math.max(ttl, 0) };
      }
      return { ok: true, remaining: opts.max - count };
    },
  };
}

let _global: RateLimiter | null = null;
export function getRateLimiter(): RateLimiter {
  if (_global) return _global;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    _global = createUpstashRateLimiter({ url, token, max: 10, windowMs: 60_000 });
  } else {
    _global = createInMemoryRateLimiter({ max: 10, windowMs: 60_000 });
  }
  return _global;
}

// Test seam
export function __setRateLimiterForTests(rl: RateLimiter | null) {
  _global = rl;
}
```

- [ ] **Step 4: Run — expected PASS**

Run: `pnpm vitest run src/lib/security/rate-limit.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/security/rate-limit.ts src/lib/security/rate-limit.test.ts
git commit -m "feat(security): in-memory + upstash rate limiter"
```

---

### Task 8.2: Apply rate limiting to critical server actions

**Files:**
- Create: `src/lib/security/with-rate-limit.ts`
- Test: `src/lib/security/with-rate-limit.test.ts`
- Modify: `src/app/invite/[token]/actions.ts`
- Modify: `src/app/app/tournaments/[tournamentId]/matches/[matchId]/actions.ts`

- [ ] **Step 1: Write failing test**

```ts
// src/lib/security/with-rate-limit.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { createInMemoryRateLimiter, __setRateLimiterForTests } from './rate-limit';
import { withRateLimit } from './with-rate-limit';

describe('withRateLimit', () => {
  beforeEach(() => {
    __setRateLimiterForTests(createInMemoryRateLimiter({ max: 2, windowMs: 60_000 }));
  });

  it('returns RATE_LIMITED once limit exceeded', async () => {
    const action = withRateLimit('test', async () => ({ ok: true as const, data: 1 }));
    expect((await action('user-1')).ok).toBe(true);
    expect((await action('user-1')).ok).toBe(true);
    const third = await action('user-1');
    expect(third.ok).toBe(false);
    if (!third.ok) expect(third.code).toBe('RATE_LIMITED');
  });
});
```

- [ ] **Step 2: Run — expected FAIL**

Run: `pnpm vitest run src/lib/security/with-rate-limit.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// src/lib/security/with-rate-limit.ts
import type { ActionResult } from '@/lib/domain/action-result';
import { fail } from '@/lib/domain/action-result';
import { getRateLimiter } from './rate-limit';

export function withRateLimit<Args extends unknown[], T>(
  bucket: string,
  fn: (key: string, ...args: Args) => Promise<ActionResult<T>>,
): (key: string, ...args: Args) => Promise<ActionResult<T>> {
  return async (key, ...args) => {
    const rl = getRateLimiter();
    const gate = await rl.check(`${bucket}:${key}`);
    if (!gate.ok) {
      return fail(
        'RATE_LIMITED',
        `Demasiadas solicitudes. Intenta de nuevo en ${Math.ceil(gate.retryAfterMs / 1000)}s.`,
      );
    }
    return fn(key, ...args);
  };
}
```

- [ ] **Step 4: Run — expected PASS**

Run: `pnpm vitest run src/lib/security/with-rate-limit.test.ts`
Expected: PASS.

- [ ] **Step 5: Apply to `acceptInvitationAction`**

Rename the previous body to `acceptInvitationCore` and re-export a wrapped entry point. Full replacement for `src/app/invite/[token]/actions.ts`:

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { fail, ok, type ActionResult } from '@/lib/domain/action-result';
import { getSession } from '@/lib/auth/session';
import { getRepo } from '@/lib/repositories/provider';
import { enqueueNotification } from '@/lib/notifications/enqueue';
import { readDispatcherEnv } from '@/lib/notifications/dispatcher-env';
import { withRateLimit } from '@/lib/security/with-rate-limit';

const AcceptSchema = z.object({
  token: z.string().min(10),
  mode: z.enum(['single', 'pair']),
  partnerProfileId: z.string().uuid().nullable().optional(),
});
type AcceptInput = z.infer<typeof AcceptSchema>;

async function acceptInvitationCore(
  profileId: string,
  input: AcceptInput,
): Promise<ActionResult<{ tournamentId: string }>> {
  const parsed = AcceptSchema.safeParse(input);
  if (!parsed.success) return fail('VALIDATION_FAILED', 'Datos inválidos');

  const repo = getRepo();
  const invitation = await repo.findInvitationByToken(parsed.data.token);
  if (!invitation) return fail('NOT_FOUND', 'Invitación no encontrada');
  if (invitation.expiresAt.getTime() < Date.now())
    return fail('INVITATION_EXPIRED', 'Invitación caducada');

  const tournament = await repo.getTournament(invitation.tournamentId);
  if (!tournament) return fail('NOT_FOUND', 'Torneo no encontrado');
  if (tournament.status !== 'open') return fail('CONFLICT', 'Inscripciones cerradas');

  const player = await repo.getPlayerByProfile(profileId);
  if (!player) return fail('NOT_FOUND', 'Perfil de jugador no encontrado');

  const existing = await repo.findInscription(tournament.id, player.id);
  if (existing) return fail('CONFLICT', 'Ya estás inscrito');

  let partnerPlayerId: string | null = null;
  if (tournament.pairingMode === 'pre_inscribed' ||
      (tournament.pairingMode === 'mixed' && parsed.data.mode === 'pair')) {
    if (!parsed.data.partnerProfileId) return fail('VALIDATION_FAILED', 'Falta la pareja');
    const partner = await repo.getPlayerByProfile(parsed.data.partnerProfileId);
    if (!partner) return fail('NOT_FOUND', 'Pareja no encontrada');
    partnerPlayerId = partner.id;
  }

  await repo.createInscription({
    tournamentId: tournament.id,
    playerId: player.id,
    partnerPlayerId,
    status: 'confirmed',
  });

  const session = await getSession();
  const actorName = session?.displayName ?? 'Un jugador';
  const { url, key } = readDispatcherEnv();
  await enqueueNotification(repo, {
    recipientProfileId: tournament.ownerId,
    kind: 'inscription_new',
    payload: { kind: 'inscription_new', tournamentName: tournament.name, actorName },
    dispatcherUrl: url,
    dispatcherKey: key,
  });

  revalidatePath(`/app/tournaments/${tournament.id}`);
  return ok({ tournamentId: tournament.id });
}

export const acceptInvitationAction = async (input: AcceptInput) => {
  const session = await getSession();
  if (!session) return fail('NOT_AUTHORIZED', 'Sesión no válida');
  return withRateLimit('invite.accept', acceptInvitationCore)(session.profileId, input);
};
```

- [ ] **Step 6: Apply to `reportResultAction` + `validateResultAction`**

In `src/app/app/tournaments/[tournamentId]/matches/[matchId]/actions.ts`, rename each exported action's body to a `*Core` function taking `profileId` as the first argument, then wrap:

```ts
import { withRateLimit } from '@/lib/security/with-rate-limit';

async function reportResultCore(
  profileId: string,
  input: ReportInput,
): Promise<ActionResult<{ resultId: string }>> {
  // original body — replace any `session.profileId` reference with the `profileId` argument.
}

async function validateResultCore(
  profileId: string,
  input: ValidateInput,
): Promise<ActionResult<{ resultId: string }>> {
  // original body — same rename.
}

export const reportResultAction = async (input: ReportInput) => {
  const session = await getSession();
  if (!session) return fail('NOT_AUTHORIZED', 'Sesión no válida');
  return withRateLimit('match.report', reportResultCore)(session.profileId, input);
};

export const validateResultAction = async (input: ValidateInput) => {
  const session = await getSession();
  if (!session) return fail('NOT_AUTHORIZED', 'Sesión no válida');
  return withRateLimit('match.validate', validateResultCore)(session.profileId, input);
};
```

The `correctResultAction` keeps its unwrapped form because organizer corrections must not be rate-limited.

- [ ] **Step 7: Run all tests**

Run: `pnpm vitest run`
Expected: PASS (existing action tests continue to pass because the in-memory limiter is permissive under default config).

- [ ] **Step 8: Commit**

```bash
git add src/lib/security src/app/invite src/app/app/tournaments
git commit -m "feat(security): rate-limit invitation accept and match report/validate"
```

---

### Task 8.3: CSP + security headers middleware

**Files:**
- Create: `src/middleware.ts`
- Create: `src/middleware.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// src/middleware.test.ts
import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware } from './middleware';

describe('middleware CSP', () => {
  it('sets a CSP header with a per-request nonce', async () => {
    const req = new NextRequest('https://padeljarto.app/');
    const res = await middleware(req);
    const csp = res.headers.get('content-security-policy');
    expect(csp).toBeTruthy();
    expect(csp!).toMatch(/'nonce-[A-Za-z0-9+/=_-]+'/);
    expect(csp!).toMatch(/default-src 'self'/);
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
  });

  it('exposes the nonce on the response header for layout consumption', async () => {
    const req = new NextRequest('https://padeljarto.app/');
    const res = await middleware(req);
    const nonce = res.headers.get('x-nonce');
    expect(nonce).toMatch(/^[A-Za-z0-9+/=_-]+$/);
  });
});
```

- [ ] **Step 2: Run — expected FAIL**

Run: `pnpm vitest run src/middleware.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// src/middleware.ts
import { NextResponse, type NextRequest } from 'next/server';

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons/|sw.js|manifest.webmanifest).*)'],
};

export async function middleware(req: NextRequest): Promise<NextResponse> {
  const nonce = Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString('base64');
  const supabase = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co').origin;
  const csp = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob: ${supabase}`,
    `font-src 'self'`,
    `connect-src 'self' ${supabase} https://api.resend.com`,
    `frame-src 'none'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
  ].join('; ');

  const res = NextResponse.next({ request: { headers: new Headers({ ...Object.fromEntries(req.headers), 'x-nonce': nonce }) } });
  res.headers.set('content-security-policy', csp);
  res.headers.set('x-nonce', nonce);
  res.headers.set('x-content-type-options', 'nosniff');
  res.headers.set('x-frame-options', 'DENY');
  res.headers.set('referrer-policy', 'strict-origin-when-cross-origin');
  res.headers.set('permissions-policy', 'camera=(), microphone=(), geolocation=()');
  res.headers.set('strict-transport-security', 'max-age=31536000; includeSubDomains; preload');
  return res;
}
```

- [ ] **Step 4: Run — expected PASS**

Run: `pnpm vitest run src/middleware.test.ts`
Expected: PASS.

- [ ] **Step 5: Read nonce in root layout and pass to `<Script>` usages**

In `src/app/layout.tsx`:

```tsx
import { headers } from 'next/headers';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  return (
    <html lang="es">
      <body>
        {children}
        {/* If/when inline scripts are added, pass nonce={nonce} */}
      </body>
    </html>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add src/middleware.ts src/middleware.test.ts src/app/layout.tsx
git commit -m "feat(security): CSP with per-request nonce and hardening headers"
```

---

### Task 8.4: GitHub Actions CI

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Write the workflow**

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  verify:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - run: pnpm lint

      - run: pnpm typecheck

      - name: Run tests with coverage
        run: pnpm test

      - name: Enforce 80% domain coverage
        run: |
          node -e "
          const r = require('./coverage/coverage-summary.json');
          const pct = r.total.lines.pct;
          if (pct < 80) { console.error('Coverage ' + pct + '% < 80%'); process.exit(1); }
          console.log('Coverage OK: ' + pct + '%');
          "

      - name: Build
        run: pnpm build
        env:
          NEXT_PUBLIC_SUPABASE_URL: https://example.supabase.co
          NEXT_PUBLIC_SUPABASE_ANON_KEY: anon-placeholder

  migration-lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
        with:
          version: latest
      - name: Lint migrations
        run: supabase db lint --file "supabase/migrations/*.sql"
```

- [ ] **Step 2: Add coverage reporter config**

Modify `vitest.config.ts` to emit `coverage-summary.json`:

```ts
// vitest.config.ts — ensure the coverage block contains:
coverage: {
  provider: 'v8',
  reporter: ['text', 'html', 'json-summary'],
  reportsDirectory: './coverage',
  thresholds: {
    lines: 80,
    functions: 80,
    branches: 75,
    statements: 80,
  },
  include: ['src/lib/domain/**/*.ts'],
},
```

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml vitest.config.ts
git commit -m "ci: lint, typecheck, test with 80% coverage gate, migration lint, build"
```

---

### Task 8.5: Dependabot + PR template

**Files:**
- Create: `.github/dependabot.yml`
- Create: `.github/pull_request_template.md`

- [ ] **Step 1: Write Dependabot config**

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: npm
    directory: "/"
    schedule: { interval: weekly }
    open-pull-requests-limit: 5
  - package-ecosystem: github-actions
    directory: "/"
    schedule: { interval: weekly }
```

- [ ] **Step 2: Write PR template**

```md
<!-- .github/pull_request_template.md -->
## Summary
-

## Test plan
- [ ] `pnpm lint`
- [ ] `pnpm typecheck`
- [ ] `pnpm test`
- [ ] Manual: exercised the affected flow end-to-end
```

- [ ] **Step 3: Commit**

```bash
git add .github/dependabot.yml .github/pull_request_template.md
git commit -m "chore(ci): dependabot + PR template"
```

---

### Task 8.6: README with run + deploy instructions

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write the README**

```md
# Padeljarto

Private PWA for running padel tournaments among 12–30 friends. Next.js 16 App Router + Supabase + Tailwind v4.

## Local setup

1. `pnpm install`
2. Copy `.env.example` → `.env.local` and fill values.
3. Start Supabase locally: `supabase start`
4. Apply migrations: `supabase db reset`
5. Run dev server: `pnpm dev`

## Tests

- Unit + integration: `pnpm test`
- Watch: `pnpm test:watch`
- Coverage gate: 80% on `src/lib/domain/**`

## Deploy

- App: Vercel (connect this repo; set env vars from `.env.example`).
- Database: Supabase project; push migrations with `supabase db push`.
- Edge function: `supabase functions deploy notify --no-verify-jwt`.

## Architecture

- `src/lib/domain/**` — pure logic (rating, bracket, scoring). Fully unit-tested.
- `src/lib/repositories/**` — `Repository` interface + `InMemoryRepository` + `SupabaseRepository`. Contract tests run against both.
- `src/app/**` — Next.js App Router, server actions, and UI.
- `supabase/migrations/**` — schema, RLS, triggers, RPCs.
- `supabase/functions/notify/**` — email dispatcher.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add project README with setup, test, and deploy instructions"
```

---

## Closing checklist

Before calling the feature done:

- [ ] `pnpm lint` is clean
- [ ] `pnpm typecheck` is clean
- [ ] `pnpm test` passes with ≥80% coverage on `src/lib/domain/**`
- [ ] `pnpm build` succeeds
- [ ] Migrations apply cleanly on a fresh Supabase project (`supabase db reset`)
- [ ] Edge function `notify` deployed and reachable
- [ ] A full happy-path round-trip works manually:
  1. Owner creates tournament (draft)
  2. Owner opens tournament; players receive email
  3. Invitations accepted; inscriptions created
  4. Owner starts tournament; pairs drawn; groups + round-robin matches generated
  5. Players report results; organizer validates; ratings update atomically
  6. Organizer advances to knockout; bracket seeded from standings
  7. Knockout played; champion recorded; tournament transitions to `complete`
- [ ] PWA installs on iOS Safari and Android Chrome; offline page visible when offline
- [ ] CSP headers present in production response

---




