import type { RiskRequestState } from "../../types/risk";
import { OverviewCard } from "./OverviewCard";

function EvidenceItem({ label, value, tone }: { label: string; value: string; tone: "safe" | "warning" | "neutral" }) {
  const dotClass =
    tone === "safe" ? "bg-vikalp-safe" : tone === "warning" ? "bg-vikalp-warning" : "bg-vikalp-text-secondary";
  return (
    <div className="flex flex-col gap-1">
      <span className="flex items-center gap-1.5 text-[12px] text-vikalp-text-secondary">
        <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} aria-hidden="true" />
        {label}
      </span>
      <span className="text-[15px] font-medium text-vikalp-text">{value}</span>
    </div>
  );
}

// Task 44 — every figure here is read directly from the real risk
// assessment's own dimension records (GET /api/settlements/{id}/risk,
// same data Risk Analysis and Map Intelligence already show) — this
// card never computes a state-level aggregate the backend doesn't
// support (task §15's own instruction: show "Available at settlement
// level" rather than inventing one). Since VIKALP has exactly one
// settlement today, "settlement level" and "what this card shows" are
// the same real numbers.
export function KeyEvidenceSummaryCard({
  state,
  onClickReview,
  bare,
}: {
  state: RiskRequestState;
  onClickReview?: () => void;
  bare?: boolean;
}) {
  if (state.status === "loading") {
    return (
      <OverviewCard icon="▤" title="Key Evidence Summary" bare={bare}>
        <span className="text-[13px] text-vikalp-text-secondary">Loading…</span>
      </OverviewCard>
    );
  }

  if (state.status === "error") {
    return (
      <OverviewCard icon="▤" title="Key Evidence Summary" bare={bare}>
        <span className="text-[13px] text-vikalp-critical">{state.message}</span>
      </OverviewCard>
    );
  }

  const { dimensions } = state.assessment;
  const hazard = dimensions.find((d) => d.dimension === "Hazard Exposure");
  const hazardDetail = hazard?.hazard_exposure_detail ?? null;
  const terrain = dimensions.find((d) => d.dimension === "Terrain / Physical Susceptibility");
  const population = dimensions.find((d) => d.dimension === "Population / Household Exposure");
  const missingCount = dimensions.filter((d) => d.status === "no_data").length;
  const unscoredCount = dimensions.filter((d) => d.score === null).length;

  return (
    <OverviewCard icon="▤" title="Key Evidence Summary" bare={bare}>
      <div className="grid grid-cols-2 gap-3">
        <EvidenceItem
          label="Landslide Evidence"
          value={
            hazardDetail
              ? `${hazardDetail.qualifying_record_count} qualifying (${hazardDetail.scoring_radius_km} km)`
              : "Available at settlement level"
          }
          tone="warning"
        />
        <EvidenceItem
          label="Terrain Evidence"
          value={terrain && terrain.evidence.length > 0 ? "Available" : "Not available"}
          tone={terrain && terrain.evidence.length > 0 ? "safe" : "neutral"}
        />
        <EvidenceItem
          label="Population Evidence"
          value={population && population.evidence.length > 0 ? "Available" : "Not available"}
          tone={population && population.evidence.length > 0 ? "safe" : "neutral"}
        />
        <EvidenceItem
          label="Missing Evidence"
          value={`${missingCount} categor${missingCount === 1 ? "y" : "ies"}`}
          tone={missingCount > 0 ? "warning" : "safe"}
        />
      </div>

      {unscoredCount > 0 && (
        <button
          type="button"
          onClick={onClickReview}
          disabled={!onClickReview}
          className="flex items-center justify-between rounded-md border border-vikalp-warning/30 bg-vikalp-warning/10 px-3 py-2 text-[13px] font-medium text-vikalp-warning transition-colors hover:bg-vikalp-warning/20 disabled:cursor-default"
        >
          <span>
            {unscoredCount} item{unscoredCount === 1 ? "" : "s"} need review
          </span>
          {onClickReview && <span aria-hidden="true">→</span>}
        </button>
      )}
    </OverviewCard>
  );
}
