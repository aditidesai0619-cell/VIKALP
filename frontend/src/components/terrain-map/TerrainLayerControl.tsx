import { LayersIcon } from "../common/icons";
import { Badge } from "../common/Badge";

export interface TerrainLayerVisibility {
  terrain: boolean;
  buildings: boolean;
  boundaries: boolean;
  settlement: boolean;
  evidence: boolean;
}

function ToggleRow({
  label,
  checked,
  disabled,
  onToggle,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-vikalp-text">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={onToggle}
        className="h-3.5 w-3.5 accent-vikalp-navy"
      />
      {label}
    </label>
  );
}

function UnavailableRow({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-between gap-2 text-vikalp-text-secondary">
      <span>{label}</span>
      <Badge tone="neutral">No data</Badge>
    </div>
  );
}

// Real, independently-toggleable layers this map actually has. Roads,
// water, and place labels are part of the OpenFreeMap base style
// itself (real OSM data) and are not offered as a separate toggle for
// the same reason EvidenceLayerControl doesn't offer one for its
// basemap: there is no served layer independent of the basemap to
// turn off. Buildings/Risk zones/Facilities/Evacuation routes/Weather
// are listed honestly as unavailable — VIKALP has no schema or data
// for any of them (confirmed by direct backend inspection), so they
// are not offered as dead toggles.
export function TerrainLayerControl({
  visibility,
  onToggle,
  terrainAvailable,
}: {
  visibility: TerrainLayerVisibility;
  onToggle: (key: keyof TerrainLayerVisibility) => void;
  terrainAvailable: boolean;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-md border border-vikalp-border bg-vikalp-card/95 px-3 py-2.5 text-[13px]">
      <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-vikalp-text-secondary">
        <LayersIcon className="h-3.5 w-3.5" />
        Layers
      </span>
      <div className="flex flex-col gap-1.5">
        {terrainAvailable ? (
          <ToggleRow
            label="3D terrain"
            checked={visibility.terrain}
            onToggle={() => onToggle("terrain")}
          />
        ) : (
          <UnavailableRow label="3D terrain" />
        )}
        <ToggleRow
          label="Buildings (OpenStreetMap)"
          checked={visibility.buildings}
          onToggle={() => onToggle("buildings")}
        />
        <ToggleRow
          label="District boundary"
          checked={visibility.boundaries}
          onToggle={() => onToggle("boundaries")}
        />
        <ToggleRow
          label="Settlement"
          checked={visibility.settlement}
          onToggle={() => onToggle("settlement")}
        />
        <ToggleRow
          label="Historical evidence (GSI/NLFC)"
          checked={visibility.evidence}
          onToggle={() => onToggle("evidence")}
        />
      </div>
      <div className="mt-1 flex flex-col gap-1 border-t border-vikalp-border pt-1.5">
        <UnavailableRow label="Risk zones" />
        <UnavailableRow label="Hospitals / shelters" />
        <UnavailableRow label="Evacuation routes" />
        <UnavailableRow label="Relocation destinations" />
        <UnavailableRow label="Weather" />
      </div>
    </div>
  );
}
