/* eslint-disable @typescript-eslint/ban-ts-comment */
// This file runs on Supabase Edge Functions (Deno), not Node. It imports from
// remote URLs (esm.sh) and uses the `Deno` global, neither of which the
// Node-targeted TS/ESLint toolchain can resolve. `@ts-nocheck` is required so
// the Node toolchain stays green; Deno type-checks this file at deploy time.
// @ts-nocheck
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
    .select('id, user_id, kind, payload, sent_at')
    .eq('id', notificationId)
    .maybeSingle();
  if (notifErr || !notif) return new Response('not found', { status: 404 });
  if (notif.sent_at) return new Response('already sent', { status: 200 });

  const { data: profile, error: profileErr } = await admin
    .from('profiles')
    .select('email, display_name')
    .eq('id', notif.user_id)
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
