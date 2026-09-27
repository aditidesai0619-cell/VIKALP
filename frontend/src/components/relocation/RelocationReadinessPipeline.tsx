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
//
// A wrapping grid (not a forced single flex-row) — with 7-8 real
// stages, squeezing every one into a single row left each card too
// narrow to read at anything under a very wide viewport. Each stage
// keeps its own sequence number instead of an inter-card arrow, since
// arrows don't have a sensible position once cards wrap onto a new
// line.
export function RelocationReadinessPipeline({ stages }: { stages: ReadinessStage[] }) {
  return (
    <div className="flex flex-col gap-3 rounded-vikalp-card border border-vikalp-border bg-vikalp-card p-5">
      <h2 className="text-lg font-semibold text-vikalp-navy">Relocation Readiness</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4">
        {stages.map((stage, index) => (
          <div
            key={stage.id}
            className="flex flex-col gap-1.5 rounded-md border border-vikalp-border bg-vikalp-bg px-3.5 py-3"
          >
            <div className="flex items-center gap-1.5">
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-vikalp-border text-[10px] font-semibold text-vikalp-text-secondary">
                {index + 1}
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-wide text-vikalp-text-secondary">
                {stage.label}
              </span>
            </div>
            <span
              className={`inline-flex w-fit items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${STATE_TONE[stage.state]}`}
            >
              {STATE_MARK[stage.state]} {STATE_LABEL[stage.state]}
            </span>
            <span className="text-[13px] text-vikalp-text">{stage.detail}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
