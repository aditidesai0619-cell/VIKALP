import { useEffect, useMemo, useRef, useState } from "react";
import { PilotDataBadge } from "../common/PilotDataBadge";
import { AssessmentStatusCard } from "../overview/AssessmentStatusCard";
import { KeyEvidenceSummaryCard } from "../overview/KeyEvidenceSummaryCard";
import { KeyInformationCard } from "../overview/KeyInformationCard";
import { OverviewCopilotCard } from "../overview/OverviewCopilotCard";
import { OverviewFilterBar } from "../overview/OverviewFilterBar";
import { StateMap, type StateMapHandle } from "../overview/StateMap";
import { WeatherForecastCard } from "../overview/WeatherForecastCard";
import { fetchBoundaries, fetchLandslides } from "../../services/gis";
import { fetchSettlementCopilotContext } from "../../services/copilot";
import { fetchSettlementRisk } from "../../services/risk";
import { fetchSettlements } from "../../services/settlements";
import { fetchPilotWeather } from "../../services/weather";
import { useSelection } from "../../state/selectionContext";
import type { BoundariesRequestState, LandslidesRequestState } from "../../types/gis";
import type { CopilotContextRequestState } from "../../types/copilot";
import type { PageId } from "../../types/navigation";
import type { RiskRequestState } from "../../types/risk";
import type { ApiSettlement } from "../../types/settlement";
import type { WeatherRequestState } from "../../types/weather";
import { SimplePageLayout } from "./SimplePageLayout";

type SettlementsRequestState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; settlements: ApiSettlement[] };

// Task 44 — the Overview page is now a state-level "Officer Workspace
// entry point": a filter bar (State/District/Settlement/Search), a
// dominant Uttarakhand map, and a compact right-hand intelligence
// stack (Key Information / Weather / Assessment Status / Key Evidence
// Summary / Copilot). Selecting a settlement here focuses the map and
// drives the right-hand cards — it does not auto-navigate; the officer
// still chooses when to move into Risk/Decision/Destination &
// Relocation/Reports via the existing shared nav (Header, unchanged —
// see docs/DECISIONS.md Task 44 on why the nav itself was left alone).
//
// This replaces the Task 43 "settlement drill-down" Overview (its own
// left layer-control sidebar + right Settlement Intelligence panel +
// 5-card bottom row) — that functionality is unchanged, it now lives
// on Map Intelligence and the dedicated Risk/Decision/Destination/
// Relocation pages Task 43 already built, reachable from here.
export function AppShell({
  activePage,
  onNavigate,
}: {
  activePage: PageId;
  onNavigate: (page: PageId) => void;
}) {
  const [settlementsState, setSettlementsState] = useState<SettlementsRequestState>({
    status: "loading",
  });
  const [boundariesState, setBoundariesState] = useState<BoundariesRequestState>({
    status: "loading",
  });
  const [landslidesState, setLandslidesState] = useState<LandslidesRequestState>({
    status: "loading",
  });
  const [weatherState, setWeatherState] = useState<WeatherRequestState>({ status: "loading" });
  const [riskState, setRiskState] = useState<RiskRequestState>({ status: "loading" });
  const [copilotContextState, setCopilotContextState] = useState<CopilotContextRequestState>({
    status: "loading",
  });

  // Task 45.6 (global foundation) — shared across every page (via
  // SelectionProvider in App.tsx) instead of living only here, so a
  // settlement picked on Overview stays picked when the officer moves
  // to Risk/Decision/Destination & Relocation/etc. `searchQuery`
  // stays local — it is an Overview-only filter-bar input, not
  // something other pages need to remember.
  const { selectedDistrict, setSelectedDistrict, selectedSettlementId, setSelectedSettlementId } =
    useSelection();
  const [searchQuery, setSearchQuery] = useState("");

  const mapHandleRef = useRef<StateMapHandle | null>(null);

  useEffect(() => {
    fetchSettlements()
      .then((settlements) => setSettlementsState({ status: "success", settlements }))
      .catch((error: unknown) =>
        setSettlementsState({
          status: "error",
          message: error instanceof Error ? error.message : "Unknown error.",
        }),
      );
  }, []);

  useEffect(() => {
    fetchBoundaries()
      .then((collection) => setBoundariesState({ status: "success", collection }))
      .catch((error: unknown) =>
        setBoundariesState({
          status: "error",
          message: error instanceof Error ? error.message : "Unknown error.",
        }),
      );
  }, []);

  useEffect(() => {
    fetchLandslides()
      .then((collection) => setLandslidesState({ status: "success", collection }))
      .catch((error: unknown) =>
        setLandslidesState({
          status: "error",
          message: error instanceof Error ? error.message : "Unknown error.",
        }),
      );
  }, []);

  useEffect(() => {
    fetchPilotWeather()
      .then((weather) => setWeatherState({ status: "success", weather }))
      .catch((error: unknown) =>
        setWeatherState({
          status: "error",
          message: error instanceof Error ? error.message : "Weather data unavailable.",
        }),
      );
  }, []);

  const settlements = settlementsState.status === "success" ? settlementsState.settlements : [];

  // The settlement whose evidence the right-hand cards reflect: the
  // officer's explicit selection, or the first real settlement while
  // none is selected — never a fabricated "state-level" aggregate risk
  // (Task 44 §15: state-level aggregation isn't supported, so this
  // shows real settlement-level evidence instead of inventing one).
  const activeSettlementId = selectedSettlementId ?? settlements[0]?.id ?? null;

  useEffect(() => {
    if (activeSettlementId === null) return;
    setRiskState({ status: "loading" });
    fetchSettlementRisk(activeSettlementId)
      .then((assessment) => setRiskState({ status: "success", assessment }))
      .catch((error: unknown) =>
        setRiskState({
          status: "error",
          message: error instanceof Error ? error.message : "Unknown error.",
        }),
      );
  }, [activeSettlementId]);

  useEffect(() => {
    if (activeSettlementId === null) return;
    setCopilotContextState({ status: "loading" });
    fetchSettlementCopilotContext(activeSettlementId)
      .then((context) => setCopilotContextState({ status: "success", context }))
      .catch((error: unknown) =>
        setCopilotContextState({
          status: "error",
          message: error instanceof Error ? error.message : "Unknown error.",
        }),
      );
  }, [activeSettlementId]);

  const districts = useMemo(() => {
    if (boundariesState.status !== "success") return [];
    const names = boundariesState.collection.features
      .map((f) => f.properties.shapeName)
      .filter((name): name is string => Boolean(name));
    return Array.from(new Set(names)).sort();
  }, [boundariesState]);

  // Reconciles the boundaries dataset's district naming ("Garhwal")
  // against the settlements table's own district field ("Pauri
  // Garhwal") — a real naming variance between two real datasets, not
  // fabricated data. A lenient substring match lets the District
  // filter narrow the settlement list correctly either way. Combined
  // with the search query in one place (rather than duplicated between
  // the filter bar and the map) so both always show the same set.
  const filteredSettlements = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return settlements.filter((s) => {
      const matchesDistrict =
        !selectedDistrict || s.district.includes(selectedDistrict) || selectedDistrict.includes(s.district);
      const matchesSearch = !query || s.name.toLowerCase().includes(query);
      return matchesDistrict && matchesSearch;
    });
  }, [settlements, selectedDistrict, searchQuery]);

  const boundaries = boundariesState.status === "success" ? boundariesState.collection : null;
  const landslides = landslidesState.status === "success" ? landslidesState.collection : null;
  const weather = weatherState.status === "success" ? weatherState.weather : null;

  return (
    <SimplePageLayout activePage={activePage} onNavigate={onNavigate}>
      <div className="flex flex-col gap-4">
        <OverviewFilterBar
          districts={districts}
          settlements={filteredSettlements}
          allSettlements={settlements}
          selectedDistrict={selectedDistrict}
          selectedSettlementId={selectedSettlementId}
          searchQuery={searchQuery}
          onDistrictChange={setSelectedDistrict}
          onSettlementChange={setSelectedSettlementId}
          onSearchChange={setSearchQuery}
        />

        {/* Overview grid — a map-heavy page, so the map column stays
            the larger share, but tuned to the brief's own "map-heavy:
            50-60% map" guidance rather than letting it run away on a
            wide, now-uncapped viewport (1.7fr:0.8fr was ~68% map — too
            far past that band once the page went fluid). 1.35fr:1fr
            lands at ~57% map / 43% sidebar. Falls back to one column
            below 1100px.

            The map's height is computed directly from the viewport
            (calc(100vh - 190px)) rather than inherited through a
            flex-1 chain — that chain broke silently when this grid's
            own template switched between one and two columns across
            breakpoints (confirmed live: at 1024px width the map and
            every sidebar card rendered with zero height). A
            self-contained height has no ancestor to depend on. */}
        <div className="grid grid-cols-1 items-start gap-6 min-[1101px]:grid-cols-[minmax(0,1.35fr)_minmax(380px,1fr)]">
          <div className="flex min-w-0 flex-col gap-3">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-semibold text-vikalp-text">
                Uttarakhand — State GIS Intelligence
              </h1>
              <PilotDataBadge />
            </div>
            <div className="min-[1101px]:h-[calc(100vh-190px)] min-[1101px]:min-h-[560px] min-[701px]:max-[1100px]:h-[620px] max-[700px]:h-[480px]">
              <StateMap
                ref={mapHandleRef}
                boundaries={boundaries}
                settlements={filteredSettlements}
                landslides={landslides}
                weather={weather}
                selectedDistrict={selectedDistrict}
                selectedSettlementId={selectedSettlementId}
                onSelectSettlement={setSelectedSettlementId}
              />
            </div>
          </div>

          {/* One grouped workspace panel instead of 5 independently
              bordered/shadowed cards floating with gaps between them
              — each section keeps its own identity via a divider and
              the OverviewCard `bare` variant, but they now read as one
              cohesive intelligence panel. */}
          <div className="flex min-w-0 flex-col divide-y divide-vikalp-border rounded-vikalp-card border border-vikalp-border bg-vikalp-card min-[1101px]:min-w-[380px]">
            <KeyInformationCard state={settlementsState} bare />
            <WeatherForecastCard state={weatherState} bare />
            <AssessmentStatusCard state={copilotContextState} bare />
            <KeyEvidenceSummaryCard
              state={riskState}
              onClickReview={() => onNavigate("risk-analysis")}
              bare
            />
            <OverviewCopilotCard onClick={() => onNavigate("copilot")} bare />
          </div>
        </div>
      </div>
    </SimplePageLayout>
  );
}
