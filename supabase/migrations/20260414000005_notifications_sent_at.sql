alter table notifications add column if not exists sent_at timestamptz;
create index if not exists notifications_unsent_idx on notifications (created_at) where sent_at is null;
