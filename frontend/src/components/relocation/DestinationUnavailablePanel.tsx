import { FlagIcon } from "../common/icons";

// Task 45.9 §14 — a polished visual empty state, not a broken-looking
// gap. Shown whenever candidates.length === 0 (true for every
// settlement in this pilot today, confirmed by destination.py's own
// design — see docs/DECISIONS.md Task 30). The map stays visible
// alongside this, per the brief's own instruction.
export function DestinationUnavailablePanel() {
  return (
    <div className="flex flex-col gap-2 rounded-vikalp-card border border-dashed border-vikalp-border bg-vikalp-bg p-5">
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-vikalp-border/30 text-vikalp-text-secondary">
          <FlagIcon className="h-5 w-5" />
        </span>
        <h3 className="text-base font-semibold text-vikalp-text-secondary">Destination Evidence</h3>
      </div>
      <p className="text-[15px] leading-relaxed text-vikalp-text-secondary">
        No government-curated destination is currently integrated for this settlement.
      </p>
      <p className="text-[13px] text-vikalp-text-secondary">
        Destination evaluation remains pending officer-provided evidence.
      </p>
    </div>
  );
}
