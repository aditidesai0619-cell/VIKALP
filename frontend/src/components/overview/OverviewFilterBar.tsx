import type { ApiSettlement } from "../../types/settlement";

const selectClassName =
  "h-10 rounded-md border border-vikalp-border bg-vikalp-bg px-3 text-sm text-vikalp-text outline-none focus:border-vikalp-navy focus:ring-1 focus:ring-vikalp-navy disabled:cursor-not-allowed disabled:opacity-60";

function FilterField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium uppercase tracking-wide text-vikalp-text-secondary">
        {label}
      </span>
      {children}
    </div>
  );
}

// Task 44 §5 — every option here comes from real VIKALP data. "State"
// has exactly one real option (Uttarakhand is the only state VIKALP
// has any data for) so it renders as a genuinely single-option,
// disabled select rather than a dropdown implying other states exist.
// District options come from the real 13-district boundaries dataset
// (GET /api/gis/boundaries); `settlements` is passed in already
// filtered to the selected district + search query by the caller
// (AppShell.tsx) — this component only renders whatever list it's
// given, so the district-name reconciliation logic (the boundaries
// dataset says "Garhwal", the settlements table says "Pauri Garhwal")
// lives in exactly one place, not duplicated here.
export function OverviewFilterBar({
  districts,
  settlements,
  allSettlements,
  selectedDistrict,
  selectedSettlementId,
  searchQuery,
  onDistrictChange,
  onSettlementChange,
  onSearchChange,
}: {
  districts: string[];
  settlements: ApiSettlement[];
  allSettlements: ApiSettlement[];
  selectedDistrict: string | null;
  selectedSettlementId: number | null;
  searchQuery: string;
  onDistrictChange: (district: string | null) => void;
  onSettlementChange: (id: number | null) => void;
  onSearchChange: (query: string) => void;
}) {
  const selectedSettlement = allSettlements.find((s) => s.id === selectedSettlementId) ?? null;

  return (
    <div className="flex min-h-12 flex-wrap items-end justify-between gap-4 border-b border-vikalp-border bg-vikalp-card px-5 py-3">
      <div className="flex flex-wrap items-end gap-4">
        <FilterField label="State">
          <select className={selectClassName} value="Uttarakhand" disabled>
            <option>Uttarakhand</option>
          </select>
        </FilterField>

        <FilterField label="District">
          <select
            className={selectClassName}
            value={selectedDistrict ?? ""}
            onChange={(event) => {
              onDistrictChange(event.target.value || null);
              onSettlementChange(null);
            }}
          >
            <option value="">All Districts</option>
            {districts.map((district) => (
              <option key={district} value={district}>
                {district}
              </option>
            ))}
          </select>
        </FilterField>

        <FilterField label="Settlement">
          <select
            className={selectClassName}
            value={selectedSettlementId ?? ""}
            onChange={(event) =>
              onSettlementChange(event.target.value ? Number(event.target.value) : null)
            }
            disabled={settlements.length === 0}
          >
            <option value="">All Settlements</option>
            {settlements.map((settlement) => (
              <option key={settlement.id} value={settlement.id}>
                {settlement.name}
              </option>
            ))}
          </select>
        </FilterField>

        <FilterField label="Search settlement">
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search settlement…"
            className={`${selectClassName} w-48`}
          />
        </FilterField>
      </div>

      <div className="flex flex-col gap-1 rounded-md border border-vikalp-navy/40 bg-vikalp-navy/10 px-3 py-1.5">
        <span className="text-xs font-medium uppercase tracking-wide text-vikalp-navy">
          Current Selection
        </span>
        <span className="text-sm text-vikalp-text">
          Uttarakhand
          <span className="text-vikalp-text-secondary"> | </span>
          {selectedDistrict ?? "All Districts"}
          <span className="text-vikalp-text-secondary"> | </span>
          {selectedSettlement ? selectedSettlement.name : "All Settlements"}
        </span>
      </div>
    </div>
  );
}
