-- Invitation expiry and rejection per PadelFlow spec.

-- Add expiry date to invitations.
alter table public.invitations
  add column if not exists expires_at timestamptz;

-- Expand invitation statuses to include expired and rejected.
alter table public.invitations
  drop constraint if exists invitations_status_check;
alter table public.invitations
  add constraint invitations_status_check
  check (status in ('pending', 'accepted', 'revoked', 'expired', 'rejected'));
