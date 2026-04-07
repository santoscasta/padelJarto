import { buildProfileMap, buildTeamMap } from "@/lib/domain/selectors";
import type { StandingRow, TournamentDetail } from "@/lib/domain/types";

function entityLabel(detail: TournamentDetail, row: StandingRow) {
  if (row.entityType === "team") {
    return buildTeamMap(detail.teams).get(row.entityId)?.name ?? "Pareja";
  }

  return buildProfileMap(detail.members).get(row.entityId)?.fullName ?? "Jugador";
}

export function StandingsTable({
  detail,
  rows,
}: Readonly<{
  detail: TournamentDetail;
  rows: StandingRow[];
}>) {
  return (
    <div className="overflow-hidden rounded-[24px] border border-white/10">
      <table className="min-w-full divide-y divide-white/10 text-sm">
        <thead className="bg-white/5 text-left text-xs uppercase tracking-[0.2em] text-[#fdba74]">
          <tr>
            <th className="px-4 py-3">#</th>
            <th className="px-4 py-3">Entidad</th>
            <th className="px-4 py-3">PJ</th>
            <th className="px-4 py-3">V</th>
            <th className="px-4 py-3">D</th>
            <th className="px-4 py-3">Sets</th>
            <th className="px-4 py-3">Juegos</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10 bg-black/10">
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="px-4 py-3 font-semibold text-[#fde68a]">{row.rank}</td>
              <td className="px-4 py-3 font-medium">{entityLabel(detail, row)}</td>
              <td className="px-4 py-3">{row.played}</td>
              <td className="px-4 py-3">{row.wins}</td>
              <td className="px-4 py-3">{row.losses}</td>
              <td className="px-4 py-3">
                {row.setsFor}-{row.setsAgainst}
              </td>
              <td className="px-4 py-3">
                {row.gamesFor}-{row.gamesAgainst}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
