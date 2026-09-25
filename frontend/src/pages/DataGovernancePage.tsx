import { useEffect, useState } from "react";
import { EvidenceCategoryCard } from "../components/evidence-locker/EvidenceCategoryCard";
import { EvidenceCopilotChip } from "../components/evidence-locker/EvidenceCopilotChip";
import { EvidenceDrawer } from "../components/evidence-locker/EvidenceDrawer";
import { EvidenceHistoricalBanner } from "../components/evidence-locker/EvidenceHistoricalBanner";
import type { EvidenceLayerVisibility } from "../components/evidence-locker/EvidenceLayerControl";
import { EvidenceMap } from "../components/evidence-locker/EvidenceMap";
import type { EvidenceRadiusSelection } from "../components/evidence-locker/EvidenceRadiusControl";
import { EvidenceSnapshotStrip } from "../components/evidence-locker/EvidenceSnapshotStrip";
import { EvidenceSpatialSummaryStrip } from "../components/evidence-locker/EvidenceSpatialSummaryStrip";
import { EvidenceTimeline } from "../components/evidence-locker/EvidenceTimeline";
import { GsiSpatialRelationshipDiagram } from "../components/evidence-locker/GsiSpatialRelationshipDiagram";
import { DerivedOutputTraceability } from "../components/evidence-locker/TraceabilityChain";
import { HistoricalReplayToggle } from "../components/historical-replay/HistoricalReplayToggle";
import { SimplePageLayout } from "../components/layout/SimplePageLayout";
import { EVIDENCE_RECORDS } from "../data/evidenceRecords";
import { buildEvidenceCategories } from "../data/evidenceCategories";
import { summarizeEvidenceStrength, HISTORICAL_EVIDENCE_CATEGORIES } from "../data/historicalReplay";
import { fetchBoundaries } from "../services/gis";
import { fetchGsiLandslideCount } from "../services/evidenceTiles";
import { fetchSettlementRisk } from "../services/risk";
import { fetchSettlementById } from "../services/settlements";
import { useHistoricalReplay } from "../state/historicalReplayContext";
import { useSelection } from "../state/selectionContext";
import type { ApiBoundaryFeatureCollection, ApiLandslideProperties } from "../types/gis";
import type { ApiSettlement } from "../types/settlement";
import type { PageId } from "../types/navigation";

const BHITAI_MALLI_ID = 1;

const EVIDENCE_STATE_STATUS_TEXT: Record<string, string> = {
  available: "Available",
  "review-required": "Review Required",
  blocked: "Blocked",
  unavailable: "Unavailable",
};

// Task 45.8 — Evidence workspace visual redesign, second generation.
// Builds on the prior redesign task's layout (map-dominant, drawer
// instead of a permanent panel, visual provenance) and adds: the GSI
// landslide layer now loads via real Mapbox Vector Tiles instead of
// one full-GeoJSON fetch (backend/app/services/gis_tiles.py), a 1 km/
// 5 km spatial evidence radius control, a compact layer control, a
// spatial-relationship diagram, and an expanded 7-category/5-state
// evidence matrix. Nothing about evidence governance, historical
// replay governance, risk scoring, or the underlying data changed —
// still the same real endpoints, still the same EVIDENCE_RECORDS
// catalog. `fetchLandslides()` (the full-GeoJSON endpoint) is
// deliberately no longer called here — the whole point of vector
// tiles is that the browser never downloads the full 813-feature
// dataset; the real total count still shown in the UI comes from a
// tiny new /count endpoint that returns a number, never geometry.
export function DataGovernancePage({
  activePage,
  onNavigate,
}: {
  activePage: PageId;
  onNavigate: (page: PageId) => void;
}) {
  const { selectedSettlementId } = useSelection();
  const settlementId = selectedSettlementId ?? BHITAI_MALLI_ID;
  const { active: historicalReplayActive } = useHistoricalReplay();

  const [boundaries, setBoundaries] = useState<ApiBoundaryFeatureCollection | null>(null);
  const [settlement, setSettlement] = useState<ApiSettlement | null>(null);
  const [gsiFeatureCount, setGsiFeatureCount] = useState<number | null>(null);
  const [boundaryFeatureCount, setBoundaryFeatureCount] = useState<number | null>(null);
  const [hazard, setHazard] = useState<{
    status: string;
    qualifyingRecordCount: number;
    scoringRadiusKm: number;
    nearestContextualDistanceKm: number | null;
    contextualRecordCount: number;
    contextRadiusKm: number;
  } | null>(null);

  const [selectedRecordIds, setSelectedRecordIds] = useState<string[] | null>(null);
  const [selectedTitle, setSelectedTitle] = useState("");
  const [selectedGsiFeature, setSelectedGsiFeature] = useState<ApiLandslideProperties | null>(null);

  const [layerVisibility, setLayerVisibility] = useState<EvidenceLayerVisibility>({
    boundaries: true,
    settlement: true,
    gsi: true,
  });
  const [radiusSelection, setRadiusSelection] = useState<EvidenceRadiusSelection>(null);

  useEffect(() => {
    fetchGsiLandslideCount()
      .then((result) => setGsiFeatureCount(result.count))
      .catch(() => setGsiFeatureCount(null));

    fetchBoundaries()
      .then((collection) => {
        setBoundaries(collection);
        setBoundaryFeatureCount(collection.features.length);
      })
      .catch(() => {
        setBoundaries(null);
        setBoundaryFeatureCount(null);
      });

    fetchSettlementRisk(settlementId)
      .then((assessment) => {
        const detail = assessment.dimensions.find((d) => d.dimension === "Hazard Exposure")
          ?.hazard_exposure_detail;
        if (detail) {
          setHazard({
            status: detail.status,
            qualifyingRecordCount: detail.qualifying_record_count,
            scoringRadiusKm: detail.scoring_radius_km,
            nearestContextualDistanceKm: detail.nearest_contextual_distance_km,
            contextualRecordCount: detail.contextual_record_count,
            contextRadiusKm: detail.context_radius_km,
          });
        }
      })
      .catch(() => setHazard(null));

    fetchSettlementById(settlementId)
      .then((result) => setSettlement(result))
      .catch(() => setSettlement(null));
  }, [settlementId]);

  const mode = historicalReplayActive ? "historical" : "current";
  const categories = buildEvidenceCategories({
    gsiFeatureCount,
    hazard: hazard
      ? {
          qualifyingRecordCount: hazard.qualifyingRecordCount,
          nearestContextualDistanceKm: hazard.nearestContextualDistanceKm,
          contextualRecordCount: hazard.contextualRecordCount,
        }
      : null,
    settlement: settlement
      ? {
          population: settlement.population,
          households: settlement.households,
          elevationM: settlement.elevation_m,
          slopeDegrees: settlement.slope_degrees,
        }
      : null,
  });
  const terrainCategory = categories.find((c) => c.id === "terrain");

  const strengthSummary = summarizeEvidenceStrength(HISTORICAL_EVIDENCE_CATEGORIES);

  const openDrawer = (recordIds: string[], title: string) => {
    setSelectedGsiFeature(null);
    setSelectedRecordIds(recordIds);
    setSelectedTitle(title);
  };

  const openGsiFeatureDrawer = (properties: ApiLandslideProperties) => {
    setSelectedGsiFeature(properties);
    setSelectedRecordIds(["gsi-nlfc-landslide-inventory"]);
    setSelectedTitle("GSI Landslide Inventory");
  };

  return (
    <SimplePageLayout activePage={activePage} onNavigate={onNavigate}>
      <div className="flex flex-col gap-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <h1 className="text-[28px] font-bold leading-tight text-vikalp-text">Evidence</h1>
            <span className="text-base text-vikalp-text-secondary">
              Verified spatial and source evidence for officer review —{" "}
              {settlement ? settlement.name : "Bhitai Malli"},{" "}
              {settlement ? `${settlement.district}, ${settlement.state}` : "Pauri Garhwal, Uttarakhand"}
            </span>
          </div>
          <HistoricalReplayToggle />
        </div>

        {historicalReplayActive && <EvidenceHistoricalBanner />}

        {/* Main area — map is supporting evidence, not the majority of
            the page (global typography/map-proportion refinement,
            brief §7): rebalanced from 62/38 to a closer 55/45 split,
            and the map's own height capped a bit lower so the
            evidence intelligence panel stays comfortably visible. */}
        <div className="flex flex-col gap-5 lg:flex-row">
          <div className="flex flex-col gap-3 lg:w-[55%]">
            <div className="h-100 shrink-0 lg:h-110">
              <EvidenceMap
                mode={mode}
                boundaries={boundaries}
                settlement={settlement}
                layerVisibility={layerVisibility}
                radiusSelection={radiusSelection}
                onRadiusChange={setRadiusSelection}
                onLayerToggle={(key) => setLayerVisibility((v) => ({ ...v, [key]: !v[key] }))}
                onSelectGsiFeature={openGsiFeatureDrawer}
              />
            </div>
            <EvidenceSpatialSummaryStrip
              withinOneKm={hazard?.qualifyingRecordCount ?? null}
              withinFiveKm={hazard?.contextualRecordCount ?? null}
              nearestKm={hazard?.nearestContextualDistanceKm ?? null}
              terrainStatus={terrainCategory ? EVIDENCE_STATE_STATUS_TEXT[terrainCategory.state] : "Not available"}
            />
          </div>
          <div className="flex flex-col gap-4 lg:w-[45%]">
            <GsiSpatialRelationshipDiagram
              settlementName={settlement ? settlement.name : "Bhitai Malli"}
              withinOneKm={hazard?.qualifyingRecordCount ?? null}
              withinFiveKm={hazard?.contextualRecordCount ?? null}
              nearestKm={hazard?.nearestContextualDistanceKm ?? null}
            />
            <EvidenceSnapshotStrip records={EVIDENCE_RECORDS} />
            <EvidenceCopilotChip onClick={() => onNavigate("copilot")} />
          </div>
        </div>

        {historicalReplayActive && (
          <EvidenceTimeline
            evidenceAvailableCount={strengthSummary.available + strengthSummary.limited}
            evidenceTotalCount={strengthSummary.total}
          />
        )}

        {/* Evidence category matrix — 7 categories, 5 states. */}
        <div className="flex flex-col gap-3">
          <h2 className="text-[20px] font-semibold text-vikalp-navy">Evidence categories</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <EvidenceCategoryCard
                key={category.id}
                data={category}
                onSelect={() => openDrawer(category.recordIds, category.category)}
              />
            ))}
          </div>
        </div>

        <DerivedOutputTraceability
          hazardQualifying={hazard?.qualifyingRecordCount ?? null}
          hazardNearestKm={hazard?.nearestContextualDistanceKm ?? null}
          onSelectHazardChain={() => openDrawer(["gsi-nlfc-landslide-inventory"], "Hazard")}
          onSelectTerrainChain={() => openDrawer(["cartodem-terrain", "vikalp-derived-slope"], "Terrain")}
        />
      </div>

      <EvidenceDrawer
        open={selectedRecordIds !== null}
        recordIds={selectedRecordIds ?? []}
        title={selectedTitle}
        historicalReplayActive={historicalReplayActive}
        selectedGsiFeature={selectedGsiFeature}
        onExplainWithCopilot={() => onNavigate("copilot")}
        live={{
          gsiFeatureCount,
          boundaryFeatureCount,
          hazard,
          settlement: settlement
            ? {
                population: settlement.population,
                households: settlement.households,
                elevationM: settlement.elevation_m,
                slopeDegrees: settlement.slope_degrees,
              }
            : null,
        }}
        onClose={() => {
          setSelectedRecordIds(null);
          setSelectedGsiFeature(null);
        }}
      />
    </SimplePageLayout>
  );
}
