import { TargetIcon } from "../common/icons";

export type EvidenceRadiusSelection = 1 | 5 | null;

// Compact spatial evidence control (brief §12): [ 1 km ] [ 5 km ]. A
// pure display/query-visualization toggle — selecting a radius never
// changes the underlying GSI dataset, only which real, already-
// computed Hazard Exposure proximity numbers get visually highlighted
// on the map (a ring + which existing tile features fall inside it).
export function EvidenceRadiusControl({
  selection,
  onChange,
}: {
  selection: EvidenceRadiusSelection;
  onChange: (value: EvidenceRadiusSelection) => void;
}) {
  const buttonClass = (active: boolean) =>
    `rounded px-2.5 py-1.5 text-[13px] font-medium transition-colors ${
      active ? "bg-vikalp-navy/20 text-vikalp-navy" : "text-vikalp-text-secondary hover:bg-vikalp-bg"
    }`;

  return (
    <div className="flex items-center gap-1 rounded-md border border-vikalp-border bg-vikalp-card/95 p-1">
      <TargetIcon className="ml-1 h-4 w-4 text-vikalp-text-secondary" />
      <button type="button" className={buttonClass(selection === 1)} onClick={() => onChange(selection === 1 ? null : 1)}>
        1 km
      </button>
      <button type="button" className={buttonClass(selection === 5)} onClick={() => onChange(selection === 5 ? null : 5)}>
        5 km
      </button>
    </div>
  );
}
