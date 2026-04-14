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
