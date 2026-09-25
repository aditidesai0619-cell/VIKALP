import { useHistoricalReplay } from "../../state/historicalReplayContext";

// Shared Current Assessment / Historical Replay mode switch — the same
// compact two-button pattern each of the three workspaces uses, now
// reading/writing the shared HistoricalReplayContext (not local state)
// so the choice persists across Evidence/Risk/Destination & Relocation
// (brief §2).
export function HistoricalReplayToggle() {
  const { active, setActive } = useHistoricalReplay();

  const tabClass = (isActive: boolean) =>
    `rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
      isActive
        ? "border border-vikalp-navy/40 bg-vikalp-navy/15 text-vikalp-navy"
        : "border border-transparent text-vikalp-text-secondary hover:text-vikalp-text"
    }`;

  return (
    <div className="flex items-center gap-1 self-start rounded-md border border-vikalp-border bg-vikalp-bg p-1">
      <button type="button" className={tabClass(!active)} onClick={() => setActive(false)}>
        Current Assessment
      </button>
      <button type="button" className={tabClass(active)} onClick={() => setActive(true)}>
        Historical Replay
      </button>
    </div>
  );
}
