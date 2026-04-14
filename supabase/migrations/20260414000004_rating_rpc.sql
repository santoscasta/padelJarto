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
