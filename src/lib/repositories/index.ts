import { hasSupabaseData } from "@/lib/env";
import { DemoTournamentRepository } from "@/lib/repositories/demo-repository";
import type { TournamentRepository } from "@/lib/domain/types";
import { SupabaseTournamentRepository } from "@/lib/repositories/supabase-repository";

const demoRepository = new DemoTournamentRepository();
const supabaseRepository = new SupabaseTournamentRepository();

export function getTournamentRepository(): TournamentRepository {
  return hasSupabaseData ? supabaseRepository : demoRepository;
}
