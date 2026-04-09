-- Enable realtime broadcasts for the tables the client subscribes to.
do $$
begin
  if not exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) then
    create publication supabase_realtime;
  end if;
end $$;

alter publication supabase_realtime add table public.matches;
alter publication supabase_realtime add table public.score_submissions;
alter publication supabase_realtime add table public.standings;
alter publication supabase_realtime add table public.tournament_memberships;
