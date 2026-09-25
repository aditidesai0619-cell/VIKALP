import { LayersIcon } from "../common/icons";

export interface RelocationLayerVisibility {
  boundaries: boolean;
  settlement: boolean;
}

// Task 45.9 §15/§16 — "only expose layers that actually have data."
// Boundaries and Settlement are real, toggleable layers. Buildings,
// Roads, and Destinations are listed too, but as disabled/greyed rows
// labeled with their real unavailability — not omitted, so the
// officer can see at a glance what VIKALP could show if that evidence
// existed, without ever implying it currently does (brief's own
// 3-way "real / unavailable / structurally supported" framing,
// applied to the layer control itself).
export function RelocationLayerControl({
  visibility,
  onToggle,
}: {
  visibility: RelocationLayerVisibility;
  onToggle: (key: keyof RelocationLayerVisibility) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-md border border-vikalp-border bg-vikalp-card/95 px-3 py-2.5 text-[13px]">
      <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-vikalp-text-secondary">
        <LayersIcon className="h-3.5 w-3.5" />
        Layers
      </span>
      <label className="flex cursor-pointer items-center gap-2 text-vikalp-text">
        <input
          type="checkbox"
          checked={visibility.settlement}
          onChange={() => onToggle("settlement")}
          className="h-3.5 w-3.5 accent-vikalp-navy"
        />
        Settlement
      </label>
      <label className="flex cursor-pointer items-center gap-2 text-vikalp-text">
        <input
          type="checkbox"
          checked={visibility.boundaries}
          onChange={() => onToggle("boundaries")}
          className="h-3.5 w-3.5 accent-vikalp-navy"
        />
        District boundary
      </label>
      {/* Consolidated into one line (was 3 separate disabled rows) —
          same information, less vertical space, so this panel fits
          without colliding with the map's other overlays even in the
          more compact map instances (e.g. HistoricalDestinationView's
          h-96 map, found live during Task 45.9's own verification). */}
      <div className="mt-1 border-t border-vikalp-border pt-1.5 text-[12px] text-vikalp-text-secondary opacity-60">
        Buildings, Roads, Destinations — no data
      </div>
    </div>
  );
}
