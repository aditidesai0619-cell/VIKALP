import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "../components/common/Badge";
import { Callout } from "../components/common/Callout";
import { HeroStat } from "../components/common/HeroStat";
import { AlertTriangleIcon, LayersIcon } from "../components/common/icons";
import { HistoricalDestinationView } from "../components/destination/HistoricalDestinationView";
import {
  DestinationIntelligenceRail,
  PathwayComparisonSection,
  type ComparisonRow,
  type EvidenceRow,
} from "../components/destination/DestinationIntelligenceRail";
import { DestinationTabs, DestinationTabContent, type Tab } from "../components/destination/NearbyLocationsPanel";
import { RelocationPlanningPanel } from "../components/destination/RelocationPlanningPanel";
import { HistoricalReplayToggle } from "../components/historical-replay/HistoricalReplayToggle";
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
import { useHistoricalReplay } from "../state/historicalReplayContext";
import { useSelection } from "../state/selectionContext";
import { statusTone } from "../utils/statusTone";
import type { PageId } from "../types/navigation";
import type { AmenitiesRequestState } from "../types/amenities";
import type { ApiBoundaryFeatureCollection } from "../types/gis";
import type { BuildingsRequestState } from "../types/buildings";
import type { ApiDestinationCandidate, DestinationRequestState } from "../types/destination";
import type { RoadsRequestState } from "../types/roads";
import type { GeojsonRequestState, SettlementRequestState } from "../types/settlement";
import type { WaterRequestState } from "../types/water";

// Bhitai Malli's id in the backend (see backend/app/database.py seed
// data) — the fallback whenever the officer hasn't explicitly selected
// a settlement elsewhere yet (Task 45.6's shared SelectionContext).
const BHITAI_MALLI_ID = 1;

function SettlementContextCard({
  settlementState,
  analysisStatus,
  hasCandidates,
}: {
  settlementState: SettlementRequestState;
  analysisStatus: string;
  hasCandidates: boolean;
}) {
  const settlement = settlementState.status === "success" ? settlementState.settlement : null;

  return (
    <div className="flex flex-col gap-3 rounded-vikalp-card border border-vikalp-border bg-vikalp-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-[28px] font-bold leading-tight text-vikalp-text">Destination &amp; Relocation</h1>
          {settlement ? (
            <>
              <span className="text-[17px] font-semibold text-vikalp-navy">{settlement.name}</span>
              <span className="text-[13px] text-vikalp-text-secondary">
                {settlement.district}, {settlement.state}
              </span>
              <span className="text-[12px] text-vikalp-text-secondary">
                {settlement.latitude.toFixed(6)}, {settlement.longitude.toFixed(6)}
              </span>
            </>
          ) : (
            <span className="text-base text-vikalp-text-secondary">Loading settlement context…</span>
          )}
        </div>

        {settlement && (
          <div className="flex gap-8">
            <HeroStat value={settlement.population} label="Population" />
            <HeroStat value={settlement.households} label="Households" />
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(() => {
          const assessmentText = analysisStatus === "complete" ? "Assessment Complete" : "Under Assessment";
          const destinationText = hasCandidates ? "Destination Data Available" : "Destination Data Unavailable";
          const planningText = "Planning Not Initiated";
          return (
            <>
              <Badge tone={statusTone(assessmentText)}>{assessmentText}</Badge>
              <Badge tone={statusTone(destinationText)}>{destinationText}</Badge>
              <Badge tone={statusTone(planningText)}>{planningText}</Badge>
            </>
          );
        })()}
      </div>
    </div>
  );
}

export function DestinationExplorerPage({
  activePage,
  onNavigate,
}: {
  activePage: PageId;
  onNavigate: (page: PageId) => void;
}) {
  const [state, setState] = useState<DestinationRequestState>({ status: "loading" });
  const [settlementState, setSettlementState] = useState<SettlementRequestState>({ status: "loading" });
  const [geojsonState, setGeojsonState] = useState<GeojsonRequestState>({ status: "loading" });
  const [boundaries, setBoundaries] = useState<ApiBoundaryFeatureCollection | null>(null);
  const [buildingsState, setBuildingsState] = useState<BuildingsRequestState>({ status: "loading" });
  const [roadsState, setRoadsState] = useState<RoadsRequestState>({ status: "loading" });
  const [waterState, setWaterState] = useState<WaterRequestState>({ status: "loading" });
  const [amenitiesState, setAmenitiesState] = useState<AmenitiesRequestState>({ status: "loading" });
  const [selectedCandidate, setSelectedCandidate] = useState<ApiDestinationCandidate | null>(null);
  const [tab, setTab] = useState<Tab>("government");
  const [layersOpen, setLayersOpen] = useState(false);
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
  const { active: historicalReplayActive } = useHistoricalReplay();

  const runFetch = useCallback(() => {
    setState({ status: "loading" });
    fetchSettlementDestinations(settlementId)
      .then((analysis) => setState({ status: "success", analysis }))
      .catch((error: unknown) =>
        setState({
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

  useEffect(() => {
    runFetch();
    runFetchGeojson();

    fetchSettlementById(settlementId)
      .then((settlement) => setSettlementState({ status: "success", settlement }))
      .catch((error: unknown) =>
        setSettlementState({
          status: "error",
          message: error instanceof Error ? error.message : "Unknown error.",
        }),
      );

    fetchSettlementBuildings(settlementId)
      .then((collection) => setBuildingsState({ status: "success", collection }))
      .catch((error: unknown) =>
        setBuildingsState({
          status: "unavailable",
          message: error instanceof Error ? error.message : "Not available for this settlement.",
        }),
      );

    fetchSettlementRoads(settlementId)
      .then((collection) => setRoadsState({ status: "success", collection }))
      .catch((error: unknown) =>
        setRoadsState({
          status: "unavailable",
          message: error instanceof Error ? error.message : "Not available for this settlement.",
        }),
      );

    fetchSettlementWater(settlementId)
      .then((collection) => setWaterState({ status: "success", collection }))
      .catch((error: unknown) =>
        setWaterState({
          status: "unavailable",
          message: error instanceof Error ? error.message : "Not available for this settlement.",
        }),
      );

    fetchSettlementAmenities(settlementId)
      .then((collection) => setAmenitiesState({ status: "success", collection }))
      .catch((error: unknown) =>
        setAmenitiesState({
          status: "unavailable",
          message: error instanceof Error ? error.message : "Not available for this settlement.",
        }),
      );
  }, [settlementId, runFetch, runFetchGeojson]);

  useEffect(() => {
    fetchBoundaries()
      .then((collection) => setBoundaries(collection))
      .catch(() => setBoundaries(null));
  }, []);

  const retry = () => runFetch();

  const analysis = state.status === "success" ? state.analysis : null;
  const candidates = analysis?.candidates ?? [];
  const topCandidate = candidates.length > 0 ? candidates[0] : null;

  const buildings = buildingsState.status === "success" ? buildingsState.collection : null;
  const roads = roadsState.status === "success" ? roadsState.collection : null;
  const water = waterState.status === "success" ? waterState.collection : null;
  const amenities = amenitiesState.status === "success" ? amenitiesState.collection : null;

  const readinessStages = analysis
    ? deriveReadinessStages(analysis, analysis.settlement_name)
    : [];

  const evidenceRows: EvidenceRow[] = analysis
    ? [
        {
          label: "Current Settlement",
          status: "Available",
          detail: analysis.settlement_name,
          onNavigate: () => onNavigate("map-intelligence"),
        },
        {
          label: "Destination Availability",
          status: topCandidate ? "Available" : "Not available",
          detail: topCandidate ? topCandidate.destination_name : "No government-curated destination",
          onNavigate: () => onNavigate("destination-explorer"),
        },
        {
          label: "Carrying Capacity",
          status: topCandidate?.available_area_hectares != null ? "Limited" : "Not integrated",
          onNavigate: () => onNavigate("relocation-planner"),
        },
        {
          label: "Access & Services",
          status: roads ? "Limited" : "Not integrated",
          onNavigate: () => onNavigate("map-intelligence"),
        },
        {
          label: "Relocation Planning",
          status: "Not integrated",
          onNavigate: () => onNavigate("relocation-planner"),
        },
      ]
    : [];

  const comparisonRows: ComparisonRow[] = [
    { aspect: "Evidence", protect: "Limited", adapt: "Limited", relocate: topCandidate ? "Limited" : "Not available" },
    { aspect: "Feasibility", protect: "Review", adapt: "Review", relocate: "Review" },
    { aspect: "Access", protect: roads ? "Limited" : "Not integrated", adapt: roads ? "Limited" : "Not integrated", relocate: "Not integrated" },
    { aspect: "Destination", protect: "—", adapt: "—", relocate: topCandidate ? "Available" : "Not available" },
  ];

  return (
    <SimplePageLayout activePage={activePage} onNavigate={onNavigate}>
      <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-7">
        <div className="flex flex-wrap items-center justify-end gap-3">
          <HistoricalReplayToggle />
        </div>

        {historicalReplayActive && <HistoricalDestinationView settlementId={settlementId} />}

        {!historicalReplayActive && state.status === "loading" && (
          <div className="flex flex-1 items-center justify-center">
            <span className="text-sm text-vikalp-text-secondary">Loading destination explorer…</span>
          </div>
        )}

        {!historicalReplayActive && state.status === "error" && (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
            <span className="text-base font-medium text-vikalp-critical">
              Destination explorer could not be loaded.
            </span>
            <span className="text-sm text-vikalp-text-secondary">{state.message}</span>
            <button
              type="button"
              onClick={retry}
              className="mt-1 rounded-md border border-vikalp-border px-3 py-1.5 text-[14px] font-medium text-vikalp-navy transition-colors hover:bg-vikalp-bg"
            >
              Retry
            </button>
          </div>
        )}

        {!historicalReplayActive && state.status === "success" && analysis && (
          <>
            <SettlementContextCard
              settlementState={settlementState}
              analysisStatus={analysis.analysis_status}
              hasCandidates={topCandidate !== null}
            />

            <div>
              <h2 className="text-[20px] font-semibold text-vikalp-text">Destination Exploration</h2>
              <p className="mt-1 text-[13px] text-vikalp-text-secondary">
                Explore potential relocation destinations and their suitability based on available
                evidence.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
              {/* Main column: ~68-72% on desktop (brief §2). The map is
                  the dominant element here — tabs/banner above it,
                  the location list below it, exactly per the brief's
                  suggested Destination Exploration structure. */}
              <div className="flex min-w-0 flex-col gap-5 lg:col-span-8">
                <DestinationTabs
                  tab={tab}
                  onChange={setTab}
                  candidatesCount={candidates.length}
                  nearbyCount={amenities?.features.length ?? 0}
                />

                {/* Map — the visual centerpiece (brief §8/§9): the same
                    shared VillageMap already used by Settlement/Risk/
                    Relocation Planner, with real buildings/roads/water/
                    services/boundaries and the candidate destination
                    marker when one exists. Only the surrounding
                    container/controls layout changed here — the map
                    itself, its data, and its worker are untouched. */}
                <div className="relative flex h-120 shrink-0 overflow-hidden rounded-vikalp-card border border-vikalp-border lg:h-140">
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
                    destinationCandidate={topCandidate}
                    onSelectDestination={() => topCandidate && setSelectedCandidate(topCandidate)}
                  />

                  <div className="absolute left-3 top-3 z-1200 flex flex-col items-start gap-2">
                    <TerrainMapControls
                      onZoomIn={() => mapHandleRef.current?.zoomIn()}
                      onZoomOut={() => mapHandleRef.current?.zoomOut()}
                      onTiltUp={() => mapHandleRef.current?.tiltUp()}
                      onTiltDown={() => mapHandleRef.current?.tiltDown()}
                      onReset={() => mapHandleRef.current?.resetView()}
                    />
                    {/* Layers panel: kept fully intact (VillageLayerControl
                        untouched), but collapsed behind a compact toggle
                        on this page only, so it no longer sits permanently
                        open over a large part of the map (brief §3). */}
                    <div className="flex flex-col items-start gap-2">
                      <button
                        type="button"
                        onClick={() => setLayersOpen((v) => !v)}
                        aria-expanded={layersOpen}
                        className={`pointer-events-auto flex items-center gap-1.5 rounded-md border border-vikalp-border bg-vikalp-card/95 px-2.5 py-2 text-[12px] font-medium transition-colors hover:bg-vikalp-bg ${
                          layersOpen ? "text-vikalp-navy" : "text-vikalp-text-secondary"
                        }`}
                      >
                        <LayersIcon className="h-3.5 w-3.5" />
                        Layers
                      </button>
                      {layersOpen && (
                        <VillageLayerControl
                          visibility={layerVisibility}
                          onToggle={(key) => setLayerVisibility((v) => ({ ...v, [key]: !v[key] }))}
                          buildingsAvailable={buildings !== null}
                          roadsAvailable={roads !== null}
                          waterAvailable={water !== null}
                          servicesAvailable={amenities !== null}
                          destinationAvailable={topCandidate !== null}
                        />
                      )}
                    </div>
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

                <DestinationTabContent
                  tab={tab}
                  candidates={candidates}
                  amenities={amenities}
                  onSelectCandidate={setSelectedCandidate}
                />
              </div>

              {/* Evidence rail: ~28-32% on desktop, narrower and less
                  visually dominant than the map (brief §5). */}
              <div className="lg:sticky lg:top-20 lg:col-span-4 lg:self-start">
                <DestinationIntelligenceRail evidenceRows={evidenceRows} />
              </div>
            </div>

            <RelocationReadinessPipeline stages={readinessStages} />

            <PathwayComparisonSection rows={comparisonRows} />

            <RelocationPlanningPanel onOpenPlanner={() => onNavigate("relocation-planner")} />

            <div className="flex flex-col gap-2 rounded-vikalp-card border border-vikalp-border bg-vikalp-card p-4">
              <h2 className="text-[15px] font-semibold text-vikalp-navy">Quick Actions</h2>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onNavigate("relocation-planner")}
                  className="rounded-md border border-vikalp-border px-3 py-1.5 text-[13px] font-medium text-vikalp-navy transition-colors hover:border-vikalp-warning hover:bg-vikalp-warning/10"
                >
                  Open Relocation Planner
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate("data-governance")}
                  className="rounded-md border border-vikalp-border px-3 py-1.5 text-[13px] font-medium text-vikalp-navy transition-colors hover:border-vikalp-warning hover:bg-vikalp-warning/10"
                >
                  View Evidence
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate("decision-workspace")}
                  className="rounded-md border border-vikalp-border px-3 py-1.5 text-[13px] font-medium text-vikalp-navy transition-colors hover:border-vikalp-warning hover:bg-vikalp-warning/10"
                >
                  Review Decision
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate("decision-workspace")}
                  className="rounded-md border border-vikalp-border px-3 py-1.5 text-[13px] font-medium text-vikalp-navy transition-colors hover:border-vikalp-warning hover:bg-vikalp-warning/10"
                >
                  Add Officer Notes
                </button>
              </div>
            </div>

            <Callout icon={<AlertTriangleIcon className="h-4 w-4" />}>{analysis.officer_review_note}</Callout>
          </>
        )}
      </div>

      <CandidateDetailDrawer
        candidate={selectedCandidate}
        open={selectedCandidate !== null}
        onClose={() => setSelectedCandidate(null)}
      />
    </SimplePageLayout>
  );
}
