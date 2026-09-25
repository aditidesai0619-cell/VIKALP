import type { ComponentType } from "react";
import {
  AlertTriangleIcon,
  ArchiveClockIcon,
  FlagIcon,
  HeartPulseIcon,
  MountainIcon,
  RoadIcon,
  UsersIcon,
} from "../common/icons";
import { MissingEvidenceCard } from "./MissingEvidenceCard";
import { EVIDENCE_STATE_LABEL, EVIDENCE_STATE_TONE } from "../../data/evidenceCategories";
import type { EvidenceCategoryCardData, EvidenceIconKey } from "../../data/evidenceCategories";

export const CATEGORY_ICON_MAP: Record<EvidenceIconKey, ComponentType<{ className?: string }>> = {
  terrain: MountainIcon,
  hazard: AlertTriangleIcon,
  historical: ArchiveClockIcon,
  population: UsersIcon,
  vulnerability: HeartPulseIcon,
  infrastructure: RoadIcon,
  destination: FlagIcon,
};

// Big visual card (Task 45.8 brief §9) — icon, category, one of the 5
// evidence STATES (Available/Review Required/Blocked/Unavailable —
// "Future" unused today, no real category fits it), 1-3 key facts as
// large numbers, source/coverage, limitation, click to open the
// drawer. Blocked/Unavailable categories render via MissingEvidenceCard
// instead (brief §18/§10: "missing data should look intentional, not
// broken" — a distinct visual treatment, not the same card dimmed).
export function EvidenceCategoryCard({
  data,
  onSelect,
}: {
  data: EvidenceCategoryCardData;
  onSelect: () => void;
}) {
  const hasEvidence = data.state === "available" || data.state === "review-required";
  if (!hasEvidence) {
    return <MissingEvidenceCard data={data} onSelect={onSelect} />;
  }

  const Icon = CATEGORY_ICON_MAP[data.icon];

  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex flex-col gap-3 rounded-vikalp-card border border-vikalp-border bg-vikalp-card p-5 text-left transition-colors hover:border-vikalp-navy/50 hover:bg-vikalp-card/80"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-vikalp-navy/10 text-vikalp-navy">
            <Icon className="h-5 w-5" />
          </span>
          <h3 className="text-base font-semibold text-vikalp-text">{data.category}</h3>
        </div>
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${EVIDENCE_STATE_TONE[data.state]}`}
        >
          {EVIDENCE_STATE_LABEL[data.state]}
        </span>
      </div>

      {data.keyFacts.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {data.keyFacts.slice(0, 4).map((fact) => (
            <div key={fact.label} className="flex flex-col">
              <span className="text-[13px] text-vikalp-text-secondary">{fact.label}</span>
              <span className="text-xl font-semibold text-vikalp-text">{fact.value}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-0.5 border-t border-vikalp-border pt-2.5 text-[13px] text-vikalp-text-secondary">
        <span>Source: {data.source}</span>
        {data.coverage && <span>Coverage: {data.coverage}</span>}
      </div>

      <p className="flex items-start gap-1.5 text-[13px] text-vikalp-warning">
        <AlertTriangleIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        {data.limitation}
      </p>
    </button>
  );
}
