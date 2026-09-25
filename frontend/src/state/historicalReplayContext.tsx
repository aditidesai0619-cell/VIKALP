import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

// Historical Replay — Evidence + Risk + Destination & Relocation task.
// Shared across all three workspaces (like SelectionContext, Task
// 45.6) so switching it on while reviewing Evidence keeps it on when
// the officer moves to Risk or Destination & Relocation, instead of
// resetting per page — the brief's §2 explicitly asks for this
// persistence ("This context must remain visible throughout: Evidence,
// Risk, Destination & Relocation"). This is a brand-new, additive
// context; it does not touch SelectionContext itself.
//
// `active` only ever toggles a PRESENTATION mode (which evidence is
// shown, how it's labeled, whether the archival banner/watermark
// render). It carries no event data of its own — see
// data/historicalReplay.ts for why: no verified named/dated historical
// event exists anywhere in this repository (confirmed by direct audit
// of data/raw, data/processed, and every relevant backend service
// before this task's UI was written), so there is nothing for this
// context to hold beyond on/off.
interface HistoricalReplaySelection {
  active: boolean;
  setActive: (active: boolean) => void;
}

const HistoricalReplayContext = createContext<HistoricalReplaySelection | null>(null);

export function HistoricalReplayProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(false);

  const value = useMemo<HistoricalReplaySelection>(() => ({ active, setActive }), [active]);

  return (
    <HistoricalReplayContext.Provider value={value}>{children}</HistoricalReplayContext.Provider>
  );
}

export function useHistoricalReplay(): HistoricalReplaySelection {
  const context = useContext(HistoricalReplayContext);
  if (!context) {
    throw new Error("useHistoricalReplay must be used within a HistoricalReplayProvider");
  }
  return context;
}
