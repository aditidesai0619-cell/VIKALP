import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "../components/common/Badge";
import { SimplePageLayout } from "../components/layout/SimplePageLayout";
import { CandidateDetailDrawer } from "../components/relocation/CandidateDetailDrawer";
import { RelocationReadinessPipeline } from "../components/relocation/RelocationReadinessPipeline";
import { deriveReadinessStages } from "../components/relocation/readinessStages";
import { TerrainMapControls } from "../components/terrain-map/TerrainMapControls";
import { VillageDataSourcePanel } from "../components/village-map/VillageDataSourcePanel";
import { VillageLayerControl, type VillageLayerVisibility } from "../components/village-map/VillageLayerControl";
import { VillageMap, type VillageMapHandle } from "../components/village-map/VillageMap";
import { fetchSettlementAmenities } from "../services/amenities";
import { fetchSettlementBuildings } from "../services/buildings";
import { fetchSettlementDestinations } from "../services/destination";
import { fetchBoundaries } from "../services/gis";
import { fetchSettlementRoads } from "../services/roads";
import { fetchSettlementById, fetchSettlementGeojson } from "../services/settlements";
import { fetchSettlementWater } from "../services/water";
import { useSelection } from "../state/selectionContext";
import { statusTone } from "../utils/statusTone";
import type { PageId } from "../types/navigation";
import type { AmenitiesRequestState } from "../types/amenities";
import type { ApiBoundaryFeatureCollection } from "../types/gis";
import type { BuildingsRequestState } from "../types/buildings";
import type { RoadsRequestState } from "../types/roads";
import type { WaterRequestState } from "../types/water";
import type { DestinationRequestState } from "../types/destination";
import type {
  GeojsonRequestState,
  SettlementRequestState,
} from "../types/settlement";

// Bhitai Malli's id in the backend (see backend/app/database.py seed
// data) — the fallback whenever the officer hasn't explicitly selected
// a settlement elsewhere yet (Task 45.6's shared SelectionContext).
const BHITAI_MALLI_ID = 1;

// Task 45.9 §20 — "combine duplicated presentation where appropriate":
// the old 4-step StepTracker here and Destination Explorer's own
// stat-grid summary have both been replaced by the same shared
// RelocationReadinessPipeline component, so the two pages never show
// two different, potentially-drifting readiness models.
export function RelocationPlannerPage({
  activePage,
  onNavigate,
}: {
  activePage: PageId;
  onNavigate: (page: PageId) => void;
}) {
  const [settlementState, setSettlementState] = useState<SettlementRequestState>({
    status: "loading",
  });
  const [geojsonState, setGeojsonState] = useState<GeojsonRequestState>({
    status: "loading",
  });
  const [destinationState, setDestinationState] = useState<DestinationRequestState>({
    status: "loading",
  });
  const [boundaries, setBoundaries] = useState<ApiBoundaryFeatureCollection | null>(null);
  const [buildingsState, setBuildingsState] = useState<BuildingsRequestState>({
    status: "loading",
  });
  const [roadsState, setRoadsState] = useState<RoadsRequestState>({ status: "loading" });
  const [waterState, setWaterState] = useState<WaterRequestState>({ status: "loading" });
  const [amenitiesState, setAmenitiesState] = useState<AmenitiesRequestState>({
    status: "loading",
  });
  const [layerVisibility, setLayerVisibility] = useState<VillageLayerVisibility>({
    buildings: true,
    roads: true,
    water: true,
    services: true,
    boundaries: true,
    settlement: true,
    evidence: true,
  });
  const [showCandidateDrawer, setShowCandidateDrawer] = useState(false);
  const mapHandleRef = useRef<VillageMapHandle | null>(null);
  const { selectedSettlementId } = useSelection();
  const settlementId = selectedSettlementId ?? BHITAI_MALLI_ID;

  const runFetchSettlement = useCallback(() => {
    setSettlementState({ status: "loading" });
    fetchSettlementById(settlementId)
      .then((settlement) => setSettlementState({ status: "success", settlement }))
      .catch((error: unknown) =>
        setSettlementState({
          status: "error",
          message: error instanceof Error ? error.message : "Unknown error.",
        }),
      );
  }, [settlementId]);

  const runFetchGeojson = useCallback(() => {
    setGeojsonState({ status: "loading" });
    fetchSettlementGeojson(settlementId)
      .then((feature) => setGeojsonState({ status: "success", feature }))
      .catch((error: unknown) =>
        setGeojsonState({
          status: "error",
          message: error instanceof Error ? error.message : "Unknown error.",
        }),
      );
  }, [settlementId]);

  const runFetchDestinations = useCallback(() => {
    setDestinationState({ status: "loading" });
    fetchSettlementDestinations(settlementId)
      .then((analysis) => setDestinationState({ status: "success", analysis }))
      .catch((error: unknown) =>
        setDestinationState({
          status: "error",
          message: error instanceof Error ? error.message : "Unknown error.",
        }),
      );
  }, [settlementId]);

  useEffect(() => {
    runFetchSettlement();
    runFetchGeojson();
    runFetchDestinations();
  }, [runFetchSettlement, runFetchGeojson, runFetchDestinations]);

  useEffect(() => {
    fetchBoundaries()
      .then((collection) => setBoundaries(collection))
      .catch(() => setBoundaries(null));
  }, []);

  useEffect(() => {
    setBuildingsState({ status: "loading" });
    fetchSettlementBuildings(settlementId)
      .then((collection) => setBuildingsState({ status: "success", collection }))
      .catch((error: unknown) =>
        setBuildingsState({
          status: "unavailable",
          message: error instanceof Error ? error.message : "Not available for this settlement.",
        }),
      );
  }, [settlementId]);

  useEffect(() => {
    setRoadsState({ status: "loading" });
    fetchSettlementRoads(settlementId)
      .then((collection) => setRoadsState({ status: "success", collection }))
      .catch((error: unknown) =>
        setRoadsState({
          status: "unavailable",
          message: error instanceof Error ? error.message : "Not available for this settlement.",
        }),
      );
  }, [settlementId]);

  useEffect(() => {
    setWaterState({ status: "loading" });
    fetchSettlementWater(settlementId)
      .then((collection) => setWaterState({ status: "success", collection }))
      .catch((error: unknown) =>
        setWaterState({
          status: "unavailable",
          message: error instanceof Error ? error.message : "Not available for this settlement.",
        }),
      );
  }, [settlementId]);

  useEffect(() => {
    setAmenitiesState({ status: "loading" });
    fetchSettlementAmenities(settlementId)
      .then((collection) => setAmenitiesState({ status: "success", collection }))
      .catch((error: unknown) =>
        setAmenitiesState({
          status: "unavailable",
          message: error instanceof Error ? error.message : "Not available for this settlement.",
        }),
      );
  }, [settlementId]);

  const settlement = settlementState.status === "success" ? settlementState.settlement : null;
  const analysis = destinationState.status === "success" ? destinationState.analysis : null;
  const candidates = analysis?.candidates ?? [];
  // No ranking exists yet for Bhitai Malli (ranking_status is always
  // "pending" today) — when candidates do exist, this simply shows the
  // first one returned rather than inventing a rank.
  const topCandidate = candidates.length > 0 ? candidates[0] : null;

  return (
    <SimplePageLayout activePage={activePage} onNavigate={onNavigate}>
      <div className="flex flex-col gap-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <h1 className="text-2xl font-bold leading-tight text-vikalp-text">Relocation Planner</h1>
            <span className="text-base text-vikalp-text-secondary">
              {settlement ? settlement.name : "Bhitai Malli"} — relocation planning workflow
            </span>
          </div>
          <Badge tone={statusTone(topCandidate ? "Destination Identified" : "Waiting for Destination")}>
            {topCandidate ? "Destination Identified" : "Waiting for Destination"}
          </Badge>
        </div>

        <div className="relative flex h-100 shrink-0 lg:h-120">
          <VillageMap
            ref={mapHandleRef}
            geojsonState={geojsonState}
            onRetryGeojson={runFetchGeojson}
            boundaries={boundaries}
            buildings={buildingsState.status === "success" ? buildingsState.collection : null}
            roads={roadsState.status === "success" ? roadsState.collection : null}
            water={waterState.status === "success" ? waterState.collection : null}
            amenities={amenitiesState.status === "success" ? amenitiesState.collection : null}
            layerVisibility={layerVisibility}
            destinationCandidate={topCandidate}
            onSelectDestination={() => setShowCandidateDrawer(true)}
          />

          <div className="absolute left-3 top-3 z-1200 flex flex-col gap-2">
            <TerrainMapControls
              onZoomIn={() => mapHandleRef.current?.zoomIn()}
              onZoomOut={() => mapHandleRef.current?.zoomOut()}
              onTiltUp={() => mapHandleRef.current?.tiltUp()}
              onTiltDown={() => mapHandleRef.current?.tiltDown()}
              onReset={() => mapHandleRef.current?.resetView()}
            />
            <VillageLayerControl
              visibility={layerVisibility}
              onToggle={(key) => setLayerVisibility((v) => ({ ...v, [key]: !v[key] }))}
              buildingsAvailable={buildingsState.status === "success"}
              roadsAvailable={roadsState.status === "success"}
              waterAvailable={waterState.status === "success"}
              servicesAvailable={amenitiesState.status === "success"}
              destinationAvailable={topCandidate !== null}
            />
          </div>

          <div className="absolute right-3 top-3 z-1200">
            <VillageDataSourcePanel
              buildingsAvailable={buildingsState.status === "success"}
              roadsAvailable={roadsState.status === "success"}
              waterAvailable={waterState.status === "success"}
              servicesAvailable={amenitiesState.status === "success"}
            />
          </div>
        </div>

        {analysis && (
          <RelocationReadinessPipeline
            stages={deriveReadinessStages(analysis, settlement?.name ?? "Bhitai Malli")}
          />
        )}

        {destinationState.status === "success" && candidates.length === 0 && (
          <div className="flex flex-col items-center gap-2 rounded-vikalp-card border border-dashed border-vikalp-border bg-vikalp-bg p-5 text-center">
            <span className="text-base font-semibold text-vikalp-text">
              No government-curated destination
            </span>
            <span className="max-w-md text-[14px] text-vikalp-text-secondary">
              Destination analysis cannot begin until an approved candidate is available for{" "}
              {settlement ? settlement.name : "this settlement"}.
            </span>
            <button
              type="button"
              onClick={() => onNavigate("destination-explorer")}
              className="mt-1 rounded-md border border-vikalp-border px-3 py-1.5 text-[14px] font-medium text-vikalp-navy transition-colors hover:border-vikalp-warning hover:bg-vikalp-warning/10"
            >
              Explore Destination Evidence →
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-1 rounded-vikalp-card border border-vikalp-border bg-vikalp-card p-4">
            <span className="text-[12px] font-semibold uppercase tracking-wide text-vikalp-text-secondary">
              Current site
            </span>
            {settlement ? (
              <>
                <span className="text-base font-semibold text-vikalp-navy">{settlement.name}</span>
                <span className="text-[15px] text-vikalp-text">
                  {settlement.population} people · {settlement.households} households
                </span>
              </>
            ) : (
              <span className="text-[14px] text-vikalp-text-secondary">Loading…</span>
            )}
          </div>

          <div className="flex flex-col gap-1 rounded-vikalp-card border border-vikalp-border bg-vikalp-card p-4">
            <span className="text-[12px] font-semibold uppercase tracking-wide text-vikalp-text-secondary">
              Destination
            </span>
            {topCandidate ? (
              <button
                type="button"
                onClick={() => setShowCandidateDrawer(true)}
                className="text-left text-base font-semibold text-vikalp-navy underline decoration-vikalp-warning underline-offset-2"
              >
                {topCandidate.destination_name}
              </button>
            ) : (
              <span className="text-[14px] text-vikalp-text-secondary">No candidate</span>
            )}
          </div>

          <div className="flex flex-col gap-1 rounded-vikalp-card border border-vikalp-border bg-vikalp-card p-4">
            <span className="text-[12px] font-semibold uppercase tracking-wide text-vikalp-text-secondary">
              Capacity
            </span>
            <span className="text-[14px] text-vikalp-text-secondary">
              {topCandidate && topCandidate.available_area_hectares !== null
                ? `${topCandidate.available_area_hectares} ha available — formal capacity not assessed`
                : "Not assessed"}
            </span>
          </div>

          <div className="flex flex-col gap-1 rounded-vikalp-card border border-vikalp-border bg-vikalp-card p-4">
            <span className="text-[12px] font-semibold uppercase tracking-wide text-vikalp-text-secondary">
              Status
            </span>
            <span className="text-[15px] text-vikalp-text">
              {topCandidate ? "Candidate identified — suitability review pending" : "Waiting for destination"}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onNavigate("destination-explorer")}
            className="rounded-md border border-vikalp-border px-3 py-1.5 text-[14px] font-medium text-vikalp-navy transition-colors hover:border-vikalp-warning hover:bg-vikalp-warning/10"
          >
            Explore Destination →
          </button>
          <p className="max-w-2xl text-[14px] text-vikalp-text-secondary">
            Evidence: settlement location is a VIKALP demo planning input; destination candidates
            (when present) come only from an approved government-curated dataset. VIKALP does not
            generate or recommend relocation sites.
          </p>
        </div>
      </div>

      <CandidateDetailDrawer
        candidate={topCandidate}
        open={showCandidateDrawer && topCandidate !== null}
        onClose={() => setShowCandidateDrawer(false)}
      />
    </SimplePageLayout>
  );
}
