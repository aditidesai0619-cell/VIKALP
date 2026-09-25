// Historical Replay — Evidence + Risk + Destination & Relocation task.
//
// Single source of truth for what this repository actually has that
// could support a "historical replay" — read directly by the Evidence,
// Risk, and Destination & Relocation workspaces so all three stay
// consistent (the brief's §3: "NEVER silently mix historical and
// current datasets" applies across pages too, not just within one).
//
// AUDIT RESULT (before any UI here was written): no verified, named,
// dated historical disaster EVENT exists anywhere in this repository.
// Checked directly:
//  - data/raw/static/hazards/gsi_nlfc_field_validated_landslides_pauri_garhwal.geojson
//    (813 records): 0% populated casualty/damage fields; only 156/813
//    (19.2%) carry any year at all (`initiati_1`), and docs/DECISIONS.md
//    Task 24B already classifies that field "probable, not confirmed"
//    (unresolved whether it means slide date or survey/mapping date).
//  - No rainfall dataset tied to any date/event exists — weather.py
//    only calls Open-Meteo for current conditions + a 3-day forecast.
//  - No road/infrastructure/access dataset exists, current or
//    historical (docs/DATA_INVENTORY.md Evidence Readiness Matrix:
//    "Roads | None", same for water/electricity/hospitals/schools).
//  - No government-curated destination candidate exists (destination.py
//    always returns an empty candidate list by design — see Task 30).
//  - No carrying-capacity data exists for any location.
//  - Settlement population/household figures are an uncited current
//    demo planning input (docs/DATA_INVENTORY.md §1.1), not tied to
//    any census year or historical date.
//
// Because there is no verified event, EVENT/DATE/etc. below are
// honestly `null` throughout — this is a review of what verified
// EVIDENCE exists, not a reconstruction of one dated disaster.

export const HISTORICAL_REPLAY_EVENT = {
  name: null as string | null,
  datePeriod: null as string | null,
  // Not an event location — the geographic scope VIKALP's pilot data
  // actually covers, shown so the officer knows what area the evidence
  // below can speak to at all.
  dataCoverage: "Pauri Garhwal district, Uttarakhand (VIKALP pilot data coverage)",
};

export type TemporalClass =
  | "historical-record"
  | "current-data"
  | "vikalp-derived"
  | "scenario-output"
  | "unavailable";

// "vikalp-derived" added for the Evidence workspace's visual redesign
// (brief §18: "HISTORICAL / CURRENT REFERENCE / VIKALP-DERIVED /
// UNAVAILABLE") — distinct from "current-data" because a derived value
// (e.g. the CartoDEM-derived slope, or a Hazard Exposure spatial
// calculation) is VIKALP's own computation over a source dataset, not
// the raw current dataset itself. Labels here stay as they were
// ("Historical Record"/"Current Data") since `TemporalClassBadge` is
// shared with the already-shipped, already-verified Risk and
// Destination & Relocation Historical Replay views — this task is
// scoped to Evidence only, so Evidence's own slightly different
// wording ("HISTORICAL"/"CURRENT REFERENCE") lives in
// evidence-locker/evidenceBadges.ts instead of changing this shared
// map.
export const TEMPORAL_CLASS_LABEL: Record<TemporalClass, string> = {
  "historical-record": "Historical Record",
  "current-data": "Current Data",
  "vikalp-derived": "VIKALP-Derived",
  "scenario-output": "Scenario Output",
  unavailable: "Unavailable",
};

export type EvidenceStrength = "available" | "limited" | "unavailable";

export interface HistoricalEvidenceCategory {
  id: string;
  /** One of the six categories the brief itself lists (§4.2/§4.4). */
  category:
    | "Terrain"
    | "Hazard"
    | "Historical Disaster"
    | "Rainfall"
    | "Population / Settlement"
    | "Infrastructure & Access";
  temporalClass: TemporalClass;
  strength: EvidenceStrength;
  title: string;
  source: string | null;
  dataset: string | null;
  datePeriod: string | null;
  coverage: string | null;
  status: string;
  limitation: string;
  /** Only set when temporalClass is "current-data" reused as map/spatial context. */
  spatialReferenceNote?: string;
}

export const HISTORICAL_EVIDENCE_CATEGORIES: HistoricalEvidenceCategory[] = [
  {
    id: "terrain",
    category: "Terrain",
    temporalClass: "current-data",
    strength: "available",
    title: "CartoDEM Terrain Elevation & Slope",
    source: "NRSC/ISRO (Bhuvan) — CartoDEM v3 R1",
    dataset: "Cartosat-1 stereo DEM, 2005–2014 imagery vintage",
    datePeriod: "2005–2014 (imagery acquisition)",
    coverage: "Partial Pauri Garhwal clip (tile-bounded, not full-district)",
    status: "Verified — real elevation/slope values",
    limitation:
      "Terrain changes negligibly on human timescales, so this is used as physical background context, not tied to any specific historical date.",
    spatialReferenceNote:
      "Current dataset used as a spatial reference; not verified historical-period state.",
  },
  {
    id: "hazard",
    category: "Hazard",
    temporalClass: "historical-record",
    strength: "limited",
    title: "GSI/NLFC Landslide Inventory",
    source: "Geological Survey of India (GSI) / National Landslide Forecast Centre (NLFC)",
    dataset: "Field-validated landslide inventory, Pauri Garhwal (813 records)",
    datePeriod: "Location verified; occurrence year present for only 19.2% of records, and classified probable — not confirmed",
    coverage: "Pauri Garhwal district",
    status: "Verified locations; date/impact fields mostly unpopulated",
    limitation:
      "0% of records carry a casualty or damage value. Only 156 of 813 records carry any year, and that field's meaning (slide date vs. survey/mapping date) is unresolved.",
  },
  {
    id: "historical-disaster",
    category: "Historical Disaster",
    temporalClass: "unavailable",
    strength: "unavailable",
    title: "Named Historical Disaster Event",
    source: null,
    dataset: null,
    datePeriod: null,
    coverage: null,
    status: "Not integrated",
    limitation: "Verified impact record not integrated.",
  },
  {
    id: "rainfall",
    category: "Rainfall",
    temporalClass: "unavailable",
    strength: "unavailable",
    title: "Date-Specific Rainfall",
    source: null,
    dataset: null,
    datePeriod: null,
    coverage: null,
    status: "Not integrated",
    limitation: "Date-specific rainfall data not integrated.",
  },
  {
    id: "settlement",
    category: "Population / Settlement",
    temporalClass: "current-data",
    strength: "available",
    title: "Settlement Location & Demographics",
    source: "VIKALP pilot planning input (uncited)",
    dataset: "Bhitai Malli — population, households, coordinates",
    datePeriod: null,
    coverage: "Bhitai Malli, Pauri Garhwal",
    status: "Current demo planning input — not official Census/survey data",
    limitation: "No census year, survey date, or government dataset citation is attached to this figure.",
    spatialReferenceNote:
      "Current dataset used as a spatial reference; not verified historical-period state.",
  },
  {
    id: "infrastructure",
    category: "Infrastructure & Access",
    temporalClass: "unavailable",
    strength: "unavailable",
    title: "Roads, Water, Electricity, Hospitals, Schools",
    source: null,
    dataset: null,
    datePeriod: null,
    coverage: null,
    status: "Not integrated",
    limitation: "No verified infrastructure or access dataset exists, current or historical.",
  },
];

export function summarizeEvidenceStrength(
  categories: HistoricalEvidenceCategory[] = HISTORICAL_EVIDENCE_CATEGORIES,
) {
  return {
    available: categories.filter((c) => c.strength === "available").length,
    limited: categories.filter((c) => c.strength === "limited").length,
    unavailable: categories.filter((c) => c.strength === "unavailable").length,
    total: categories.length,
  };
}

// Destination & Relocation — every category the brief's §7 asks about
// confirmed unavailable (docs/DECISIONS.md Task 30: destination
// candidate generation, carrying capacity, and infrastructure/access
// data are all "NOT IMPLEMENTATION-READY" / "NOT AVAILABLE"). Kept
// here, not fabricated per-field, so Destination & Relocation's
// Historical Replay view says exactly this and nothing more.
export const HISTORICAL_DESTINATION_STATUS = {
  destinationIntegrated: false,
  capacityAssessed: false,
  accessDataIntegrated: false,
  destinationMessage: "No government-curated destination integrated.",
  capacityMessage: "Carrying capacity not assessed — required destination evidence is not integrated.",
  accessMessage: "Verified historical access/route data not integrated.",
};
