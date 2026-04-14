# notify edge function

Reads a `notifications` row by id, renders the email via the shared `buildPayload`, and sends it through Resend. Server actions call this endpoint fire-and-forget after inserting the notification row.

## Required env (set via `supabase secrets set`)

- `NOTIFY_DISPATCHER_SECRET` — shared bearer token; must match `NOTIFY_DISPATCHER_SECRET` in the Next.js server env.
- `RESEND_API_KEY`
- `RESEND_FROM` — e.g. `Padeljarto <noreply@padeljarto.app>`
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — injected automatically in Supabase.

## Deploy

    supabase functions deploy notify --no-verify-jwt
