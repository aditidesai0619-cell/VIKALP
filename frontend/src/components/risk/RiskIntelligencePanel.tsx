import { useState } from "react";
import { Badge } from "../common/Badge";
import { AlertTriangleIcon, HomeIcon, LayersIcon, UsersIcon } from "../common/icons";
import { formatStatusLabel } from "../../utils/formatStatus";
import { statusTone } from "../../utils/statusTone";
import type { ApiSettlement } from "../../types/settlement";
import type { ApiRiskAssessment, ApiRiskDimension } from "../../types/risk";

// Risk Analysis workspace redesign — right intelligence column. Every
// number here comes straight from the real GET /api/settlements/{id}/risk
// and GET /api/settlements response already fetched by RiskAnalysisPage;
// nothing is computed against a scoring model VIKALP hasn't approved.
// See docs/DECISIONS.md — no dimension currently has an approved
// scoring rule + sufficient evidence together, so overall_score and
// risk_level are always null today. That fact drives every choice
// below: metric cards describe EVIDENCE coverage, not a risk verdict.

const CARTODEM_DERIVED_SLOPE_DEGREES = 22.58;

function MetricCard({
  icon,
  value,
  label,
  sublabel,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  sublabel?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-vikalp-card border border-vikalp-border bg-vikalp-card p-3">
      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-vikalp-navy/10 text-vikalp-navy">
        {icon}
      </div>
      <span className="text-xl font-semibold text-vikalp-text">{value}</span>
      <span className="text-[11px] font-medium text-vikalp-text-secondary">{label}</span>
      {sublabel && <span className="text-[10px] text-vikalp-text-secondary">{sublabel}</span>}
    </div>
  );
}

function RiskOverviewCards({
  assessment,
  settlementsCount,
  population,
}: {
  assessment: ApiRiskAssessment;
  settlementsCount: number;
  population: number | null;
}) {
  const evidenceDimensions = assessment.dimensions.filter((d) => {
    if (d.evidence.length > 0) return true;
    const detail = d.hazard_exposure_detail;
    return !!detail && detail.contextual_record_count > 0;
  }).length;

  const hazard = assessment.dimensions.find((d) => d.dimension === "Hazard Exposure");
  const hazardRecords = hazard?.hazard_exposure_detail?.contextual_record_count ?? 0;

  return (
    <div>
      <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-vikalp-text-secondary">
        Risk Overview
      </h2>
      <div className="grid grid-cols-2 gap-2.5">
        <MetricCard
          icon={<LayersIcon className="h-4 w-4" />}
          value={`${evidenceDimensions} / ${assessment.dimensions.length}`}
          label="Evidence dimensions available"
        />
        <MetricCard
          icon={<AlertTriangleIcon className="h-4 w-4" />}
          value={String(hazardRecords)}
          label="GSI landslide records"
          sublabel={hazard?.hazard_exposure_detail ? `within ${hazard.hazard_exposure_detail.context_radius_km} km` : undefined}
        />
        <MetricCard
          icon={<HomeIcon className="h-4 w-4" />}
          value={String(settlementsCount)}
          label="Settlements assessed"
          sublabel="Pilot dataset"
        />
        <MetricCard
          icon={<UsersIcon className="h-4 w-4" />}
          value={population !== null ? String(population) : "—"}
          label="Population covered"
        />
      </div>
    </div>
  );
}

// §7 — only one hazard category (landslide, via the GSI/NLFC inventory)
// has any real evidence at all; flood/cloudburst/coastal-erosion have
// none. A multi-slice donut implying a real distribution across
// categories would misrepresent that, so this renders a single real
// segment (or an empty ring when even that is zero) plus an explicit
// per-category list instead of invented percentages.
function HazardEvidenceChart({ dimensions }: { dimensions: ApiRiskDimension[] }) {
  const hazard = dimensions.find((d) => d.dimension === "Hazard Exposure");
  const records = hazard?.hazard_exposure_detail?.contextual_record_count ?? 0;
  const hasRecords = records > 0;

  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const dash = hasRecords ? circumference : 0;

  const categories = [
    { label: "Landslide (GSI/NLFC)", status: hasRecords ? `${records} records` : "No records", color: "#a8822f", on: hasRecords },
    { label: "Flood", status: "Not integrated", color: "#2a2823", on: false },
    { label: "Cloudburst", status: "Not integrated", color: "#2a2823", on: false },
    { label: "Coastal erosion", status: "Not applicable", color: "#2a2823", on: false },
  ];

  return (
    <div>
      <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-vikalp-text-secondary">
        Evidence by Hazard Category
      </h2>
      <div className="flex items-center gap-4 rounded-vikalp-card border border-vikalp-border bg-vikalp-card p-3">
        <svg width="84" height="84" viewBox="0 0 84 84" className="shrink-0">
          <circle cx="42" cy="42" r={radius} fill="none" stroke="#2a2823" strokeWidth="10" />
          {hasRecords && (
            <circle
              cx="42"
              cy="42"
              r={radius}
              fill="none"
              stroke="#a8822f"
              strokeWidth="10"
              strokeDasharray={`${dash} ${circumference}`}
              strokeLinecap="round"
              transform="rotate(-90 42 42)"
            />
          )}
          <text x="42" y="39" textAnchor="middle" className="fill-vikalp-text text-[15px] font-semibold">
            {records}
          </text>
          <text x="42" y="52" textAnchor="middle" className="fill-vikalp-text-secondary text-[8px]">
            records
          </text>
        </svg>
        <div className="flex flex-1 flex-col gap-1">
          {categories.map((c) => (
            <div key={c.label} className="flex items-center justify-between gap-2 text-[11px]">
              <span className="flex items-center gap-1.5 text-vikalp-text-secondary">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: c.color, opacity: c.on ? 1 : 0.5 }}
                />
                {c.label}
              </span>
              <span className={c.on ? "font-medium text-vikalp-text" : "text-vikalp-text-secondary"}>
                {c.status}
              </span>
            </div>
          ))}
        </div>
      </div>
      <p className="mt-1.5 text-[10px] text-vikalp-text-secondary">
        1 of 4 hazard categories has verified evidence in this pilot. This is not a percentage
        distribution across hazards — only landslide has any mapped records.
      </p>
    </div>
  );
}

function SettlementEvidenceTable({
  settlement,
  assessment,
}: {
  settlement: ApiSettlement;
  assessment: ApiRiskAssessment;
}) {
  const hazard = assessment.dimensions.find((d) => d.dimension === "Hazard Exposure");
  const detail = hazard?.hazard_exposure_detail ?? null;

  return (
    <div>
      <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-vikalp-text-secondary">
        Settlement Evidence Summary
      </h2>
      <div className="overflow-hidden rounded-vikalp-card border border-vikalp-border">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b border-vikalp-border bg-vikalp-bg text-vikalp-text-secondary">
              <th className="px-2 py-1.5 text-left font-medium">#</th>
              <th className="px-2 py-1.5 text-left font-medium">Settlement</th>
              <th className="px-2 py-1.5 text-left font-medium">Hazard evidence</th>
              <th className="px-2 py-1.5 text-left font-medium">Status</th>
              <th className="px-2 py-1.5 text-right font-medium">Population</th>
            </tr>
          </thead>
          <tbody>
            <tr className="text-vikalp-text">
              <td className="px-2 py-1.5">1</td>
              <td className="px-2 py-1.5 font-semibold text-vikalp-navy">{settlement.name}</td>
              <td className="px-2 py-1.5">
                {detail ? `${detail.contextual_record_count} GSI records (${detail.context_radius_km} km)` : "No evidence"}
              </td>
              <td className="px-2 py-1.5">
                <Badge tone={statusTone("Evidence under review")}>Evidence under review</Badge>
              </td>
              <td className="px-2 py-1.5 text-right">{settlement.population}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <span className="mt-1 block text-[10px] text-vikalp-text-secondary">
        Single-settlement pilot dataset — no comparative ranking exists across settlements.
      </span>
    </div>
  );
}

function KeyInsightCard({
  settlement,
  assessment,
}: {
  settlement: ApiSettlement;
  assessment: ApiRiskAssessment;
}) {
  const hazard = assessment.dimensions.find((d) => d.dimension === "Hazard Exposure");
  const detail = hazard?.hazard_exposure_detail ?? null;
  const noDataDimensions = assessment.dimensions.filter((d) => d.status === "no_data");

  return (
    <div>
      <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-vikalp-text-secondary">
        Key Insight
      </h2>
      <div className="flex flex-col gap-1.5 rounded-vikalp-card border border-vikalp-border bg-vikalp-card p-3 text-[11px] text-vikalp-text">
        {detail && (
          <p>
            {detail.contextual_record_count} GSI/NLFC landslide records exist within{" "}
            {detail.context_radius_km} km of {settlement.name}
            {detail.nearest_contextual_distance_km !== null &&
              ` (nearest ${detail.nearest_contextual_distance_km} km away)`}
            . None fall within the {detail.scoring_radius_km} km scoring radius, so Hazard
            Exposure currently shows no qualifying evidence — this does not establish the
            settlement is safe from landslide hazard.
          </p>
        )}
        <p>
          Elevation is {settlement.elevation_m} m. The stored slope value ({settlement.slope_degrees}°)
          and the CartoDEM-derived slope ({CARTODEM_DERIVED_SLOPE_DEGREES}°) disagree and remain
          unreconciled.
        </p>
        <p>
          Population/household exposure: {settlement.population} people across{" "}
          {settlement.households} households.
        </p>
        {noDataDimensions.length > 0 && (
          <p className="text-vikalp-text-secondary">
            {noDataDimensions.length} of {assessment.dimensions.length} risk dimensions
            ({noDataDimensions.map((d) => d.dimension).join(", ")}) have no integrated evidence
            at all — no overall risk score can be produced until they do.
          </p>
        )}
        <p className="border-t border-vikalp-border pt-1.5 text-vikalp-text-secondary">
          Evidence-oriented summary only — not a relocation recommendation. Officer review
          required.
        </p>
      </div>
    </div>
  );
}

function KeyEvidence({ dimension }: { dimension: ApiRiskDimension }) {
  if (dimension.dimension === "Hazard Exposure" && dimension.hazard_exposure_detail) {
    const h = dimension.hazard_exposure_detail;
    return (
      <div className="flex flex-wrap gap-3 text-xs text-vikalp-text">
        <span>{h.qualifying_record_count} qualifying</span>
        {h.nearest_contextual_distance_km !== null && (
          <span>{h.nearest_contextual_distance_km} km nearest</span>
        )}
        <span>{h.contextual_record_count} contextual</span>
      </div>
    );
  }

  if (dimension.dimension === "Terrain / Physical Susceptibility") {
    const elevation = dimension.evidence.find((e) => e.input === "elevation_m")?.value;
    const storedSlope = dimension.evidence.find((e) => e.input === "slope_degrees")?.value;
    if (elevation === undefined && storedSlope === undefined) {
      return <span className="text-xs text-vikalp-text-secondary">No evidence available.</span>;
    }
    return (
      <div className="flex flex-col gap-1 text-xs text-vikalp-text">
        <div className="flex flex-wrap gap-3">
          {elevation !== undefined && <span>{elevation} m elevation</span>}
          {storedSlope !== undefined && <span>{storedSlope}° stored slope</span>}
          <span>{CARTODEM_DERIVED_SLOPE_DEGREES}° derived slope</span>
        </div>
        <span className="flex items-center gap-1 text-[11px] font-medium text-vikalp-warning">
          ⚠ Stored and derived slope disagree — disclosed, not resolved.
        </span>
      </div>
    );
  }

  if (dimension.evidence.length === 0) {
    return <span className="text-xs text-vikalp-text-secondary">No evidence available yet.</span>;
  }

  return (
    <div className="flex flex-wrap gap-3 text-xs text-vikalp-text">
      {dimension.evidence.map((item) => (
        <span key={item.input}>
          {item.value} {item.input.replace(/_/g, " ")}
        </span>
      ))}
    </div>
  );
}

function DimensionCard({ dimension }: { dimension: ApiRiskDimension }) {
  const [expanded, setExpanded] = useState(false);
  const hasEvidence = dimension.evidence.length > 0;

  return (
    <div className="flex flex-col gap-2 rounded-vikalp-card border border-vikalp-border bg-vikalp-card p-3.5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[13px] font-semibold text-vikalp-navy">{dimension.dimension}</h3>
        <Badge tone="neutral">{Math.round(dimension.weight * 100)}%</Badge>
      </div>

      <span className="text-[11px] font-medium text-vikalp-text-secondary">
        {hasEvidence ? "Evidence available" : "No evidence available"}
      </span>

      <KeyEvidence dimension={dimension} />

      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] text-vikalp-text-secondary">
          Score:{" "}
          <span className="font-medium text-vikalp-text">
            {dimension.score !== null ? dimension.score : "Pending"}
          </span>
        </span>
        <Badge tone={statusTone(formatStatusLabel(dimension.status))}>{formatStatusLabel(dimension.status)}</Badge>
      </div>

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="self-start text-[11px] font-medium text-vikalp-navy underline decoration-vikalp-warning underline-offset-2"
      >
        {expanded ? "Hide details" : "View details"}
      </button>

      {expanded && (
        <div className="flex flex-col gap-2 border-t border-vikalp-border pt-2">
          {dimension.missing_inputs.length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-medium text-vikalp-text-secondary">
                Missing inputs
              </span>
              <ul className="flex flex-wrap gap-1">
                {dimension.missing_inputs.map((input) => (
                  <li
                    key={input}
                    className="rounded-full border border-vikalp-border bg-vikalp-bg px-2 py-0.5 text-[10px] text-vikalp-text-secondary"
                  >
                    {input}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <span className="text-[10px] text-vikalp-text-secondary">{dimension.rule_reference}</span>
        </div>
      )}
    </div>
  );
}

export function RiskIntelligencePanel({
  settlement,
  settlements,
  assessment,
}: {
  settlement: ApiSettlement | null;
  settlements: ApiSettlement[];
  assessment: ApiRiskAssessment | null;
}) {
  if (!settlement || !assessment) {
    return (
      <div className="flex w-full shrink-0 flex-col gap-3 overflow-y-auto rounded-vikalp-card border border-vikalp-border bg-vikalp-card p-4 lg:w-96">
        <span className="text-xs text-vikalp-text-secondary">Loading risk intelligence…</span>
      </div>
    );
  }

  return (
    <div className="flex w-full shrink-0 flex-col gap-5 overflow-y-auto rounded-vikalp-card border border-vikalp-border bg-vikalp-card p-4 lg:w-96">
      <RiskOverviewCards
        assessment={assessment}
        settlementsCount={settlements.length}
        population={settlement.population}
      />
      <HazardEvidenceChart dimensions={assessment.dimensions} />
      <SettlementEvidenceTable settlement={settlement} assessment={assessment} />
      <KeyInsightCard settlement={settlement} assessment={assessment} />

      <div>
        <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-vikalp-text-secondary">
          Dimension Detail
        </h2>
        <div className="flex flex-col gap-2.5">
          {assessment.dimensions.map((dimension) => (
            <DimensionCard key={dimension.dimension} dimension={dimension} />
          ))}
        </div>
      </div>
    </div>
  );
}
