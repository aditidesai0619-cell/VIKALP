// Visual historical timeline (brief §5) — BEFORE EVENT → EVENT PERIOD
// → AVAILABLE EVIDENCE → REVIEW. Only shown in Historical Replay mode.
// Dates are honestly "Not available" — no verified event date exists
// in this repository (see docs/DECISIONS.md for the full audit) — the
// brief's own required fallback text is used verbatim rather than
// inventing a chronology.
export function EvidenceTimeline({ evidenceAvailableCount, evidenceTotalCount }: {
  evidenceAvailableCount: number;
  evidenceTotalCount: number;
}) {
  const stages = [
    { label: "Before event", value: "Date-specific historical event timeline unavailable" },
    { label: "Event period", value: "Date-specific historical event timeline unavailable" },
    {
      label: "Available evidence",
      value: `${evidenceAvailableCount} of ${evidenceTotalCount} categories have real supporting data`,
    },
    { label: "Officer review", value: "Structured evidence review — no automatic conclusion" },
  ];

  return (
    <div className="flex flex-col gap-3 rounded-vikalp-card border border-vikalp-border bg-vikalp-card p-5">
      <h2 className="text-lg font-semibold text-vikalp-navy">Historical timeline</h2>
      <div className="flex flex-col gap-2 lg:flex-row lg:items-stretch lg:gap-0">
        {stages.map((stage, index) => (
          <div key={stage.label} className="flex items-center gap-2 lg:flex-1">
            <div className="flex flex-1 flex-col gap-1 rounded-md border border-vikalp-border bg-vikalp-bg px-3.5 py-3">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-vikalp-text-secondary">
                {stage.label}
              </span>
              <span className="text-sm text-vikalp-text">{stage.value}</span>
            </div>
            {index < stages.length - 1 && (
              <span aria-hidden="true" className="hidden shrink-0 text-lg text-vikalp-text-secondary lg:block">
                →
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
