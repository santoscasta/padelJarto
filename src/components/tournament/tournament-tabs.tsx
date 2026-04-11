"use client";

import { useState } from "react";

const TABS = [
  { key: "summary", label: "Resumen" },
  { key: "matches", label: "Partidos" },
  { key: "standings", label: "Clasificación" },
  { key: "players", label: "Jugadores" },
  { key: "rules", label: "Reglas" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function TournamentTabs({
  children,
}: Readonly<{
  children: Record<TabKey, React.ReactNode>;
}>) {
  const [active, setActive] = useState<TabKey>("summary");

  return (
    <div>
      <div className="flex gap-1 overflow-x-auto border-b border-white/10 pb-px">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActive(tab.key)}
            className={`shrink-0 px-4 py-2.5 text-sm font-medium transition rounded-t-lg ${
              active === tab.key
                ? "border-b-2 border-[#f97316] text-[#f97316] bg-white/5"
                : "text-[#a8a29e] hover:text-[#fff7ed] hover:bg-white/5"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="mt-6">{children[active]}</div>
    </div>
  );
}
