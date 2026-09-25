// Only legends entries for what this map actually renders. The pasted
// brief also asks for "High/Moderate/Lower concern" swatches, but
// nothing on this map is colour-classified by risk — VIKALP has no
// risk-zone geometry to back that (confirmed by direct backend
// inspection: hazard_exposure.py returns a per-settlement scalar, never
// a polygon). Showing concern-level swatches with nothing on the map
// using them would imply a classification that doesn't exist, so they
// are intentionally left out rather than added as decoration.
export function TerrainLegend({ terrainAvailable }: { terrainAvailable: boolean }) {
  return (
    <div className="pointer-events-none absolute bottom-3 left-3 z-1200 flex flex-col gap-1.5 rounded-md border border-vikalp-border bg-vikalp-card/95 px-3.5 py-3 text-[13px] text-vikalp-text-secondary">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-vikalp-text-secondary">
        Legend
      </span>
      {terrainAvailable && (
        <span className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-sm bg-gradient-to-br from-[#4c7a4a] to-[#8a7355]"
            aria-hidden="true"
          />
          Elevation-shaded terrain
        </span>
      )}
      <span className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full bg-[#a8822f]" aria-hidden="true" />
        Current settlement
      </span>
      <span className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full bg-[#8a6d3b] opacity-70" aria-hidden="true" />
        Historical evidence (GSI/NLFC point record)
      </span>
      <span className="flex items-center gap-2">
        <span className="h-0.5 w-3.5 rounded-full bg-[#d9b56a]" aria-hidden="true" />
        District boundary
      </span>
      <span className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-sm bg-vikalp-text-secondary/50" aria-hidden="true" />
        Building — OpenStreetMap data, not assessed
      </span>
    </div>
  );
}
