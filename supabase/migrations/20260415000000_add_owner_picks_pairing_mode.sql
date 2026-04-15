-- Add 'owner_picks' to the pairing_mode enum so organizers can manually
-- assign pairs after everyone inscribes solo.
alter type public.pairing_mode add value if not exists 'owner_picks';
