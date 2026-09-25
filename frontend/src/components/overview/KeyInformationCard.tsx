import type { ApiSettlement } from "../../types/settlement";
import { OverviewCard } from "./OverviewCard";

type SettlementsState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; settlements: ApiSettlement[] };

function Stat({ label, value, hero = true }: { label: string; value: string; hero?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs uppercase tracking-wide text-vikalp-text-secondary">{label}</span>
      <span className={`font-semibold text-vikalp-text ${hero ? "text-stat" : "text-lg"}`}>{value}</span>
    </div>
  );
}

// Task 44 — every number here is a real aggregation over
// GET /api/settlements (today: 1 settlement, Bhitai Malli). No
// fabricated state-wide totals (612 settlements / 11.9M population in
// the reference mock) — "Area" has no source anywhere in VIKALP today,
// so it honestly reads "Not available" rather than being invented.
export function KeyInformationCard({ state, bare }: { state: SettlementsState; bare?: boolean }) {
  if (state.status === "loading") {
    return (
      <OverviewCard icon="◎" title="Uttarakhand — Key Information" bare={bare}>
        <span className="text-[13px] text-vikalp-text-secondary">Loading…</span>
      </OverviewCard>
    );
  }

  if (state.status === "error") {
    return (
      <OverviewCard icon="◎" title="Uttarakhand — Key Information" bare={bare}>
        <span className="text-[13px] text-vikalp-critical">{state.message}</span>
      </OverviewCard>
    );
  }

  const { settlements } = state;
  const totalPopulation = settlements.reduce((sum, s) => sum + s.population, 0);
  const totalHouseholds = settlements.reduce((sum, s) => sum + s.households, 0);

  return (
    <OverviewCard icon="◎" title="Uttarakhand — Key Information" bare={bare}>
      <div className="grid grid-cols-2 gap-4">
        <Stat label="Total Settlements" value={String(settlements.length)} />
        <Stat label="Total Population" value={totalPopulation.toLocaleString("en-IN")} />
        <Stat label="Total Households" value={totalHouseholds.toLocaleString("en-IN")} />
        <Stat label="Area" value="Not available" hero={false} />
      </div>
      <span className="text-[12px] text-vikalp-text-secondary">
        Reflects the {settlements.length} settlement{settlements.length === 1 ? "" : "s"}{" "}
        currently in VIKALP's pilot dataset, not a full state census.
      </span>
    </OverviewCard>
  );
}
