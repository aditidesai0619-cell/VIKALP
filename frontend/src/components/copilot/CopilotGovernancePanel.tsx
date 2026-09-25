// Static governance disclosure (Task 41 §12) — not derived from any API
// response; describes the architecture itself, which does not change
// per settlement/request. Kept visible at all times, not hidden behind
// a toggle, since it's the core trust statement for this page.

const PIPELINE_STEPS = [
  "VIKALP collects verified evidence.",
  "Deterministic rules produce assessment outputs.",
  "Copilot receives only the approved assessment context.",
  "Copilot explains the available evidence.",
  "The officer remains the final decision-maker.",
];

const COPILOT_CANNOT = [
  "Calculate risk",
  "Override VIKALP rules",
  "Select destinations",
  "Approve relocation",
  "Issue government orders",
  "Invent missing evidence",
];

export function CopilotGovernancePanel() {
  return (
    <div className="flex flex-col gap-3 rounded-vikalp-card border border-vikalp-border bg-vikalp-card p-4">
      <div className="flex flex-col gap-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-wide text-vikalp-warning">
          How VIKALP Copilot works
        </h2>
        <ol className="flex flex-col gap-1 text-xs text-vikalp-text">
          {PIPELINE_STEPS.map((step, index) => (
            <li key={step} className="flex gap-2">
              <span className="font-semibold text-vikalp-navy">{index + 1}.</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="flex flex-col gap-2 border-t border-vikalp-border pt-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-wide text-vikalp-text-secondary">
          Copilot does not
        </h2>
        <ul className="grid grid-cols-1 gap-1 text-xs text-vikalp-text sm:grid-cols-2">
          {COPILOT_CANNOT.map((item) => (
            <li key={item} className="flex gap-1.5">
              <span aria-hidden="true" className="font-semibold text-vikalp-critical">
                ×
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
