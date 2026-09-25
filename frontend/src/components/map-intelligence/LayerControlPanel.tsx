function StatusRow({ label, status }: { label: string; status: string }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-[13px] text-vikalp-text-secondary">
      <span>{label}</span>
      <span className="text-right text-[13px]">{status}</span>
    </div>
  );
}

// Layer visibility toggles moved onto the map itself (VillageMap's own
// overlay LayerControl, Task: village map integration) — this sidebar
// no longer duplicates them (brief: "do not overload the map UI" /
// avoid two controls for the same layer). What's left here is location
// context plus factual status info the map overlay doesn't show.
export function LayerControlPanel({
  locationPath,
  buildingsAvailable,
  onResetView,
  onFitToBuildings,
}: {
  locationPath: string[];
  buildingsAvailable: boolean;
  onResetView: () => void;
  onFitToBuildings: () => void;
}) {
  return (
    <div className="flex w-full shrink-0 flex-col gap-4 overflow-y-auto rounded-vikalp-card border border-vikalp-border bg-vikalp-card p-4 lg:w-64">
      <div>
        <h2 className="text-[12px] font-semibold uppercase tracking-wide text-vikalp-text-secondary">
          Location
        </h2>
        <nav aria-label="Location hierarchy" className="mt-2 flex flex-col gap-0.5">
          {locationPath.map((segment, index) => (
            <span
              key={segment}
              className={
                index === locationPath.length - 1
                  ? "text-sm font-semibold text-vikalp-navy"
                  : "text-[13px] text-vikalp-text-secondary"
              }
              style={{ paddingLeft: `${index * 10}px` }}
            >
              {index > 0 ? "→ " : ""}
              {segment}
            </span>
          ))}
        </nav>
      </div>

      <div>
        <h2 className="text-[12px] font-semibold uppercase tracking-wide text-vikalp-text-secondary">
          Terrain
        </h2>
        <div className="mt-2 flex flex-col divide-y divide-vikalp-border">
          <StatusRow label="Terrain / DEM" status="Available — CartoDEM v3 R1" />
          <StatusRow label="Slope" status="Available — derived from CartoDEM" />
        </div>
      </div>

      <div>
        <h2 className="text-[12px] font-semibold uppercase tracking-wide text-vikalp-text-secondary">
          Not available in this pilot
        </h2>
        <div className="mt-2 flex flex-col divide-y divide-vikalp-border">
          <StatusRow label="Flood" status="Unavailable in current pilot" />
          <StatusRow label="Cloudburst" status="Unavailable in current pilot" />
          <StatusRow
            label="Coastal erosion"
            status="Not applicable to current Uttarakhand pilot"
          />
        </div>
      </div>

      <div>
        <h2 className="text-[12px] font-semibold uppercase tracking-wide text-vikalp-text-secondary">
          View
        </h2>
        <div className="mt-2 flex flex-col gap-1.5">
          <button
            type="button"
            onClick={onResetView}
            className="rounded-md border border-vikalp-border px-2.5 py-1.5 text-left text-[13px] font-medium text-vikalp-navy transition-colors hover:bg-vikalp-bg"
          >
            Reset to settlement
          </button>
          <button
            type="button"
            onClick={onFitToBuildings}
            disabled={!buildingsAvailable}
            className="rounded-md border border-vikalp-border px-2.5 py-1.5 text-left text-[13px] font-medium text-vikalp-navy transition-colors hover:bg-vikalp-bg disabled:cursor-not-allowed disabled:text-vikalp-text-secondary disabled:hover:bg-transparent"
          >
            Fit to buildings
          </button>
        </div>
      </div>
    </div>
  );
}
