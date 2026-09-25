import { SparkleIcon } from "../common/icons";

// Small, contextual — never a giant panel (brief §12). Copilot only
// explains verified VIKALP evidence; it must never calculate risk,
// invent historical facts, or recommend relocation — enforced by
// services/copilot.py, unchanged by this task.
export function EvidenceCopilotChip({ onClick }: { onClick: () => void }) {
  return (
    <div className="flex flex-col gap-2 rounded-vikalp-card border border-vikalp-border bg-vikalp-card p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-vikalp-text">
        <SparkleIcon className="h-4 w-4 text-vikalp-navy" />
        Ask VIKALP
      </div>
      <p className="text-[13px] text-vikalp-text-secondary">"Why is this evidence important?"</p>
      <button
        type="button"
        onClick={onClick}
        className="self-start rounded-md border border-vikalp-border px-3 py-1.5 text-[13px] font-medium text-vikalp-navy transition-colors hover:border-vikalp-warning hover:bg-vikalp-warning/10"
      >
        Explain this evidence →
      </button>
    </div>
  );
}
