import { labelForSide } from "@/lib/domain/selectors";
import type { TournamentDetail } from "@/lib/domain/types";

export function KnockoutBracket({
  detail,
}: Readonly<{
  detail: TournamentDetail;
}>) {
  if (!detail.knockoutRounds.length) {
    return (
      <div className="rounded-[24px] border border-dashed border-white/15 bg-white/5 p-6 text-sm text-[#d6d3d1]">
        El cuadro final todavía no está creado.
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {detail.knockoutRounds.map((round) => (
        <div key={round.round} className="space-y-3 rounded-[24px] border border-white/10 bg-black/15 p-5">
          <h3 className="font-[family:var(--font-display)] text-xl tracking-tight text-[#fed7aa]">
            {round.label}
          </h3>
          <div className="space-y-3">
            {round.matches.map((match) => {
              const home = labelForSide(detail, match.sides[0]);
              const away = labelForSide(detail, match.sides[1]);

              return (
                <article key={match.id} className="rounded-[20px] border border-white/10 bg-white/5 p-4">
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-[#fb923c]">{match.roundLabel}</p>
                      <p className="mt-1 font-semibold">{home.title}</p>
                      <p className="text-xs text-[#d6d3d1]">{home.subtitle}</p>
                    </div>
                    <div>
                      <p className="font-semibold">{away.title}</p>
                      <p className="text-xs text-[#d6d3d1]">{away.subtitle}</p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
