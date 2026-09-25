import { Drawer } from "../common/Drawer";
import { Badge } from "../common/Badge";
import { CATEGORY_BADGE_TONE, CATEGORY_LABEL } from "./categoryStyles";
import { TemporalClassBadge } from "../historical-replay/TemporalClassBadge";
import { EVIDENCE_RECORDS } from "../../data/evidenceRecords";
import type { TemporalClass } from "../../data/historicalReplay";
import type { ApiLandslideProperties } from "../../types/gis";

// Records without a genuine "historical" character even during
// Historical Replay (spatial/current-reference data) vs. the one that
// genuinely is a historical-record class dataset. Brief §14: "Every
// historical item must identify: Historical Record / Current Spatial
// Reference / Scenario Output / Unavailable."
const DRAWER_TEMPORAL_CLASS: Record<string, TemporalClass> = {
  "gsi-nlfc-landslide-inventory": "historical-record",
  "cartodem-terrain": "current-data",
  "vikalp-derived-slope": "current-data",
  "geoboundaries-adm2": "current-data",
  "bhitai-malli-demo-inputs": "current-data",
};

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-vikalp-text-secondary">
        {label}
      </span>
      <span className="text-[15px] leading-relaxed text-vikalp-text">{value}</span>
    </div>
  );
}

export interface EvidenceDrawerLiveFacts {
  gsiFeatureCount: number | null;
  boundaryFeatureCount: number | null;
  hazard: {
    status: string;
    qualifyingRecordCount: number;
    scoringRadiusKm: number;
    nearestContextualDistanceKm: number | null;
    contextualRecordCount: number;
    contextRadiusKm: number;
  } | null;
  settlement: {
    population: number;
    households: number;
    elevationM: number;
    slopeDegrees: number;
  } | null;
}

// The right-side drawer (brief §8) — replaces the old permanent inline
// side panel. Every field here is the same real data
// EvidenceDetailPanel.tsx already showed (source/dataset/scope/usage/
// limitation, plus live facts per record where they existed); only the
// presentation changed to the brief's own SOURCE/DATASET/SCOPE/USED BY
// VIKALP/LIMITATION section format, larger type, and slide-in
// disclosure instead of a permanent panel.
export function EvidenceDrawer({
  recordIds,
  title,
  live,
  historicalReplayActive,
  selectedGsiFeature,
  onExplainWithCopilot,
  open,
  onClose,
}: {
  recordIds: string[];
  title: string;
  live: EvidenceDrawerLiveFacts;
  historicalReplayActive: boolean;
  selectedGsiFeature?: ApiLandslideProperties | null;
  onExplainWithCopilot: () => void;
  open: boolean;
  onClose: () => void;
}) {
  const records = recordIds
    .map((id) => EVIDENCE_RECORDS.find((r) => r.id === id))
    .filter((r): r is NonNullable<typeof r> => r !== undefined);

  return (
    <Drawer open={open} title={title} onClose={onClose}>
      {selectedGsiFeature && (
        <div className="flex flex-col gap-1.5 rounded-md border border-vikalp-border bg-vikalp-bg p-3.5">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-vikalp-text-secondary">
            Selected GSI record (from map)
          </span>
          <ul className="flex flex-col gap-0.5 text-sm text-vikalp-text">
            <li>Slide no: {selectedGsiFeature.slide_no ?? "Not available"}</li>
            <li>Activity: {selectedGsiFeature.activity ?? "Not available"}</li>
            <li>Triggering: {selectedGsiFeature.triggering ?? "Not available"}</li>
            <li>Toposheet: {selectedGsiFeature.toposheet ?? "Not available"}</li>
          </ul>
          <span className="text-[13px] font-medium text-vikalp-warning">
            Contextual evidence, not an assessed risk zone.
          </span>
        </div>
      )}

      {records.map((record, index) => (
        <div
          key={record.id}
          className={`flex flex-col gap-3 ${index > 0 || selectedGsiFeature ? "border-t border-vikalp-border pt-4" : ""}`}
        >
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-base font-semibold text-vikalp-text">{record.title}</h3>
            <Badge tone={CATEGORY_BADGE_TONE[record.category]}>
              {CATEGORY_LABEL[record.category]}
            </Badge>
          </div>

          {historicalReplayActive && DRAWER_TEMPORAL_CLASS[record.id] && (
            <TemporalClassBadge temporalClass={DRAWER_TEMPORAL_CLASS[record.id]} />
          )}

          <Field label="Source" value={record.source} />
          <Field label="Dataset" value={record.dataset} />
          <Field label="Scope" value={record.geographicScope} />
          <Field label="Used by VIKALP" value={record.usageInVikalp} />

          {record.id === "gsi-nlfc-landslide-inventory" && live.gsiFeatureCount !== null && (
            <div className="flex flex-col gap-1.5 rounded-md border border-vikalp-border bg-vikalp-bg p-3.5">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-vikalp-text-secondary">
                Currently serving (live)
              </span>
              <span className="text-sm text-vikalp-text">
                {live.gsiFeatureCount} total records in the inventory, served as viewport-scoped vector
                tiles (never downloaded in full).
              </span>
            </div>
          )}

          {record.id === "gsi-nlfc-landslide-inventory" && live.hazard && (
            <div className="flex flex-col gap-1.5 rounded-md border border-vikalp-border bg-vikalp-bg p-3.5">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-vikalp-text-secondary">
                Derived VIKALP output for Bhitai Malli
              </span>
              <ul className="flex flex-col gap-0.5 text-sm text-vikalp-text">
                <li>
                  Qualifying records within {live.hazard.scoringRadiusKm} km:{" "}
                  {live.hazard.qualifyingRecordCount}
                </li>
                {live.hazard.nearestContextualDistanceKm !== null && (
                  <li>Nearest contextual record: {live.hazard.nearestContextualDistanceKm} km away</li>
                )}
                <li>
                  Contextual records within {live.hazard.contextRadiusKm} km:{" "}
                  {live.hazard.contextualRecordCount}
                </li>
              </ul>
            </div>
          )}

          {record.id === "geoboundaries-adm2" && live.boundaryFeatureCount !== null && (
            <div className="flex flex-col gap-1.5 rounded-md border border-vikalp-border bg-vikalp-bg p-3.5">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-vikalp-text-secondary">
                Currently serving (live)
              </span>
              <span className="text-sm text-vikalp-text">
                {live.boundaryFeatureCount} district features rendered on the map.
              </span>
            </div>
          )}

          {record.id === "bhitai-malli-demo-inputs" && live.settlement && (
            <div className="flex flex-col gap-1.5 rounded-md border border-vikalp-border bg-vikalp-bg p-3.5">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-vikalp-text-secondary">
                Current values (live)
              </span>
              <ul className="flex flex-col gap-0.5 text-sm text-vikalp-text">
                <li>Population: {live.settlement.population}</li>
                <li>Households: {live.settlement.households}</li>
                <li>Elevation: {live.settlement.elevationM} m</li>
                <li>Planning/database slope: {live.settlement.slopeDegrees}°</li>
              </ul>
            </div>
          )}

          {record.limitations.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-vikalp-text-secondary">
                Limitation
              </span>
              <ul className="flex flex-col gap-1.5 text-[13px] leading-relaxed text-vikalp-text-secondary">
                {record.limitations.map((limitation) => (
                  <li key={limitation}>{limitation}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ))}

      <button
        type="button"
        onClick={onExplainWithCopilot}
        className="self-start rounded-md border border-vikalp-border px-3 py-1.5 text-[13px] font-medium text-vikalp-navy transition-colors hover:border-vikalp-warning hover:bg-vikalp-warning/10"
      >
        Explain this evidence →
      </button>
    </Drawer>
  );
}
