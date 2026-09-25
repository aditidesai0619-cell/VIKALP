import { useState } from "react";
import { Badge } from "../common/Badge";
import { statusTone } from "../../utils/statusTone";
import type { ApiDecisionPathway } from "../../types/decision";

// Decision Workspace redesign — one pathway card, reused identically
// for Protect/Adapt/Relocate so all three carry equal visual weight
// (brief §6/§10: "do not visually imply that one pathway is
// preferred"). No pathway-specific accent color is used — every card
// shares the same neutral vikalp-navy/border treatment. The
// evidence-status pill uses the shared semantic status mapping
// (Available -> green, Limited -> amber, Not integrated -> grey) so
// it reads by MEANING, not as a uniform "everything is amber" wall —
// this still never implies one pathway is preferred over another,
// since the tone reflects evidence completeness, not desirability.

export interface PathwayEvidenceItem {
  label: string;
  value: string;
}

export function PathwayCard({
  icon,
  pathway,
  evidenceStatus,
  keyEvidence,
  constraints,
  selected,
  onSelect,
}: {
  icon: React.ReactNode;
  pathway: ApiDecisionPathway;
  evidenceStatus: "Available" | "Limited" | "Not integrated";
  keyEvidence: PathwayEvidenceItem[];
  constraints: string[];
  selected: boolean;
  onSelect: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`flex flex-col gap-4 rounded-vikalp-card border bg-vikalp-card p-6 transition-colors ${
        selected ? "border-vikalp-navy" : "border-vikalp-border"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-vikalp-navy/10 text-vikalp-navy">
            {icon}
          </div>
          <h3 className="text-lg font-semibold text-vikalp-navy">{pathway.pathway}</h3>
        </div>
        <Badge tone={statusTone(evidenceStatus)}>{evidenceStatus}</Badge>
      </div>

      <p className="text-base leading-snug text-vikalp-text">{pathway.definition}</p>

      {keyEvidence.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-vikalp-text-secondary">
            Key evidence
          </span>
          <ul className="flex flex-col gap-1.5">
            {keyEvidence.map((item) => (
              <li key={item.label} className="flex flex-wrap justify-between gap-2 text-sm text-vikalp-text">
                <span className="text-vikalp-text-secondary">{item.label}</span>
                <span className="text-right font-semibold">{item.value}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {pathway.action_categories.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-vikalp-text-secondary">
            Possible intervention areas
          </span>
          <ul className="flex flex-wrap gap-1.5">
            {pathway.action_categories.map((category) => (
              <li
                key={category}
                className="rounded-full border border-vikalp-border bg-vikalp-bg px-2.5 py-1 text-xs text-vikalp-text-secondary"
              >
                {category}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-xs text-vikalp-text-secondary">
          Not defined as a set of intervention categories — this pathway's evaluation depends on
          destination evidence instead (see Key evidence above).
        </p>
      )}

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="self-start text-sm font-medium text-vikalp-navy underline decoration-vikalp-warning underline-offset-2"
      >
        {expanded ? "Hide details" : "View details"}
      </button>

      {expanded && (
        <div className="flex flex-col gap-2 border-t border-vikalp-border pt-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-vikalp-text-secondary">
            Constraints / limitations
          </span>
          <ul className="flex flex-col gap-1 text-sm text-vikalp-text-secondary">
            {constraints.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </div>
      )}

      <button
        type="button"
        onClick={onSelect}
        className={`mt-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
          selected
            ? "border-vikalp-navy bg-vikalp-navy/10 text-vikalp-navy"
            : "border-vikalp-border text-vikalp-navy hover:border-vikalp-warning hover:bg-vikalp-warning/10"
        }`}
      >
        {selected ? "Selected for officer review" : "Select this pathway for review"}
      </button>
    </div>
  );
}
