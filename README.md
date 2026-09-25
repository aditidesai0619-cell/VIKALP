# VIKALP

Government-facing GIS decision-support prototype for hazard red zones,
settlement risk assessment, carrying capacity, and relocation planning.
Built for SIH 2026. Pilot geography: Uttarakhand → Pauri Garhwal →
Bhitai Malli. Officer-controlled decisions throughout — no autonomous
relocation logic.

## Current task

**Task 20 — GSI/NLFC field-validated landslide inventory acquired.**
`data/raw/static/hazards/gsi_nlfc_field_validated_landslides_pauri_garhwal.geojson`
now holds 813 real landslide inventory points (GSI/NLFC, EPSG:4326,
134 attributes preserved) — the first hazard layer in this repo with
actual feature geometry, not just metadata. Filtered using the exact
Pauri Garhwal district polygon (not the dataset's own `district` text
field, which is inconsistent near Bhitai Malli, or a bounding box,
which pulled in 7 unrelated districts) — full reasoning in
[docs/DECISIONS.md](docs/DECISIONS.md#task-20). **"No GSI inventory
feature intersects the Bhitai Malli point"** — confirmed directly
against all 813 records; nearest is 2.04 km away, 21 within 5 km, all
reported as context only, not a claim about the settlement itself.
Nothing was scored or connected to the risk engine. See
[docs/DATA_PROVENANCE.md](docs/DATA_PROVENANCE.md) for full
provenance and checksums.

**Task 19 — GSI/NLFC landslide source investigation (research only,
nothing downloaded).** Traced Bhusanket's (`bhusanket.gsi.gov.in`)
actual GIS backend — a GSI-hosted Esri ArcGIS Server — and found the
NLSM susceptibility raster service exists but requires an
authentication token this session doesn't have (confirmed, not
guessed). Also found one genuinely public, no-login service: a
field-validated landslide point inventory
(`Hosted/Public_Portal_Dashboard_Map/FeatureServer/0`) with 31,545
India-wide records, 5,217 in Uttarakhand, and **569 in Pauri Garhwal
district** — the strongest landslide evidence source found so far. A
live spatial query at Bhitai Malli's exact coordinates found no
record within ≈1.1 km ("Feature intersection at Bhitai Malli not
verified"); the nearest of 28 nearby records sit roughly 2–3 km away.
Recommended for a future acquisition task, pending your approval. Full
detail in
[docs/DATA_INVENTORY.md](docs/DATA_INVENTORY.md#9-task-19--gsinlfc-bhusanket-landslide-source-investigation-no-acquisition)
and [docs/DECISIONS.md](docs/DECISIONS.md#task-19).

**Task 18 — Bhuvan landslide evidence acquired (metadata + point
queries only, not a dataset).** `data/raw/static/hazards/` now holds
real WMS layer metadata for `UK_SLIM_2017` and `RIRUCHBA_LHZ_01`
(Bhuvan/NRSC/ISRO), plus `GetFeatureInfo` query results at Bhitai
Malli's exact coordinates for both. Confirmed first that Bhuvan's WFS
(bulk vector export) is disabled server-side — no vector/GeoJSON
download path exists for these layers. All `GetFeatureInfo` queries
made (Bhitai Malli plus one bbox-center sample per layer) returned
empty results: **"No feature intersection verified at Bhitai
Malli."** This is bounding-box coverage evidence, not proof the
settlement is or isn't landslide-affected — nothing was scored,
classified, or connected to the risk engine. Full detail in
[docs/DATA_PROVENANCE.md](docs/DATA_PROVENANCE.md) and
[docs/DECISIONS.md](docs/DECISIONS.md#task-18).

**Task 17 — Landslide source verification (research only, nothing
acquired).** Directly queried Bhuvan's public WMS
(`bhuvan-vec2.nrsc.gov.in/bhuvan/wms`, no login) and confirmed real
Uttarakhand-specific landslide layers whose bounding boxes contain
Bhitai Malli's coordinates: `UK_SLIM_2014_GCS`, `UK_SLIM_2017`,
`LS_UTTARAKHAND_2023`, `ls_Uttarakhand_2014_SLIM` (inventory), and
`RIRUCHBA_LHZ_01` (route-corridor hazard zonation). A point-level
`GetFeatureInfo` query at Bhitai Malli's exact coordinates found no
mapped feature in any of the three tested layers — bounding-box
coverage is confirmed, feature-level presence is not. GSI Bhukosh
remains unreachable from this environment (confirmed twice); NGDR
requires login for the whole portal. Recommended source: Bhuvan's
`disaster:` WMS workspace — pending your explicit approval before any
acquisition. Full detail in
[docs/DATA_INVENTORY.md](docs/DATA_INVENTORY.md#7-task-16-hazard-data-audit-no-acquisition)
and [docs/DECISIONS.md](docs/DECISIONS.md#task-17).

**Task 16 — Hazard data audit (research only, nothing acquired).**
Confirmed zero hazard datasets (landslide, flood, cloudburst,
historical disaster, rainfall) exist anywhere in the repository, and
no Open-Meteo or other weather integration exists either. Researched
8 candidate authoritative sources (USDMA, Bhuvan/NRSC disaster
services, GSI Bhukosh, NDMA's landslide/flood atlases, CWC, IMD
gridded rainfall, data.gov.in) — none downloaded, none validated, all
recorded as **CANDIDATE — NOT YET ACQUIRED**. Notable finding: NDMA's
Flood Hazard Atlas confirmed to exclude Uttarakhand entirely. Full
evidence matrix, candidate-source table, and risk-dimension readiness
assessment in [docs/DATA_INVENTORY.md](docs/DATA_INVENTORY.md#7-task-16-hazard-data-audit-no-acquisition)
and [docs/DECISIONS.md](docs/DECISIONS.md#task-16).

**Task 15 — Terrain processed and slope derived (still not connected
to anything).** `data/processed/static/terrain/` now has a clipped
elevation raster (`cartodem_v3r1_h44g_pauri_garhwal_clip.tif`, 2863×927,
EPSG:4326, unresampled) and a derived slope raster in degrees
(`slope_degrees_pauri_garhwal_clip.tif`, Horn's 1981 method), both
covering the portion of Pauri Garhwal that falls inside the one
downloaded DEM tile. At Bhitai Malli: DEM elevation 991 m (matches the
existing demo `elevation_m`); derived slope 22.58° (does **not** match
the existing demo `slope_degrees` of 18.91° — reported as an open,
unreconciled discrepancy, `vikalp.db` left unchanged). **Still nothing
consumes these files** — no risk-engine connection, no API, no map
layer; that's deliberately out of scope. Full method and limitations
in [docs/DATA_PROVENANCE.md](docs/DATA_PROVENANCE.md) and
[docs/DECISIONS.md](docs/DECISIONS.md#task-15).

**Task 14/14A — CartoDEM acquired and validated.** A real Cartosat-1
DEM tile (`cdnh44g.tif`, CartoDEM v3 R1, NRSC/ISRO, 1 arc-sec,
EPSG:4326) exists at
`data/raw/static/terrain/C1_DEM_16B_2005-2014_v3_R-1_78E30N_h44g/cdnh44g_v3r1/cdnh44g.tif`.
Three other downloaded tiles (one east of the target area, duplicated)
don't cover Bhitai Malli and weren't needed — see
[docs/DATA_PROVENANCE.md](docs/DATA_PROVENANCE.md) and
[docs/DECISIONS.md](docs/DECISIONS.md#task-14a) for the full
discrepancy report. `rasterio` is installed
(`backend/requirements.txt`); the standalone `gdal`/`osgeo` package
isn't (failed to build — no MSVC Build Tools — but unneeded, since
rasterio bundles its own GDAL).

**Task 12A — Map data attribution.** The Overview map panel now shows
a compact attribution line immediately above the map (not overlaid on
it), reading: "Data sources: Administrative boundaries: geoBoundaries
India ADM2 (ODbL 1.0). Source metadata: Pathways Data Pvt. Ltd. /
lgdirectory.gov.in. Uttarakhand subset; district-level context." —
visible whenever the boundary layer is actually rendered, wording
taken directly from [docs/DATA_PROVENANCE.md](docs/DATA_PROVENANCE.md).
The pre-existing OpenStreetMap attribution (bottom-right, inside the
map) is unchanged. See [docs/DECISIONS.md](docs/DECISIONS.md#task-12a).

**Task 12 — First genuinely sourced GIS layer.** geoBoundaries' India
ADM2 (district) boundaries, filtered to Uttarakhand's 13 districts
(735 → 13 features), with a full source/processing/application-use
provenance record. New `GET /api/gis/boundaries` reads the processed
static file directly from disk (no DB table) and returns an honest
error rather than an empty result if the file is missing/invalid. The
Overview map now shows this as an independent MapLibre layer, below
the Bhitai Malli settlement point so it's never obscured, and verified
to keep working even when the other fails (and vice versa). This is
**district-level only** — Bhitai Malli's existing coordinates were
verified via point-in-polygon to fall inside the district polygon
corresponding to Pauri Garhwal, not an exact village boundary. See
[docs/DATA_PROVENANCE.md](docs/DATA_PROVENANCE.md) for the full record
and [docs/DECISIONS.md](docs/DECISIONS.md#task-12) for what was built
— **including a reported limitation**: same as Task 11, on-screen
pixel rendering of the polygon layer couldn't be visually confirmed
via screenshot in this session's sandboxed test environment (verified
instead via direct inspection of MapLibre's internal state — source
feature count, layer registration, z-order — please also confirm
visually in a real browser).

## Frontend setup

```
cd frontend
npm install
npm run dev
```

Opens at `http://localhost:5173/`. The app boots at `#/login` (visual
only); "Continue to Overview (demo)" goes to the dashboard at
`#/overview`, which renders a live MapLibre map (DEMO-ONLY OpenStreetMap
basemap — see [docs/UI_SPEC.md](docs/UI_SPEC.md#map-task-03)) with the
settlement point now sourced from `GET /api/settlements/1/geojson` as
a real GeoJSON source/layer, Settlement Evidence panel, and Key
Insights card. The map and Settlement Evidence panel fetch
independently (two different resources); if the backend isn't running,
each shows its own truthful error state instead.

Optional: copy `.env.example` to `.env` to override `VITE_API_BASE_URL`
(defaults to `http://localhost:8000`, which matches the backend's
default port).

Other commands: `npm run build` (typecheck + production build),
`npm run lint` (oxlint).

## Backend setup

```
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Serves at `http://127.0.0.1:8000`. Full detail in [backend/README.md](backend/README.md).

GIS data processing (one-time, not needed to just run the API) also
installs GeoPandas/Shapely/PyProj — already in `requirements.txt`.

## Project structure

```
frontend/
  src/
    components/
      layout/       AppShell, Header, Sidebar, bottom panels
      navigation/    hash router, nav tabs, page switch
      dashboard/     Overview page's presentation components (map,
                     evidence panel, key insights) — receive settlement
                     data as props, don't fetch it themselves
      common/        Badge, StatItem, IntelligenceCard, PlaceholderPage
    pages/           one file per route (incl. RiskAnalysisPage,
                     DecisionWorkspacePage, DestinationExplorerPage)
    services/        API clients (settlements.ts — settlement +
                     geojson, risk.ts, decision.ts, destination.ts)
    data/            navigation.ts only — demoSettlement.ts removed
                     (Task 07A) once nothing referenced it any more
    types/           shared TS types (settlement.ts, risk.ts,
                     decision.ts, destination.ts, navigation.ts)
    styles/          Tailwind entry + design tokens
backend/
  app/
    main.py          FastAPI app, health route, DB init/seed on startup
    config.py        env-driven settings (DB path only)
    database.py      sqlite3 connection + schema + seed (no ORM)
    models/          plain dataclasses mapped from DB rows
    schemas/         Pydantic request/response models (incl. risk.py,
                     decision.py, destination.py)
    api/             route modules (incl. risk.py, decision.py,
                     destination.py)
    services/        risk.py, decision.py, destination.py —
                     deterministic logic, kept out of the route layer
docs/                project specs and decisions
data/
  raw/static/boundaries/  geoBoundaries India ADM2 file, untouched
  raw/static/terrain/     CartoDEM v3 R1 tiles as downloaded (only
                          cdnh44g.tif covers Bhitai Malli; 3 other
                          tiles present but unneeded — see
                          docs/DATA_PROVENANCE.md), untouched
  processed/static/       boundaries_uk_demo.geojson (13 districts) —
                          what the API actually serves
  processed/static/terrain/  clipped CartoDEM + derived slope
                          (degrees) covering part of Pauri Garhwal;
                          not yet served by any API or map layer
```

## Current limitations

- No authentication, RBAC, or audit logging — the login screen is
  visual only, and the backend has no auth on its endpoints. CORS is
  wide open to only one dev origin, not a real access-control layer.
- Map basemap is demo-only (OpenStreetMap raster tiles) — no hazard or
  government GIS layers rendered yet; sidebar Layers checkboxes are
  still visual placeholders. A real DEM and a derived slope raster
  covering Bhitai Malli exist (Task 14/14A/15) but are not yet exposed
  through any API or map layer, and are not connected to the risk
  engine.
- The DEM-derived slope at Bhitai Malli (22.58°) does not match the
  existing demo `slope_degrees` value (18.91°) — an open, unreconciled
  discrepancy; see [docs/DATA_PROVENANCE.md](docs/DATA_PROVENANCE.md).
- No dimension of the risk engine has an approved scoring rule yet, so
  no settlement can receive an actual numeric risk score/level today —
  only the "pending" state, with full evidence/missing-inputs detail.
- No pathway-evaluation algorithm exists for the Decision Workspace —
  Protect/Adapt/Relocate always stay "not_evaluated" today, by design.
- No candidate-destination dataset exists anywhere — the Destination
  Explorer's `candidates` list is always empty, by design, and no
  ranking weights are defined (none approved, none needed yet).
- No capacity, officer-approval, or reporting logic — those
  pages/endpoints don't exist yet. Overview's `RiskAnalysisCard.tsx`
  summary widget still shows static placeholder text (only the full
  Risk Analysis, Decision Workspace, and Destination Explorer pages
  were implemented, not this smaller Overview card).
- Only one settlement (Bhitai Malli) with only its known demo values;
  no invented statistics.
- The only real GIS layer is Uttarakhand's district boundaries
  (district-level, not village-level) — no roads, POIs, DEM, or hazard
  data exist anywhere yet.
- On-screen rendering of the map's GeoJSON point/label and boundary
  polygons was not visually confirmed in the sandboxed test environment
  used during development (see
  [docs/DECISIONS.md](docs/DECISIONS.md#task-11) and
  [docs/DECISIONS.md](docs/DECISIONS.md#task-12)) — verify in a real
  browser.
- Boundary data license (ODbL 1.0) attribution is now shown above the
  Overview map (Task 12A); still no attribution UI anywhere else that
  might later consume this dataset.

## Next task

**Task 13 — integrate the next provenance-recorded GIS evidence
layer.** Candidates for what precedes/accompanies it: verify Tasks
11–12's map layers in a real browser; or approve a risk
dimension/pathway-evaluation/destination-dataset decision to let the
risk engine, Decision Workspace, or Destination Explorer produce their
first real result. See [docs/MVP_BACKLOG.md](docs/MVP_BACKLOG.md).
