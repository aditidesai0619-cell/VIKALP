import { useCallback, useEffect, useState } from "react";
import { Badge } from "../components/common/Badge";
import { Callout } from "../components/common/Callout";
import { HeroStat } from "../components/common/HeroStat";
import {
  AlertTriangleIcon,
  ArchiveClockIcon,
  HeartPulseIcon,
  MapPinIcon,
  MountainIcon,
  RoadIcon,
  ShieldIcon,
  SlidersIcon,
  UsersIcon,
} from "../components/common/icons";
import {
  DecisionIntelligenceRail,
  type ComparisonRow,
  type EvidenceRow,
} from "../components/decision/DecisionIntelligenceRail";
import { OFFICER_REVIEW_PANEL_ID, OfficerReviewPanel } from "../components/decision/OfficerReviewPanel";
import { PathwayCard, type PathwayEvidenceItem } from "../components/decision/PathwayCard";
import { SimplePageLayout } from "../components/layout/SimplePageLayout";
import { fetchSettlementAmenities } from "../services/amenities";
import { fetchSettlementBuildings } from "../services/buildings";
import { fetchSettlementDecision } from "../services/decision";
import { fetchSettlementDestinations } from "../services/destination";
import { fetchSettlementRisk } from "../services/risk";
import { fetchSettlementRoads } from "../services/roads";
import { fetchSettlementById } from "../services/settlements";
import { useSelection } from "../state/selectionContext";
import { formatStatusLabel } from "../utils/formatStatus";
import { statusTone } from "../utils/statusTone";
import type { PageId } from "../types/navigation";
import type { AmenitiesRequestState } from "../types/amenities";
import type { BuildingsRequestState } from "../types/buildings";
import type { DecisionRequestState } from "../types/decision";
import type { DestinationRequestState } from "../types/destination";
import type { RiskRequestState } from "../types/risk";
import type { RoadsRequestState } from "../types/roads";
import type { SettlementRequestState } from "../types/settlement";

// Bhitai Malli's id in the backend (see backend/app/database.py seed
// data) — the fallback whenever the officer hasn't explicitly selected
// a settlement elsewhere yet (Task 45.6's shared SelectionContext).
const BHITAI_MALLI_ID = 1;

const CARTODEM_DERIVED_SLOPE_DEGREES = 22.58;

function SettlementContextCard({
  decisionState,
  settlementState,
  riskState,
  onExploreDestinations,
}: {
  decisionState: DecisionRequestState;
  settlementState: SettlementRequestState;
  riskState: RiskRequestState;
  onExploreDestinations: () => void;
}) {
  if (decisionState.status === "loading") {
    return (
      <div className="flex items-center justify-center rounded-vikalp-card border border-vikalp-border bg-vikalp-card p-8">
        <span className="text-sm text-vikalp-text-secondary">Loading decision workspace…</span>
      </div>
    );
  }

  if (decisionState.status === "error") {
    return (
      <div className="flex flex-col items-center gap-2 rounded-vikalp-card border border-vikalp-border bg-vikalp-card p-8 text-center">
        <span className="text-base font-medium text-vikalp-critical">
          Decision workspace could not be loaded.
        </span>
        <span className="text-sm text-vikalp-text-secondary">{decisionState.message}</span>
      </div>
    );
  }

  const decision = decisionState.decision;
  const settlement = settlementState.status === "success" ? settlementState.settlement : null;
  const isRiskPending = decision.risk_assessment_status !== "complete";
  const isDecisionPending = decision.decision_status !== "evaluated";

  const evidenceCoverage =
    riskState.status === "success"
      ? (() => {
          const dims = riskState.assessment.dimensions;
          const withEvidence = dims.filter(
            (d) => d.evidence.length > 0 || (d.hazard_exposure_detail?.contextual_record_count ?? 0) > 0,
          ).length;
          return `Evidence available across ${withEvidence} of ${dims.length} risk dimensions`;
        })()
      : "Evidence coverage not yet loaded";

  const riskBadgeText = isRiskPending ? "Assessment Pending" : formatStatusLabel(decision.risk_assessment_status);
  const decisionBadgeText = isDecisionPending ? "Decision Pending" : formatStatusLabel(decision.decision_status);

  return (
    <div className="flex flex-col gap-5 rounded-vikalp-card border border-vikalp-border bg-vikalp-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold leading-tight text-vikalp-text">Decision Workspace</h1>
        <button
          type="button"
          onClick={onExploreDestinations}
          className="rounded-md border border-vikalp-border px-3.5 py-2 text-sm font-medium text-vikalp-navy transition-colors hover:border-vikalp-warning hover:bg-vikalp-warning/10"
        >
          Explore Destinations →
        </button>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-lg font-semibold text-vikalp-navy">{decision.settlement_name}</span>
          <span className="text-sm text-vikalp-text-secondary">
            {decision.settlement_district}, {decision.settlement_state}
          </span>
          {settlement && (
            <span className="text-xs text-vikalp-text-secondary">
              {settlement.latitude.toFixed(6)}, {settlement.longitude.toFixed(6)}
            </span>
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
        <Badge tone={statusTone(riskBadgeText)}>{riskBadgeText}</Badge>
        <Badge tone={statusTone(decisionBadgeText)}>{decisionBadgeText}</Badge>
        <span className="text-xs text-vikalp-text-secondary">{evidenceCoverage}</span>
      </div>

      <p className="text-base text-vikalp-text">{decision.explanation}</p>

      <Callout icon={<AlertTriangleIcon className="h-4 w-4" />}>
        {decision.officer_review_note} VIKALP does not issue relocation orders — officer approval
        remains final.
      </Callout>
    </div>
  );
}

export function DecisionWorkspacePage({
  activePage,
  onNavigate,
}: {
  activePage: PageId;
  onNavigate: (page: PageId) => void;
}) {
  const [decisionState, setDecisionState] = useState<DecisionRequestState>({ status: "loading" });
  const [settlementState, setSettlementState] = useState<SettlementRequestState>({ status: "loading" });
  const [riskState, setRiskState] = useState<RiskRequestState>({ status: "loading" });
  const [buildingsState, setBuildingsState] = useState<BuildingsRequestState>({ status: "loading" });
  const [roadsState, setRoadsState] = useState<RoadsRequestState>({ status: "loading" });
  const [amenitiesState, setAmenitiesState] = useState<AmenitiesRequestState>({ status: "loading" });
  const [destinationState, setDestinationState] = useState<DestinationRequestState>({ status: "loading" });

  const [selectedPathway, setSelectedPathway] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [rationale, setRationale] = useState("");
  const [saved, setSaved] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const { selectedSettlementId } = useSelection();
  const settlementId = selectedSettlementId ?? BHITAI_MALLI_ID;

  const runFetchDecision = useCallback(() => {
    setDecisionState({ status: "loading" });
    fetchSettlementDecision(settlementId)
      .then((decision) => setDecisionState({ status: "success", decision }))
      .catch((error: unknown) =>
        setDecisionState({
          status: "error",
          message: error instanceof Error ? error.message : "Unknown error.",
        }),
      );
  }, [settlementId]);

  useEffect(() => {
    runFetchDecision();

    fetchSettlementById(settlementId)
      .then((settlement) => setSettlementState({ status: "success", settlement }))
      .catch((error: unknown) =>
        setSettlementState({
          status: "error",
          message: error instanceof Error ? error.message : "Unknown error.",
        }),
      );

    fetchSettlementRisk(settlementId)
      .then((assessment) => setRiskState({ status: "success", assessment }))
      .catch((error: unknown) =>
        setRiskState({ status: "error", message: error instanceof Error ? error.message : "Unknown error." }),
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

    fetchSettlementAmenities(settlementId)
      .then((collection) => setAmenitiesState({ status: "success", collection }))
      .catch((error: unknown) =>
        setAmenitiesState({
          status: "unavailable",
          message: error instanceof Error ? error.message : "Not available for this settlement.",
        }),
      );

    fetchSettlementDestinations(settlementId)
      .then((analysis) => setDestinationState({ status: "success", analysis }))
      .catch((error: unknown) =>
        setDestinationState({
          status: "error",
          message: error instanceof Error ? error.message : "Unknown error.",
        }),
      );
  }, [settlementId, runFetchDecision]);

  // Selecting a new settlement invalidates any in-progress, session-only
  // review — it was written about a different settlement.
  useEffect(() => {
    setSelectedPathway(null);
    setNotes("");
    setRationale("");
    setSaved(false);
    setSavedAt(null);
  }, [settlementId]);

  const handleSave = () => {
    setSaved(true);
    setSavedAt(new Date().toLocaleTimeString());
  };

  const handleSelectPathway = (pathway: string | null) => {
    setSelectedPathway((current) => (current === pathway ? null : pathway));
    setSaved(false);
  };

  const handleAddOfficerNotes = () => {
    document.getElementById(OFFICER_REVIEW_PANEL_ID)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (decisionState.status !== "success") {
    return (
      <SimplePageLayout activePage={activePage} onNavigate={onNavigate}>
        <div className="flex flex-col gap-4">
          <SettlementContextCard
            decisionState={decisionState}
            settlementState={settlementState}
            riskState={riskState}
            onExploreDestinations={() => onNavigate("destination-explorer")}
          />
          {decisionState.status === "error" && (
            <button
              type="button"
              onClick={runFetchDecision}
              className="self-center rounded-md border border-vikalp-border px-3 py-1.5 text-sm font-medium text-vikalp-navy transition-colors hover:bg-vikalp-bg"
            >
              Retry
            </button>
          )}
        </div>
      </SimplePageLayout>
    );
  }

  const decision = decisionState.decision;
  const settlement = settlementState.status === "success" ? settlementState.settlement : null;
  const assessment = riskState.status === "success" ? riskState.assessment : null;
  const hazard = assessment?.dimensions.find((d) => d.dimension === "Hazard Exposure") ?? null;
  const hazardDetail = hazard?.hazard_exposure_detail ?? null;
  const terrain = assessment?.dimensions.find((d) => d.dimension === "Terrain / Physical Susceptibility") ?? null;
  const vulnerability = assessment?.dimensions.find((d) => d.dimension === "Vulnerability") ?? null;

  const roads = roadsState.status === "success" ? roadsState.collection : null;
  const buildings = buildingsState.status === "success" ? buildingsState.collection : null;
  const amenities = amenitiesState.status === "success" ? amenitiesState.collection : null;
  const analysis = destinationState.status === "success" ? destinationState.analysis : null;
  const candidates = analysis?.candidates ?? [];
  const topCandidate = candidates.length > 0 ? candidates[0] : null;

  const protectPathway = decision.pathways.find((p) => p.pathway === "Protect");
  const adaptPathway = decision.pathways.find((p) => p.pathway === "Adapt");
  const relocatePathway = decision.pathways.find((p) => p.pathway === "Relocate");

  const sharedConstraint =
    "No approved pathway-evaluation rule exists yet for Protect, Adapt, or Relocate.";

  // §7 — Protect's own key evidence.
  const protectEvidence: PathwayEvidenceItem[] = [
    {
      label: "Terrain & Slope",
      value:
        terrain && terrain.evidence.length > 0
          ? `${settlement?.elevation_m ?? "—"} m, ${settlement?.slope_degrees ?? "—"}° stored / ${CARTODEM_DERIVED_SLOPE_DEGREES}° derived`
          : "No evidence",
    },
    {
      label: "Hazard Exposure",
      value: hazardDetail ? `${hazardDetail.contextual_record_count} GSI records (${hazardDetail.qualifying_record_count} qualifying)` : "No evidence",
    },
    {
      label: "Access / Roads",
      value: roads ? `${roads.features.length} mapped segments (OSM)` : "Not integrated",
    },
  ];
  const protectAvailableCount = [terrain && terrain.evidence.length > 0, !!hazardDetail, !!roads].filter(Boolean).length;

  // §8 — Adapt's own key evidence.
  const adaptEvidence: PathwayEvidenceItem[] = [
    {
      label: "Population / Households",
      value: settlement ? `${settlement.population} people, ${settlement.households} households` : "No evidence",
    },
    {
      label: "Mapped services",
      value: amenities ? `${amenities.features.length} mapped (OSM)` : "Not integrated",
    },
    {
      label: "Vulnerability",
      value: vulnerability && vulnerability.status !== "no_data" ? "Available" : "Not integrated",
    },
    {
      label: "Buildings",
      value: buildings ? `${buildings.features.length} footprints (Open Buildings)` : "Not integrated",
    },
  ];
  const adaptAvailableCount = [!!settlement, !!(amenities && amenities.features.length > 0), vulnerability?.status !== "no_data", !!buildings].filter(Boolean).length;

  // §9 — Relocate's own key evidence: every negative here is a real,
  // currently-true fact (0 candidates for Bhitai Malli), never a
  // fabricated destination/capacity/route.
  const relocateEvidence: PathwayEvidenceItem[] = [
    {
      label: "Current settlement evidence",
      value: terrain && hazardDetail ? "Available (terrain + hazard)" : "Limited",
    },
    {
      label: "Destination availability",
      value: topCandidate ? topCandidate.destination_name : "No government-curated destination",
    },
    {
      label: "Carrying capacity",
      value: topCandidate?.available_area_hectares != null ? `${topCandidate.available_area_hectares} ha` : "Capacity data unavailable",
    },
    {
      label: "Access & services",
      value: "Route analysis not integrated",
    },
  ];
  const relocateAvailableCount = [!!(terrain && hazardDetail), !!topCandidate, topCandidate?.available_area_hectares != null].filter(Boolean).length;

  const statusFor = (available: number, total: number): "Available" | "Limited" | "Not integrated" => {
    if (available === 0) return "Not integrated";
    if (available === total) return "Available";
    return "Limited";
  };

  const evidenceRows: EvidenceRow[] = [
    {
      label: "Terrain & Slope",
      status: terrain && terrain.evidence.length > 0 ? "Available" : "Not integrated",
      icon: <MountainIcon className="h-4 w-4" />,
      onNavigate: () => onNavigate("risk-analysis"),
    },
    {
      label: "Hazard",
      status: hazardDetail ? "Available" : "Not integrated",
      icon: <AlertTriangleIcon className="h-4 w-4" />,
      onNavigate: () => onNavigate("risk-analysis"),
    },
    {
      label: "Historical Disaster",
      status: "Not integrated",
      icon: <ArchiveClockIcon className="h-4 w-4" />,
      onNavigate: () => onNavigate("risk-analysis"),
    },
    {
      label: "Population",
      status: settlement ? "Available" : "Not integrated",
      icon: <UsersIcon className="h-4 w-4" />,
      onNavigate: () => onNavigate("risk-analysis"),
    },
    {
      label: "Vulnerability",
      status: vulnerability && vulnerability.status !== "no_data" ? "Available" : "Not integrated",
      icon: <HeartPulseIcon className="h-4 w-4" />,
      onNavigate: () => onNavigate("risk-analysis"),
    },
    {
      label: "Infrastructure / Access",
      status: roads ? "Limited" : "Not integrated",
      icon: <RoadIcon className="h-4 w-4" />,
      onNavigate: () => onNavigate("map-intelligence"),
    },
  ];

  const comparisonRows: ComparisonRow[] = [
    {
      aspect: "Evidence",
      protect: statusFor(protectAvailableCount, protectEvidence.length),
      adapt: statusFor(adaptAvailableCount, adaptEvidence.length),
      relocate: statusFor(relocateAvailableCount, relocateEvidence.length),
    },
    { aspect: "Feasibility", protect: "Review", adapt: "Review", relocate: "Review" },
    {
      aspect: "Access",
      protect: roads ? "Limited" : "Not integrated",
      adapt: roads ? "Limited" : "Not integrated",
      relocate: "Not integrated",
    },
    {
      aspect: "Destination",
      protect: "—",
      adapt: "—",
      relocate: topCandidate ? "Available" : "Not available",
    },
  ];

  const pathwayCards = [
    protectPathway && {
      icon: <ShieldIcon className="h-5 w-5" />,
      pathway: protectPathway,
      evidenceStatus: statusFor(protectAvailableCount, protectEvidence.length),
      keyEvidence: protectEvidence,
      constraints: [...protectPathway.evidence_required, sharedConstraint],
    },
    adaptPathway && {
      icon: <SlidersIcon className="h-5 w-5" />,
      pathway: adaptPathway,
      evidenceStatus: statusFor(adaptAvailableCount, adaptEvidence.length),
      keyEvidence: adaptEvidence,
      constraints: [...adaptPathway.evidence_required, sharedConstraint],
    },
    relocatePathway && {
      icon: <MapPinIcon className="h-5 w-5" />,
      pathway: relocatePathway,
      evidenceStatus: statusFor(relocateAvailableCount, relocateEvidence.length),
      keyEvidence: relocateEvidence,
      constraints: [...relocatePathway.evidence_required, sharedConstraint],
    },
  ].filter((c): c is NonNullable<typeof c> => !!c);

  const quickActions: { label: string; onClick: () => void }[] = [
    { label: "View Evidence", onClick: () => onNavigate("data-governance") },
    { label: "Review Risk Assessment", onClick: () => onNavigate("risk-analysis") },
    { label: "Explore Destinations", onClick: () => onNavigate("destination-explorer") },
    { label: "Open Relocation Planner", onClick: () => onNavigate("relocation-planner") },
    { label: "Add Officer Notes", onClick: handleAddOfficerNotes },
  ];

  return (
    <SimplePageLayout activePage={activePage} onNavigate={onNavigate}>
      <div className="flex flex-col gap-12">
        <SettlementContextCard
          decisionState={decisionState}
          settlementState={settlementState}
          riskState={riskState}
          onExploreDestinations={() => onNavigate("destination-explorer")}
        />

        {/* 12-column grid — pathways + officer review take 8 cols, the
            evidence/comparison/status rail takes 4 and stays sticky
            while the main column scrolls past it. */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="flex min-w-0 flex-col gap-6 lg:col-span-8">
            <div>
              <h2 className="text-xl font-semibold text-vikalp-text">Intervention Pathways</h2>
              <p className="text-sm text-vikalp-text-secondary">
                Compare available pathways using the current evidence. No pathway is selected yet.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {pathwayCards.map((card) => (
                <PathwayCard
                  key={card.pathway.pathway}
                  icon={card.icon}
                  pathway={card.pathway}
                  evidenceStatus={card.evidenceStatus}
                  keyEvidence={card.keyEvidence}
                  constraints={card.constraints}
                  selected={selectedPathway === card.pathway.pathway}
                  onSelect={() => handleSelectPathway(card.pathway.pathway)}
                />
              ))}
            </div>

            <OfficerReviewPanel
              selectedPathway={selectedPathway}
              onSelectPathway={handleSelectPathway}
              notes={notes}
              onNotesChange={setNotes}
              rationale={rationale}
              onRationaleChange={setRationale}
              saved={saved}
              savedAt={savedAt}
              onSave={handleSave}
            />

            <div className="flex flex-col gap-3 rounded-vikalp-card border border-vikalp-border bg-vikalp-card p-6">
              <h2 className="text-lg font-semibold text-vikalp-navy">Quick Actions</h2>
              <div className="flex flex-wrap gap-2">
                {quickActions.map((action) => (
                  <button
                    key={action.label}
                    type="button"
                    onClick={action.onClick}
                    className="rounded-md border border-vikalp-border px-3.5 py-2 text-sm font-medium text-vikalp-navy transition-colors hover:border-vikalp-warning hover:bg-vikalp-warning/10"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:sticky lg:top-20 lg:col-span-4 lg:self-start">
            <DecisionIntelligenceRail
              evidenceRows={evidenceRows}
              comparisonRows={comparisonRows}
              decisionStatus={{
                pathwaySelected: selectedPathway ?? "Not selected",
                officerReview: decision.officer_review_required ? "Required" : "Not required",
                evidence: assessment ? formatStatusLabel(assessment.data_completeness) : "Loading…",
                approval: "Not initiated",
              }}
            />
          </div>
        </div>
      </div>
    </SimplePageLayout>
  );
}
