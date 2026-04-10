-- Notifications and audit log per PadelFlow spec.

-- In-app notifications.
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  data jsonb,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx on public.notifications (user_id, read, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "notifications_own_read" on public.notifications;
create policy "notifications_own_read" on public.notifications
for select to authenticated
using (user_id = auth.uid());

drop policy if exists "notifications_own_update" on public.notifications;
create policy "notifications_own_update" on public.notifications
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Audit log for sensitive actions.
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_log_entity_idx on public.audit_log (entity_type, entity_id);
create index if not exists audit_log_actor_idx on public.audit_log (actor_id);

alter table public.audit_log enable row level security;

-- Audit log readable by tournament organizer for their tournament actions.
drop policy if exists "audit_log_organizer_read" on public.audit_log;
create policy "audit_log_organizer_read" on public.audit_log
for select to authenticated
using (
  -- Actor can see their own audit entries.
  actor_id = auth.uid()
  or exists (
    select 1 from public.tournaments t
    where t.id = audit_log.entity_id
      and t.organizer_id = auth.uid()
      and audit_log.entity_type in ('tournament', 'match', 'match_result')
  )
);

-- Realtime for notifications.
do $$
begin
  perform 1 from pg_publication where pubname = 'supabase_realtime';
  if found then
    begin
      alter publication supabase_realtime add table public.notifications;
    exception when duplicate_object then null;
    end;
    begin
      alter publication supabase_realtime add table public.match_result_proposals;
    exception when duplicate_object then null;
    end;
    begin
      alter publication supabase_realtime add table public.match_result_validations;
    exception when duplicate_object then null;
    end;
  end if;
end $$;
