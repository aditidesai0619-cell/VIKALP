import { useState } from "react";
import { VillageLayerControl, type VillageLayerVisibility } from "../village-map/VillageLayerControl";
import type { ApiSettlement } from "../../types/settlement";

// Risk Analysis workspace redesign — left control column. Reuses
// VillageLayerControl unmodified (no duplicate layer-toggle logic) and
// the same real map-layer colors VillageMap.tsx already paints with,
// so the legend can never drift out of sync with what the map actually
// renders. Every status row states a real, currently-true fact about
// VIKALP's data — nothing here is a placeholder for a hazard layer
// that doesn't exist yet.

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[11px] font-semibold uppercase tracking-wide text-vikalp-text-secondary">
      {children}
    </h2>
  );
}

function StatusRow({ label, status }: { label: string; status: string }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1 text-xs">
      <span className="text-vikalp-text-secondary">{label}</span>
      <span className="text-right text-vikalp-text">{status}</span>
    </div>
  );
}

function LegendRow({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2 py-0.5 text-xs text-vikalp-text-secondary">
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-sm border border-vikalp-border/60"
        style={{ backgroundColor: color }}
      />
      {label}
    </div>
  );
}

export function RiskControlPanel({
  locationPath,
  settlements,
  selectedSettlementId,
  onSelectSettlement,
  landslideEvidenceAvailable,
  landslideRecordCount,
  layerVisibility,
  onToggleLayer,
  buildingsAvailable,
  roadsAvailable,
  waterAvailable,
  servicesAvailable,
  onResetView,
}: {
  locationPath: string[];
  settlements: ApiSettlement[];
  selectedSettlementId: number | null;
  onSelectSettlement: (id: number) => void;
  landslideEvidenceAvailable: boolean;
  landslideRecordCount: number;
  layerVisibility: VillageLayerVisibility;
  onToggleLayer: (key: keyof VillageLayerVisibility) => void;
  buildingsAvailable: boolean;
  roadsAvailable: boolean;
  waterAvailable: boolean;
  servicesAvailable: boolean;
  onResetView: () => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = settlements.filter((s) =>
    s.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <div className="flex w-full shrink-0 flex-col gap-4 overflow-y-auto rounded-vikalp-card border border-vikalp-border bg-vikalp-card p-4 lg:w-64">
      <div>
        <SectionHeading>Location</SectionHeading>
        <nav aria-label="Location hierarchy" className="mt-2 flex flex-col gap-0.5">
          {locationPath.map((segment, index) => (
            <span
              key={segment}
              className={
                index === locationPath.length - 1
                  ? "text-sm font-semibold text-vikalp-navy"
                  : "text-xs text-vikalp-text-secondary"
              }
              style={{ paddingLeft: `${index * 10}px` }}
            >
              {index > 0 ? "→ " : ""}
              {segment}
            </span>
          ))}
        </nav>

        <label className="mt-3 flex flex-col gap-1">
          <span className="text-[10px] font-medium uppercase tracking-wide text-vikalp-text-secondary">
            Search settlement
          </span>
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search…"
            className="rounded-md border border-vikalp-border bg-vikalp-bg px-2.5 py-1.5 text-xs text-vikalp-text outline-none focus:border-vikalp-navy focus:ring-1 focus:ring-vikalp-navy"
          />
        </label>
        <div className="mt-1.5 flex flex-col gap-0.5">
          {filtered.length === 0 && (
            <span className="text-[11px] text-vikalp-text-secondary">No match.</span>
          )}
          {filtered.map((settlement) => {
            const selected = settlement.id === selectedSettlementId;
            return (
              <button
                key={settlement.id}
                type="button"
                onClick={() => onSelectSettlement(settlement.id)}
                className={`rounded-md border px-2.5 py-1.5 text-left text-xs transition-colors ${
                  selected
                    ? "border-vikalp-navy bg-vikalp-navy/10 font-semibold text-vikalp-navy"
                    : "border-vikalp-border text-vikalp-text hover:bg-vikalp-bg"
                }`}
              >
                {settlement.name}
                {selected && <span className="ml-1.5 text-[10px] font-normal">(selected)</span>}
              </button>
            );
          })}
        </div>
        {settlements.length <= 1 && (
          <span className="mt-1 block text-[10px] text-vikalp-text-secondary">
            Single-settlement pilot dataset — no other settlements to search.
          </span>
        )}
      </div>

      <div>
        <SectionHeading>Hazard Layers</SectionHeading>
        <div className="mt-2 flex flex-col divide-y divide-vikalp-border">
          <StatusRow
            label="Landslide"
            status={
              landslideEvidenceAvailable
                ? `${landslideRecordCount} GSI/NLFC records — see Additional Layers`
                : "No evidence"
            }
          />
          <StatusRow label="Flood" status="Unavailable in current pilot" />
          <StatusRow label="Cloudburst" status="Unavailable in current pilot" />
          <StatusRow label="Coastal erosion" status="Not applicable — Uttarakhand pilot" />
        </div>
      </div>

      <div>
        <SectionHeading>Legend</SectionHeading>
        <div className="mt-2 flex flex-col">
          {buildingsAvailable && <LegendRow color="#c9c4b8" label="Building footprint (visualization only)" />}
          {roadsAvailable && <LegendRow color="#b3ab9c" label="Road / path" />}
          {waterAvailable && <LegendRow color="#5f8fb3" label="Water" />}
          {servicesAvailable && <LegendRow color="#7fa9c9" label="Mapped service" />}
          <LegendRow color="#a8822f" label="Settlement location" />
          <LegendRow color="#d9b56a" label="District boundary" />
          {landslideEvidenceAvailable && <LegendRow color="#8a6d3b" label="Landslide evidence (GSI/NLFC)" />}
        </div>
      </div>

      <div>
        <SectionHeading>Additional Layers</SectionHeading>
        <div className="mt-2">
          <VillageLayerControl
            visibility={layerVisibility}
            onToggle={onToggleLayer}
            buildingsAvailable={buildingsAvailable}
            roadsAvailable={roadsAvailable}
            waterAvailable={waterAvailable}
            servicesAvailable={servicesAvailable}
          />
        </div>
      </div>

      <div>
        <SectionHeading>View</SectionHeading>
        <div className="mt-2">
          <button
            type="button"
            onClick={onResetView}
            className="w-full rounded-md border border-vikalp-border px-2.5 py-1.5 text-left text-xs font-medium text-vikalp-navy transition-colors hover:bg-vikalp-bg"
          >
            Reset view
          </button>
        </div>
      </div>
    </div>
  );
}
