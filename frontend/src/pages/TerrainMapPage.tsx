import { useCallback, useEffect, useRef, useState } from "react";
import { SimplePageLayout } from "../components/layout/SimplePageLayout";
import { DataSourcePanel } from "../components/terrain-map/DataSourcePanel";
import { MapStatusBanner } from "../components/terrain-map/MapStatusBanner";
import { TerrainLayerControl, type TerrainLayerVisibility } from "../components/terrain-map/TerrainLayerControl";
import { TerrainLegend } from "../components/terrain-map/TerrainLegend";
import { TerrainMap, type TerrainMapHandle } from "../components/terrain-map/TerrainMap";
import { TerrainMapControls } from "../components/terrain-map/TerrainMapControls";
import { fetchBoundaries } from "../services/gis";
import { fetchSettlementGeojson } from "../services/settlements";
import { useSelection } from "../state/selectionContext";
import type { PageId } from "../types/navigation";
import type { BoundariesRequestState } from "../types/gis";
import type { GeojsonRequestState } from "../types/settlement";

// Bhitai Malli's id in the backend — same fallback used by
// MapIntelligencePage/DataGovernancePage when nothing is explicitly
// selected via the shared SelectionContext.
const BHITAI_MALLI_ID = 1;

export function TerrainMapPage({
  activePage,
  onNavigate,
}: {
  activePage: PageId;
  onNavigate: (page: PageId) => void;
}) {
  const { selectedSettlementId } = useSelection();
  const settlementId = selectedSettlementId ?? BHITAI_MALLI_ID;

  const [geojsonState, setGeojsonState] = useState<GeojsonRequestState>({ status: "loading" });
  const [boundariesState, setBoundariesState] = useState<BoundariesRequestState>({
    status: "loading",
  });
  const [terrainStatus, setTerrainStatus] = useState<"checking" | "available" | "unavailable">(
    "checking",
  );
  const [layerVisibility, setLayerVisibility] = useState<TerrainLayerVisibility>({
    terrain: true,
    buildings: true,
    boundaries: true,
    settlement: true,
    evidence: true,
  });

  const mapHandleRef = useRef<TerrainMapHandle | null>(null);

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

  useEffect(() => {
    runFetchGeojson();
    fetchBoundaries()
      .then((collection) => setBoundariesState({ status: "success", collection }))
      .catch((error: unknown) =>
        setBoundariesState({
          status: "error",
          message: error instanceof Error ? error.message : "Unknown error.",
        }),
      );
  }, [runFetchGeojson]);

  const boundaries = boundariesState.status === "success" ? boundariesState.collection : null;

  return (
    <SimplePageLayout activePage={activePage} onNavigate={onNavigate} mode="fill">
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-[22px] font-semibold text-vikalp-navy">3D Terrain View</h1>
            <p className="text-[13px] text-vikalp-text-secondary">
              Terrain context for the selected settlement — historical evidence, settlement
              location, and district boundary layered over real elevation.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate("map-intelligence")}
            className="rounded-md border border-vikalp-border px-3 py-1.5 text-[14px] font-medium text-vikalp-navy transition-colors hover:border-vikalp-warning hover:bg-vikalp-warning/10"
          >
            ← Back to Settlement
          </button>
        </div>

        <div className="relative min-h-0 flex-1">
          <TerrainMap
            ref={mapHandleRef}
            geojsonState={geojsonState}
            onRetryGeojson={runFetchGeojson}
            boundaries={boundaries}
            layerVisibility={layerVisibility}
            onTerrainAvailabilityChange={(available) =>
              setTerrainStatus(available ? "available" : "unavailable")
            }
          />

          {geojsonState.status === "loading" && terrainStatus === "checking" && (
            <MapStatusBanner kind="loading" />
          )}
          {terrainStatus === "unavailable" && <MapStatusBanner kind="terrain-unavailable" />}

          <div className="absolute left-3 top-3 z-1200 flex flex-col gap-2">
            <TerrainMapControls
              onZoomIn={() => mapHandleRef.current?.zoomIn()}
              onZoomOut={() => mapHandleRef.current?.zoomOut()}
              onTiltUp={() => mapHandleRef.current?.tiltUp()}
              onTiltDown={() => mapHandleRef.current?.tiltDown()}
              onReset={() => mapHandleRef.current?.resetView()}
            />
            <TerrainLayerControl
              visibility={layerVisibility}
              onToggle={(key) => setLayerVisibility((v) => ({ ...v, [key]: !v[key] }))}
              terrainAvailable={terrainStatus === "available"}
            />
          </div>

          <TerrainLegend terrainAvailable={terrainStatus === "available"} />
          <DataSourcePanel terrainAvailable={terrainStatus === "available"} />
        </div>
      </div>
    </SimplePageLayout>
  );
}
