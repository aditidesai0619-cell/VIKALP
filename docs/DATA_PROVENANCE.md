# VIKALP — Data Provenance

Provenance record for the first genuinely sourced GIS layer integrated
into VIKALP (Task 12). Distinguishes **source** (what was obtained and
from where), **processing** (what was done to it), and **application
use** (how it's exposed/rendered). Nothing in this document is
invented — where something isn't documented in the source itself, it
says so explicitly.

## SOURCE

| Field | Value |
|---|---|
| Dataset name | geoBoundaries — India ADM2 (district-level administrative boundaries) |
| Publisher/platform | geoBoundaries (William & Mary geoLab), `gbOpen` release tier |
| Underlying source organization | Pathways Data Pvt. Ltd.; `lgdirectory.gov.in` (India's Local Government Directory, Ministry of Panchayati Raj) — as recorded in the dataset's own `boundarySource`/`boundarySourceURL` metadata field |
| Original source path/URL | `https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/IND/ADM2/geoBoundaries-IND-ADM2_simplified.geojson` |
| Retrieved via | geoBoundaries' own public API: `https://www.geoboundaries.org/api/current/gbOpen/IND/ADM2/` (queried directly; source/CRS/counts below were verified from the actual downloaded file, not assumed from the API metadata alone) |
| Retrieval date | This task's session (2026-09-11) |
| License | `Open Data Commons Open Database License 1.0` — as recorded in this dataset's own `boundaryLicense` metadata field. (geoBoundaries' general `gbOpen` tier is described elsewhere on their site as CC-BY 4.0; this specific boundary's own recorded license is ODbL 1.0. Both require attribution. This document records what the dataset's own metadata states, not the general site-wide description, since they differ.) |
| Boundary year represented | 2021 (per `boundaryYearRepresented`) |
| Source data update date | 2023-01-19 (per `sourceDataUpdateDate`) |
| geoBoundaries build date | 2023-12-12 (per `buildDate`) |
| Documented admin unit count (API metadata) | 736 (per `admUnitCount`) |
| Actual feature count in downloaded file | **735** — a discrepancy from the API's own stated count of 736. Not investigated further; recorded here rather than silently reconciled. |
| Raw file SHA256 | `d68db39cd3e2d0892af268e2b0454166368ce3b5b8a78fcda63069ec92a641db` |
| Raw file path | `data/raw/static/boundaries/geoBoundaries-IND-ADM2_simplified.geojson` (untouched, read-only; sidecar `SOURCE.txt` alongside it records the same retrieval details) |
| Original CRS | `urn:ogc:def:crs:OGC:1.3:CRS84` (WGS84, longitude/latitude axis order) — as declared in the file's own `crs` member; confirmed identical in substance to EPSG:4326 when read via GeoPandas (`gdf.crs` reports `EPSG:4326`) |
| Original geometry type | Polygon (confirmed by inspection; no MultiPolygon features present in this file) |
| Original properties/attributes | `shapeName`, `shapeISO`, `shapeGroup`, `shapeID`, `shapeType` — confirmed by inspecting the raw file directly. **No `state`/ADM1 attribution field exists in the source** — districts are not labeled with their parent state. |
| Original geographic coverage | All of India, 735 district-level (ADM2) polygons |

## PROCESSING

1. Downloaded the raw file as-is (no modification) into `data/raw/static/boundaries/geoBoundaries-IND-ADM2_simplified.geojson`.
2. Loaded with GeoPandas (`gpd.read_file`), confirming CRS reads as `EPSG:4326`.
3. **Geographic filtering.** Because the source has no `state` property, Uttarakhand's districts were identified by name match against the dataset's own `shapeName` values. Uttarakhand's 13 official districts were located in the file under these exact `shapeName` spellings (note two names differ from the commonly-used official spelling):
   - Almora, Bageshwar, Chamoli, Champawat, Dehradun, **Garhwal** (= Pauri Garhwal), **Hardwar** (= Haridwar), Nainital, Pithoragarh, Rudraprayag, Tehri Garhwal, Udham Singh Nagar, Uttarkashi.
   - Verified via `gdf[gdf['shapeName'].isin([...13 names...])]` — matched exactly 13 features, none missing.
   - Independently cross-checked with a bounding-box intersection test (`lon 77.5–81.1, lat 28.6–31.5`, Uttarakhand's approximate extent) — the 13 name-matched districts were consistent with the districts intersecting that box (after excluding neighboring-state districts the box also overlaps).
4. **Spatial verification of the Bhitai Malli relationship** (see BHITAI MALLI RELATIONSHIP section below) — a point-in-polygon test using Bhitai Malli's existing, unmodified coordinates (78.781266, 30.167112) against every polygon in the source file, to determine with certainty which single district contains it, rather than trusting the name match alone.
5. Reprojected to `EPSG:4326` explicitly (`gdf.to_crs('EPSG:4326')`) — a no-op here since the source was already in that CRS, but performed explicitly rather than assumed, and required for valid RFC 7946 GeoJSON output regardless.
6. Reduced to the original 5 source columns only (`shapeName`, `shapeISO`, `shapeID`, `shapeGroup`, `shapeType`) plus geometry — **no properties were added, renamed, or invented**. Sorted by `shapeName` for a deterministic output order.
7. Wrote the result to `data/processed/static/boundaries_uk_demo.geojson` via `GeoDataFrame.to_file(..., driver='GeoJSON')`.

| Field | Value |
|---|---|
| Processed file path | `data/processed/static/boundaries_uk_demo.geojson` |
| Processed CRS | `EPSG:4326` / `urn:ogc:def:crs:OGC:1.3:CRS84` (unchanged from source) |
| Feature count before filtering | 735 |
| Feature count after filtering | 13 (all Uttarakhand districts) |
| Processed file size | ~228 KB |
| Geometry filtering method | Attribute filter (exact `shapeName` match against the 13 known Uttarakhand district names), cross-checked with a bounding-box spatial intersection |
| Tooling used | GeoPandas 1.1.4, Shapely 2.1.2, PyProj 3.8.0 (all from the project's already-approved GIS stack; newly installed for this task, pinned in `backend/requirements.txt`) |

## APPLICATION USE

| Field | Value |
|---|---|
| Backend endpoint | `GET /api/gis/boundaries` — reads `data/processed/static/boundaries_uk_demo.geojson` directly from disk on each request (no database table); returns honest HTTP errors (503) for a missing/invalid/empty file rather than a silent empty `FeatureCollection` |
| Frontend rendering | MapLibre GeoJSON source `boundaries-source` + `fill` layer `boundaries-fill` + `line` layer `boundaries-line`, layered above the OSM raster base but below the Bhitai Malli settlement point/label, so the settlement marker is never obscured |
| Fill/line styling | Muted slate-blue (`#5b7a99` fill at 12% opacity, `#3d5a75` outline at 60% opacity) — deliberately **not** using the app's safe/warning/critical colors (green/amber/red), since this layer carries no risk information and using those colors would misleadingly imply a hazard status |
| Click interaction | Shows only real source fields: district name (`shapeName`), a static "Uttarakhand" state label (true of every feature in this file by construction — the whole layer is the Uttarakhand filter result — not a per-feature invented property), and the administrative ID (`shapeID`) when present |
| UI disclosure | "Sourced GIS boundary data — provenance recorded; source validation in application pending" (shown only once the layer successfully loads); a separate honest error state with retry if the endpoint fails, independent of the settlement point |

## BHITAI MALLI RELATIONSHIP

**Verified spatially, not assumed.** Bhitai Malli's existing, unmodified
coordinates (longitude 78.781266, latitude 30.167112) were tested with
a point-in-polygon query (`geometry.contains(Point(...))`) against
every one of the 735 source district polygons. Exactly one polygon
contains the point: `shapeName = "Garhwal"`, `shapeID =
76128533B46926146855114`.

This is a **district-level match, not a village-level match** — the
source dataset contains no village or block-level boundaries anywhere,
for Bhitai Malli or any other settlement. "Garhwal" in this dataset's
naming is understood to correspond to the administrative unit commonly
known as **Pauri Garhwal** district (matching the district name
already recorded for Bhitai Malli in the application's own settlement
record), but this document does not claim the dataset's internal name
was independently verified against an official district-code registry
beyond the spatial containment test and the plausibility of the name
itself. No exact Bhitai Malli village polygon exists in this dataset
or anywhere else in the repository.

## LIMITATIONS

- District-level (ADM2) resolution only — no village, block, or ward
  boundaries.
- No `state` attribute in the source; Uttarakhand membership is
  established by this project's own filtering (name match +
  bounding-box cross-check), not a field present in the raw data.
- The source's own `shapeISO` field is empty for every feature in this
  file — not populated at ADM2 level in this dataset.
- A documented `admUnitCount` of 736 vs. an actual 735 features in the
  downloaded file was not investigated further.
- No attribute beyond the original 5 source fields is available (no
  population, area, or administrative-office data at district level in
  this file).
- License requires attribution (ODbL 1.0, per this dataset's own
  metadata) — not yet added as a visible attribution string in the
  application UI; the OSM basemap attribution is currently the only
  visible map attribution. Flagged for a follow-up task.
- Access date/license/URL information above is exactly what was
  observed from geoBoundaries' own API and file metadata during this
  session — anything not present in that metadata is marked "Not
  documented in the local source metadata" rather than inferred.

## VALIDATION STATUS

- File existence, format (valid GeoJSON `FeatureCollection`), CRS,
  geometry type, feature count, properties, and bounding box were all
  verified directly from the actual downloaded and processed files
  (via `json.load` inspection and GeoPandas), not assumed.
- The Bhitai Malli spatial relationship was verified via an actual
  point-in-polygon computation against the source geometry, not
  inferred from names alone.
- The backend endpoint was verified live (`curl`) to return valid
  GeoJSON with the correct feature count, and to return an honest 503
  error (not an empty `FeatureCollection`) when the processed file was
  temporarily removed during testing.
- The MapLibre integration was verified via direct inspection of the
  live map's internal state (source/layer registration, feature count,
  paint properties, layer z-order) — the same reliable verification
  method established in Task 12's predecessor task, since on-screen
  pixel rendering of WebGL vector layers could not be visually
  confirmed via screenshot in this session's sandboxed test
  environment (see `docs/DECISIONS.md` Task 11 and Task 12 for detail).
- Not validated: whether the "Garhwal" polygon's boundary precisely
  matches Pauri Garhwal district's official/current administrative
  extent as gazetted by the Uttarakhand government — no such official
  reference boundary was available in this repository to compare
  against. This dataset should be treated as demo/prototype-grade, not
  a substitute for an authoritative government boundary source.

---

# TERRAIN — CartoDEM (Task 14 / 14A)

Provenance record for the second genuinely sourced GIS layer, a
Cartosat-1 Digital Elevation Model tile. **This dataset has been
downloaded and validated but not yet processed or exposed through any
API/map layer** — only the SOURCE and RAW FILE VALIDATION sections
below apply; there is no PROCESSING or APPLICATION USE section yet.

## SOURCE

| Field | Value |
|---|---|
| Dataset name | CartoDEM (Cartosat-1 Digital Elevation Model), Version-3 R1 |
| Publisher/organization | National Remote Sensing Centre (NRSC), Indian Space Research Organisation (ISRO), Dept. of Space, Govt. of India |
| Portal | Bhuvan Open Data Archive (`bhuvan-app3.nrsc.gov.in`) — download requires a registered-user login, per the file's own embedded metadata (`<Access_Constraints> Registered Users </Access_Constraints>`) |
| Retrieval method | Manually downloaded by the user through Bhuvan's interactive tile picker (registered-user login required; not something this session could perform itself — see `docs/DECISIONS.md` Task 13/14) |
| Retrieval date | This task's session (2026-09-12) |
| Original source imagery | Cartosat-1 PAN (2.5 m) Stereo Data, acquired 2005–2014 (per each tile's own filename prefix `C1_DEM_16B_2005-2014`) |
| Product edition | "Third" (= Version-3), per every tile's own `<Edition>` metadata field |
| Data type (as labeled in the file's own metadata) | `<Data_Type>Elevation</Data_Type>`, but `<Dataset_Topic_Category>` labels it "Digital Surface Model (DSM)" — the source's own metadata uses both terms; this document records both rather than picking one |
| Tile scheme | 1°×1° tiles, named by a Survey-of-India-style grid code (e.g. `H44G`) plus the tile's own SW/NE corner in the filename (e.g. `78E30N`) |
| Resolution | "1 arc sec" per the file's own `<Resolution>`/`<Spatial_Resolution>` tags — confirmed independently below via the raster's own pixel size |
| Format | GeoTIFF, 16-bit ("16B" in the filename; confirmed as signed 16-bit below) |
| License/terms | NRSC/ISRO single-user, non-exclusive, non-transferable license (full text in each tile's own `readme.txt`) — permits internal use, derivative/value-added products, and limited web posting (≤1K×1K visualization only, no re-download), with mandatory citation as "\<Name of the Data\>, National Remote Sensing Centre, ISRO, Government of India, Hyderabad, India." Each tile also ships a separate `policy.txt`, which is the **Bhuvan portal's privacy policy** (site cookies/IP logging) — not a data license; recorded here only to avoid it being mistaken for licensing text. |
| Accuracy (per NRSC's general CartoDEM documentation, not per-tile) | ~8 m vertical (LE90) |

## RAW FILES RECEIVED — discrepancy flagged

The task requesting this download expected **one** tile covering
Bhitai Malli. What was actually placed in the repo was **four
already-extracted folders** (not ZIP archives — no `.zip` file exists
anywhere in the repository; confirmed by repo-wide search), covering
**three distinct 1°×1° tiles, only one of which contains Bhitai
Malli**:

| Folder (as placed) | Tile | Coverage (lon °E, lat °N) | Contains Bhitai Malli? |
|---|---|---|---|
| `C1_DEM_16B_2005-2014_v3_R-1_78E30N_h44g/` | H44G | [78, 79) × [30, 31) | **Yes — the needed tile** |
| `C1_DEM_16B_2005-2014_v3_R-1_79E30N_h44h (1)/` | H44H | [79, 80) × [30, 31) | No |
| `C1_DEM_16B_2005-2014_v3_R-1_79E30N_h44h (2)/` | H44H | [79, 80) × [30, 31) | No — byte-identical duplicate of "(1)" |
| `C1_DEM_16B_2005-2014_v3_R-1_79E29N_h44n (1)/` | H44N | [79, 80) × [29, 30) | No |

Additionally, a **fourth copy** of tile H44H's entire file set is
nested *inside* the H44G folder, at
`C1_DEM_16B_2005-2014_v3_R-1_78E30N_h44g/C1_DEM_16B_2005-2014_v3_R-1_79E30N_h44h (2)/cdnh44h_v3r1/` —
confirmed byte-identical (SHA256) to the other two top-level H44H
copies. This is almost certainly an accidental nested extraction/copy
on the user's side, not a distinct file. **This entire discrepancy
(non-ZIP folders, 3 of 4 items for the wrong tile, a triple-duplicated
H44H, and one duplicate nested inside H44G) is reported here exactly
as instructed rather than silently worked around.** Nothing was
deleted, renamed, or modified — see `docs/DECISIONS.md` Task 14A.

Each tile folder contains the same file set: the DEM GeoTIFF
(`cdn<tile>.tif`), a per-tile FGDC/ISO-style XML metadata record
(`cdn<tile>.xml`), a waterbody polygon shapefile
(`cdn<tile>.shp`/`.shx`/`.dbf`/`.prj`/`.shp.xml` — confirmed via the
shapefile's own embedded lineage metadata to be a Cartosat-derived
glacial-lake/waterbody layer, field `Carto_WBID`, unrelated to
elevation), and copies of the shared `readme.txt`/`policy.txt`.

## RAW FILE VALIDATION — `cdnh44g.tif` (the needed tile)

Validated directly with `rasterio` (which bundles GDAL 3.12.4), never
modifying the file.

| Field | Value |
|---|---|
| Path | `data/raw/static/terrain/C1_DEM_16B_2005-2014_v3_R-1_78E30N_h44g/cdnh44g_v3r1/cdnh44g.tif` |
| File size | 26,642,329 bytes (~25.4 MiB) |
| SHA256 | `b8ff126c086b61833a07714e4c6d6273af0a21add003103cdcdad8bafe2f22ee` |
| Format/driver | GeoTIFF (`GTiff`); `TIFFTAG_SOFTWARE` = "ERDAS IMAGINE" |
| CRS | `EPSG:4326` (geographic WGS84) — confirmed both by rasterio reading the embedded CRS and by the sidecar `cdnh44g.prj` (`GCS_WGS_1984`) |
| Width × height | 3600 × 3600 pixels |
| Pixel resolution | 0.00027777778° per pixel in both axes — exactly 1/3600°, i.e. **1 arc-second**, matching the file's own metadata label |
| Bounds (lon, lat) | `[77.999861, 30.000139]` to `[78.999861, 31.000139]` — matches the embedded XML's stated coverage (78°E–79°E, 30°N–31°N) to within half a pixel, consistent with the file's `AREA_OR_POINT=Area` pixel convention |
| Band count / data type | 1 band, signed 16-bit integer (`int16`) |
| NoData | **Not declared** in the GeoTIFF's own tags (`rasterio` reports `nodata: None`). The value `-32768` is documented elsewhere by NRSC as a nodata sentinel for a related (2.5 m) CartoDSM product, but this specific tile's pixel data was checked directly and contains **zero** occurrences of `-32768` and **zero** negative or zero values anywhere — i.e. this tile appears to have full data coverage with no internal gaps, though the absence of a formal NoData tag is recorded as-is rather than assumed. |
| Elevation range (this tile) | 232 m to 6575 m — plausible for Uttarakhand's terrain (Himalayan foothill valleys to high peaks); not independently cross-checked against any other elevation source |
| Elevation unit | Meters (per the tile's own `<Spatial_Resolution_Unit>m</Spatial_Resolution_Unit>` and the general product documentation) |

### Bhitai Malli coverage — verified

Bhitai Malli's existing, unmodified coordinates (longitude 78.781266,
latitude 30.167112) fall **inside** `cdnh44g.tif`'s bounds. Sampling
the raster at that exact point (pixel row 2998, column 2813) returns
an elevation of **991 meters**.

**This exactly matches the `elevation_m` value (991) already stored
for Bhitai Malli in `backend/vikalp.db`.** This is recorded as an
observed fact only — it is *not* claimed here that the existing demo
database value was derived from this DEM (no evidence either way was
found), only that an independently obtained, now-validated raster
happens to report the same figure at these coordinates.

"Spatial coverage verified for Bhitai Malli."

## VALIDATION STATUS (terrain)

- File format, CRS, dimensions, resolution, bounds, data type, and
  pixel values were all verified directly from the actual downloaded
  file via `rasterio`, not assumed from documentation.
- SHA256 checksums were computed for every file received (all 4
  folders), establishing that three of the four are exact duplicates
  of a single unneeded tile (H44H).
- Not validated: the DEM's absolute vertical accuracy at Bhitai
  Malli's specific location (NRSC's ~8 m LE90 figure is a general
  product-level claim, not a per-pixel one); whether this tile's
  elevation values have any relationship to how the existing
  `elevation_m`/`slope_degrees` demo fields were originally chosen;
  the H44H/H44N tiles' own validity (checked only enough to confirm
  their coverage excludes Bhitai Malli, not fully validated since
  they are not needed).
- No slope was calculated. No terrain risk score was calculated. No
  processed output was created. No API or map layer was built.

---

# TERRAIN — CartoDEM processing and slope derivation (Task 15)

This section documents the first **processed** (not just validated)
terrain outputs. Distinguishing the three categories the task
requires:

- **SOURCE DATA** — `cdnh44g.tif`, the raw CartoDEM tile documented
  above (Task 14/14A); untouched.
- **DERIVED DATA** — the two processed rasters described below,
  computed from the source DEM by code in this task; not independently
  sourced, not officially validated.
- **DEMO PLANNING INPUTS** — Bhitai Malli's existing `elevation_m`
  (991) and `slope_degrees` (18.91°) scalars in `vikalp.db`, unchanged
  by this task (per its own explicit instruction not to auto-update
  them). Compared against the derived values below as an observation
  only.

## PROCESSING

1. Loaded `cdnh44g.tif` read-only via `rasterio`; re-confirmed CRS
   (`EPSG:4326`), resolution (1 arc-sec), bounds, dimensions
   (3600×3600), dtype (`int16`), and that no NoData value is declared
   — all identical to the Task 14A findings, re-verified fresh rather
   than assumed.
2. **Clip extent chosen**: the intersection of (a) the Pauri Garhwal
   district polygon's bounding box, read from the existing
   `data/processed/static/boundaries_uk_demo.geojson` (`shapeName =
   "Garhwal"`, the same district Task 12 verified contains Bhitai
   Malli), and (b) `cdnh44g.tif`'s own actual raster bounds. A single
   downloaded tile cannot cover all of Pauri Garhwal — the district's
   full bounding box (`[78.2046, 29.43081, 79.23448, 30.25756]`)
   extends south and east beyond this tile's `[78–79°E, 30–31°N]`
   coverage, into tiles that were not required or downloaded for this
   task (`H44H`, and an unrequested tile south of `H44G` neither of
   which was needed since Bhitai Malli itself is covered). The
   resulting clip is therefore **not the full district** — it is the
   portion of Pauri Garhwal that happens to fall inside the one tile
   available, chosen because it is grounded in real, already-verified
   boundary data rather than an arbitrary radius around the point, and
   because it comfortably contains Bhitai Malli.
   - Resulting clip bounds: lon `[78.204583, 78.999861]`, lat
     `[30.000139, 30.257639]` — 2863 × 927 pixels (vs. the source
     tile's full 3600 × 3600).
   - The clip's **south and east edges coincide exactly with the
     source tile's own physical boundary** (confirmed
     programmatically) — i.e., real DEM data for the rest of Pauri
     Garhwal genuinely doesn't exist in this repository yet, not just
     that it was cropped out.
3. **No resampling, reprojection, or value alteration** — every pixel
   value in the clipped elevation raster is copied unchanged from the
   source tile; only the CRS (`EPSG:4326`) and per-pixel resolution
   (0.00027777778°, unchanged) were preserved, per the task's own
   "minimum processing necessary" instruction.
4. **Slope derivation** — Horn's (1981) 3×3 finite-difference gradient
   method, the same algorithm GDAL's `gdaldem slope` and ArcGIS use by
   default. Because the source is in geographic coordinates (degrees),
   pixel spacing was converted to meters before computing the gradient:
   `dx_meters = pixel_width_deg × 111,320 × cos(reference_latitude)`,
   `dy_meters = pixel_height_deg × 111,320` — the standard spherical
   approximation (111,320 m/degree), chosen as adequate given the
   source DEM's own ~8 m (LE90) vertical accuracy makes a more precise
   ellipsoidal formula immaterial here. A single reference latitude
   (30.1288°, the clip's own center latitude) was used for the whole
   clip rather than a per-row-varying one — justified because the
   clip's latitude range is only ~0.26° wide, over which `cos(lat)`
   changes by under 0.3%. `slope = degrees(atan(sqrt((dz/dx)² +
   (dz/dy)²)))`.
   - **Edge handling**: computing a 3×3 gradient needs one ring of
     neighboring pixels beyond every output pixel. This was supplied
     by padding the *extracted clip array* with 1 pixel of
     edge-value replication (`numpy.pad(..., mode="edge")`) on all
     four sides, rather than reading genuine neighboring pixels from
     the full source tile. At the clip's south/east edges this is
     unavoidable (no further real data exists in this repository —
     see above); at the west/north edges, genuine neighboring pixels
     *do* exist in the full source tile but were not read for this
     computation — a deliberate simplification for this task, not a
     data gap. Slope values in the single outermost ring of pixels are
     therefore a lower-confidence edge estimate; **Bhitai Malli is
     deep in the clip's interior and is unaffected by this**.
5. Wrote two GeoTIFFs to `data/processed/static/terrain/`, both
   carrying `SOURCE`/`PROCESSING`/`DATA_STATUS` GeoTIFF tags recording
   this same information inside the file itself, not just in this doc.

| Output | Path | dtype | Size |
|---|---|---|---|
| Clipped elevation | `data/processed/static/terrain/cartodem_v3r1_h44g_pauri_garhwal_clip.tif` | `int16` (unchanged from source) | 5,320,313 bytes |
| Derived slope (degrees) | `data/processed/static/terrain/slope_degrees_pauri_garhwal_clip.tif` | `float32` | 10,628,327 bytes |

Both share the same CRS (`EPSG:4326`), transform, and 2863×927 pixel
grid, so they can be indexed with the same row/column for any point.

## VALIDATION — processed outputs

Both files were reopened fresh (not just checked in-memory) and
confirmed to open and read successfully:

| Field | Elevation clip | Slope (degrees) |
|---|---|---|
| CRS | EPSG:4326 | EPSG:4326 |
| Width × height | 2863 × 927 | 2863 × 927 |
| Resolution | 0.00027777778° (unchanged) | same grid |
| Bounds | `[78.204583, 30.000139]`–`[78.999861, 30.257639]` | same |
| Dtype | int16 | float32 |
| NoData | Not declared (same as source; clip contains no gaps) | Not declared |
| Min / max | 232 m / 2597 m | 0.0° / 68.56° |
| SHA256 | `fd3dd3592111dd7956c0af6cdac828cb5a6fd9376b66e1787e6520cf43ea6534` | `3835042d61b78692a3909ccc9f7f44e74a5830ce83ef2f97f42b9f4f9063762d` |

The clipped elevation range (232–2597 m) is narrower than the full
source tile's (232–6575 m) because this clip only covers the lower
Pauri Garhwal valley area within the tile, not the tile's higher
Himalayan terrain further north/east that falls outside the district.

## BHITAI MALLI — extracted values

At the settlement's existing, unmodified coordinates (78.781266,
30.167112), pixel (row 325, column 2076) in both processed rasters:

| Field | Value |
|---|---|
| Extracted DEM elevation | **991 m** |
| Extracted derived slope | **22.58°** (22.584474...) |
| Falls inside processed raster's valid extent | Yes |
| NoData at this pixel | No — the source declares no NoData and this pixel holds an ordinary in-range value |

**Comparison against the existing demo planning inputs (observation
only — `vikalp.db` was not modified):**
- Elevation: DEM says 991 m; the existing `elevation_m` demo value is
  also 991 — an exact match (same observation already noted in Task
  14A's provenance record).
- Slope: DEM-derived slope is 22.58°; the existing `slope_degrees`
  demo value is 18.91° — **these do not match**. This is recorded
  plainly rather than reconciled or explained away. Plausible reasons
  include: different slope algorithms/window sizes, the ~30 m DEM
  pixel averaging out local terrain the original demo figure may have
  been based on a smaller footprint, or the demo figure simply not
  having been derived from this (or any) DEM in the first place — no
  evidence was found either way, and none is claimed.

## LIMITATIONS (terrain processing)

- The processed clip covers only the portion of Pauri Garhwal that
  falls inside the one downloaded tile — not the whole district. Two
  of the clip's four edges are hard-limited by the source tile's own
  boundary, not by any deliberate area-of-interest choice.
- Slope's outermost pixel ring (all four edges of the processed
  rasters) is a lower-confidence estimate due to edge-replicated
  padding rather than genuine neighboring data; does not affect
  Bhitai Malli.
- Slope was computed with a single reference-latitude meters-per-degree
  conversion, not a per-row-varying one — adequate at this clip's
  narrow latitude range but not appropriate to reuse unmodified for a
  much larger-latitude-range clip in the future.
- The `elevation_m`/`slope_degrees` match-vs-mismatch pattern above
  (elevation matches exactly, slope doesn't) is reported as observed
  fact; no causal explanation is asserted.
- Not validated: absolute vertical/slope accuracy against any
  independent ground-truth or survey source.
- No terrain risk score, no risk-engine connection, no new API, no map
  layer — all explicitly out of scope for this task.

---

# HAZARDS — Bhuvan landslide evidence (Task 18)

Provenance record for the third genuinely sourced GIS evidence set:
two landslide-related layers from Bhuvan's public disaster WMS,
approved after Task 17's source investigation. **This is metadata and
point-query evidence, not a downloaded vector dataset** — no bulk
vector/GeoJSON endpoint exists for these layers (see WFS STATUS
below). Nothing here is connected to the risk engine or converted into
a score.

## SOURCE

| Field | Value |
|---|---|
| Publisher/organization | National Remote Sensing Centre (NRSC), Indian Space Research Organisation (ISRO) — via the Bhuvan geoportal's public disaster-services WMS |
| Service | `https://bhuvan-vec2.nrsc.gov.in/bhuvan/wms` (OGC WMS 1.1.1, GeoServer) |
| Access | No login or API key required for `GetCapabilities` or `GetFeatureInfo` — confirmed directly by calling the live service, not assumed |
| Retrieval date | 2026-09-12 (this session) |
| Layer 1 | `disaster:UK_SLIM_2017` — Title "UK_SLIM_2017"; per NRSC's general documentation, "SLIM" = Seasonal Landslide Inventory Mapping (satellite-based inventory of landslides observed during the 2017 monsoon season) |
| Layer 2 | `disaster:RIRUCHBA_LHZ_01` — Title **"New_rishikesh_rudraprayag_chamoli_badrinath"** (read directly from the layer's own metadata) — a Landslide Hazard Zonation tile for the Rishikesh–Rudraprayag–Chamoli–Badrinath pilgrimage-route corridor |
| CRS | `EPSG:4326` for both layers, per each layer's own `<SRS>`/`<BoundingBox SRS=...>` metadata |
| Layer 1 bounding box | lon `[77.6436, 80.7177]`, lat `[29.1083, 31.0897]` |
| Layer 2 bounding box | lon `[78.259, 79.604]`, lat `[30.042, 30.772]` |
| Geometry type | **Not confirmed for either layer** — WMS `GetCapabilities` does not declare feature geometry type, and every `GetFeatureInfo` query made (5 total, at 4 distinct points) returned zero features, so no actual geometry was retrieved to inspect |
| `queryable` flag | `1` (true) for both layers, per their own `<Layer queryable="1">` attribute |
| License/terms | Not separately confirmed for WMS consumption; Bhuvan's general NRSC/ISRO data terms (same family as the Task 14 CartoDEM license) are assumed applicable but not re-verified here |

## ACQUISITION METHOD

1. Tested the dedicated WFS endpoint directly:
   `service=WFS&request=GetCapabilities` against both `/bhuvan/wfs` and
   `/bhuvan/ows`. **Both returned the explicit server error "Service
   WFS is disabled."** No bulk vector/GeoJSON download path exists for
   this service — confirmed by the server's own response, not assumed
   from silence or a 404.
2. Fetched the WMS `GetCapabilities` response (5,211,565 bytes, SHA256
   `7a5a8ed3751187f4bcd84581aaec0632a8ada133cad92d278ee0d27e475d26cb`)
   and extracted the exact `<Layer>` metadata block for each approved
   layer — real service metadata (title, SRS, bounding box), not
   feature data.
3. Because WFS is disabled, `GetFeatureInfo` (a point-query mechanism)
   was the only working interface for feature-level data. Per the
   task's explicit instruction not to build a scraping workaround, no
   systematic grid-sampling was attempted. Instead: (a) one
   `GetFeatureInfo` query at Bhitai Malli's exact coordinates per
   layer (the required validation point), and (b) one additional query
   at each layer's own bounding-box center, solely to check whether
   *any* feature could be retrieved to document the layer's real
   attribute schema. All 4 queries (plus a 5th repeat of the Bhitai
   Malli query for `UK_SLIM_2017` from Task 17) returned byte-identical
   empty `<wfs:FeatureCollection>` documents.
4. No further sampling was attempted — continuing to probe additional
   points in search of a hit would have become exactly the "brittle
   scraping workaround" the task prohibited.

## FILES ACQUIRED

All in `data/raw/static/hazards/` (raw, unmodified since retrieval):

| File | Content | SHA256 | Size |
|---|---|---|---|
| `uk_slim_2017_wms_layer_metadata.xml` | Extracted `<Layer>` block for `UK_SLIM_2017` | `3439ad6ec71f9f6a4fd75688b91793d1cf009c2171fa19297705d4ae6b75227c` | 1,174 bytes |
| `riruchba_lhz_01_wms_layer_metadata.xml` | Extracted `<Layer>` block for `RIRUCHBA_LHZ_01` | `df7b1c0e080b3c436eba8680d0e3ce70c165f5ae0d003bcd93de9c60c25f7ee9` | 928 bytes |
| `uk_slim_2017_getfeatureinfo_bhitai_malli.gml` | GetFeatureInfo response at Bhitai Malli's exact coordinates | `5f2c3458407f595541bd6ba6e9864161834c2cd63027147703f14acfd8235196` | 430 bytes |
| `riruchba_lhz_01_getfeatureinfo_bhitai_malli.gml` | GetFeatureInfo response at Bhitai Malli's exact coordinates | `5f2c3458407f595541bd6ba6e9864161834c2cd63027147703f14acfd8235196` | 430 bytes |
| `uk_slim_2017_getfeatureinfo_sample_point_bbox_center.gml` | GetFeatureInfo response at the layer's bbox center (not Bhitai Malli) | `5f2c3458407f595541bd6ba6e9864161834c2cd63027147703f14acfd8235196` | 430 bytes |
| `riruchba_lhz_01_getfeatureinfo_sample_point_bbox_center.gml` | GetFeatureInfo response at the layer's bbox center (not Bhitai Malli) | `5f2c3458407f595541bd6ba6e9864161834c2cd63027147703f14acfd8235196` | 430 bytes |
| `SOURCE.txt` | Human-readable summary of the above | — | — |

All four `.gml` files are byte-identical (same SHA256) — every query,
at every point tested, returned the same empty result:
```xml
<?xml version="1.0" encoding="UTF-8"?><wfs:FeatureCollection xmlns="http://www.opengis.net/wfs" xmlns:wfs="http://www.opengis.net/wfs" xmlns:gml="http://www.opengis.net/gml" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.opengis.net/wfs https://bhuvan-vec2.nrsc.gov.in/bhuvan/schemas/wfs/1.0.0/WFS-basic.xsd"><gml:boundedBy><gml:null>unknown</gml:null></gml:boundedBy></wfs:FeatureCollection>
```

**No processed output was created** (`data/processed/static/hazards/`
does not exist) — there is no vector/raster data to clip, reproject,
or reduce; the raw files above already are the minimum evidence
obtainable through the proper GIS endpoints.

## PAURI GARHWAL / BHITAI MALLI COVERAGE

| Check | UK_SLIM_2017 | RIRUCHBA_LHZ_01 |
|---|---|---|
| Bhitai Malli (78.781266, 30.167112) inside layer's bounding box | **Yes** | **Yes** |
| Pauri Garhwal district bbox (from `boundaries_uk_demo.geojson`) overlaps layer's bounding box | **Yes** | **Yes** |
| Feature found at Bhitai Malli's exact point (`GetFeatureInfo`) | **No** | **No** |
| Feature found at layer's bbox center (sample point, not Bhitai Malli) | **No** | **No** |

**"No feature intersection verified at Bhitai Malli."** This applies
to both layers. Bounding-box coverage is real and directly verified;
it does **not** mean a landslide or hazard zone has been mapped at
Bhitai Malli's specific location — it means the settlement falls
within the geographic extent these layers cover, and no evidence
either confirms or rules out a feature there specifically, because no
feature was retrievable at any tested point in either layer.
**Bhitai Malli must not be treated as landslide-affected or
unaffected based on this data.**

## LIMITATIONS

- No vector/GeoJSON bulk download exists for these layers — WFS is
  administratively disabled on this service (confirmed via the
  server's own error message).
- Geometry type (point/line/polygon) for either layer was not
  confirmed — no feature was ever retrieved to inspect.
- Feature-level attributes/classes (e.g. an actual hazard-zone
  category for `RIRUCHBA_LHZ_01`, or an actual landslide record for
  `UK_SLIM_2017`) were not obtained — every query returned an empty
  result. This may reflect genuinely sparse data (most of any bounding
  box legitimately has no mapped landslide), an artifact of the
  specific points queried, or something about how this environment's
  network reaches this specific service — the exact cause was not
  determined, and none is assumed.
- Only 5 total point-queries were made (a small, deliberately bounded
  number, per the task's prohibition on scraping workarounds) — this
  is not an exhaustive survey of either layer's actual feature
  coverage.
- License/access terms for WMS consumption specifically were not
  independently re-verified in this task.
- This data is **not** ready for risk-engine integration or scoring —
  no feature-level evidence exists yet to score, and the task
  explicitly excluded that step regardless.

---

# HAZARDS — GSI/NLFC field-validated landslide inventory (Task 20)

Provenance record for the fourth genuinely sourced GIS evidence set,
and the **first hazard layer with actual, real feature geometry and
attributes** (Tasks 17/18's Bhuvan investigation found only empty
query results). Distinguishing this record's scope carefully: this is
a landslide **inventory** (past recorded/mapped events), not a
susceptibility score, not a hazard classification, and not evidence
that Bhitai Malli is or isn't affected — see BHITAI MALLI RESULT below.

## SOURCE

| Field | Value |
|---|---|
| Publisher/organization | Geological Survey of India (GSI), National Landslide Forecasting Centre (NLFC) |
| Portal | Bhusanket (`bhusanket.gsi.gov.in`), public Esri ArcGIS Server backend |
| Service | `https://bhusanket.gsi.gov.in/gisserver/rest/services/Hosted/Public_Portal_Dashboard_Map/FeatureServer/0` |
| Layer name (server-declared) | `Landslide_Public` |
| Access | Public — no login/API key/token required; confirmed directly (same finding as Task 19) |
| Retrieval date | 2026-09-12 (this session) |
| Geometry type | Point, confirmed via the service's own `geometryType: esriGeometryPoint` and independently via every feature in the downloaded file |
| CRS | `EPSG:4326`, confirmed via the service's declared `spatialReference` (`wkid: 4326`) and independently by GeoPandas auto-detection on load; the GeoJSON output itself carries no explicit `crs` member (RFC 7946 default, same situation as the Task 12 boundaries file) |
| Object ID field | `objectid` (also has a separate `globalid` GUID field) |
| Attribute field count | 134, all preserved unmodified/unrenamed |
| Service-declared full extent (India-wide) | lon `[72.921, 96.617]`, lat `[8.490, 34.560]` |
| India-wide record count (whole layer) | 31,545 (per Task 19's `returnCountOnly` query, re-confirmed unchanged) |
| Query capability | `Query` only (read-only) — `maxRecordCount: 2000`; `supportedQueryFormats: JSON, geoJSON, PBF` |
| License/terms | Not explicitly stated on this API endpoint; GSI's general data-dissemination terms (same family as Task 14/18) assumed applicable, not independently re-confirmed for this exact service |

### Selected attribute fields (of 134 total; full list in the raw file itself)

`objectid`, `globalid`, `state`, `district`, `village`, `slide_name`,
`slide_no`, `toposheet`, `latitude`, `longitude`, `activity`
(Active/Dormant/Reactivated/Suspended/Abandoned), `triggering` (e.g.
"Heavy rainfall"), `movement_t` (Slide/Fall/etc.), `geology`,
`initiation` (year, integer), `date`/`date_acc`/`exactdatei`/
`history_da` (date-related), `length`/`width`/`depth`/`height`/
`ls_area`/`ls_volume` (dimensions), `peopledead`/`peopleinju`/
`housesbuil` (impact), `pre_remedi`/`remedial_1` (remedial measures),
`report`/`photos`/`citation` (source documentation references).

## ACQUISITION METHOD

1. Fetched the layer's full metadata (`?f=json`) to confirm geometry
   type, CRS, object ID field, and the complete 134-field schema
   before querying — per the task's own required order of operations.
2. **Chose a spatial (polygon) filter over an attribute (`district`
   text field) filter**, after discovering the `district` field is
   inconsistent for records near Bhitai Malli — some are labeled
   `"Garhwal"` rather than the official `"Pauri Garhwal"`. An
   attribute filter alone (`district='Pauri Garhwal'`) would have
   returned 569 records and silently excluded genuinely local ones. A
   raw bounding-box spatial filter was tried and also rejected: it
   returned 1,073 records spanning 8 different district labels
   (Almora, Chamoli, Dehradun, Garhwal, Nainital, Pauri Garhwal, Tehri
   Garhwal, Uttarkashi), since Pauri Garhwal's actual shape is
   irregular relative to its bounding rectangle.
3. Used the **exact Pauri Garhwal district polygon** already
   established in `data/processed/static/boundaries_uk_demo.geojson`
   (`shapeName="Garhwal"`, the same polygon Task 12 verified contains
   Bhitai Malli) as the query geometry — extracted via GeoPandas
   (already-approved stack, no new dependency), converted to Esri JSON
   ring format, and sent as `geometryType=esriGeometryPolygon`,
   `spatialRel=esriSpatialRelIntersects` via an HTTP **POST** to the
   service's own `/query` endpoint (the polygon's ~10 KB size exceeds
   practical GET URL length limits — POST is the same official query
   mechanism, not a workaround).
4. Requested `outFields=*` (all attributes, none renamed or dropped)
   and `f=geojson` (the server's own native GeoJSON output format,
   not a local conversion).
5. Saved the response verbatim to
   `data/raw/static/hazards/gsi_nlfc_field_validated_landslides_pauri_garhwal.geojson`.

## FILE ACQUIRED

| Field | Value |
|---|---|
| Path | `data/raw/static/hazards/gsi_nlfc_field_validated_landslides_pauri_garhwal.geojson` |
| Size | 2,332,765 bytes |
| SHA256 | `b9f73d5a7e0f8d62947ae76ab61d01dd553220ecc507a2940cae7e667d968e99` |
| Feature count | **813** — confirmed identically three ways: the server's own `returnCountOnly=true` query, a manual count of features in the downloaded file, and GeoPandas' row count on load |
| Spatial extent (of the 813 acquired records) | lon `[78.358, 79.228]`, lat `[29.464, 30.242]` |
| `district` field breakdown within the 813 | Pauri Garhwal 565, Garhwal 213, Almora 30, Uttarkashi 3, Tehri Garhwal 1, Chamoli 1 — the 35 records labeled with a neighboring district but geometrically inside Pauri Garhwal's polygon are most likely source coordinate imprecision, recorded as-is, not corrected or excluded |
| Also saved | `SOURCE_gsi_nlfc_field_validated_landslides_pauri_garhwal.txt` (human-readable summary of the above) |

**No processed output was created** — the acquired GeoJSON is already
in the target CRS (`EPSG:4326`) and format (GeoJSON) with no
resampling/reprojection/schema change needed; `data/processed/static/hazards/`
does not exist.

## BHITAI MALLI RESULT

Exact-coordinate check across all 813 features against Bhitai Malli's
unmodified coordinates (78.781266, 30.167112): **zero matches**.

**"No GSI inventory feature intersects the Bhitai Malli point."**

| Radius | Records | Notes |
|---|---|---|
| Exact point | 0 | — |
| ≤ 5 km | 21 | All labeled `district="Garhwal"`; nearly all `triggering="Rainfall"`; activity states span Active/Reactivated/Suspended/Abandoned |

**Nearest single record**: 2.04 km away — `slide_no`
`UK/GAR/53J16/2015/1103`, `district` "Garhwal", `toposheet` "53J16",
`activity` "Active", `triggering` "Rainfall", `movement_t` "Slide".
Reported as its own source attributes, not reinterpreted or converted
into any VIKALP classification.

This is spatial **context**, not a claim about Bhitai Malli itself —
no radius-based threshold was chosen or proposed for any future
VIKALP scoring purpose, per the task's explicit instruction.

## VALIDATION STATUS

- File opens successfully as valid JSON (Python `json.load`) and as a
  valid GeoJSON layer (GeoPandas `read_file`) — both independently
  confirmed.
- CRS, geometry type, object ID field, and full attribute schema all
  confirmed against the service's own declared metadata, not assumed.
- Feature count cross-checked three independent ways (server count
  query, manual feature count, GeoPandas row count) — all agree at 813.
- Spatial extent computed directly from the downloaded coordinates.
- Bhitai Malli exact-point and radius checks computed directly against
  every feature's real coordinates (haversine distance), not
  estimated.
- Not validated: absolute positional accuracy of individual records;
  whether the `initiation` field's frequent `0` value represents a
  real placeholder convention or a data-entry gap (not resolved);
  whether this service's 31,545-record total is the complete GSI
  archive or a subset (the homepage separately cites "1,179 recorded
  events," a figure this task's service-level count does not match —
  reported, not reconciled, consistent with the same discrepancy noted
  in Task 19).

## LIMITATIONS

- Inventory only — represents recorded/reported past events, not a
  susceptibility surface; says nothing about locations with no
  reported history, including Bhitai Malli itself.
- `district` field inconsistency (documented above) means any future
  attribute-only filtering of this file must not trust `district`
  alone.
- Many nearby records carry `initiation=0` and blank `slide_name` —
  recorded as-is, not interpreted as meaningful zero-length history.
- License/access terms not independently re-confirmed for this exact
  API endpoint.
- No risk score, no risk-engine connection, no new API, no map layer —
  all explicitly out of scope for this task.

## Task 39 — surfaced in-app via the Evidence Locker

Every source in this document (geoBoundaries India ADM2, ISRO/NRSC
CartoDEM v3 R1, GSI/NLFC landslide inventory) is now also presented to
officers directly inside VIKALP, at the Evidence Locker page
(`frontend/src/pages/DataGovernancePage.tsx`, `frontend/src/data/
evidenceRecords.ts`) — read-only, no upload/edit/delete. That page's
static content reuses this document's own wording rather than
re-describing these sources independently, and its live figures (813
landslide records, 13 boundary features, Bhitai Malli's settlement
values and Hazard Exposure derived output) are fetched from VIKALP's
existing `/api/gis/landslides`, `/api/gis/boundaries`, and
`/api/settlements/{id}` endpoints rather than duplicated as a second,
driftable copy of the numbers already recorded above. Nothing in this
document was changed by Task 39 — see docs/DECISIONS.md Task 39 for
the Evidence Locker's own architecture notes.

# BUILDINGS — Google Open Buildings v3, Bhitai Malli vicinity (Task: village map)

## SOURCE

| Field | Value |
|---|---|
| Dataset name | Google Open Buildings v3 — building footprint polygons |
| Publisher/organization | Google Research |
| Accessed via | source.coop re-hosting (Chris Holmes, `source.coop/cholmes/google-open-buildings`) — a cloud-native GeoParquet republish of the same unmodified upstream data. Original Google distribution is gzipped CSV sharded by S2 level-4 cell; the tile covering this area is `391_buildings.csv.gz` (~7.19 GB), `gs://open-buildings-data/v3/polygons_s2_level_4_gzip/` |
| Queried file | `s3://us-west-2.opendata.source.coop/google-research-open-buildings/geoparquet-by-country/country_iso=IN/IN_123130.parquet` (~1.92 GB — never downloaded in full; only the query result was retained) |
| Retrieval date | This task's session (2026-09-25) |
| License | Dual-licensed: Creative Commons Attribution 4.0 (CC BY 4.0) and Open Data Commons Open Database License 1.0 (ODbL 1.0) — the user may choose either. Both require attribution; neither restricts commercial/derivative use. Confirmed identically from Google's own site and the source.coop republish's own README. |
| Original CRS | WGS84 / EPSG:4326 (lon/lat) |
| Geometry type | Polygon (building footprint) |
| Original properties | `confidence` (float), `area_in_meters` (float), `full_plus_code` (string) — plus `country_iso`/`quadkey` added by the source.coop republish's own partitioning (not retained in the VIKALP extract) |

## PROCESSING

1. Installed DuckDB (Python package, `pip install duckdb`) with the `httpfs` and `spatial` extensions — no other VIKALP dependency changed.
2. Ran one remote SQL query directly against the India GeoParquet partition above, over HTTPS: `ST_Intersects(geometry, ST_MakeEnvelope(lon-0.01, lat-0.01, lon+0.01, lat+0.01))` around Bhitai Malli's recorded coordinate (30.167112, 78.781266) — a ~1.1 km half-width box, sized to comfortably cover the six building clusters already identified within ~700 m of the settlement point during prior verification (see `docs/DECISIONS.md`), with margin.
3. This file's `geometry` column has no covering bbox for row-group pruning, so the query performed one full remote scan of the 1.92 GB file (~4-8 minutes observed across two runs) rather than a partial read — flagged since it exceeded the original "low tens of MB" expectation, though still far short of downloading the full dataset or persisting it locally.
4. Wrote matching rows to a local GeoJSON `FeatureCollection`, keeping only `confidence`, `area_in_meters`, `full_plus_code`, and a fixed `source: "Google Open Buildings v3"` disclosure string. Geometry copied verbatim — never simplified, reprojected, or clipped beyond the bounding-box filter.
5. Result stored at `data/processed/static/buildings/bhitai_malli_open_buildings_vicinity.geojson` (not `data/raw/` — this is a derived/filtered extract, not the untouched upstream distribution). Companion `SOURCE.txt` sidecar in the same directory records the same details.

| Field | Value |
|---|---|
| Feature count | 875 |
| Bounding box | lon [78.7712, 78.7911], lat [30.1570, 30.1758] |
| Confidence range | 0.6503 - 0.9072 |
| Footprint area range | 4.21 - 289.09 m² |
| Processed file path | `data/processed/static/buildings/bhitai_malli_open_buildings_vicinity.geojson` (353 KB) |

## APPLICATION USE

| Layer | Detail |
|---|---|
| Backend endpoint | `GET /api/settlements/{id}/buildings` (`backend/app/api/settlements.py`), auth-protected. Serves this file only when the requested settlement's own coordinate falls within (a small buffer around) the extract's bounding box — an honest per-settlement gate, not a hardcoded settlement id. |
| Frontend rendering | `frontend/src/components/village-map/VillageMap.tsx` — MapLibre `fill-extrusion` layer, fixed low visualization height (6 m, identical for every building), neutral off-white color. Used by the Settlement page and Relocation Planner via the shared `VillageMap` component. |
| UI disclosure | Layer control label "Buildings: Google Open Buildings"; data-source panel states coverage is "Bhitai Malli vicinity", not an official inventory; building click popup shows only `source`/`confidence`/`area_in_meters`. |

## LIMITATIONS

- No official Bhitai Malli settlement-boundary polygon exists anywhere in VIKALP to confirm every footprint falls within the administrative settlement extent, as opposed to a neighboring structure — this is vicinity coverage, not a confirmed complete inventory, and the app never claims otherwise.
- Open Buildings provides footprints, confidence, and area only — no height, floor count, building type, owner, occupancy, or construction date. The map's 3D extrusion height is a fixed visualization constant, never presented as measured.
- Only a ~1.1 km box around the settlement point was extracted; buildings further out (e.g. the separate, denser cluster found ~1.5-2.3 km away during verification) were deliberately excluded as not plausibly part of Bhitai Malli itself.
- The source query could not use row-group pruning (no bbox statistics on this file's geometry column), so producing or refreshing this extract requires one multi-minute full-file remote scan — acceptable as a one-time/occasional data-prep step, not something the running application ever does itself.

# ROADS/PATHS — OpenStreetMap, Bhitai Malli vicinity (Task: road/path layer)

## SOURCE

| Field | Value |
|---|---|
| Dataset name | OpenStreetMap road/path network (`highway=*` ways) |
| Publisher | OpenStreetMap contributors |
| Accessed via | Overpass API (`overpass-api.de/api/interpreter`) — free, keyless, one-time query; never called live from the running application |
| Retrieval date | This task's session (2026-09-25) |
| License | Open Data Commons Open Database License (ODbL) 1.0 — same license family as VIKALP's existing geoBoundaries dataset. Requires attribution: "© OpenStreetMap contributors". |
| CRS | EPSG:4326 (WGS84, lon/lat) |
| Geometry type | LineString (one per clipped segment) |
| Query | `[out:json][timeout:60];(way["highway"](30.1570,78.7712,30.1758,78.7911););out geom;` — the same bounding box as the Open Buildings vicinity extract above |

## PROCESSING

1. Queried Overpass once via Python `urllib` (a `curl` attempt to the same endpoint returned `406 Not Acceptable`; plain `urllib.request` succeeded — documented in case this is revisited) — raw response: 14 ways, real unmodified OSM geometry.
2. Overpass returns each way's *complete* geometry even where it extends far outside the query box (e.g. a district highway continuing for many kilometers). Each way was clipped to a padded box (query box + 0.015°, ~1.5-1.7 km buffer) by keeping only maximal contiguous runs of the way's own original points inside that padded box — a standard bounding-box clip, not a geometry modification: no point moved, added, or interpolated. A way crossing the boundary multiple times (real switchback mountain-road geometry) became multiple segments.
3. Kept properties: `highway`, `name` (nullable — only 1 of 14 original ways is named), `surface` (nullable), `osm_way_id`, plus a fixed `source: "OpenStreetMap contributors"` disclosure string.
4. Result stored at `data/processed/static/infrastructure/bhitai_malli_osm_roads_vicinity.geojson` (not `data/raw/`). Companion `SOURCE.txt` sidecar in the same directory.

| Field | Value |
|---|---|
| Segments after clipping | 16 (from 14 original ways) |
| Highway categories | unclassified (3 seg / ~10,659 m), tertiary (1 seg / ~6,965 m), trunk (3 seg / ~6,649 m), residential (7 seg / ~1,995 m), track (2 seg / ~1,813 m) |
| Categories confirmed absent | path, footway, cycleway, service, living_street, primary, secondary — not assumed, confirmed absent from the actual Overpass response |
| Total clipped length | ~28,081 m |
| Named segments | 1 of 16 ("Pauri Highway", trunk) |
| Processed file path | `data/processed/static/infrastructure/bhitai_malli_osm_roads_vicinity.geojson` (28 KB) |

## COVERAGE RELATIVE TO VERIFIED BUILDING CLUSTERS

Distance from each of the six Open Buildings clusters (see the BUILDINGS section above) to the nearest mapped road:

| Cluster (lat, lon) | Buildings | Nearest road | Distance |
|---|---|---|---|
| 30.16900, 78.77810 | 127 | residential | 28 m |
| 30.16886, 78.77667 | 104 | residential | 12 m |
| 30.16375, 78.78423 | 69 | tertiary | 161 m |
| 30.16132, 78.77998 | 80 | tertiary | 107 m |
| 30.16349, 78.78063 | 58 | tertiary | 196 m |
| 30.17135, 78.78558 | 69 | trunk | 311 m |

Two clusters sit directly beside a mapped residential street (12-28 m); the other four are 100-311 m from the nearest mapped road. Real, uneven coverage — not claimed as complete.

## APPLICATION USE

| Layer | Detail |
|---|---|
| Backend endpoint | `GET /api/settlements/{id}/roads` (`backend/app/api/settlements.py`), auth-protected, same coverage-bbox gate pattern as `/buildings`. |
| Frontend rendering | `frontend/src/components/village-map/VillageMap.tsx` — MapLibre `line` layers, styled by `highway` category (trunk/tertiary thicker and solid, residential/unclassified medium, track thin/dashed), rendered beneath the buildings layer. Road name labels shown only where OSM provides one. |
| UI disclosure | Layer control label "Roads & Paths"; data-source panel states "OpenStreetMap (ODbL 1.0), may be incomplete — not an official government road inventory". |

## LIMITATIONS

- Community-mapped, not a government road inventory — coverage may be incomplete, and this is disclosed in-app, not asserted as comprehensive.
- Most of the mapped length (unclassified/tertiary/trunk, ~24.3 km combined) is regional through-roads passing near the village, not exclusively village-internal streets. The residential + track categories (~3.8 km combined) are the closest analogue to a local village road/path network, and even that is not asserted to be exhaustive — four of six building clusters are 100-311 m from the nearest mapped road, a real gap, not hidden.
- No footway/path/cycleway/service/living_street data exists in this area in OSM — the app does not offer toggles for categories that were confirmed absent, and does not infer their existence from building layout.

# WATER — OpenStreetMap, Bhitai Malli vicinity (Task: water/services layer)

## SOURCE

| Field | Value |
|---|---|
| Dataset name | OpenStreetMap water features (`natural=water`, `waterway=river/stream/canal/drain`) |
| Publisher | OpenStreetMap contributors |
| Accessed via | Overpass API, one-time query (public service was intermittently overloaded this session — 504/429 across several mirrors; this query succeeded on retry) |
| Retrieval date | This task's session (2026-09-25) |
| License | ODbL 1.0, attribution required: "© OpenStreetMap contributors" |
| CRS | EPSG:4326 |
| Query | `[out:json][timeout:80];(way["natural"="water"](bbox);node["natural"="water"](bbox);way["waterway"~"river\|stream\|canal\|drain"](bbox););out geom;` — same vicinity box as buildings/roads: lon [78.7712, 78.7911], lat [30.1570, 30.1758] |

## PROCESSING & RESULT

Raw response: **1 way**, a stream named "Nandal Gad" (`waterway=stream`). Zero `natural=water` polygons and zero river/canal/drain features — confirmed absent, not assumed. Clipped the same way as the roads extract (padded box = vicinity box + 0.015°, real contiguous points only): 1 segment, ~5,505 m within the padded box (the full unclipped OSM way continues to ~9,953 m — deliberately excluded as not locally relevant).

| Field | Value |
|---|---|
| Features | 1 (stream, "Nandal Gad") |
| Distance to settlement coordinate | ~539 m |
| Distance to building clusters | 187-955 m (closest: 187 m, the northeasternmost cluster) |
| Processed file | `data/processed/static/infrastructure/bhitai_malli_osm_water_vicinity.geojson` (1.3 KB) |

## APPLICATION USE

`GET /api/settlements/{id}/water`; rendered as a restrained blue MapLibre `line` layer beneath roads.

## LIMITATIONS

A single mapped stream — real, but OSM water-feature mapping in mountainous terrain is often sparse, so this is not asserted to be every watercourse near the village. Not an official hydrology dataset.

# SERVICES/POIs — OpenStreetMap, Bhitai Malli vicinity (Task: water/services layer)

## SOURCE

| Field | Value |
|---|---|
| Dataset name | OpenStreetMap `amenity=*` points: hospital, clinic, school, college, kindergarten, pharmacy, community_centre, place_of_worship, fire_station, police, post_office, townhall |
| Publisher | OpenStreetMap contributors |
| Accessed via | Overpass API, one query per category (bulk multi-category queries repeatedly hit 504s under server load this session; per-category queries with retry/backoff succeeded) |
| Retrieval date | This task's session (2026-09-25) |
| License | ODbL 1.0, attribution required |
| CRS | EPSG:4326 |

## PROCESSING & RESULT

**Step 1** — the tight vicinity box (same as buildings/roads/water) returned **zero features in all 12 categories**. Confirmed per-category, not a failed/skipped query.

**Step 2** — per the brief's own allowance for a padded query box when technically necessary, queried a wider box (vicinity box + 0.05°, ~5.5 km: lat [30.1087, 30.2258], lon [78.7212, 78.8411]). This returned real results: hospital=4, clinic=2, school=2, college=5, place_of_worship=3; all other categories remained 0.

**Filtering** — the 16 hits split cleanly into two groups by distance from Bhitai Malli: 4 at 1.95-2.57 km, and 12 at 5.91-7.09 km. The distant group is part of the separate, denser building cluster (~6 km away, almost certainly Srinagar) already identified as a different settlement during Open Buildings verification — a straight-line 3 km distance cutoff (computed here, not an OSM field) was applied to exclude it. This is a distance filter on real data, not a second query and not a fabrication.

| Category | Kept (≤3 km) | Name | Distance |
|---|---|---|---|
| hospital | 1 | DH Pauri (District Hospital) | 1.95 km |
| clinic | 1 | Dr. Nautiyal's Clinic | 2.28 km |
| clinic | 1 | Dr. Bahuguna Clinic | 2.29 km |
| place_of_worship | 1 | Kyunkaleshwar (Hindu temple) | 2.57 km |

Zero mapped within 3 km: school, college, kindergarten, pharmacy, community_centre, fire_station, police, post_office, townhall.

12 features excluded (5.9-7.1 km, Srinagar-area cluster, not shipped): 3 more hospitals, 2 schools, 5 "college"-tagged features (several literally named "...GROUND" — real OSM tagging of a college campus's athletic fields, not something this extraction invented or corrected), 2 more places of worship.

| Field | Value |
|---|---|
| Processed file | `data/processed/static/infrastructure/bhitai_malli_osm_services_vicinity.geojson` (1.1 KB, 4 features) |

## APPLICATION USE

`GET /api/settlements/{id}/services`; rendered as small MapLibre `symbol` icons above the buildings layer. Popups show only `name`/`amenity`/`source` — never capacity, staffing, hours, or quality, since none exists in the source.

## LIMITATIONS

Only 4 real mapped services exist within 3 km of Bhitai Malli, across 3 of 12 investigated categories. Disclosed throughout the UI as "mapped services", never as "services serving the village" — this is OSM community mapping, not an official government facility registry, and coverage may be incomplete.
