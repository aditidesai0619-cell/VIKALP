import { TEMPORAL_CLASS_LABEL, type TemporalClass } from "../../data/historicalReplay";

export const TEMPORAL_CLASS_TONE: Record<TemporalClass, string> = {
  "historical-record": "border-vikalp-warning/40 bg-vikalp-warning/10 text-vikalp-warning",
  "current-data": "border-vikalp-border bg-vikalp-border/30 text-vikalp-text-secondary",
  "vikalp-derived": "border-vikalp-navy/40 bg-vikalp-navy/10 text-vikalp-navy",
  "scenario-output": "border-vikalp-navy/40 bg-vikalp-navy/10 text-vikalp-navy",
  unavailable: "border-vikalp-border bg-vikalp-bg text-vikalp-text-secondary",
};

// Every evidence item shown in Historical Replay carries one of these
// four labels (brief §3) so historical and current data are never
// silently mixed.
export function TemporalClassBadge({ temporalClass }: { temporalClass: TemporalClass }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${TEMPORAL_CLASS_TONE[temporalClass]}`}
    >
      {TEMPORAL_CLASS_LABEL[temporalClass]}
    </span>
  );
}
