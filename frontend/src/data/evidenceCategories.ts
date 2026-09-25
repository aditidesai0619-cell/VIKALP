// Task 45.8 — Evidence workspace visual redesign, evidence category
// matrix (brief §9): 7 categories (Terrain, Hazard, Historical
// Disaster, Population, Vulnerability, Infrastructure & Access,
// Destination Evidence), each in one of 5 states (AVAILABLE / REVIEW
// REQUIRED / BLOCKED / UNAVAILABLE / FUTURE). Built from real values
// only: the existing EVIDENCE_RECORDS static catalog (unchanged) plus
// whatever live values DataGovernancePage already fetches, exactly as
// the prior Evidence redesign task did. Current Assessment and
// Historical Replay share this same underlying data — VIKALP's
// terrain/hazard/settlement facts don't differ between the two views.
//
// State assignment is a direct read of each category's real, already-
// documented VIKALP status (docs/DECISIONS.md, EVIDENCE_RECORDS' own
// `status`/`limitations` fields) — never a guess:
//   - Terrain: REVIEW REQUIRED — real DEM/slope data exists, but the
//     stored (18.91°) vs. CartoDEM-derived (22.58°) values disagree
//     and remain unreconciled (brief's own worked example).
//   - Hazard: AVAILABLE — real GSI/NLFC inventory integrated and
//     already used by Hazard Exposure scoring (brief's own worked
//     example).
//   - Historical Disaster: UNAVAILABLE — permanent no_data stub
//     (backend/app/services/risk.py), zero casualty/damage/date
//     evidence in the source inventory.
//   - Population: REVIEW REQUIRED — real current figures exist, but
//     are an uncited demo planning input with no scoring rule.
//   - Vulnerability: UNAVAILABLE — zero data of any kind (housing
//     type, distance-to-service, economic index — none integrated).
//   - Infrastructure & Access: UNAVAILABLE — zero road/water/
//     electricity/health/school data, current or historical.
//   - Destination Evidence: BLOCKED — not simply "no data": destination.py
//     is a deliberate structural-framework-only design (Task 30,
//     "NOT IMPLEMENTATION-READY"), always returns an empty candidate
//     list by policy pending a real government-curated dataset.
// No category maps to FUTURE (a roadmap item distinct from any of the
// above) — none of the 7 real categories genuinely fits that state
// today, so it is left unused rather than force-fit.

export type EvidenceState = "available" | "review-required" | "blocked" | "unavailable";

export const EVIDENCE_STATE_LABEL: Record<EvidenceState, string> = {
  available: "Available",
  "review-required": "Review Required",
  blocked: "Blocked",
  unavailable: "Unavailable",
};

// Restrained semantic colors per the brief's §9 palette — teal/blue
// for available, amber for review required, muted grey/purple for
// blocked/unavailable. No bright red/green (no approved risk
// classification exists for any of these categories).
export const EVIDENCE_STATE_TONE: Record<EvidenceState, string> = {
  available: "border-[#4c8ba8]/40 bg-[#4c8ba8]/10 text-[#7cb3cc]",
  "review-required": "border-vikalp-warning/40 bg-vikalp-warning/10 text-vikalp-warning",
  blocked: "border-[#8a7ca8]/40 bg-[#8a7ca8]/10 text-[#b0a4c8]",
  unavailable: "border-vikalp-border bg-vikalp-bg text-vikalp-text-secondary",
};

export type EvidenceIconKey =
  | "terrain"
  | "hazard"
  | "historical"
  | "population"
  | "vulnerability"
  | "infrastructure"
  | "destination";

export interface EvidenceCategoryCardData {
  id: string;
  category: string;
  icon: EvidenceIconKey;
  state: EvidenceState;
  keyFacts: { label: string; value: string }[];
  source: string | null;
  coverage: string | null;
  limitation: string;
  /** ids into EVIDENCE_RECORDS, shown together in the drawer for this card. */
  recordIds: string[];
}

export interface LiveEvidenceFacts {
  gsiFeatureCount: number | null;
  hazard: {
    qualifyingRecordCount: number;
    nearestContextualDistanceKm: number | null;
    contextualRecordCount: number;
  } | null;
  settlement: {
    population: number;
    households: number;
    elevationM: number;
    slopeDegrees: number;
  } | null;
}

const CARTODEM_DERIVED_SLOPE_DEGREES = 22.58;

export function buildEvidenceCategories(live: LiveEvidenceFacts): EvidenceCategoryCardData[] {
  const terrainFacts: { label: string; value: string }[] = [];
  if (live.settlement) {
    terrainFacts.push({ label: "Elevation", value: `${live.settlement.elevationM} m` });
    terrainFacts.push({ label: "Stored slope", value: `${live.settlement.slopeDegrees}°` });
  }
  terrainFacts.push({ label: "Derived slope", value: `${CARTODEM_DERIVED_SLOPE_DEGREES}°` });

  const hazardFacts: { label: string; value: string }[] = [];
  if (live.gsiFeatureCount !== null) {
    hazardFacts.push({ label: "Inventory records", value: String(live.gsiFeatureCount) });
  }
  if (live.hazard) {
    hazardFacts.push({ label: "Within 1 km", value: String(live.hazard.qualifyingRecordCount) });
    if (live.hazard.nearestContextualDistanceKm !== null) {
      hazardFacts.push({ label: "Nearest", value: `${live.hazard.nearestContextualDistanceKm} km` });
    }
    hazardFacts.push({ label: "Within 5 km", value: String(live.hazard.contextualRecordCount) });
  }

  const populationFacts: { label: string; value: string }[] = live.settlement
    ? [
        { label: "Population", value: String(live.settlement.population) },
        { label: "Households", value: String(live.settlement.households) },
      ]
    : [];

  return [
    {
      id: "terrain",
      category: "Terrain",
      icon: "terrain",
      state: "review-required",
      keyFacts: terrainFacts,
      source: "CartoDEM v3 R1 (NRSC/ISRO)",
      coverage: "Bhitai Malli, Pauri Garhwal",
      limitation: "Stored and CartoDEM-derived slope values disagree and remain unreconciled.",
      recordIds: ["cartodem-terrain", "vikalp-derived-slope"],
    },
    {
      id: "hazard",
      category: "Hazard",
      icon: "hazard",
      state: "available",
      keyFacts: hazardFacts,
      source: "GSI/NLFC landslide inventory",
      coverage: "Pauri Garhwal district",
      limitation: "Inventory presence does not itself constitute a current risk classification.",
      recordIds: ["gsi-nlfc-landslide-inventory"],
    },
    {
      id: "historical-disaster",
      category: "Historical Disaster",
      icon: "historical",
      state: "unavailable",
      keyFacts: [],
      source: null,
      coverage: null,
      limitation: "Verified event-period data has not been integrated.",
      recordIds: ["missing-historical-disaster"],
    },
    {
      id: "population",
      category: "Population",
      icon: "population",
      state: "review-required",
      keyFacts: populationFacts,
      source: "VIKALP pilot planning input (uncited)",
      coverage: "Bhitai Malli, Pauri Garhwal",
      limitation: "Current demo planning figure, not tied to any census year or historical date.",
      recordIds: ["bhitai-malli-demo-inputs"],
    },
    {
      id: "vulnerability",
      category: "Vulnerability",
      icon: "vulnerability",
      state: "unavailable",
      keyFacts: [],
      source: null,
      coverage: null,
      limitation: "No housing, distance-to-service, or economic vulnerability data is integrated.",
      recordIds: ["missing-vulnerability"],
    },
    {
      id: "infrastructure",
      category: "Infrastructure & Access",
      icon: "infrastructure",
      state: "unavailable",
      keyFacts: [],
      source: null,
      coverage: null,
      limitation: "No verified infrastructure or access dataset exists, current or historical.",
      recordIds: ["missing-land-suitability"],
    },
    {
      id: "destination",
      category: "Destination Evidence",
      icon: "destination",
      state: "blocked",
      keyFacts: [],
      source: null,
      coverage: null,
      limitation: "No government-curated destination candidate is integrated — blocked on data, not policy alone.",
      recordIds: ["missing-destination-candidates"],
    },
  ];
}
