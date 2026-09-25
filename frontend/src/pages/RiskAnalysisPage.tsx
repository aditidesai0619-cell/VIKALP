import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "../components/common/Badge";
import { Callout } from "../components/common/Callout";
import { StatItem } from "../components/common/StatItem";
import { AlertTriangleIcon } from "../components/common/icons";
import { statusTone } from "../utils/statusTone";
import { HistoricalReplayToggle } from "../components/historical-replay/HistoricalReplayToggle";
import { SimplePageLayout } from "../components/layout/SimplePageLayout";
import { RiskControlPanel } from "../components/risk/RiskControlPanel";
import { RiskIntelligencePanel } from "../components/risk/RiskIntelligencePanel";
import { HistoricalRiskView } from "../components/risk/HistoricalRiskView";
import { TerrainMapControls } from "../components/terrain-map/TerrainMapControls";
import { VillageDataSourcePanel } from "../components/village-map/VillageDataSourcePanel";
import type { VillageLayerVisibility } from "../components/village-map/VillageLayerControl";
import { VillageMap, type VillageMapHandle } from "../components/village-map/VillageMap";
import { fetchSettlementAmenities } from "../services/amenities";
import { fetchSettlementBuildings } from "../services/buildings";
import { fetchBoundaries } from "../services/gis";
import { fetchSettlementRisk } from "../services/risk";
import { fetchSettlementRoads } from "../services/roads";
import { fetchSettlementById, fetchSettlementGeojson, fetchSettlements } from "../services/settlements";
import { fetchSettlementWater } from "../services/water";
import { useHistoricalReplay } from "../state/historicalReplayContext";
import { useSelection } from "../state/selectionContext";
import { formatStatusLabel } from "../utils/formatStatus";
import type { PageId } from "../types/navigation";
import type { AmenitiesRequestState } from "../types/amenities";
import type { BoundariesRequestState } from "../types/gis";
import type { BuildingsRequestState } from "../types/buildings";
import type { ApiRiskAssessment, RiskRequestState } from "../types/risk";
import type { RoadsRequestState } from "../types/roads";
import type { ApiSettlement } from "../types/settlement";
import type { WaterRequestState } from "../types/water";
import type {
  GeojsonRequestState,
  SettlementRequestState,
} from "../types/settlement";

// Bhitai Malli's id in the backend (see backend/app/database.py seed
// data) — the fallback whenever the officer hasn't explicitly selected
// a settlement elsewhere yet (Task 45.6's shared SelectionContext).
const BHITAI_MALLI_ID = 1;

function RiskSummary({
  assessment,
  onReviewDecision,
}: {
  assessment: ApiRiskAssessment;
  onReviewDecision: () => void;
}) {
  const isPending = assessment.assessment_status !== "complete";
  const scoredCount = assessment.dimensions.filter((d) => d.score !== null).length;

  const statusBadgeText = isPending ? "Assessment Pending" : (assessment.risk_level ?? "Unavailable");

  return (
    <div className="flex flex-col gap-4 rounded-vikalp-card border border-vikalp-border bg-vikalp-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold text-vikalp-navy">
          {assessment.settlement_name} — Risk Analysis
        </h1>
        <div className="flex items-center gap-2">
          <Badge tone={statusTone(statusBadgeText)}>{statusBadgeText}</Badge>
          <button
            type="button"
            onClick={onReviewDecision}
            className="rounded-md border border-vikalp-border px-3.5 py-2 text-sm font-medium text-vikalp-navy transition-colors hover:border-vikalp-warning hover:bg-vikalp-warning/10"
          >
            Review Decision Workspace →
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatItem
          label="Overall score"
          value={assessment.overall_score === null ? "Unavailable" : String(assessment.overall_score)}
        />
        <StatItem label="Dimensions scored" value={`${scoredCount} / ${assessment.dimensions.length}`} />
        <StatItem label="Risk level" value={assessment.risk_level ?? "Unavailable"} />
        <StatItem label="Data completeness" value={formatStatusLabel(assessment.data_completeness)} />
      </div>

      <Callout icon={<AlertTriangleIcon className="h-4 w-4" />}>{assessment.officer_review_note}</Callout>
    </div>
  );
}

export function RiskAnalysisPage({
  activePage,
  onNavigate,
}: {
  activePage: PageId;
  onNavigate: (page: PageId) => void;
}) {
  const [state, setState] = useState<RiskRequestState>({ status: "loading" });
  const [settlementState, setSettlementState] = useState<SettlementRequestState>({
    status: "loading",
  });
  const [settlements, setSettlements] = useState<ApiSettlement[]>([]);
  const [geojsonState, setGeojsonState] = useState<GeojsonRequestState>({ status: "loading" });
  const [boundariesState, setBoundariesState] = useState<BoundariesRequestState>({
    status: "loading",
  });
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

  const mapHandleRef = useRef<VillageMapHandle | null>(null);
  const { active: historicalReplayActive } = useHistoricalReplay();
  const { selectedSettlementId, setSelectedSettlementId } = useSelection();
  const settlementId = selectedSettlementId ?? BHITAI_MALLI_ID;

  const runFetchRisk = useCallback(() => {
    setState({ status: "loading" });
    fetchSettlementRisk(settlementId)
      .then((assessment) => setState({ status: "success", assessment }))
      .catch((error: unknown) =>
        setState({
          status: "error",
          message: error instanceof Error ? error.message : "Unknown error.",
        }),
      );
  }, [settlementId]);

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

  const runFetchBoundaries = useCallback(() => {
    setBoundariesState({ status: "loading" });
    fetchBoundaries()
      .then((collection) => setBoundariesState({ status: "success", collection }))
      .catch((error: unknown) =>
        setBoundariesState({
          status: "error",
          message: error instanceof Error ? error.message : "Unknown error.",
        }),
      );
  }, []);

  const runFetchBuildings = useCallback(() => {
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

  const runFetchRoads = useCallback(() => {
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

  const runFetchWater = useCallback(() => {
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

  const runFetchAmenities = useCallback(() => {
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

  useEffect(() => {
    runFetchRisk();
    runFetchSettlement();
    runFetchGeojson();
    runFetchBoundaries();
    runFetchBuildings();
    runFetchRoads();
    runFetchWater();
    runFetchAmenities();
  }, [
    runFetchRisk,
    runFetchSettlement,
    runFetchGeojson,
    runFetchBoundaries,
    runFetchBuildings,
    runFetchRoads,
    runFetchWater,
    runFetchAmenities,
  ]);

  // Independent of the selected settlement — the real list backing the
  // left panel's settlement search (Task brief §3A/§10). Fetched once;
  // VIKALP's pilot dataset has exactly one settlement today, so this
  // honestly returns a single-item list rather than a fabricated set.
  useEffect(() => {
    fetchSettlements()
      .then((list) => setSettlements(list))
      .catch(() => setSettlements([]));
  }, []);

  const retry = () => {
    runFetchRisk();
  };

  const settlement = settlementState.status === "success" ? settlementState.settlement : null;
  const locationPath = settlement
    ? ["India", settlement.state, settlement.district, settlement.name]
    : ["India", "Uttarakhand", "Pauri Garhwal", "Bhitai Malli"];

  const boundaries = boundariesState.status === "success" ? boundariesState.collection : null;
  const buildings = buildingsState.status === "success" ? buildingsState.collection : null;
  const roads = roadsState.status === "success" ? roadsState.collection : null;
  const water = waterState.status === "success" ? waterState.collection : null;
  const amenities = amenitiesState.status === "success" ? amenitiesState.collection : null;

  const assessment = state.status === "success" ? state.assessment : null;
  const hazardDetail =
    assessment?.dimensions.find((d) => d.dimension === "Hazard Exposure")?.hazard_exposure_detail ??
    null;

  return (
    <SimplePageLayout activePage={activePage} onNavigate={onNavigate} mode="fill">
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <HistoricalReplayToggle />

        {historicalReplayActive && (
          <div className="flex-1 overflow-y-auto">
            <HistoricalRiskView />
          </div>
        )}

        {!historicalReplayActive && state.status === "loading" && (
          <div className="flex flex-1 items-center justify-center">
            <span className="text-xs text-vikalp-text-secondary">Loading risk assessment…</span>
          </div>
        )}

        {!historicalReplayActive && state.status === "error" && (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
            <span className="text-sm font-medium text-vikalp-critical">
              Risk assessment could not be loaded.
            </span>
            <span className="text-xs text-vikalp-text-secondary">{state.message}</span>
            <button
              type="button"
              onClick={retry}
              className="mt-1 rounded-md border border-vikalp-border px-3 py-1.5 text-xs font-medium text-vikalp-navy transition-colors hover:bg-vikalp-bg"
            >
              Retry
            </button>
          </div>
        )}

        {!historicalReplayActive && state.status === "success" && (
          <>
            <RiskSummary
              assessment={state.assessment}
              onReviewDecision={() => onNavigate("decision-workspace")}
            />

            <div className="flex min-h-0 flex-1 flex-col gap-3 lg:flex-row">
              <RiskControlPanel
                locationPath={locationPath}
                settlements={settlements}
                selectedSettlementId={settlementId}
                onSelectSettlement={setSelectedSettlementId}
                landslideEvidenceAvailable={!!hazardDetail && hazardDetail.contextual_record_count > 0}
                landslideRecordCount={hazardDetail?.contextual_record_count ?? 0}
                layerVisibility={layerVisibility}
                onToggleLayer={(key) => setLayerVisibility((v) => ({ ...v, [key]: !v[key] }))}
                buildingsAvailable={buildings !== null}
                roadsAvailable={roads !== null}
                waterAvailable={water !== null}
                servicesAvailable={amenities !== null}
                onResetView={() => mapHandleRef.current?.resetView()}
              />

              <div className="relative min-h-0 flex-1">
                <VillageMap
                  ref={mapHandleRef}
                  geojsonState={geojsonState}
                  onRetryGeojson={runFetchGeojson}
                  boundaries={boundaries}
                  buildings={buildings}
                  roads={roads}
                  water={water}
                  amenities={amenities}
                  layerVisibility={layerVisibility}
                />

                <div className="absolute left-3 top-3 z-1200 flex flex-col gap-2">
                  <TerrainMapControls
                    onZoomIn={() => mapHandleRef.current?.zoomIn()}
                    onZoomOut={() => mapHandleRef.current?.zoomOut()}
                    onTiltUp={() => mapHandleRef.current?.tiltUp()}
                    onTiltDown={() => mapHandleRef.current?.tiltDown()}
                    onReset={() => mapHandleRef.current?.resetView()}
                  />
                </div>

                <div className="absolute right-3 top-3 z-1200">
                  <VillageDataSourcePanel
                    buildingsAvailable={buildings !== null}
                    roadsAvailable={roads !== null}
                    waterAvailable={water !== null}
                    servicesAvailable={amenities !== null}
                  />
                </div>
              </div>

              <RiskIntelligencePanel
                settlement={settlement}
                settlements={settlements}
                assessment={assessment}
              />
            </div>

            <p className="shrink-0 rounded-md border border-vikalp-border bg-vikalp-bg px-3 py-2 text-xs text-vikalp-text-secondary">
              {state.assessment.policy_disclaimer}
            </p>
          </>
        )}
      </div>
    </SimplePageLayout>
  );
}
