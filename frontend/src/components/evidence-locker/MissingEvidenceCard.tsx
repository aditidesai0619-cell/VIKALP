import { CATEGORY_ICON_MAP } from "./EvidenceCategoryCard";
import { EVIDENCE_STATE_LABEL, EVIDENCE_STATE_TONE } from "../../data/evidenceCategories";
import type { EvidenceCategoryCardData } from "../../data/evidenceCategories";

// A deliberately distinct visual state for Blocked/Unavailable
// categories (brief §10/§18: "missing data should look intentional,
// not broken") — dashed border, muted, a clear status marker rather
// than a boring text card that reads like an error.
export function MissingEvidenceCard({
  data,
  onSelect,
}: {
  data: EvidenceCategoryCardData;
  onSelect: () => void;
}) {
  const Icon = CATEGORY_ICON_MAP[data.icon];

  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex flex-col gap-3 rounded-vikalp-card border border-dashed border-vikalp-border bg-vikalp-bg p-5 text-left transition-colors hover:border-vikalp-text-secondary"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-vikalp-border/30 text-vikalp-text-secondary">
            <Icon className="h-5 w-5" />
          </span>
          <h3 className="text-base font-semibold text-vikalp-text-secondary">{data.category}</h3>
        </div>
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${EVIDENCE_STATE_TONE[data.state]}`}
        >
          {EVIDENCE_STATE_LABEL[data.state]}
        </span>
      </div>

      <p className="text-sm text-vikalp-text-secondary">{data.limitation}</p>

      <span className="text-[13px] text-vikalp-text-secondary">
        No verified integrated dataset available for this category.
      </span>
    </button>
  );
}
