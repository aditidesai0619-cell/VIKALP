import { LayersIcon } from "../common/icons";

export interface EvidenceLayerVisibility {
  boundaries: boolean;
  settlement: boolean;
  gsi: boolean;
}

// Compact layer control (brief §5: "provide a compact layer control...
// do not automatically show every possible layer at once"). Terrain
// relief is the always-on basemap itself, not a separate served
// layer, so it isn't listed as a toggle here — VIKALP has no served
// raster terrain/hillshade tile layer independent of the basemap
// (the CartoDEM raster is a static file, never tile-served — see
// docs/DATA_PROVENANCE.md), so offering a "Terrain" toggle that
// doesn't correspond to a real independent layer would be misleading.
export function EvidenceLayerControl({
  visibility,
  onToggle,
}: {
  visibility: EvidenceLayerVisibility;
  onToggle: (key: keyof EvidenceLayerVisibility) => void;
}) {
  const rows: { key: keyof EvidenceLayerVisibility; label: string }[] = [
    { key: "boundaries", label: "District boundaries" },
    { key: "settlement", label: "Settlement" },
    { key: "gsi", label: "GSI evidence" },
  ];

  return (
    <div className="flex flex-col gap-1.5 rounded-md border border-vikalp-border bg-vikalp-card/95 px-3 py-2.5 text-[13px]">
      <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-vikalp-text-secondary">
        <LayersIcon className="h-3.5 w-3.5" />
        Layers
      </span>
      {rows.map((row) => (
        <label key={row.key} className="flex cursor-pointer items-center gap-2 text-vikalp-text">
          <input
            type="checkbox"
            checked={visibility[row.key]}
            onChange={() => onToggle(row.key)}
            className="h-3.5 w-3.5 accent-vikalp-navy"
          />
          {row.label}
        </label>
      ))}
    </div>
  );
}
