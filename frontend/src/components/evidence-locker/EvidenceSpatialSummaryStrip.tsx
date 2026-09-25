// Task 45.8 §8 — compact visual evidence summary, immediately below
// the map. Every value is real (Hazard Exposure's own already-
// computed proximity numbers, unchanged) — `null` renders "Not
// available", never a substituted zero.
export function EvidenceSpatialSummaryStrip({
  withinOneKm,
  withinFiveKm,
  nearestKm,
  terrainStatus,
}: {
  withinOneKm: number | null;
  withinFiveKm: number | null;
  nearestKm: number | null;
  terrainStatus: string;
}) {
  const cards: { label: string; value: string; sub?: string }[] = [
    { label: "GSI Records", value: withinFiveKm !== null ? String(withinFiveKm) : "Not available", sub: "within 5 km" },
    { label: "Within 1 km", value: withinOneKm !== null ? String(withinOneKm) : "Not available" },
    { label: "Nearest", value: nearestKm !== null ? `${nearestKm} km` : "Not available" },
    { label: "Terrain", value: terrainStatus },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="flex flex-col items-center gap-0.5 rounded-vikalp-card border border-vikalp-border bg-vikalp-card px-3 py-3.5 text-center"
        >
          <span className="text-[11px] font-semibold uppercase tracking-wide text-vikalp-text-secondary">
            {card.label}
          </span>
          <span className="text-2xl font-bold text-vikalp-text">{card.value}</span>
          {card.sub && <span className="text-[11px] text-vikalp-text-secondary">{card.sub}</span>}
        </div>
      ))}
    </div>
  );
}
