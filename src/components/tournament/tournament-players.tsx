import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { initialsFromName } from "@/lib/utils";

interface Player {
  id: string;
  name: string;
  role?: string;
  status?: string;
}

export function TournamentPlayers({
  players,
}: Readonly<{
  players: Player[];
}>) {
  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#a8a29e]">
          {players.length} jugadores inscritos
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {players.map((player) => (
          <Card key={player.id} className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-[#1f2937] text-sm font-semibold text-[#fde68a]">
              {initialsFromName(player.name)}
            </div>
            <div>
              <p className="font-semibold">{player.name}</p>
              {player.role && (
                <Badge className="mt-1 text-[10px]">
                  {player.role === "organizer" ? "Organizador" : "Jugador"}
                </Badge>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
