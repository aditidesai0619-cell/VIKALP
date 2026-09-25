import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

// Task 45.6 (global UI foundation) — the officer's current State/
// District/Settlement selection, shared across every page instead of
// living only inside the Overview's own local state (as it did through
// Task 45.7). "Maintain the selected settlement across navigation"
// only has real, observable effect once VIKALP has more than one
// settlement — today's pilot dataset has exactly one (Bhitai Malli),
// so every page's own `BHITAI_MALLI_ID` fallback still applies
// whenever nothing has been explicitly selected yet. This is
// infrastructure only: it does not change any page's layout, business
// logic, or data-fetching rules — only where the settlement id/
// district name come from.
interface Selection {
  selectedState: string;
  selectedDistrict: string | null;
  setSelectedDistrict: (district: string | null) => void;
  selectedSettlementId: number | null;
  setSelectedSettlementId: (id: number | null) => void;
}

const SelectionContext = createContext<Selection | null>(null);

export function SelectionProvider({ children }: { children: ReactNode }) {
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const [selectedSettlementId, setSelectedSettlementId] = useState<number | null>(null);

  const value = useMemo<Selection>(
    () => ({
      // Hardcoded, not a fake multi-state dropdown — Uttarakhand is
      // the only state VIKALP has any data for (same reasoning as
      // OverviewFilterBar's disabled State select, Task 44).
      selectedState: "Uttarakhand",
      selectedDistrict,
      setSelectedDistrict,
      selectedSettlementId,
      setSelectedSettlementId,
    }),
    [selectedDistrict, selectedSettlementId],
  );

  return <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>;
}

export function useSelection(): Selection {
  const context = useContext(SelectionContext);
  if (!context) {
    throw new Error("useSelection must be used within a SelectionProvider");
  }
  return context;
}
