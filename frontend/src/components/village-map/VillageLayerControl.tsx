import { LayersIcon } from "../common/icons";
import { Badge } from "../common/Badge";

export interface VillageLayerVisibility {
  buildings: boolean;
  roads: boolean;
  water: boolean;
  services: boolean;
  boundaries: boolean;
  settlement: boolean;
  evidence: boolean;
}

function ToggleRow({
  label,
  checked,
  onToggle,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-vikalp-text">
      <input
        type="checkbox"
        checked={checked}
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

// Real, independently-toggleable layers this map actually has, plus
// honest "no data" rows for every category the brief asked us to
// investigate (route/access, relocation destinations) — VIKALP has no
// schema or data for those (confirmed by direct backend inspection),
// so they stay listed, not silently omitted, and not wired to any
// fake layer.
export function VillageLayerControl({
  visibility,
  onToggle,
  buildingsAvailable,
  roadsAvailable,
  waterAvailable = false,
  servicesAvailable = false,
  destinationAvailable = false,
}: {
  visibility: VillageLayerVisibility;
  onToggle: (key: keyof VillageLayerVisibility) => void;
  buildingsAvailable: boolean;
  roadsAvailable: boolean;
  waterAvailable?: boolean;
  servicesAvailable?: boolean;
  destinationAvailable?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-md border border-vikalp-border bg-vikalp-card/95 px-3 py-2.5 text-[13px]">
      <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-vikalp-text-secondary">
        <LayersIcon className="h-3.5 w-3.5" />
        Layers
      </span>
      <div className="flex flex-col gap-1.5">
        {buildingsAvailable ? (
          <ToggleRow
            label="Buildings"
            checked={visibility.buildings}
            onToggle={() => onToggle("buildings")}
          />
        ) : (
          <UnavailableRow label="Buildings" />
        )}
        {roadsAvailable ? (
          <ToggleRow
            label="Roads & Paths"
            checked={visibility.roads}
            onToggle={() => onToggle("roads")}
          />
        ) : (
          <UnavailableRow label="Roads & Paths" />
        )}
        {waterAvailable ? (
          <ToggleRow
            label="Water"
            checked={visibility.water}
            onToggle={() => onToggle("water")}
          />
        ) : (
          <UnavailableRow label="Water" />
        )}
        {servicesAvailable ? (
          <ToggleRow
            label="Services (mapped)"
            checked={visibility.services}
            onToggle={() => onToggle("services")}
          />
        ) : (
          <UnavailableRow label="Services" />
        )}
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
        <UnavailableRow label="Route / access" />
        {!destinationAvailable && <UnavailableRow label="Relocation destinations" />}
      </div>
      {(buildingsAvailable || roadsAvailable || waterAvailable || servicesAvailable) && (
        <div className="flex flex-col gap-0.5 border-t border-vikalp-border pt-1.5 text-[10px] text-vikalp-text-secondary">
          {buildingsAvailable && <span>Buildings: Google Open Buildings</span>}
          {roadsAvailable && <span>Roads: OpenStreetMap contributors</span>}
          {waterAvailable && <span>Water: OpenStreetMap contributors</span>}
          {servicesAvailable && <span>Services: OpenStreetMap contributors</span>}
        </div>
      )}
    </div>
  );
}
