# VIKALP — Data Inventory

**Read-only inspection. No source code, schema, or data was modified.
No external dataset was downloaded. No external API was called. No
synthetic GIS/hazard/road/POI/rainfall/destination/capacity data was
created. No risk score was calculated.**

## Method

Searched the repository for `data/raw/`, `data/processed/`,
`data/dynamic/`, `data/metadata/`, and any backend seed/data/config
folders. **None of these directories exist anywhere in the
repository** — this was verified by directory listing and a
repo-wide glob for `**/data/**`, not assumed from documentation. The
only match was `frontend/src/data/` (a TypeScript source folder —
`navigation.ts`, application config — not a GIS data directory).

The only data-bearing artifacts that actually exist in the repo are
listed below in full.

## 1. Data files found

### 1.1 `backend/vikalp.db`

| Property | Value |
|---|---|
| Format | SQLite 3 database |
| Size | 16,384 bytes (16 KB; one allocated page) |
| Classification | **Processed** (application-managed relational data, seeded in code — not raw survey data, not dynamic/live, not a metadata catalog) |
| CRS | **Not declared anywhere.** No geometry column, no PostGIS/SpatiaLite extension, no `.prj`/CRS metadata. `latitude`/`longitude` are plain `REAL` columns. WGS84 (EPSG:4326) decimal degrees is the *implied* convention (matches how the frontend feeds these values straight into MapLibre, which expects WGS84), but nothing in the database enforces or records this. |
| Geometry type | None — no geometry object; a location is two scalar float columns, not a `POINT` |
| Feature count | 1 row |
| Bounding box | Single point: `[78.781266, 30.167112, 78.781266, 30.167112]` (lon, lat) |
| Available fields | `id`, `name`, `district`, `state`, `population`, `households`, `elevation_m`, `slope_degrees`, `latitude`, `longitude` (confirmed via `PRAGMA table_info`) |
| Raster info | N/A — not a raster |
| Source/provenance | Hardcoded literal in `backend/app/database.py`'s `BHITAI_MALLI` dict. The API layer (`backend/app/schemas/settlement.py`) labels every response with `data_note: "Demo planning inputs"`. **No cited external survey, census, or government dataset backs this row.** |
| Sensitivity | **Demo** — self-declared synthetic/demo planning input throughout the app; not real departmental survey data |
| Allowed Git status | Currently **gitignored** (`.gitignore` line 14: `backend/*.db`) — correct as-is; this is a runtime-generated artifact rebuilt on every fresh `uvicorn` start, not source data that belongs in version control |
| MapLibre readiness | **Ready as a point** — lon/lat are valid WGS84 decimal degrees, already rendered as a marker since Task 03. Not currently exposed as a GeoJSON `Feature`/`FeatureCollection` from the API (the frontend builds the marker manually via `new maplibregl.Marker().setLngLat(...)`, not from a GeoJSON source) |
| Risk-calculation readiness | Supplies raw `evidence` for 2 of 5 risk dimensions (`Terrain/Physical Susceptibility`: `slope_degrees`, `elevation_m`; `Population/Household Exposure`: `population`, `households`) — but per Task 07B, **no approved scoring rule exists** to convert any of these into a dimension score. The other 3 dimensions (Hazard Exposure, Historical Disaster Evidence, Vulnerability) have zero backing fields here or anywhere else. |

### 1.2 `frontend/public/favicon.svg`, `frontend/public/icons.svg`

Not GIS/geospatial data — generic UI iconography from the Vite React-TS
scaffold (Task 02: `favicon.svg` 9,522 bytes, `icons.svg` 5,031 bytes).
Listed only to confirm `frontend/public/` was checked and contains
nothing spatial. CRS/geometry/feature-count fields don't apply.

### 1.3 Everything else

No `.geojson`, `.shp`, `.tif`/`.tiff`, `.csv` with coordinates, `.gpkg`,
or any other spatial file format exists anywhere in the repository
(confirmed via repo-wide search). `GeoPandas`, `Shapely`, `Rasterio`,
`GDAL`, `PyProj` are listed as approved future stack in
`docs/VIKALP_MASTER_SPEC.md` but **are not installed** —
`backend/requirements.txt` currently contains only `fastapi`,
`pydantic`, `uvicorn`.

## 2. Evidence Readiness Matrix

| Category | Available now | Exact source/path | Quality/provenance | What's missing | Allowed next action |
|---|---|---|---|---|---|
| **Settlement** | Partial — 1 settlement (Bhitai Malli): name, district, state, population, households, elevation, slope, lat/lon | `backend/vikalp.db` → `settlements` table, row id 1; seeded from `backend/app/database.py` | Self-declared "Demo planning inputs"; no cited census/survey source | Verified source citation; any settlement beyond Bhitai Malli; a settlement boundary polygon | Obtain and cite a real source before treating any field as verified; add other pilot settlements only with equally-cited data |
| **Boundaries** (admin/village) | None | — | — | Entire dataset (state/district/village boundary polygons) | Source an approved administrative boundary dataset (e.g. Survey of India / state GIS cell) |
| **Roads** | None | — | — | Entire road network dataset | Source an approved road-network dataset from a government agency (PWD/NHAI or equivalent) — not OSM Overpass, per project constraints |
| **Hospitals** | None | — | — | Entire health-facility POI dataset | Source an approved facility list from the health department |
| **Schools** | None | — | — | Entire school POI dataset | Source an approved facility list from the education department |
| **DEM** | **AVAILABLE** (Task 14/14A) — `cdnh44g.tif`, CartoDEM v3 R1, covers Bhitai Malli | `data/raw/static/terrain/C1_DEM_16B_2005-2014_v3_R-1_78E30N_h44g/cdnh44g_v3r1/cdnh44g.tif` | NRSC/ISRO, registered-user Bhuvan download; validated with rasterio — see §5 and `docs/DATA_PROVENANCE.md` | Slope derivation; a processed/clipped output; an API/map layer — none built yet by design | Task 15+ may derive slope and/or expose a minimal terrain endpoint once explicitly scoped |
| **Slope** | **AVAILABLE as a derived raster** (Task 15) covering part of Pauri Garhwal, **plus** the pre-existing single scalar (18.91° for Bhitai Malli) | Raster: `data/processed/static/terrain/slope_degrees_pauri_garhwal_clip.tif`; scalar: `backend/vikalp.db` → `settlements.slope_degrees` | Raster derived via Horn's method from CartoDEM — see `docs/DATA_PROVENANCE.md`; scalar is an uncited demo planning input; **the two do not agree at Bhitai Malli (22.58° derived vs. 18.91° demo) — reported, not reconciled** | An approved slope→susceptibility classification rule (none exists — see `docs/DECISIONS.md` Task 07A §3 caveat); risk-engine connection | Propose a classification rule for explicit approval — do not classify either value independently; decide (in a future task) which slope value, if either, the risk engine should eventually use |
| **Landslide (susceptibility)** | None (`status: "no_data"` in the live risk API today) | — | — | Entire susceptibility zonation dataset | Source approved zonation (e.g. GSI, state disaster management authority) |
| **Flood** | None (`status: "no_data"`) | — | — | Entire flood hazard dataset | Source approved flood hazard mapping |
| **Rainfall** | None | — | — | Historical/intensity rainfall records | Source approved rainfall data (e.g. IMD) |
| **Historical disasters** | None (`status: "no_data"`) | — | — | Event history (count/severity/recency) near the settlement | Source approved disaster-event records (SDMA/district disaster management office) |
| **Population** | Yes, for Bhitai Malli only (383) | `backend/vikalp.db` → `settlements.population` | Demo planning input, uncited | Verified census/survey source; demographic breakdown (vulnerable subgroups) | Cite a real source before treating as verified; add subgroup counts only from a cited source |
| **Destination sites** | None — `candidates: []` unconditionally (Task 09) | — | — | Entire candidate-destination dataset | Source approved candidate relocation sites from the relevant district/state authority (see §3.6 below on demo sites) |
| **Land** (use/availability) | None | — | — | Land-use and land-availability data, both at origin and any future destination | Source land records (e.g. revenue department cadastral data) once destination sites are identified |
| **Water** | None | — | — | Water supply/availability data | Source from Jal Shakti / PHED or equivalent |
| **Electricity** | None | — | — | Electricity access/infrastructure data | Source from the state electricity board |
| **Housing** | Weak proxy only — `households` count (86) | `backend/vikalp.db` → `settlements.households` | Demo planning input; a count, not a condition/quality survey | Housing construction-type/quality data (feeds the Vulnerability dimension, currently `status: "no_data"`) | Source a housing-condition survey |
| **Health** (facility capacity/service level) | None | — | — | Health service-capacity data (distinct from the hospitals POI list above) | Source from the health department |
| **School capacity** | None | — | — | School enrollment/capacity data | Source from the education department |
| **Livelihoods/environment** | None | — | — | Entire dataset | Source from the relevant department or field survey |

## 3. Recommendations

### 3.1 Exact first layer to integrate

The **Bhitai Malli settlement point**, reformatted as a proper GeoJSON
`Feature` — it is the only layer where real (if demo-labeled) data
already exists, needs no new departmental sourcing, and carries zero
new risk. Concretely: a `data/processed/settlements.geojson` (or
equivalent) generated from the existing `vikalp.db` row, retaining the
same `data_note: "Demo planning inputs"` disclosure. This is
integration of *existing* data into a proper spatial format, not new
data acquisition — appropriate to do without further approval since it
invents nothing.

The first genuinely **new** layer (requiring real sourcing) should be
an **administrative/village boundary polygon** for Bhitai Malli /
Pauri Garhwal — it's the spatial context every other layer (hazard,
roads, POIs) will eventually need to be clipped/joined against, and it
has no dependency on any other missing dataset.

### 3.2 First safe FastAPI endpoint to add

A read-only GeoJSON endpoint exposing the existing settlement as a
proper `Feature` (e.g. `GET /api/settlements/{id}/geojson`, or a
`format=geojson` option on the existing settlement endpoint). This
requires no new data — only reformatting the already-approved
`vikalp.db` row — and is the safest possible next backend step: no new
dataset dependency, no schema change, no new risk-of-fabrication
surface.

### 3.3 First MapLibre layer to render

Correspondingly, the same settlement point served as a **GeoJSON
source + layer** (replacing the current hand-built
`maplibregl.Marker()` with a proper `map.addSource()`/`map.addLayer()`
pair reading from §3.2's endpoint) — this is a rendering-technique
upgrade using data that's already on the map today, not a new data
layer. The first genuinely new *data* layer to render, once sourced,
would be the administrative boundary polygon from §3.1.

### 3.4 Risk dimensions that can be evaluated

**None can produce a score today** — 0 of 5 dimensions have an
approved scoring rule (confirmed live via `GET /api/settlements/1/risk`,
Task 07B). Two dimensions have partial raw evidence available but no
rule to score it with: **Terrain/Physical Susceptibility** (has
`slope_degrees`, `elevation_m`) and **Population/Household Exposure**
(has `population`, `households`). The other three — Hazard Exposure,
Historical Disaster Evidence, Vulnerability — have zero backing data
of any kind found in this inventory.

### 3.5 Outputs that must remain Pending

Everything downstream of the above, unconditionally, until real data
and an approved rule both exist:
- Risk `overall_score` / `risk_level` (all 5 dimension scores)
- All three Decision Workspace pathways (Protect/Adapt/Relocate
  `status`/`recommended`)
- Destination `candidates`, `ranking_status`, `ranked_candidates`
- Carrying-capacity values (not yet built, but would be pending on the
  same grounds — no land/population capacity data exists)

### 3.6 Whether demo candidate destination sites are appropriate later

**Only under explicit, narrow conditions — and only with your
separate, explicit approval before any are added; nothing here
authorizes creating one now (this task forbids it outright).** If
adopted later:
- Every demo candidate must carry the exact label **"Demo planning
  input — departmental verification required"** attached to the
  candidate itself (an API field, not just a page-level disclaimer),
  the same way `data_note` already travels with every settlement
  response.
- Demo candidates must never be returned by a code path that could be
  mistaken for a live ranking — i.e. they must not carry a `score` or
  `rank`, matching Task 09's existing rule that scores are never
  invented.
- Their purpose would be strictly UI/workflow testing (proving the
  Destination Explorer's candidate-list and comparison views render
  correctly), never presented to an officer as an actual option.
- This is a repeat of the same pattern already approved for Bhitai
  Malli itself (a labeled demo record, not a real survey) — but
  destinations carry more real-world consequence if ever
  misread as genuine, so this should be a deliberate, separate
  approval, not bundled into a future task by default.

## Ready layers

- Bhitai Malli settlement point (demo-labeled), already rendered on
  the map since Task 03; not yet exposed as GeoJSON from the API.

## Major gaps

- No administrative boundaries, roads, hospitals, schools, DEM/slope
  raster, landslide, flood, rainfall, or historical-disaster data
  exist anywhere in the repository.
- No candidate destination sites, land, water, electricity, housing
  condition, health capacity, school capacity, or
  livelihoods/environment data exist.
- The approved GIS stack (GeoPandas, Shapely, Rasterio, GDAL, PyProj)
  is documented but not installed.
- Every quantitative field that does exist (population, households,
  elevation, slope) is an uncited "demo planning input," not a
  verified departmental source.

## Recommended Task 11

Add the read-only GeoJSON reformatting described in §3.1–3.3: a
`GET /api/settlements/{id}/geojson`-style endpoint serving the existing
Bhitai Malli record as a proper GeoJSON `Feature` (no new data, no
schema change, no dependency), and switch the frontend's MapLibre
marker to consume it via a GeoJSON source instead of a hand-built
`Marker()` call — establishing the GeoJSON pipeline pattern that every
future real layer (boundaries, hazards, roads, destinations) will need,
without requiring any new dataset to be sourced first.

## 4. Task 13 — Terrain/DEM audit

Read-only re-audit, specifically for a raster DEM/elevation/slope/
terrain dataset, ahead of a possible Terrain/Physical Susceptibility
evidence layer. Nothing below was assumed from §1–3 above (which
predate Tasks 11/12) — the repository was searched fresh.

**Method:** full recursive listing of `data/raw/static/` and
`data/processed/static/` (the only data directories that exist, both
created in Task 12); a repo-wide case-insensitive filename search for
`dem`, `elevation`, `terrain`, `slope`, `cartodem`, `bhuvan`, `srtm`,
`aster`; and a repo-wide search for `.tif`/`.tiff` files. Also checked
`backend/requirements.txt` for `rasterio`/`gdal`, and the installed
backend virtualenv directly (`import rasterio`, `from osgeo import
gdal`).

| Item | Status | Detail |
|---|---|---|
| Raster DEM file (any format) | **MISSING** | Zero `.tif`/`.tiff` files anywhere in the repository. `data/raw/static/` and `data/processed/static/` contain only the Task 12 boundary files (`boundaries/geoBoundaries-IND-ADM2_simplified.geojson`, `SOURCE.txt`, `boundaries_uk_demo.geojson`) |
| Terrain/elevation/slope/DEM-named file | **MISSING** | Only incidental substring hit: the string `dem` inside `data/processed/static/boundaries_uk_demo.geojson` — matches the file's own internal GeoJSON `"name": "boundaries_uk_demo"` property (from "demo", written automatically by GeoPandas' `to_file` based on the output filename) and the filename itself, not a DEM reference |
| Documentation implying a DEM already exists | **MISSING** | `docs/VIKALP_MASTER_SPEC.md`'s only "elevation"/"slope" mentions are Bhitai Malli's two existing scalar demo fields (991 m, 18.91°) — already known, already in `vikalp.db`, not raster-derived. No doc anywhere claims a DEM file is present. |
| `rasterio` (approved stack) | **MISSING** — not installed | Not in `backend/requirements.txt`; `import rasterio` fails in the backend venv |
| `gdal`/`osgeo` (approved stack) | **MISSING** — not installed | Not in `backend/requirements.txt`; `from osgeo import gdal` fails in the backend venv |
| `geopandas`, `shapely`, `pyproj` (approved stack) | **AVAILABLE** | Installed since Task 12 (`backend/requirements.txt`); not vector-DEM-capable, listed for completeness only |
| Bhitai Malli's own `elevation_m`/`slope_degrees` scalars | **AVAILABLE, but NOT YET VALIDATED against any raster** | `backend/vikalp.db` → `settlements` row (991 m / 18.91°) — a self-declared demo planning input (see §1.1), not derived from or cross-checked against any DEM, since none exists locally |

**Conclusion: no DEM/terrain raster exists anywhere in this repository.**
This reconfirms §1.3/§2's Task 10 finding (`Rasterio`/`GDAL` not
installed, no raster file present) rather than contradicting it — the
only change since Task 10 is that `GeoPandas`/`Shapely`/`PyProj` were
installed in Task 12 for the (non-raster) boundary layer.

Candidate public DEM sources for a future task, with their approval
status, are documented in `docs/DECISIONS.md` (Task 13) rather than
here, since no data was acquired and this section records only what
was **found**, not what is proposed.

## 5. Task 14/14A — CartoDEM acquired and validated

**AVAILABLE**: a real CartoDEM Version-3 R1 tile now exists in the
repository and covers Bhitai Malli. **NOT YET VALIDATED for anything
beyond raw-file integrity**: no slope, no processed output, no API, no
map layer, no relationship to the risk engine.

| Item | Status | Detail |
|---|---|---|
| DEM raster covering Bhitai Malli | **AVAILABLE** | `data/raw/static/terrain/C1_DEM_16B_2005-2014_v3_R-1_78E30N_h44g/cdnh44g_v3r1/cdnh44g.tif` — CartoDEM v3 R1, tile H44G, EPSG:4326, 3600×3600, 1 arc-sec, 232–6575 m range. Full detail in `docs/DATA_PROVENANCE.md`. |
| Bhitai Malli point sample | **AVAILABLE, verified** | 991 m at (30.167112, 78.781266) — matches the existing `vikalp.db` `elevation_m` value; recorded as an observation, not a causal claim |
| Extraneous downloaded tiles (H44H ×3 copies, H44N ×1) | **AVAILABLE but NOT NEEDED** | Don't cover Bhitai Malli (one tile east, one tile east+south of the target area); not deleted per this task's own instruction not to remove anything; flagged as a discrepancy in `docs/DECISIONS.md` Task 14A |
| Slope raster | **MISSING** | Not derived — explicitly out of scope for Task 14A |
| Processed/clipped terrain output (`data/processed/static/terrain/`) | **MISSING** | Not created — the task's own instruction was to create one only if processing is actually necessary, and none was needed to validate the raw file |
| `GET /api/gis/terrain` or any terrain map layer | **MISSING** | Not built — explicitly out of scope |
| `rasterio` (approved stack) | **AVAILABLE**, installed Task 14 | `backend/requirements.txt`; bundles its own GDAL 3.12.4 |
| `gdal`/`osgeo` standalone Python package (approved stack) | **MISSING**, not installed | Failed to build in this environment (no MSVC C++ Build Tools); not pursued since rasterio's bundled GDAL already covers every raster operation needed so far |

## 6. Task 15 — Terrain processed and slope derived

**AVAILABLE**: a processed (clipped) DEM and a derived slope raster,
both covering part of Pauri Garhwal including Bhitai Malli. **STILL
MISSING/NOT YET VALIDATED**: risk-engine connection, any
slope→susceptibility rule, coverage of the rest of Pauri Garhwal
(only the portion inside the one downloaded tile exists).

| Item | Status | Detail |
|---|---|---|
| Processed elevation raster | **AVAILABLE** | `data/processed/static/terrain/cartodem_v3r1_h44g_pauri_garhwal_clip.tif` — clipped from `cdnh44g.tif`, no resampling/reprojection, EPSG:4326, 2863×927 |
| Derived slope raster (degrees) | **AVAILABLE** | `data/processed/static/terrain/slope_degrees_pauri_garhwal_clip.tif` — Horn's method, same grid as the elevation clip |
| Bhitai Malli elevation (from raster) | **AVAILABLE, verified** | 991 m — matches the existing demo `elevation_m` scalar |
| Bhitai Malli slope (from raster) | **AVAILABLE, verified — but disagrees with the demo scalar** | 22.58° derived vs. 18.91° demo value; reported as an unresolved discrepancy, not reconciled |
| Full Pauri Garhwal district coverage | **MISSING** | Only the part of the district inside the single downloaded tile is covered; the rest would require tiles not downloaded (out of scope — "do not download additional DEM data") |
| Slope→Terrain/Physical Susceptibility classification rule | **MISSING** | No rule exists or was proposed; explicitly out of scope per Task 07A/07B's own approval gate |
| Risk-engine connection | **MISSING** | Not built — explicitly out of scope for Task 15 |
| `GET /api/gis/terrain` or any terrain map layer | **MISSING** | Not built — explicitly out of scope |

## 7. Task 16 — Hazard data audit (no acquisition)

**Read-only audit.** No hazard dataset was downloaded, modified,
processed, or integrated. This section records what exists, what
doesn't, and what was researched as candidates only.

### 7.1 Repo-wide hazard-keyword search

Searched `data/`, `backend/`, `frontend/`, `docs/` for: landslide,
flood, inundation, erosion, cloudburst, rainfall, precipitation,
disaster, hazard, susceptibility, vulnerability, warning, alert.

- `data/raw/` and `data/processed/` contain **only** the boundaries
  (Task 12) and terrain (Task 14/15) files already documented above —
  zero hazard-related files of any kind (confirmed by full directory
  listing, not just a keyword grep).
- Matches in `backend/app/services/risk.py`, `decision.py`,
  `destination.py` are **all** risk-dimension/pathway *category
  labels and missing-input field names* from the Task 07B/08/09
  frameworks (e.g. `"landslide_susceptibility_class"` listed under
  `missing_inputs`) — not data. Confirmed by reading the full file,
  not just the grep hits.
- Matches in `frontend/src/` are UI copy referencing these same
  category names (page headings, badge text) — not data.
- **Zero matches** for "open-meteo" or "openmeteo" anywhere in the
  repository (source code or docs) — see §7.3.

### 7.2 Hazard evidence matrix

| Hazard / Evidence | Status | File(s) | Source | Coverage | Format | Validated? | Usable for Bhitai Malli? | Limitations |
|---|---|---|---|---|---|---|---|---|
| Landslide susceptibility / hazard zonation | **PARTIAL** (Task 18) | `data/raw/static/hazards/riruchba_lhz_01_*` | Bhuvan/NRSC/ISRO, `disaster:RIRUCHBA_LHZ_01` | Bbox-verified to cover Bhitai Malli/Pauri Garhwal; feature-level coverage not verified | WMS layer metadata (XML) + empty GetFeatureInfo (GML) — no vector geometry obtained | Metadata validated; no feature ever retrieved | **Not yet** — "No feature intersection verified at Bhitai Malli" | See §8 and `docs/DATA_PROVENANCE.md` HAZARDS section |
| Flood hazard | **MISSING** | — | — | — | — | — | No | Nothing in-repo; NDMA's atlas confirmed to exclude Uttarakhand (§7.4) |
| Historical landslide/disaster evidence | **AVAILABLE** (Task 20) | `data/raw/static/hazards/gsi_nlfc_field_validated_landslides_pauri_garhwal.geojson` | GSI/NLFC, `Hosted/Public_Portal_Dashboard_Map/FeatureServer/0` (field-validated inventory) | 813 real point records within Pauri Garhwal's exact district polygon; nearest to Bhitai Malli is 2.04 km, none intersect the exact point | Real GeoJSON, Point geometry, EPSG:4326, 134 attributes, all preserved | Fully validated (see §10) | **Context only** — "No GSI inventory feature intersects the Bhitai Malli point" | See §10 and `docs/DATA_PROVENANCE.md` HAZARDS section |
| Rainfall / precipitation | **MISSING** | — | — | — | — | — | No | No Open-Meteo or any other weather integration exists (§7.3) |
| Cloudburst evidence | **MISSING** | — | — | — | — | — | No | Nothing in-repo |
| Other (multi-hazard overlay) | **MISSING** | — | — | — | — | — | No | Listed only as a `missing_inputs` field name in `risk.py`, never populated |

### 7.3 Open-Meteo / dynamic weather data — status

**Not implemented anywhere in this repository.** Confirmed by a
repo-wide search (zero matches for "open-meteo"/"openmeteo") and by
reading `backend/app/services/*.py` and `backend/app/api/*.py` in
full — there is no HTTP client call to any external weather API, no
weather-related schema, no weather-related route, and no frontend
component consuming weather data. `risk.py`'s `missing_inputs` lists
reference hazard *classes* (e.g. `flood_hazard_class`), not raw
weather observations — even if a weather integration existed, its
output would be a forecast/observation, not a hazard/susceptibility
class, and this audit does not conflate the two per the task's own
instruction.

### 7.4 Candidate authoritative sources — CANDIDATE, NOT YET ACQUIRED

None of the sources below have been downloaded, accessed, or
validated. "Discovered" means found via research; it does not imply
"accessible" or "downloaded" — those are separate, unconfirmed states
for every row.

| # | Organization | Dataset/product | Hazard type | URL | Coverage | Resolution/scale | Temporal | Format | Login/access | Suitability | Confidence |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Uttarakhand State Disaster Management Authority (USDMA) | State Level Risk Atlas / DRA Final Report / district "Hotspot Plans" | Landslide, flood, cloudburst (state risk assessment) | `usdma.uk.gov.in` (document-category/disaster-risk-assessment) — confirmed reachable and listing these titles; two more specific sub-page URLs found via search (`/landslide-80.aspx`, `/flood-81.aspx`) returned 404 when checked directly in this session, so those two specific pages are recorded as **not verified reachable** rather than assumed still valid | Uttarakhand state-specific; district/hotspot plans named include Joshimath, Kedarnath, Munsiari, Mussoorie, Dehradun, Haridwar, Rudrapur/Haldwani, Bhatwari, Narayanbagar, Badrinath — **Pauri Garhwal not named among the confirmed titles** | Not stated (PDF reports, not a scaled map product per confirmed listing) | Not stated in what was checked | **PDF documents**, not machine-readable GIS data, per the confirmed listing | No login seen for the document-category page | **MEDIUM** — most state-specific and disaster-authority-relevant, but appears to be narrative/report PDFs rather than GIS layers usable for point-in-polygon analysis | Medium — page content confirmed directly, but PDF internal contents (maps, coordinates, whether Pauri Garhwal is covered inside the DRA Final Report) not inspected |
| 2 | ISRO/NRSC — Bhuvan Disaster Services, public WMS (`disaster:` workspace) | Seasonal Landslide Inventory Mapping (SLIM) — `UK_SLIM_2014_GCS`, `UK_SLIM_2017`, `LS_UTTARAKHAND_2023`, `ls_Uttarakhand_2014_SLIM`; Landslide Hazard Zonation (LHZ) route-corridor tiles, e.g. `RIRUCHBA_LHZ_01` | Landslide inventory (SLIM layers) + route-corridor hazard zonation (LHZ layers) | WMS base `https://bhuvan-vec2.nrsc.gov.in/bhuvan/wms` — **directly queried and confirmed working in Task 17**: `GetCapabilities` returned a full, unauthenticated 9,141-layer catalog; `GetFeatureInfo` queries against 5 specific layers all returned valid (if empty) responses, not auth errors | **Bounding-box confirmed** (not just India/state-wide) for 4 SLIM/2023 layers and 1 LHZ layer (`RIRUCHBA_LHZ_01`) — all directly contain Bhitai Malli's coordinates (78.781266, 30.167112), read straight from each layer's own `<LatLonBoundingBox>` in the live capabilities response. A `GetFeatureInfo` point-query at Bhitai Malli's exact coordinates against `UK_SLIM_2017`, `LS_UTTARAKHAND_2023`, and `RIRUCHBA_LHZ_01` each returned "no features found" — i.e. bbox coverage is confirmed, but no landslide/zonation *feature* is recorded at that exact pixel in these layers | Vector (GeoServer-style WMS); LHZ documented elsewhere as 1:25,000 scale (not independently confirmed per-tile) | SLIM: 2014/2017/2023 (seasonal/event); LHZ: undated in the capabilities response | **WMS** (`GetMap`/`GetFeatureInfo`/`GetLegendGraphic` all confirmed working) — not a direct file download; a sibling WFS (for vector/GeoJSON export) was not tested | **No login required** for `GetCapabilities` or `GetFeatureInfo` — confirmed directly, unlike Bhuvan's CartoDEM file-download portal (Task 14) | **HIGH** — authoritative, confirmed live/queryable without login, and the only candidate with directly bbox-verified Uttarakhand + Bhitai-Malli-area coverage (see Task 17 for full detail) | High — based on direct queries against the live service in Task 17, not secondary sources |
| 3 | Geological Survey of India (GSI) | Bhukosh / National Geoscience Data Repository (NGDR) — landslide susceptibility zonation, landslide inventory | Landslide susceptibility + inventory | `bhukosh.gsi.gov.in/Bhukosh/MapViewer.aspx`, `geodataindia.gov.in` | India-wide, described as including Uttarakhand in academic literature (not confirmed on an official coverage page in this session) | Not confirmed | Not confirmed | Not confirmed (map-viewer platform; NGDR is a broader geoscience data portal) | **Confirmed via secondary source**: viewing is free, but download requires login/registration | **MEDIUM** — authoritative national geological agency, plausible Uttarakhand coverage, but this session could not directly reach `bhukosh.gsi.gov.in` (connection error) to confirm anything first-hand | Low — reachability itself could not be confirmed this session; entirely secondary-source-based |
| 4 | National Disaster Management Authority (NDMA) | National Landslide Hazard Atlas of India | Landslide hazard (national) | `ndma.gov.in/landslide-hazard-atlas` (confirmed reachable) | National — confirmed as a single 60 MB PDF; state/district breakdown not confirmed from the page itself | National scale (PDF), not a usable analytical scale | Not stated | **PDF** (60 MB), confirmed — not GIS data | No login required, confirmed | **LOW** for direct settlement-level use — it's a static national PDF map, not queryable GIS data; would need manual digitization to use for Bhitai Malli | High confidence in what it *is* (PDF atlas), low confidence it's directly usable |
| 5 | NDMA | Flood Hazard Atlases | Flood hazard | `ndma.gov.in/flood-hazard-atlases` (confirmed reachable) | Confirmed: National + Andhra Pradesh, Bihar, Uttar Pradesh, Odisha, West Bengal only. **Uttarakhand is explicitly NOT among the published state atlases** | State-level PDF | Not stated | PDF, no login | **NOT SUITABLE** — confirmed to exclude Uttarakhand entirely | High — directly confirmed from the page's own listing |
| 6 | Central Water Commission (CWC) | Flood Forecast Dashboard / FloodWatch India | Flood forecasting (real-time water levels, not a static hazard layer) | `cwc.gov.in/ffm_dashboard`, `ffs.india-water.gov.in` | 325 forecasting stations, 197 low-lying areas/towns, 128 reservoirs nationally (per search results); whether any station is near Pauri Garhwal/Bhitai Malli **not verified** | Station-based, not a raster/vector hazard surface | Real-time/operational, not historical zonation | Web dashboard/app; downloadable dataset format not confirmed | Not confirmed | **LOW** for VIKALP's current need — this is operational flood forecasting (a live monitoring service), not a static hazard-susceptibility or historical-disaster dataset the risk engine's dimensions are framed around | Low — not directly fetched; based on search-result descriptions only |
| 7 | India Meteorological Department (IMD), Pune | Gridded daily rainfall, 0.25°×0.25°, NetCDF | Rainfall/precipitation (weather observation, **not** a hazard/susceptibility class) | `imdpune.gov.in/cmpg/Griddata/Rainfall_25_NetCDF.html` (confirmed reachable) | India-wide grid, 135×129 points, 6.5°N–38.5°N / 66.5°E–100.0°E — arithmetically includes Bhitai Malli's coordinates, but **settlement-level coverage not independently verified by sampling the actual grid** | 0.25° (~25 km) — much coarser than the CartoDEM terrain layer (30 m) | 1901–2024 daily | **NetCDF** — a format not currently used anywhere in VIKALP; would need a new library (e.g. `netCDF4` or `xarray`) not in the approved stack, or conversion via GDAL's NetCDF driver (bundled in rasterio, unconfirmed whether sufficient alone) | Login requirement not stated on the page checked | **MEDIUM** for rainfall specifically, but explicitly **not a hazard/susceptibility layer** — per this task's own instruction, must never be treated as a hazard score if acquired | Medium — page content confirmed directly; format/dependency implications noted, not resolved |
| 8 | data.gov.in (Open Government Data Platform) | Various IMD/hazard-adjacent datasets (aggregator, not a primary source) | Varies | `data.gov.in` | Varies by dataset | Varies | Varies | Varies | Varies | **Not independently evaluated** — an aggregator/catalog, not a specific dataset; listed only because the task named it as a candidate organization to check | Not assessed |

**"Coverage not yet verified"** applies to every candidate above for
settlement-level (Bhitai Malli-specific) coverage — none were sampled
or queried at that exact point; India-wide or state-wide availability
was not treated as proof of settlement-level coverage, per the task's
explicit instruction.

### 7.5 Recommended source per missing hazard type (candidate only, not approved)

| Missing hazard type | Recommended candidate | Why | Caveat |
|---|---|---|---|
| Landslide susceptibility | Bhuvan LHZ (candidate #2) or GSI Bhukosh (#3) | Only two sources found that are both authoritative and specifically susceptibility-mapping-oriented (not just narrative PDFs) | Neither was reachable/confirmable in enough detail this session to recommend acquisition yet — needs a follow-up task that can actually authenticate/browse the portal |
| Historical landslide/disaster evidence | USDMA Hotspot Plans + DRA Final Report (candidate #1), or Bhuvan's event/route-wise inventory (#2) | USDMA is the state authority most likely to hold Pauri-Garhwal-relevant incident history; Bhuvan's inventory is structured/dated | USDMA's are narrative PDFs (would need manual extraction); Bhuvan's inventory format/access unconfirmed |
| Flood hazard | **None confidently recommended** | NDMA's atlas explicitly excludes Uttarakhand; CWC is operational forecasting, not a static hazard layer; no Uttarakhand-specific flood hazard GIS source was confirmed | Flood may be a lower-priority hazard for this specific mountain settlement pilot regardless (see §7.6) |
| Rainfall/precipitation | IMD gridded rainfall (candidate #7) | Only genuinely open, well-documented, long-record rainfall dataset found | Coarse resolution relative to a single settlement; NetCDF format needs a stack decision before acquisition; must not be treated as a hazard score itself |

### 7.6 MUST HAVE / SHOULD HAVE / OPTIONAL

- **MUST HAVE** (to make the "Hazard Exposure" and "Historical Disaster
  Evidence" risk dimensions credible at all, since they currently have
  zero evidence of any kind): at least one landslide susceptibility
  or historical-incident source with confirmed Pauri-Garhwal-level (or
  finer) coverage. Landslide is prioritized over flood/cloudburst
  because Bhitai Malli is a hill settlement (991 m, 22.58° derived
  slope) where landslide is the more terrain-plausible hazard, and
  because no credible Uttarakhand flood-hazard source was found at all
  in this audit.
- **SHOULD HAVE**: rainfall/precipitation context (IMD gridded data)
  once its format/dependency question is resolved — useful
  supporting evidence, but the task is explicit that rainfall is not
  itself a hazard score.
- **OPTIONAL / FUTURE**: flood hazard (no confirmed Uttarakhand source
  exists yet — pursuing it now would mean acquiring a lower-relevance
  or non-existent layer just to fill a category); cloudburst-specific
  data (no dedicated dataset was found distinct from general landslide/
  flood/rainfall sources); CWC's real-time forecasting (operational,
  not a static risk-engine input).

### 7.7 Risk-dimension readiness (evidence only — no scoring formulas)

| Dimension (weight) | Available evidence | Missing evidence | Scoring rule implementable now? | Additional sourcing required? |
|---|---|---|---|---|
| Terrain / Physical Susceptibility (20%) | `elevation_m`, `slope_degrees` (DB scalars, Task 07B); a DEM-derived elevation/slope raster now exists (Task 14/15) but is **not wired into this dimension** — `risk.py` still reads only the DB scalars | `geology`, `aspect`, `dem_derived_susceptibility_index` | **No** — inputs exist but no approved classification rule (per Task 07A §3) | No new *source* data strictly required to attempt a rule (geology/aspect would still help), but a scoring-rule approval is the actual blocker |
| Hazard Exposure (30%) | **None** | `landslide_susceptibility_class`, `flood_hazard_class`, `cloudburst_hazard_class`, `multi_hazard_overlay` | **No** | **Yes** — this is the dimension this task's audit was aimed at; still zero usable data after this audit |
| Historical Disaster Evidence (15%) | **None** | `past_incident_count`, `past_incident_severity`, `most_recent_incident_recency` | **No** | **Yes** — same conclusion |
| Population / Household Exposure (20%) | `population`, `households` (DB scalars) | `vulnerable_subgroup_counts` | **No** (rule, not data, is the blocker) | Only for the subgroup breakdown, not the core dimension |
| Vulnerability (15%) | **None** | `housing_construction_type`, `distance_to_hospital`, `distance_to_road`, `economic_vulnerability_index` | **No** | **Yes** |

No numeric scoring formula is proposed here, per the task's explicit
instruction — this table reports evidence availability only.

### 7.8 Data acquisition blockers

- **Login/registration walls**: Bhuvan (confirmed, same as Task 14),
  GSI/NGDR (confirmed via secondary source) — this session cannot
  create accounts on the user's behalf (same conclusion as Task 14).
- **Reachability**: `bhukosh.gsi.gov.in` could not be connected to
  directly in this session (connection error); `usdma.uk.gov.in`'s
  two specific sub-page URLs found via search returned 404.
- **Format/dependency gaps**: IMD's NetCDF rainfall format is not
  currently handled anywhere in VIKALP's approved stack — acquiring it
  would require a stack decision (new dependency or a documented
  GDAL-NetCDF-driver approach) before any download, per the "no new
  dependencies without approval" rule.
- **Coverage gaps**: NDMA's Flood Hazard Atlas confirmed to exclude
  Uttarakhand; no confirmed Uttarakhand-specific flood hazard GIS
  source was found at all.
- **Format mismatch**: Several of the most accessible sources (NDMA's
  atlases, USDMA's reports) are static PDF documents, not
  machine-readable GIS data — even once "acquired," they would need a
  separate (unapproved, unscoped) digitization step before being
  usable in the existing GeoJSON/raster pipeline.

### 7.9 Provenance fields to record for any future acquisition

For whichever candidate is eventually approved, `docs/DATA_PROVENANCE.md`
would need: source organization, exact dataset/product name and
version, official URL, access/retrieval date, original filename(s),
CRS, spatial resolution, temporal coverage, license/access conditions,
SHA256 checksum, exact geographic subset/processing performed, and
known limitations — the same structure already used for the
boundaries (Task 12) and terrain (Task 14/15) records. Not created
now, since nothing was acquired.

## 8. Task 18 — Bhuvan landslide evidence acquired (metadata + point queries only)

**AVAILABLE, but limited**: real WMS layer metadata and point-query
results for the two approved layers now exist in
`data/raw/static/hazards/`. **NOT AVAILABLE**: any actual feature
geometry, attribute value, or hazard class for either layer — no
vector/GeoJSON dataset could be obtained through any proper GIS
endpoint (see below).

| Item | Status | Detail |
|---|---|---|
| `UK_SLIM_2017` layer metadata (CRS, bbox, title) | **AVAILABLE** | `data/raw/static/hazards/uk_slim_2017_wms_layer_metadata.xml`, extracted from live `GetCapabilities` |
| `RIRUCHBA_LHZ_01` layer metadata (CRS, bbox, title) | **AVAILABLE** | `data/raw/static/hazards/riruchba_lhz_01_wms_layer_metadata.xml` — title reveals it's the Rishikesh–Rudraprayag–Chamoli–Badrinath route corridor |
| Bhitai Malli bbox coverage, both layers | **AVAILABLE, verified** | Confirmed programmatically against each layer's own `<LatLonBoundingBox>` |
| Pauri Garhwal bbox overlap, both layers | **AVAILABLE, verified** | Confirmed against the Task 12 `boundaries_uk_demo.geojson` Garhwal district bbox |
| Actual feature geometry/attributes at Bhitai Malli | **MISSING** | 2 `GetFeatureInfo` queries at Bhitai Malli's exact point (one per layer) both returned empty `FeatureCollection`s — "No feature intersection verified at Bhitai Malli" |
| Actual feature geometry/attributes anywhere (schema sample) | **MISSING** | 2 more queries at each layer's own bbox center also returned empty — no example feature was ever retrieved from either layer in this session |
| Bulk vector/GeoJSON download endpoint | **CONFIRMED NOT TO EXIST** | WFS explicitly returns "Service WFS is disabled" at both `/bhuvan/wfs` and `/bhuvan/ows` |
| Processed hazard output (`data/processed/static/hazards/`) | **NOT CREATED** | No processing was possible or necessary — the raw metadata/query files are already the minimum obtainable evidence |
| Risk-engine connection | **NOT DONE** | Explicitly out of scope for this task |

Full acquisition method, file-by-file checksums, and the coverage
table are in `docs/DATA_PROVENANCE.md`'s HAZARDS section.

## 9. Task 19 — GSI/NLFC (Bhusanket) landslide source investigation (no acquisition)

**Read-only investigation.** No file was downloaded or written to
`data/`. All findings below come from directly querying GSI's public
infrastructure (portal pages, and the Esri ArcGIS Server REST API
backing `bhusanket.gsi.gov.in`), not from secondary sources, unless
stated otherwise.

### 9.1 What the portal actually is

`bhusanket.gsi.gov.in` is a JavaScript single-page application built
on the **Esri ArcGIS API for JavaScript 4.29**, confirmed by finding
`<script src="https://js.arcgis.com/4.29/">` in the page source. Its
real GIS backend is GSI's own **Esri ArcGIS Server** instance at
`https://bhusanket.gsi.gov.in/gisserver/rest/services` (ArcGIS Server
11.2, confirmed via its own `currentVersion` field) — found by fetching
the site's `json/config.json`, which lists every layer URL the map
viewer actually uses. Static tools cannot see this by reading the
HTML/markdown alone (most sub-pages showed "Unable to fetch data from
the server" placeholders); the config file and the ArcGIS REST API
itself had to be queried directly.

### 9.2 Services found, and their access status

| Service | Type | Access | Notes |
|---|---|---|---|
| `Hosted/Public_Portal_Dashboard_Map/FeatureServer/0` ("Landslide_Public") | FeatureServer, Point | **PUBLIC — no token** | The field-validated landslide inventory. See §9.3. |
| `Hosted/Public_Portal_Dashboard_Map/FeatureServer/1` ("District_Boundary") | FeatureServer, Polygon | **PUBLIC — no token** | Confirmed to contain a real `Pauri Garhwal` / `UTTARAKHAND` polygon feature |
| `Hosted/Public_Portal_Dashboard_Map/FeatureServer/2` ("State_Boundary") | FeatureServer, Polygon | **PUBLIC — no token** | Not individually queried beyond metadata |
| `Bulletin_NDEM/MapServer` (District_Layer_Day1/Day2) | MapServer, Polygon | **PUBLIC — no token** | This is the **dynamic forecast bulletin** (1–2 day lookahead), not a static hazard/inventory layer — wrong evidence type for VIKALP's Hazard Exposure/Historical Disaster dimensions, noted for completeness only |
| `GSI/Landslidedata_1` (FeatureServer) | FeatureServer, Point | **PUBLIC — no token** | Metadata accessible, but its own declared `fullExtent` is lon `[73.49,80.10]`, lat `[10.29,13.38]` — **South India only; does not reach Uttarakhand** |
| `Hosted/India_All_Landslided/FeatureServer/0` ("landslide_lyr" in config.json) | FeatureServer | **BLOCKED — "Token Required" (HTTP 200, ArcGIS error code 499)** | The layer the homepage's own config wires up as the primary "landslide_lyr" — not accessible |
| `GSI/Landslide_Polygon/FeatureServer` | FeatureServer, Polygon | **BLOCKED — Token Required** | Could have been the actual hazard-zonation/mapped-landslide-polygon product; not accessible |
| `GSI/Susceptibility/ImageServer` ("susceptibility_lyr") | ImageServer (raster) | **BLOCKED — Token Required** | **This is the NLSM/susceptibility raster service — the Task 19 SPECIAL PRIORITY target. Confirmed to exist, confirmed not accessible.** |
| `Susceptibility` (folder, distinct from `GSI/Susceptibility`) | Folder listing | **BLOCKED — Token Required** | Whatever else lives in this folder (possibly LSM 10K/impact-probability products) could not be enumerated |
| `GSI/GSI_Landslide_India` (FeatureServer + MapServer) | FeatureServer/MapServer | **BLOCKED — Token Required** | Found via the public `GSI` folder listing; content unknown |

### 9.3 The Landslide_Public inventory — the one usable dataset found

`https://bhusanket.gsi.gov.in/gisserver/rest/services/Hosted/Public_Portal_Dashboard_Map/FeatureServer/0`

- **Product**: field-validated landslide inventory (matches the
  homepage's "Landslide Inventory (Field Validated)" product — though
  this service's own total record count, 31,545, is far larger than
  the "1,179 recorded events" figure seen on the homepage; this
  discrepancy is reported, not resolved — they may be different
  subsets, e.g. a current-season count vs. the full cumulative
  archive).
- **Access**: fully public, no login/token — confirmed by direct
  `GetCapabilities`-equivalent (`?f=json`) and `query` calls.
- **CRS**: `EPSG:4326` (`wkid:4326`), confirmed from the service's own
  `spatialReference`.
- **Geometry type**: Point.
- **Format**: Esri REST JSON/GeoJSON via a standard `.../query`
  endpoint — genuinely GIS-usable, not a PDF or screenshot.
- **Attributes** (partial list, from real field metadata and sample
  records): `state`, `district`, `village`, `slide_name`, `slide_no`,
  `toposheet`, `activity` (Active/Dormant/Reactivated/Suspended/
  Abandoned), `triggering` (e.g. "Heavy rainfall"), `movement_t`
  (Slide/Fall/etc.), `geology`, `initiation` (year), `length`/`width`/
  `depth`/`height`/`ls_area`/`ls_volume`, casualty/damage fields,
  `report`/`photos`/`citation` references, `latitude`/`longitude`.
- **Coverage counts** (all confirmed via live `returnCountOnly=true`
  queries, not estimated): **31,545** records India-wide; **5,217**
  where `state='Uttarakhand'`; **569** where `district LIKE '%Pauri%'`
  (Pauri Garhwal).
- **Bhitai Malli feature intersection test** (the required critical
  coverage test): a spatial query with a ±0.01° envelope
  (≈ ±1.1 km) centered exactly on (78.781266, 30.167112) returned
  **zero features**. **"Feature intersection at Bhitai Malli not
  verified."**
- **Nearby context** (not a coverage claim): widening the same query
  to a ±0.05° envelope (≈ ±5.5 km) returned **28 records**, all in
  `district="Garhwal"`, nearly all `triggering="Rainfall"`, activity
  states spanning Active/Reactivated/Dormant/Suspended/Abandoned. The
  closest of these are roughly 2–3 km from Bhitai Malli. This is
  useful proximity context, not evidence that Bhitai Malli itself is
  affected.
- **District_Boundary layer cross-check**: a real `Pauri Garhwal` /
  `UTTARAKHAND` polygon feature was retrieved from
  `FeatureServer/1`, confirming the service's own district boundaries
  correctly identify and contain the pilot district.

### 9.4 Priority findings, as the task requested

- **SPECIAL PRIORITY (NLSM 1:50,000 / susceptibility)**: the service
  (`GSI/Susceptibility/ImageServer`) exists and was located, but
  **requires an authentication token this session does not have** —
  not accessible. Whether Uttarakhand's NLSM coverage is complete
  could not be independently confirmed from an official page reachable
  this session (the Ministry of Earth Sciences PDF most likely to
  state this precisely returned HTTP 403 Forbidden when fetched).
- **SECOND PRIORITY (field-validated inventory)**: **found and fully
  verified** — see §9.3. This is the one genuinely usable candidate
  from this entire investigation (Tasks 18 and 19 combined).
- **THIRD PRIORITY (LSM 10K maps)**: the `NLSM_10K_Map.html` viewer
  page exists and describes itself as showing "Landslide Susceptibility
  Map and Landslide Management map" at 1:10,000 scale, but no distinct
  public service URL for it was found in `config.json` — it most
  likely renders through the same token-gated `Susceptibility`
  ImageServer/folder. Not confirmed accessible; not confirmed to cover
  Pauri Garhwal specifically.
- **Landslide Impact Probability Map**: mentioned on the homepage as a
  product name; no distinct service or page content was found
  describing it further. Not confirmed to be GIS-usable or to cover
  Pauri Garhwal.

### 9.5 Ranking

1. **HIGH — `Hosted/Public_Portal_Dashboard_Map/FeatureServer/0`
   (Landslide_Public)**: government authority (GSI/NLFC), confirmed
   Pauri Garhwal coverage (569 records) and nearby (≤5.5 km) Bhitai
   Malli context, genuinely GIS-usable (point features, real
   attributes, standard REST/GeoJSON), fully accessible without login,
   well-documented Esri REST API, best-quality result of either
   landslide investigation so far.
2. **MEDIUM (blocked, not ruled out)** — `GSI/Susceptibility/ImageServer`
   (NLSM raster): highest government-authority and directly matches
   the Hazard Exposure dimension's need for a susceptibility
   class/surface, but inaccessible without a token that would need to
   be separately requested from GSI.
3. **LOW** — Bhuvan `UK_SLIM_2017`/`RIRUCHBA_LHZ_01` (Task 18):
   accessible but returned no usable features anywhere queried;
   superseded in usefulness by finding #1 above.
4. **NOT VIABLE** — every other token-gated Bhusanket service; the
   Bulletin_NDEM forecast layer (wrong evidence type); `Landslidedata_1`
   (doesn't reach Uttarakhand).

### 9.6 Recommendation

**Recommended dataset:** GSI/NLFC's field-validated landslide
inventory, served via
`https://bhusanket.gsi.gov.in/gisserver/rest/services/Hosted/Public_Portal_Dashboard_Map/FeatureServer/0`.

**Why:** It is the only landslide-related source found across both
Task 18 and Task 19 that is simultaneously authoritative (GSI/NLFC),
confirmed to have real records in Pauri Garhwal district (569),
genuinely GIS-usable (point geometry, `EPSG:4326`, rich real
attributes, standard Esri REST/GeoJSON query interface), and fully
accessible without login or token.

**How it can be acquired:** A direct HTTPS `query` request against the
`FeatureServer/0/query` endpoint, filtered to `district` = Pauri
Garhwal (or a Pauri-Garhwal bounding box/polygon), requesting
`f=geojson` — no scraping, no screenshots, no digitization; this is
the service's own documented, intended query mechanism.

**Expected format:** GeoJSON (or Esri JSON), point geometry, `EPSG:4326`.

**Expected coverage:** District-level (Pauri Garhwal, 569 records
confirmed to exist); settlement-level (Bhitai Malli exact point) is
**not** covered — confirmed empty within ≈1.1 km, with the nearest
known records roughly 2–3 km away.

**Bhitai Malli feature status:** "Feature intersection at Bhitai Malli
not verified."

**Main limitation:** No record intersects Bhitai Malli's own location;
the evidence this dataset could contribute is district/proximity-level
context, not a settlement-specific hazard determination. The
higher-value NLSM susceptibility raster (which would give an actual
susceptibility class at Bhitai Malli's exact point) remains
token-gated and unavailable.

**NO GSI LANDSLIDE DATA WAS DOWNLOADED OR MODIFIED.** *(Task 19 status — superseded by Task 20 below, which did acquire data under explicit approval.)*

## 10. Task 20 — GSI/NLFC field-validated landslide inventory acquired

**AVAILABLE**: a real, validated GeoJSON point dataset — the first
hazard-category layer in this repository with actual feature geometry
and attributes (not just metadata or empty query results).

| Item | Status | Detail |
|---|---|---|
| GSI landslide inventory, Pauri Garhwal scope | **AVAILABLE** | `data/raw/static/hazards/gsi_nlfc_field_validated_landslides_pauri_garhwal.geojson` — 813 points, EPSG:4326, 134 attributes preserved |
| Feature count validation | **AVAILABLE, verified 3 ways** | Server count query, manual file count, GeoPandas row count all agree: 813 |
| Bhitai Malli exact-point intersection | **CONFIRMED: none** | "No GSI inventory feature intersects the Bhitai Malli point" — checked against all 813 features directly |
| Nearby context (≤5 km) | **AVAILABLE** | 21 records, nearest 2.04 km, all `district="Garhwal"`, nearly all rainfall-triggered — reported as context, not a Bhitai Malli claim |
| `district` field reliability | **KNOWN LIMITATION** | Inconsistent near Bhitai Malli ("Garhwal" vs "Pauri Garhwal"); resolved for acquisition via exact polygon spatial filtering instead of trusting the text field |
| Processed output (`data/processed/static/hazards/`) | **NOT CREATED** | Not needed — acquired file already matches the target CRS/format |
| Risk-engine connection | **NOT DONE** | Explicitly out of scope for this task |
| NLSM susceptibility raster (`GSI/Susceptibility/ImageServer`) | **STILL BLOCKED** | Unchanged from Task 19 — token required, not accessible |

Full acquisition method, exact query construction, checksums, and the
Bhitai Malli proximity table are in `docs/DATA_PROVENANCE.md`'s
"HAZARDS — GSI/NLFC field-validated landslide inventory" section.
