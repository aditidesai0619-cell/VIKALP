import { HISTORICAL_REPLAY_EVENT } from "../../data/historicalReplay";

// Persistent archival banner + event context header — shown at the top
// of Evidence/Risk/Destination & Relocation whenever Historical Replay
// is active (brief §2). Event name/date are honestly `null` (see
// data/historicalReplay.ts for the audit behind that) — this always
// says so plainly rather than ever leaving those fields blank/implied.
export function HistoricalReplayBanner() {
  return (
    <div className="flex flex-col gap-2 rounded-vikalp-card border border-vikalp-warning/40 bg-vikalp-warning/10 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-vikalp-warning">
          Historical Replay — Archived evidence view. Not a current-risk assessment.
        </span>
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-vikalp-text-secondary sm:grid-cols-4">
        <span>
          <span className="text-vikalp-text-secondary">Event: </span>
          <span className="text-vikalp-text">{HISTORICAL_REPLAY_EVENT.name ?? "Not available"}</span>
        </span>
        <span>
          <span className="text-vikalp-text-secondary">Date/period: </span>
          <span className="text-vikalp-text">{HISTORICAL_REPLAY_EVENT.datePeriod ?? "Not available"}</span>
        </span>
        <span className="sm:col-span-2">
          <span className="text-vikalp-text-secondary">Data coverage: </span>
          <span className="text-vikalp-text">{HISTORICAL_REPLAY_EVENT.dataCoverage}</span>
        </span>
      </div>
    </div>
  );
}
