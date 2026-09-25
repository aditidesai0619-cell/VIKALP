import type { EvidenceRecord } from "../types/evidence";

// Static reference content only — source names, licenses, descriptions,
// and limitations that live in docs/DATA_PROVENANCE.md and
// docs/DECISIONS.md today, with no other API home. Live, request-specific
// numbers (current landslide feature count, current Hazard Exposure
// derived values, current boundary feature count) are NOT hardcoded here
// — the Evidence Locker page fetches those from the existing, unmodified
// /api/gis/landslides, /api/gis/boundaries, and /api/settlements/{id}/risk
// endpoints instead, so this file never drifts out of sync with what
// those endpoints actually return (Task 39 §O: "do not duplicate source
// data unnecessarily").
//
// Do not add an entry for OpenStreetMap here — OSM is used only as demo
// basemap tiles (IntelligenceMap.tsx / RelocationMap.tsx), never as a
// VIKALP evidence source, per the same conclusion already documented in
// services/copilot.py.

const INVENTORY_BIAS_DISCLAIMER =
  "Absence of a GSI inventory record within the scoring radius means no " +
  "landslide event has been documented and mapped there in this dataset. " +
  "It does NOT mean this location is safe from landslide hazard " +
  "(docs/DECISIONS.md Task 21 §11).";

export const EVIDENCE_RECORDS: EvidenceRecord[] = [
  {
    id: "gsi-nlfc-landslide-inventory",
    title: "GSI/NLFC Landslide Inventory",
    category: "source-backed",
    source: "Geological Survey of India (GSI), National Landslide Forecasting Centre (NLFC)",
    dataset: "Field-validated landslide inventory (Bhusanket portal, public Esri ArcGIS Server)",
    geographicScope: "Pauri Garhwal district extraction, Uttarakhand (Task 20 acquisition)",
    description:
      "Point-geometry, field-validated landslide records, EPSG:4326. The " +
      "source service carries 134 attribute fields, preserved unmodified " +
      "on acquisition; VIKALP's map layer exposes only slide_no, " +
      "activity, triggering, and toposheet.",
    usageInVikalp:
      "Used by VIKALP's Hazard Exposure dimension for spatial landslide-" +
      "proximity scoring (docs/DECISIONS.md Task 21/22/23), and rendered " +
      "as the Landslide Evidence map layer (Task 38).",
    status: "Verified source",
    attribution:
      "Not explicitly stated on this API endpoint; GSI's general data-" +
      "dissemination terms are assumed applicable, not independently " +
      "re-confirmed for this exact service.",
    limitations: [
      INVENTORY_BIAS_DISCLAIMER,
      "This is a record of documented/mapped events, not a complete " +
        "census of every slope that has failed or could fail.",
      "Covers landslide-inventory evidence only — flood, cloudburst, and " +
        "multi-hazard-overlay evidence remain entirely unavailable.",
    ],
    affectedModules: [
      "Risk Analysis — Hazard Exposure dimension",
      "Map Intelligence — Landslide Evidence layer",
      "Evidence-backed PDF report",
      "Copilot evidence context",
    ],
  },
  {
    id: "cartodem-terrain",
    title: "CartoDEM Terrain Elevation",
    category: "source-backed",
    source:
      "National Remote Sensing Centre (NRSC), Indian Space Research " +
      "Organisation (ISRO), Dept. of Space, Govt. of India",
    dataset:
      "CartoDEM v3 R1 (Cartosat-1 Digital Elevation Model), via Bhuvan " +
      "Open Data Archive (registered-user access)",
    geographicScope: "H44G tile, clipped to Pauri Garhwal (Task 14/14A acquisition)",
    description: "16-bit GeoTIFF elevation raster, 1 arc-second resolution, EPSG:4326.",
    usageInVikalp:
      "Source elevation raster used to derive the slope raster (Task 15). " +
      "Not currently served as a live raster/tile layer to the frontend " +
      "— VIKALP shows the extracted point figures at Bhitai Malli only.",
    status: "Verified source",
    attribution:
      'NRSC/ISRO single-user, non-exclusive, non-transferable license ' +
      'terms; mandatory citation as "<Name of the Data>, National ' +
      'Remote Sensing Centre, ISRO, Government of India, Hyderabad, India."',
    limitations: [
      "Terrain risk scoring remains pending — no approved scoring rule " +
        "exists yet (docs/DECISIONS.md Task 27/28).",
      "Not exposed via any current raster-serving API.",
    ],
    affectedModules: [
      "Map Intelligence — Terrain status",
      "Evidence-backed PDF report",
      "Copilot evidence context",
    ],
  },
  {
    id: "vikalp-derived-slope",
    title: "VIKALP-Derived Slope (Terrain Discrepancy)",
    category: "derived",
    source: "Derived from CartoDEM via Horn's (1981) method (Task 15)",
    dataset: "slope_degrees_pauri_garhwal_clip.tif",
    geographicScope: "Bhitai Malli point extraction",
    description:
      "22.58° — VIKALP-computed slope at Bhitai Malli's coordinates, " +
      "derived from the CartoDEM elevation raster using Horn's 3×3 " +
      "finite-difference gradient method (the same algorithm GDAL's " +
      "gdaldem slope uses by default).",
    usageInVikalp:
      "Reference terrain evidence only — not currently used by any " +
      "scoring rule (Terrain / Physical Susceptibility scoring remains " +
      "pending).",
    status: "Derived — unresolved discrepancy",
    limitations: [
      "Terrain slope discrepancy — unresolved: the existing settlement/" +
        "demo planning value is 18.91°, while this VIKALP-derived value " +
        "is 22.58°. Neither is presented as authoritative; the " +
        "discrepancy is disclosed, not reconciled.",
    ],
    affectedModules: [
      "Map Intelligence — evidence panel",
      "Evidence-backed PDF report",
      "Copilot evidence context",
    ],
  },
  {
    id: "geoboundaries-adm2",
    title: "geoBoundaries India ADM2",
    category: "source-backed",
    source:
      "geoBoundaries (William & Mary geoLab); underlying source " +
      "organization Pathways Data Pvt. Ltd. / lgdirectory.gov.in " +
      "(India's Local Government Directory, Ministry of Panchayati Raj)",
    dataset: "India ADM2 (district-level) administrative boundaries, gbOpen release tier",
    geographicScope: "Uttarakhand subset (Task 12 acquisition)",
    description:
      "Polygon administrative boundary geometry. Only shapeName, " +
      "shapeISO, shapeID, shapeGroup, and shapeType fields are kept — " +
      "no properties added, renamed, or invented.",
    usageInVikalp:
      "Rendered as the Administrative Boundary map layer (Overview and " +
      "Map Intelligence). Provides district-level context only.",
    status: "Verified source",
    attribution:
      "Open Data Commons Open Database License 1.0 (ODbL 1.0), per this " +
      "dataset's own recorded metadata.",
    limitations: [
      "District-level only — VIKALP does not have an authoritative " +
        "Bhitai Malli village-level boundary polygon.",
      'Bhitai Malli\'s inclusion in the "Garhwal" district polygon was ' +
        "confirmed by point-in-polygon check (Task 12), not by name-" +
        "matching alone.",
    ],
    affectedModules: [
      "Overview dashboard map",
      "Map Intelligence — Administrative Boundary layer",
      "Evidence-backed PDF report",
    ],
  },
  {
    id: "bhitai-malli-demo-inputs",
    title: "Bhitai Malli Settlement Values",
    category: "demo-input",
    source: "VIKALP demo planning input (backend/app/database.py seed record)",
    dataset: "Settlement seed record",
    geographicScope: "Bhitai Malli, Pauri Garhwal, Uttarakhand",
    description:
      "Population, households, elevation, demo/database slope, and " +
      "latitude/longitude coordinates for the pilot settlement.",
    usageInVikalp:
      "Used as the settlement's identity and as the Population/Household " +
      "Exposure dimension's raw inputs (scoring rule not yet approved).",
    status: "Demo planning input",
    limitations: [
      '"Demo planning input — source validation pending" — not official ' +
        "Census data, not government survey data, and not claimed as " +
        "authoritative population data.",
      "Elevation happens to exactly match the independently-derived " +
        "CartoDEM elevation at this location — recorded as an observed " +
        "fact only, not evidence the demo value was itself sourced from " +
        "CartoDEM.",
    ],
    affectedModules: [
      "Settlement Evidence panel",
      "Risk Analysis — Population/Household Exposure dimension",
      "Map Intelligence",
      "Evidence-backed PDF report",
    ],
  },
  {
    id: "missing-terrain-scoring",
    title: "Terrain / Physical Susceptibility scoring rule",
    category: "missing",
    source: "Not applicable",
    dataset: "No approved scoring rule",
    geographicScope: "Bhitai Malli",
    description:
      "Slope/elevation data exists (see CartoDEM and VIKALP-derived " +
      "slope records above), but no approved rule converts it into a " +
      "score yet.",
    usageInVikalp: "Blocked on governance decisions, not on missing data (docs/DECISIONS.md Task 27/28).",
    status: "Pending validation",
    limitations: ["Terrain slope discrepancy (18.91° vs 22.58°) remains unresolved and is part of the blocker."],
    affectedModules: ["Risk Analysis — Terrain / Physical Susceptibility dimension"],
  },
  {
    id: "missing-historical-disaster",
    title: "Historical Disaster Evidence scoring",
    category: "missing",
    source: "Not applicable",
    dataset: "No approved scoring rule",
    geographicScope: "Bhitai Malli",
    description:
      "A candidate methodology was designed (Task 24) using the GSI " +
      "inventory's dated subset, but several governance questions " +
      "remain open (Task 24A/24B).",
    usageInVikalp: "Not implemented — status remains no_data in the live Risk Analysis API.",
    status: "Pending validation",
    limitations: ["The meaning of the GSI inventory's own date field is classified probable, not confirmed (Task 24B)."],
    affectedModules: ["Risk Analysis — Historical Disaster Evidence dimension"],
  },
  {
    id: "missing-population-scoring",
    title: "Population/Household Exposure scoring rule",
    category: "missing",
    source: "Not applicable",
    dataset: "No approved scoring rule",
    geographicScope: "Bhitai Malli",
    description:
      "Population/household data exists (see Bhitai Malli Settlement " +
      "Values above), but no approved numeric scoring rule exists yet " +
      "(Task 25).",
    usageInVikalp: "Blocked on unjustified numeric constants — no official Indian settlement-size classification was found.",
    status: "Pending validation",
    limitations: ["Only one settlement record exists in the system — no distribution exists to rank against."],
    affectedModules: ["Risk Analysis — Population/Household Exposure dimension"],
  },
  {
    id: "missing-vulnerability",
    title: "Vulnerability evidence",
    category: "missing",
    source: "Not applicable",
    dataset: "No data of any kind",
    geographicScope: "Bhitai Malli",
    description:
      "No vulnerability data (housing construction type, distance to " +
      "hospital/road, economic vulnerability index) exists in VIKALP " +
      "today — the most severe data gap of any risk dimension (Task 26).",
    usageInVikalp: "Not implemented — status remains no_data in the live Risk Analysis API.",
    status: "Unavailable",
    limitations: ["Genuinely blocked on missing data, not resolvable by a governance decision alone."],
    affectedModules: ["Risk Analysis — Vulnerability dimension"],
  },
  {
    id: "missing-flood-cloudburst",
    title: "Flood / Cloudburst hazard layers",
    category: "missing",
    source: "Not applicable",
    dataset: "No data",
    geographicScope: "Uttarakhand pilot",
    description: "Entirely unavailable in the current Uttarakhand pilot.",
    usageInVikalp: "Not reflected anywhere in Hazard Exposure scoring or the Map Intelligence layer list.",
    status: "Unavailable",
    limitations: ["No rainfall/weather integration of any kind exists in this repository."],
    affectedModules: ["Risk Analysis — Hazard Exposure dimension", "Map Intelligence"],
  },
  {
    id: "missing-destination-candidates",
    title: "Destination candidate dataset",
    category: "missing",
    source: "Not applicable",
    dataset: "No data",
    geographicScope: "Not applicable",
    description: "No government-curated destination candidate dataset is currently integrated.",
    usageInVikalp: "Destination Explorer's candidates list remains empty unconditionally (Task 09/30).",
    status: "Unavailable",
    limitations: ["Candidate generation is intended to be government-curated only — never GIS-auto-generated."],
    affectedModules: ["Destination Explorer"],
  },
  {
    id: "missing-land-suitability",
    title: "Land suitability / access / service evidence",
    category: "missing",
    source: "Not applicable",
    dataset: "No data",
    geographicScope: "Not applicable",
    description:
      "Land-use, roads, water/electricity/health/school, and land-" +
      "ownership datasets are unavailable — 5 of the 6 Destination " +
      "suitability dimensions are blocked on this (only Hazard Safety " +
      "has a working rule, and only once a candidate coordinate exists).",
    usageInVikalp: "All six suitability dimensions remain not_evaluated.",
    status: "Unavailable",
    limitations: ["Blocked on data availability, not on policy — see docs/DECISIONS.md Task 30."],
    affectedModules: ["Destination Explorer"],
  },
  {
    id: "missing-carrying-capacity",
    title: "Carrying capacity assessment",
    category: "missing",
    source: "Not applicable",
    dataset: "No data",
    geographicScope: "Not applicable",
    description: "Carrying-capacity calculation has not been initiated.",
    usageInVikalp: "No candidate destination exists yet to calculate a capacity for.",
    status: "Unavailable",
    limitations: [
      "A land-area-only capacity formula was explicitly rejected (Task 30) " +
        "— any future formula requires policy approval, not just data.",
    ],
    affectedModules: ["Destination Explorer"],
  },
];
