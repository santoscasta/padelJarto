# PadelFlow - Product Specification

## Overview

PadelFlow is a responsive PWA for managing amateur and semi-professional padel tournaments.
Built with Next.js App Router on Vercel and Supabase for auth, database, realtime, and storage.

## Key Features

- **Tournament Formats**: League (round-robin), Playoff (knockout), or League + Playoff combined.
- **Pair Modes**: Fixed pairs (constant throughout) or Variable pairs (reassigned per round).
- **Distributed Result Validation**: Players propose results; rivals validate; disputes go to organizer.
- **Scoring**: Victoria = 3pts, Derrota = 0pts. Tiebreakers: points → head-to-head → set diff → game diff → manual.
- **Invitations**: Token-based with expiry, accept/reject by players.
- **Notifications**: In-app notification system for match results, disputes, invitations.
- **Audit Log**: Full traceability of sensitive actions (dispute resolution, expulsions).
- **Clubs**: Optional community grouping for tournaments.
- **PWA**: Installable on mobile, offline-capable shell.

## User Roles

| Role | Capabilities |
|------|-------------|
| Player | Join tournaments, propose results, validate rival results |
| Organizer | Create/manage tournaments, resolve disputes, manage teams |
| Admin | Platform-wide moderation (future) |

## Tournament Lifecycle

`draft` → `published` → `in_progress` → `completed` (or `cancelled` at any point)

## Match Lifecycle

`pending` → `result_proposed` → `validated` (if accepted) or `in_dispute` (if rejected) → `closed`

Organizer can resolve disputes and override results at any time.

## Variable Pair Strategies

1. **Manual**: Organizer assigns pairs for each round.
2. **Balanced Shuffle**: Random but balanced pairing.
3. **Auto Rotation**: Avoids repeating partner in consecutive rounds.

## Tech Stack

- Next.js 16 + React 19 + TypeScript 5
- Tailwind CSS 4
- Supabase (Auth, Postgres + RLS, Realtime, Storage)
- Zod validation, date-fns, Lucide icons
- Vercel deployment with cron jobs
- Vitest for unit testing
