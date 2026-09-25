import { useCallback, useEffect, useRef, useState } from "react";
import { EvidencePanel } from "../components/map-intelligence/EvidencePanel";
import { LayerControlPanel } from "../components/map-intelligence/LayerControlPanel";
import { SimplePageLayout } from "../components/layout/SimplePageLayout";
import { TerrainMapControls } from "../components/terrain-map/TerrainMapControls";
import { VillageDataSourcePanel } from "../components/village-map/VillageDataSourcePanel";
import { VillageLayerControl, type VillageLayerVisibility } from "../components/village-map/VillageLayerControl";
import { VillageMap, type VillageMapHandle } from "../components/village-map/VillageMap";
import { fetchSettlementAmenities } from "../services/amenities";
import { fetchSettlementBuildings } from "../services/buildings";
import { fetchBoundaries } from "../services/gis";
import { fetchSettlementRisk } from "../services/risk";
import { fetchSettlementRoads } from "../services/roads";
import { fetchSettlementById, fetchSettlementGeojson } from "../services/settlements";
import { fetchSettlementWater } from "../services/water";
import { useSelection } from "../state/selectionContext";
import type { PageId } from "../types/navigation";
import type { AmenitiesRequestState } from "../types/amenities";
import type { BoundariesRequestState } from "../types/gis";
import type { BuildingsRequestState } from "../types/buildings";
import type { RiskRequestState } from "../types/risk";
import type { RoadsRequestState } from "../types/roads";
import type { WaterRequestState } from "../types/water";
import type {
  GeojsonRequestState,
  SettlementRequestState,
} from "../types/settlement";

// Bhitai Malli's id in the backend (see backend/app/database.py seed
// data) — the fallback whenever the officer hasn't explicitly selected
// a settlement elsewhere yet (Task 45.6's shared SelectionContext).
const BHITAI_MALLI_ID = 1;

export function MapIntelligencePage({
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
  const [riskState, setRiskState] = useState<RiskRequestState>({ status: "loading" });

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

  const runFetchRisk = useCallback(() => {
    setRiskState({ status: "loading" });
    fetchSettlementRisk(settlementId)
      .then((assessment) => setRiskState({ status: "success", assessment }))
      .catch((error: unknown) =>
        setRiskState({
          status: "error",
          message: error instanceof Error ? error.message : "Unknown error.",
        }),
      );
  }, [settlementId]);

  // Eight independent fetches — separate resources, never blocking one
  // another (same principle as AppShell's settlement/geojson/boundaries
  // triple, extended here with buildings/roads/water/amenities + risk
  // for the evidence panel).
  useEffect(() => {
    runFetchSettlement();
    runFetchGeojson();
    runFetchBoundaries();
    runFetchBuildings();
    runFetchRoads();
    runFetchWater();
    runFetchAmenities();
    runFetchRisk();
  }, [
    runFetchSettlement,
    runFetchGeojson,
    runFetchBoundaries,
    runFetchBuildings,
    runFetchRoads,
    runFetchWater,
    runFetchAmenities,
    runFetchRisk,
  ]);

  const settlement =
    settlementState.status === "success" ? settlementState.settlement : null;

  const locationPath = settlement
    ? ["India", settlement.state, settlement.district, settlement.name]
    : ["India", "Uttarakhand", "Pauri Garhwal", "Bhitai Malli"];

  const boundaries = boundariesState.status === "success" ? boundariesState.collection : null;
  const buildings = buildingsState.status === "success" ? buildingsState.collection : null;
  const roads = roadsState.status === "success" ? roadsState.collection : null;
  const water = waterState.status === "success" ? waterState.collection : null;
  const amenities = amenitiesState.status === "success" ? amenitiesState.collection : null;

  return (
    <SimplePageLayout activePage={activePage} onNavigate={onNavigate} mode="fill">
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="flex min-h-0 flex-1 flex-col gap-3 lg:flex-row">
          <LayerControlPanel
            locationPath={locationPath}
            buildingsAvailable={buildings !== null}
            onResetView={() => mapHandleRef.current?.resetView()}
            onFitToBuildings={() => mapHandleRef.current?.fitToBuildings()}
          />

          <div className="flex min-h-0 flex-1 flex-col gap-3">
            <div className="flex shrink-0 justify-end">
              <button
                type="button"
                onClick={() => onNavigate("terrain-3d")}
                className="rounded-md border border-vikalp-border px-3 py-1.5 text-[14px] font-medium text-vikalp-navy transition-colors hover:border-vikalp-warning hover:bg-vikalp-warning/10"
              >
                Open 3D Terrain View →
              </button>
            </div>

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
                <VillageLayerControl
                  visibility={layerVisibility}
                  onToggle={(key) => setLayerVisibility((v) => ({ ...v, [key]: !v[key] }))}
                  buildingsAvailable={buildings !== null}
                  roadsAvailable={roads !== null}
                  waterAvailable={water !== null}
                  servicesAvailable={amenities !== null}
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
          </div>

          <EvidencePanel
            settlement={settlement}
            riskState={riskState}
            onOpenEvidenceLocker={() => onNavigate("data-governance")}
          />
        </div>
      </div>
    </SimplePageLayout>
  );
}
