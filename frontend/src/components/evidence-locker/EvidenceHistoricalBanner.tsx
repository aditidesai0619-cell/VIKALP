import { ArchiveClockIcon } from "../common/icons";
import { HISTORICAL_REPLAY_EVENT } from "../../data/historicalReplay";

// Evidence-page-specific, larger presentation of the same Historical
// Replay banner content shown on Risk and Destination & Relocation
// (historical-replay/HistoricalReplayBanner.tsx, left untouched since
// this task is scoped to Evidence only). Same restrained amber/gold
// archival language (brief §11: no neon, no war-room aesthetic) at the
// bigger typography this whole redesign calls for.
export function EvidenceHistoricalBanner() {
  return (
    <div className="flex flex-col gap-3 rounded-vikalp-card border border-vikalp-warning/40 bg-vikalp-warning/10 px-6 py-5">
      <div className="flex items-center gap-3">
        <ArchiveClockIcon className="h-6 w-6 text-vikalp-warning" />
        <div className="flex flex-col">
          <span className="text-lg font-semibold text-vikalp-warning">
            Historical Replay — Archived evidence view · Not a current-risk assessment
          </span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-8 gap-y-2 border-t border-vikalp-warning/20 pt-3 text-sm sm:grid-cols-4">
        <div className="flex flex-col">
          <span className="text-[12px] font-medium uppercase tracking-wide text-vikalp-text-secondary">
            Event
          </span>
          <span className="text-vikalp-text">{HISTORICAL_REPLAY_EVENT.name ?? "Not available"}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[12px] font-medium uppercase tracking-wide text-vikalp-text-secondary">
            Date / period
          </span>
          <span className="text-vikalp-text">{HISTORICAL_REPLAY_EVENT.datePeriod ?? "Not available"}</span>
        </div>
        <div className="flex flex-col sm:col-span-2">
          <span className="text-[12px] font-medium uppercase tracking-wide text-vikalp-text-secondary">
            Location
          </span>
          <span className="text-vikalp-text">{HISTORICAL_REPLAY_EVENT.dataCoverage}</span>
        </div>
        <div className="flex flex-col sm:col-span-4">
          <span className="text-[12px] font-medium uppercase tracking-wide text-vikalp-text-secondary">
            Source status
          </span>
          <span className="text-vikalp-text">
            Real, verified evidence shown where it exists; unavailable categories are disclosed, never
            invented.
          </span>
        </div>
      </div>
      <p className="border-t border-vikalp-warning/20 pt-3 text-[13px] font-medium text-vikalp-warning">
        Historical replay unavailable — verified event-specific data has not been integrated. This view
        shows verified evidence, not a reconstructed historical event.
      </p>
    </div>
  );
}
