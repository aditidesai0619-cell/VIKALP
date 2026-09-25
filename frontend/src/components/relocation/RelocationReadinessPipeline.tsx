import type { ReadinessStage, ReadinessState } from "./readinessStages";

const STATE_LABEL: Record<ReadinessState, string> = {
  available: "Available",
  "review-required": "Review Required",
  blocked: "Blocked",
  unavailable: "Unavailable",
  "not-assessed": "Not Assessed",
};

// Same restrained semantic palette as the Evidence workspace's
// category matrix (Task 45.8) — teal/blue for available, amber for
// review required, muted grey for unavailable, muted purple for
// blocked, muted slate for not-assessed. No bright red/green (no
// approved relocation risk classification exists).
const STATE_TONE: Record<ReadinessState, string> = {
  available: "border-[#4c8ba8]/40 bg-[#4c8ba8]/10 text-[#7cb3cc]",
  "review-required": "border-vikalp-warning/40 bg-vikalp-warning/10 text-vikalp-warning",
  blocked: "border-[#8a7ca8]/40 bg-[#8a7ca8]/10 text-[#b0a4c8]",
  unavailable: "border-vikalp-border bg-vikalp-bg text-vikalp-text-secondary",
  "not-assessed": "border-[#5c7a94]/40 bg-[#5c7a94]/10 text-[#8fb0c8]",
};

const STATE_MARK: Record<ReadinessState, string> = {
  available: "✓",
  "review-required": "•",
  blocked: "—",
  unavailable: "—",
  "not-assessed": "—",
};

// Task 45.9 §11 — a large visual pipeline, shared by Destination
// Explorer and the Relocation Planner (brief §20: "combine duplicated
// presentation where appropriate" — this replaces both pages' own,
// different, narrower "step tracker" implementations). No numeric
// score anywhere; every stage's state is read from real data (see
// readinessStages.ts), never invented.
export function RelocationReadinessPipeline({ stages }: { stages: ReadinessStage[] }) {
  return (
    <div className="flex flex-col gap-3 rounded-vikalp-card border border-vikalp-border bg-vikalp-card p-5">
      <h2 className="text-lg font-semibold text-vikalp-navy">Relocation Readiness</h2>
      <div className="flex flex-col gap-2 lg:flex-row lg:items-stretch lg:gap-0">
        {stages.map((stage, index) => (
          <div key={stage.id} className="flex items-center gap-2 lg:flex-1">
            <div className="flex flex-1 flex-col gap-1.5 rounded-md border border-vikalp-border bg-vikalp-bg px-3.5 py-3">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-vikalp-text-secondary">
                {stage.label}
              </span>
              <span
                className={`inline-flex w-fit items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${STATE_TONE[stage.state]}`}
              >
                {STATE_MARK[stage.state]} {STATE_LABEL[stage.state]}
              </span>
              <span className="text-[13px] text-vikalp-text">{stage.detail}</span>
            </div>
            {index < stages.length - 1 && (
              <span aria-hidden="true" className="hidden shrink-0 px-1 text-lg text-vikalp-text-secondary lg:block">
                →
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
