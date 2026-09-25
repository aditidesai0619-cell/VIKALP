import { HistoricalReplayBanner } from "../historical-replay/HistoricalReplayBanner";
import { TemporalClassBadge } from "../historical-replay/TemporalClassBadge";
import type { TemporalClass } from "../../data/historicalReplay";

// Task — Historical Replay for the Risk workspace, expanded from the
// earlier single-panel "Historical Replay unavailable" state (see
// docs/DECISIONS.md's prior Task entry for the audit that first
// established no verified event-specific historical data exists). This
// master task asks for something more specific than a blanket
// unavailable message: per-dimension EVIDENCE review, still with zero
// fabricated scores. Governance basis for that split (brief §5.3): a
// numeric historical score requires (1) approved historical scoring
// logic, (2) genuinely existing historical data, AND (3) governance
// approval for the calculation — none of VIKALP's five risk dimensions
// meet all three today. Hazard Exposure has a working CURRENT scoring
// rule (backend/app/services/hazard_exposure.py), but no governance
// decision has ever approved reusing it under a "historical" label, so
// even that dimension shows evidence only, never a relabeled score.
interface DimensionEvidence {
  dimension: string;
  temporalClass: TemporalClass;
  hasEvidence: boolean;
  source: string | null;
  coverage: string | null;
  limitation: string;
  scoreMessage: string;
}

const DIMENSIONS: DimensionEvidence[] = [
  {
    dimension: "Terrain / Physical Susceptibility",
    temporalClass: "current-data",
    hasEvidence: true,
    source: "CartoDEM v3 R1 (NRSC/ISRO)",
    coverage: "Partial Pauri Garhwal clip",
    limitation: "Stored and CartoDEM-derived slope values disagree and remain unreconciled (disclosed, not resolved).",
    scoreMessage: "Evidence available for officer review; no governed historical score calculated.",
  },
  {
    dimension: "Hazard Exposure",
    temporalClass: "historical-record",
    hasEvidence: true,
    source: "GSI/NLFC landslide inventory",
    coverage: "Pauri Garhwal district",
    limitation: "Location verified; occurrence date confirmed for only 19.2% of records, and that field's meaning is itself unresolved.",
    scoreMessage: "Evidence available for officer review; no governed historical score calculated.",
  },
  {
    dimension: "Historical Disaster Evidence",
    temporalClass: "unavailable",
    hasEvidence: false,
    source: null,
    coverage: null,
    limitation: "Verified impact record not integrated.",
    scoreMessage: "Historical assessment pending — approved scoring evidence incomplete.",
  },
  {
    dimension: "Population / Household Exposure",
    temporalClass: "current-data",
    hasEvidence: true,
    source: "VIKALP pilot planning input (uncited)",
    coverage: "Bhitai Malli, Pauri Garhwal",
    limitation: "Current demo planning figure, not tied to any census year or historical date.",
    scoreMessage: "Evidence available for officer review; no governed historical score calculated.",
  },
  {
    dimension: "Vulnerability",
    temporalClass: "unavailable",
    hasEvidence: false,
    source: null,
    coverage: null,
    limitation: "No vulnerability dataset (socioeconomic, structural, or demographic) is integrated.",
    scoreMessage: "Historical assessment pending — approved scoring evidence incomplete.",
  },
];

const PATHWAYS: {
  name: string;
  summary: string;
  requiredEvidence: string[];
  unknown: string[];
}[] = [
  {
    name: "Protect",
    summary: "Existing settlement remains in place with protective measures.",
    requiredEvidence: ["Terrain stability", "Hazard exposure", "Infrastructure protection feasibility"],
    unknown: ["Cost/feasibility of protective works", "Whether protection would have addressed the actual hazard mechanism"],
  },
  {
    name: "Adapt",
    summary: "Settlement remains, with changes to reduce exposure (e.g. structural, land-use, or access changes).",
    requiredEvidence: ["Vulnerability evidence", "Infrastructure & access evidence", "Hazard exposure"],
    unknown: ["What adaptation measures were feasible for this settlement", "Whether adaptation would have been sufficient"],
  },
  {
    name: "Relocate",
    summary: "Settlement moves to an alternate, government-curated site.",
    requiredEvidence: ["A verified destination candidate", "Carrying capacity evidence", "Access/route evidence"],
    unknown: ["Whether any destination candidate was ever evaluated historically", "Capacity or suitability of any alternate site"],
  },
];

export function HistoricalRiskView() {
  return (
    <div className="flex flex-col gap-4">
      <HistoricalReplayBanner />

      <div className="rounded-md border border-vikalp-border bg-vikalp-bg px-3 py-2.5 text-xs text-vikalp-text-secondary">
        This view answers <span className="font-medium text-vikalp-text">"What did the available evidence
        indicate?"</span> — not "what would VIKALP have predicted?" No dimension below is scored unless
        approved historical scoring logic, genuinely existing historical data, and governance approval all
        exist together; none currently do.
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-vikalp-navy">Risk dimensions — evidence review</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {DIMENSIONS.map((d) => (
            <div
              key={d.dimension}
              className="flex flex-col gap-1.5 rounded-vikalp-card border border-vikalp-border bg-vikalp-card p-3.5"
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-vikalp-text">{d.dimension}</h3>
                <TemporalClassBadge temporalClass={d.temporalClass} />
              </div>
              <span className="text-[11px] font-medium text-vikalp-text-secondary">
                {d.hasEvidence ? "Evidence available" : "No evidence available"}
              </span>
              {d.hasEvidence && (
                <div className="flex flex-col gap-0.5 text-[11px] text-vikalp-text-secondary">
                  <span>Source: {d.source}</span>
                  <span>Coverage: {d.coverage}</span>
                </div>
              )}
              <span className="border-t border-vikalp-border pt-1.5 text-[11px] text-vikalp-text-secondary">
                Limitation: {d.limitation}
              </span>
              <span className="text-[11px] font-medium text-vikalp-warning">{d.scoreMessage}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2 rounded-vikalp-card border border-vikalp-border bg-vikalp-card p-4">
        <h2 className="text-sm font-semibold text-vikalp-navy">Observed historical evidence</h2>
        <ul className="flex flex-col gap-1 text-xs text-vikalp-text">
          <li>• Terrain and settlement location data exist for this area, usable as physical/spatial reference.</li>
          <li>
            • The GSI/NLFC landslide inventory records real, field-verified landslide locations in this
            district, though most records do not carry a confirmed occurrence date.
          </li>
          <li>
            • No verified historical rainfall, casualty, damage, or named-event record exists for this
            location.
          </li>
        </ul>
        <p className="text-xs text-vikalp-text-secondary">
          This historical replay shows how available evidence could have been assembled for officer review.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-vikalp-navy">Decision pathways — neutral, officer review required</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {PATHWAYS.map((p) => (
            <div
              key={p.name}
              className="flex flex-col gap-2 rounded-vikalp-card border border-vikalp-border bg-vikalp-card p-3.5"
            >
              <h3 className="text-sm font-semibold text-vikalp-navy">{p.name}</h3>
              <p className="text-xs text-vikalp-text">{p.summary}</p>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-vikalp-text-secondary">
                  Required evidence
                </span>
                <ul className="flex flex-col gap-0.5 text-[11px] text-vikalp-text-secondary">
                  {p.requiredEvidence.map((e) => (
                    <li key={e}>• {e}</li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-vikalp-text-secondary">
                  Remains unknown
                </span>
                <ul className="flex flex-col gap-0.5 text-[11px] text-vikalp-text-secondary">
                  {p.unknown.map((e) => (
                    <li key={e}>• {e}</li>
                  ))}
                </ul>
              </div>
              <span className="mt-1 self-start rounded-full border border-vikalp-border bg-vikalp-bg px-2 py-0.5 text-[10px] font-medium text-vikalp-text-secondary">
                Officer review required
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-md border border-vikalp-border bg-vikalp-bg px-3 py-2.5 text-xs text-vikalp-text-secondary">
        <span className="font-medium text-vikalp-text">Counterfactual demonstration. </span>
        This replay reconstructs the evidence workflow using verified historical records. It demonstrates
        how VIKALP could have supported structured officer review if the platform had been available during
        the historical period.
      </div>
    </div>
  );
}
