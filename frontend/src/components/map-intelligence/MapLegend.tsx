// Deliberately restrained — no risk-level color scale (green/yellow/red)
// since Bhitai Malli's overall risk assessment is pending (Task 38 §J).
// Only distinguishes what each visible marker/shape *is*, never what it
// means about safety.
export function MapLegend({
  showBoundaries,
  showSettlement,
  showLandslides,
}: {
  showBoundaries: boolean;
  showSettlement: boolean;
  showLandslides: boolean;
}) {
  const hasAnyEntry = showBoundaries || showSettlement || showLandslides;
  if (!hasAnyEntry) return null;

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-x-5 gap-y-1.5 rounded-vikalp-card border border-vikalp-border bg-vikalp-card px-4 py-2.5 text-[11px] text-vikalp-text-secondary">
      <span className="font-medium text-vikalp-text">Legend:</span>

      {showSettlement && (
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full border-2 border-white bg-[#a8822f]" />
          Settlement (demo planning input)
        </span>
      )}

      {showBoundaries && (
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-4 rounded-sm border border-[#4a4438] bg-[#6b6355]/20" />
          Administrative boundary (district)
        </span>
      )}

      {showLandslides && (
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-[#8a6d3b] opacity-70" />
          GSI/NLFC landslide record (contextual evidence, not a hazard zone)
        </span>
      )}
    </div>
  );
}
