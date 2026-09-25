import type { EvidenceCategory, EvidenceRecord } from "../../types/evidence";
import { CATEGORY_LABEL } from "./categoryStyles";

const ORDER: EvidenceCategory[] = ["source-backed", "derived", "demo-input", "missing"];

const SEGMENT_COLOR: Record<EvidenceCategory, string> = {
  "source-backed": "#4caf87",
  derived: "#a8822f",
  "demo-input": "#d9b56a",
  missing: "#5c584a",
};

// Big-number metric strip + a real segmented-availability bar (brief
// §4/§7) — replaces the old EvidenceSummaryBar's small tiles. Counts
// are computed from the same EVIDENCE_RECORDS array as before, never
// invented; the bar's segment widths are those exact counts as a
// percentage of the total, nothing else.
export function EvidenceSnapshotStrip({ records }: { records: EvidenceRecord[] }) {
  const counts = records.reduce<Record<string, number>>((acc, record) => {
    acc[record.category] = (acc[record.category] ?? 0) + 1;
    return acc;
  }, {});
  const total = records.length;

  return (
    <div className="flex flex-col gap-4 rounded-vikalp-card border border-vikalp-border bg-vikalp-card p-5">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {ORDER.map((category) => (
          <div key={category} className="flex flex-col gap-0.5">
            <span className="text-4xl font-bold text-vikalp-text">{counts[category] ?? 0}</span>
            <span className="text-[13px] font-medium text-vikalp-text-secondary">
              {CATEGORY_LABEL[category]}
            </span>
          </div>
        ))}
      </div>

      <div className="flex h-3 w-full overflow-hidden rounded-full bg-vikalp-bg">
        {ORDER.map((category) => {
          const count = counts[category] ?? 0;
          if (count === 0) return null;
          return (
            <div
              key={category}
              style={{ width: `${(count / total) * 100}%`, backgroundColor: SEGMENT_COLOR[category] }}
              title={`${CATEGORY_LABEL[category]}: ${count}`}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-vikalp-text-secondary">
        {ORDER.map((category) => (
          <span key={category} className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: SEGMENT_COLOR[category] }}
              aria-hidden="true"
            />
            {CATEGORY_LABEL[category]}
          </span>
        ))}
      </div>
    </div>
  );
}
