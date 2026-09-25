// Task 44 §16 — compact, advisory-only entry point into the existing
// AI Copilot page (Task 37/41's deterministic context/explanation
// endpoints — no LLM, no independent ranking/approval). This card
// itself makes no request of its own; it only navigates.
export function OverviewCopilotCard({ onClick, bare }: { onClick: () => void; bare?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        bare
          ? "flex items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-vikalp-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vikalp-warning"
          : "flex items-center justify-between gap-3 rounded-vikalp-card border border-vikalp-border bg-vikalp-card p-4 text-left transition-colors hover:border-vikalp-warning focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vikalp-warning"
      }
    >
      <div className="flex items-center gap-2">
        <span className="text-vikalp-navy" aria-hidden="true">
          ✦
        </span>
        <div className="flex flex-col">
          <span className="text-[16px] font-semibold text-vikalp-text">Ask Copilot</span>
          <span className="text-[13px] text-vikalp-text-secondary">
            "What should I review next?"
          </span>
        </div>
      </div>
      <span className="text-vikalp-text-secondary" aria-hidden="true">
        →
      </span>
    </button>
  );
}
