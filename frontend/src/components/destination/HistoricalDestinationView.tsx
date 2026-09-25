import { useEffect, useState } from "react";
import { RelocationMap } from "../relocation/RelocationMap";
import { HistoricalReplayBanner } from "../historical-replay/HistoricalReplayBanner";
import { MapWatermark } from "../historical-replay/MapWatermark";
import { HISTORICAL_DESTINATION_STATUS } from "../../data/historicalReplay";
import { fetchSettlementById, fetchSettlementGeojson } from "../../services/settlements";
import type { ApiSettlement } from "../../types/settlement";
import type { GeojsonRequestState } from "../../types/settlement";

type StageStatus = "available" | "limited" | "unavailable" | "requires-review";

const STAGE_LABEL: Record<StageStatus, string> = {
  available: "Available",
  limited: "Limited",
  unavailable: "Unavailable",
  "requires-review": "Requires review",
};

const STAGE_TONE: Record<StageStatus, string> = {
  available: "border-vikalp-safe/40 bg-vikalp-safe/10 text-vikalp-safe",
  limited: "border-vikalp-warning/40 bg-vikalp-warning/10 text-vikalp-warning",
  unavailable: "border-vikalp-border bg-vikalp-bg text-vikalp-text-secondary",
  "requires-review": "border-vikalp-navy/40 bg-vikalp-navy/10 text-vikalp-navy",
};

const STAGES: { label: string; status: StageStatus }[] = [
  { label: "Current settlement", status: "available" },
  { label: "Destination", status: "unavailable" },
  { label: "Capacity", status: "unavailable" },
  { label: "Access", status: "unavailable" },
  { label: "Relocation plan", status: "requires-review" },
  { label: "Officer review", status: "requires-review" },
];

// Destination & Relocation's Historical Replay content (brief §7-8) —
// "If relocation were being considered, what would the officer need to
// check?" Every field here was confirmed empty/unintegrated by direct
// audit of backend/app/services/destination.py (a permanent structural-
// framework-only service — always returns an empty candidate list, no
// capacity field exists on its response schema at all) before this was
// written, so nothing here is a placeholder standing in for real data
// — it is the honest current state of what VIKALP has, framed for
// historical review the same way it is framed for current review.
export function HistoricalDestinationView({ settlementId }: { settlementId: number }) {
  const [geojsonState, setGeojsonState] = useState<GeojsonRequestState>({ status: "loading" });
  const [settlement, setSettlement] = useState<ApiSettlement | null>(null);

  useEffect(() => {
    setGeojsonState({ status: "loading" });
    fetchSettlementGeojson(settlementId)
      .then((feature) => setGeojsonState({ status: "success", feature }))
      .catch((error: unknown) =>
        setGeojsonState({
          status: "error",
          message: error instanceof Error ? error.message : "Unknown error.",
        }),
      );
    fetchSettlementById(settlementId)
      .then((result) => setSettlement(result))
      .catch(() => setSettlement(null));
  }, [settlementId]);

  return (
    <div className="flex flex-col gap-4">
      <HistoricalReplayBanner />

      {/* §7.2 Current settlement — explicitly labeled current, not
          historical-period state. */}
      <div className="flex flex-col gap-2 rounded-vikalp-card border border-vikalp-border bg-vikalp-card p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-vikalp-navy">Current settlement context</h2>
        </div>
        {settlement ? (
          <>
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-vikalp-text">{settlement.name}</span>
              <span className="text-xs text-vikalp-text-secondary">
                {settlement.district}, {settlement.state}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3 pt-1">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wide text-vikalp-text-secondary">
                  Population
                </span>
                <span className="text-lg font-semibold text-vikalp-text">{settlement.population}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wide text-vikalp-text-secondary">
                  Households
                </span>
                <span className="text-lg font-semibold text-vikalp-text">{settlement.households}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wide text-vikalp-text-secondary">
                  Elevation
                </span>
                <span className="text-lg font-semibold text-vikalp-text">{settlement.elevation_m} m</span>
              </div>
            </div>
            <span className="text-[11px] font-medium text-vikalp-warning">
              Current dataset used as a spatial reference; not verified historical state.
            </span>
          </>
        ) : (
          <span className="text-xs text-vikalp-text-secondary">Settlement data unavailable.</span>
        )}
      </div>

      {/* §7.3 Destination map — reuses the existing, unmodified
          RelocationMap component (Task 43) exactly as Current mode
          uses it, with no destination candidate (none exists) plus a
          watermark overlay added from outside — RelocationMap.tsx
          itself was not changed. */}
      {/* h-100 (not the original h-72) — RelocationMap's layer-control
          and legend overlay stack (Task 45.9) was sized for the taller
          maps Destination Explorer/Relocation Planner use; at h-72 the
          two absolutely-positioned panels visually collided outright.
          h-96 got the collision down to a residual ~6px corner touch
          (live-measured); h-100 adds clear margin on top of that. */}
      <div className="relative flex h-100 shrink-0">
        <RelocationMap
          geojsonState={geojsonState}
          onRetryGeojson={() => fetchSettlementGeojson(settlementId)}
          destinationCandidate={null}
        />
        <MapWatermark />
      </div>

      {/* §7.4/§7.5/§7.6 — every field the brief asks about, each
          honestly unavailable, using the brief's own required text. */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5 rounded-vikalp-card border border-vikalp-border bg-vikalp-card p-3.5">
          <h3 className="text-sm font-semibold text-vikalp-text">Destination evidence</h3>
          <span className="text-xs text-vikalp-text-secondary">
            {HISTORICAL_DESTINATION_STATUS.destinationMessage}
          </span>
        </div>
        <div className="flex flex-col gap-1.5 rounded-vikalp-card border border-vikalp-border bg-vikalp-card p-3.5">
          <h3 className="text-sm font-semibold text-vikalp-text">Carrying capacity</h3>
          <span className="text-xs text-vikalp-text-secondary">
            {HISTORICAL_DESTINATION_STATUS.capacityMessage}
          </span>
        </div>
        <div className="flex flex-col gap-1.5 rounded-vikalp-card border border-vikalp-border bg-vikalp-card p-3.5">
          <h3 className="text-sm font-semibold text-vikalp-text">Access / route</h3>
          <span className="text-xs text-vikalp-text-secondary">
            {HISTORICAL_DESTINATION_STATUS.accessMessage}
          </span>
        </div>
      </div>

      {/* §8 Relocation planning visual — status-first, no paragraphs. */}
      <div className="flex flex-col gap-2 rounded-vikalp-card border border-vikalp-border bg-vikalp-card p-4">
        <h2 className="text-sm font-semibold text-vikalp-navy">Relocation planning workflow</h2>
        <div className="flex flex-col gap-1 lg:flex-row lg:items-stretch lg:gap-0">
          {STAGES.map((stage, index) => (
            <div key={stage.label} className="flex items-center gap-1 lg:flex-1">
              <div className="flex flex-1 flex-col items-start gap-1 rounded-md border border-vikalp-border bg-vikalp-bg px-2.5 py-2">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-vikalp-text-secondary">
                  {stage.label}
                </span>
                <span
                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${STAGE_TONE[stage.status]}`}
                >
                  {STAGE_LABEL[stage.status]}
                </span>
              </div>
              {index < STAGES.length - 1 && (
                <span aria-hidden="true" className="shrink-0 px-1 text-vikalp-text-secondary">
                  →
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-md border border-vikalp-border bg-vikalp-bg px-3 py-2.5 text-xs text-vikalp-text-secondary">
        <span className="font-medium text-vikalp-text">Counterfactual demonstration. </span>
        This replay reconstructs the evidence workflow using verified historical records. It demonstrates
        how VIKALP could have supported structured officer review of relocation questions if the platform
        had been available during the historical period — it does not claim VIKALP would have relocated
        this settlement, or that any destination was ever identified.
      </div>
    </div>
  );
}
