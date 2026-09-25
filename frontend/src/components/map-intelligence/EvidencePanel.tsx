import { Badge } from "../common/Badge";
import { formatStatusLabel } from "../../utils/formatStatus";
import { statusTone } from "../../utils/statusTone";
import type { ApiSettlement } from "../../types/settlement";
import type { RiskRequestState } from "../../types/risk";

// Same disclosed-not-resolved static fact used by report.py (Task 34)
// and services/copilot.py (Task 37) — not recalculated here, this page
// only displays it. See docs/DECISIONS.md Task 15/27.
const CARTODEM_DERIVED_SLOPE_DEGREES = 22.58;

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5 border-b border-vikalp-border pb-3 last:border-b-0 last:pb-0">
      <h3 className="text-[12px] font-semibold uppercase tracking-wide text-vikalp-text-secondary">
        {title}
      </h3>
      {children}
    </div>
  );
}

export function EvidencePanel({
  settlement,
  riskState,
  onOpenEvidenceLocker,
}: {
  settlement: ApiSettlement | null;
  riskState: RiskRequestState;
  onOpenEvidenceLocker?: () => void;
}) {
  if (!settlement) {
    return (
      <div className="flex w-full shrink-0 flex-col gap-3 rounded-vikalp-card border border-vikalp-border bg-vikalp-card p-4 lg:w-96">
        <span className="text-[13px] text-vikalp-text-secondary">
          {riskState.status === "loading"
            ? "Loading evidence…"
            : "Evidence unavailable."}
        </span>
      </div>
    );
  }

  const hazard =
    riskState.status === "success"
      ? riskState.assessment.dimensions.find((d) => d.dimension === "Hazard Exposure")
          ?.hazard_exposure_detail ?? null
      : null;

  return (
    <div className="flex w-full shrink-0 flex-col gap-3 overflow-y-auto rounded-vikalp-card border border-vikalp-border bg-vikalp-card p-4 lg:w-96">
      <Section title="Settlement">
        <span className="text-sm font-semibold text-vikalp-navy">
          {settlement.name}
        </span>
        <span className="text-[13px] text-vikalp-text-secondary">
          {settlement.district}, {settlement.state}
        </span>
        <div className="mt-1 grid grid-cols-2 gap-2 text-[14px] text-vikalp-text">
          <span>Population: {settlement.population}</span>
          <span>Households: {settlement.households}</span>
        </div>
        <span className="text-[12px] text-vikalp-text-secondary">
          {settlement.data_note}
        </span>
      </Section>

      <Section title="Terrain">
        <div className="flex flex-col gap-0.5 text-[14px] text-vikalp-text">
          <span>Elevation: {settlement.elevation_m} m</span>
          <span>Planning/database slope value: {settlement.slope_degrees}°</span>
          <span>Derived DEM slope value: {CARTODEM_DERIVED_SLOPE_DEGREES}°</span>
        </div>
        <p className="mt-1 text-[13px] text-vikalp-text-secondary">
          These two slope values disagree and the discrepancy is disclosed,
          not resolved. VIKALP does not choose one as authoritative.
        </p>
      </Section>

      <Section title="Landslide evidence">
        {riskState.status === "loading" && (
          <span className="text-[13px] text-vikalp-text-secondary">
            Loading hazard evidence…
          </span>
        )}
        {riskState.status === "error" && (
          <span className="text-[13px] text-vikalp-critical">
            Evidence unavailable — {riskState.message}
          </span>
        )}
        {riskState.status === "success" && !hazard && (
          <span className="text-[13px] text-vikalp-text-secondary">
            Hazard exposure evidence unavailable for this settlement.
          </span>
        )}
        {riskState.status === "success" && hazard && (
          <>
            <div className="flex items-center gap-2">
              <Badge tone={statusTone("Assessment Pending")}>Assessment Pending</Badge>
              <span className="text-[12px] text-vikalp-text-secondary">
                {formatStatusLabel(hazard.status)}
              </span>
            </div>
            <div className="mt-1 flex flex-col gap-0.5 text-[14px] text-vikalp-text">
              <span>
                Qualifying records within {hazard.scoring_radius_km} km:{" "}
                {hazard.qualifying_record_count}
              </span>
              {hazard.nearest_contextual_distance_km !== null && (
                <span>
                  Nearest contextual record: {hazard.nearest_contextual_distance_km}{" "}
                  km away
                </span>
              )}
              <span>
                Contextual records within {hazard.context_radius_km} km:{" "}
                {hazard.contextual_record_count}
              </span>
            </div>
            <p className="mt-1.5 text-[13px] text-vikalp-text-secondary">
              No qualifying evidence was found within the current scoring
              radius from the available GSI/NLFC inventory. This does not
              establish absence of hazard.
            </p>
          </>
        )}
      </Section>

      <Section title="What this map does not establish">
        <ul className="flex flex-col gap-1 text-[13px] text-vikalp-text-secondary">
          <li>No overall risk score exists yet for this settlement.</li>
          <li>No destination or relocation recommendation is shown here.</li>
          <li>An absence of visible evidence is not evidence of safety.</li>
        </ul>
      </Section>

      <Section title="Source / provenance">
        <ul className="flex flex-col gap-1 text-[13px] text-vikalp-text-secondary">
          <li>Settlement: VIKALP demo planning input.</li>
          <li>Administrative boundary: geoBoundaries India ADM2 (ODbL 1.0).</li>
          <li>Landslide inventory: GSI / NLFC field-validated landslide inventory.</li>
          <li>Terrain: ISRO / NRSC / Bhuvan CartoDEM v3 R1.</li>
          <li>Derived slope: VIKALP-derived GIS calculation from CartoDEM.</li>
        </ul>
      </Section>

      {onOpenEvidenceLocker && (
        <button
          type="button"
          onClick={onOpenEvidenceLocker}
          className="rounded-md border border-vikalp-border px-3 py-1.5 text-[14px] font-medium text-vikalp-navy transition-colors hover:border-vikalp-warning hover:bg-vikalp-warning/10"
        >
          Open Evidence Locker →
        </button>
      )}
    </div>
  );
}
