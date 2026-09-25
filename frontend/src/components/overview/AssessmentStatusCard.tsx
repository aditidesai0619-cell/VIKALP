import type { CopilotContextRequestState } from "../../types/copilot";
import { formatStatusLabel } from "../../utils/formatStatus";
import { OverviewCard } from "./OverviewCard";

function StatusColumn({ label, value, pending }: { label: string; value: string; pending: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[12px] text-vikalp-text-secondary">{label}</span>
      <span className="flex items-center gap-1.5 text-[15px] font-medium text-vikalp-text">
        <span
          className={`h-1.5 w-1.5 rounded-full ${pending ? "bg-vikalp-warning" : "bg-vikalp-text-secondary"}`}
          aria-hidden="true"
        />
        {value}
      </span>
    </div>
  );
}

// Task 44 — real governance state for the 4 workflow stages, reusing
// the same copilot-context fetch (GET /api/settlements/{id}/copilot-
// context, Task 37) the old Task 43 bottom-row cards used, just in a
// compact 4-column layout instead of 4 separate cards. Destination and
// Relocation both read "Not available" — not "Pending" — since no
// candidate destination dataset exists at all yet (there is nothing
// pending to compute), matching the task's own §14 example exactly.
export function AssessmentStatusCard({
  state,
  bare,
}: {
  state: CopilotContextRequestState;
  bare?: boolean;
}) {
  if (state.status === "loading") {
    return (
      <OverviewCard icon="◷" title="Assessment Status" bare={bare}>
        <span className="text-[13px] text-vikalp-text-secondary">Loading…</span>
      </OverviewCard>
    );
  }

  if (state.status === "error") {
    return (
      <OverviewCard icon="◷" title="Assessment Status" bare={bare}>
        <span className="text-[13px] text-vikalp-critical">{state.message}</span>
      </OverviewCard>
    );
  }

  const { risk_assessment, decision_workspace, destinations } = state.context;
  const hasDestinationCandidates = destinations.candidates.length > 0;

  return (
    <OverviewCard icon="◷" title="Assessment Status" bare={bare}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatusColumn
          label="Risk"
          value={formatStatusLabel(risk_assessment.assessment_status)}
          pending={risk_assessment.assessment_status !== "complete"}
        />
        <StatusColumn
          label="Decision"
          value={formatStatusLabel(decision_workspace.decision_status)}
          pending={decision_workspace.decision_status !== "evaluated"}
        />
        <StatusColumn
          label="Destination"
          value={hasDestinationCandidates ? formatStatusLabel(destinations.analysis_status) : "Not available"}
          pending={hasDestinationCandidates}
        />
        <StatusColumn
          label="Relocation"
          value={hasDestinationCandidates ? "In Progress" : "Not available"}
          pending={hasDestinationCandidates}
        />
      </div>
    </OverviewCard>
  );
}
