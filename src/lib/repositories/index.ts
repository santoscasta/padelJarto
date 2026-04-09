import { hasSupabaseData, isDemoEnabled } from "@/lib/env";
import { DemoTournamentRepository } from "@/lib/repositories/demo-repository";
import type { TournamentRepository } from "@/lib/domain/types";
import { SupabaseTournamentRepository } from "@/lib/repositories/supabase-repository";
import { invariant } from "@/lib/utils";

const demoRepository = new DemoTournamentRepository();
const supabaseRepository = new SupabaseTournamentRepository();

export function getTournamentRepository(): TournamentRepository {
  if (hasSupabaseData) {
    return supabaseRepository;
  }

  invariant(
    isDemoEnabled,
    "Supabase data is not configured and demo mode is disabled.",
  );
  return demoRepository;
}
