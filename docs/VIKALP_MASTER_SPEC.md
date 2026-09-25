# VIKALP — Master Spec

## What it is
A closed-access, government-facing GIS decision-support prototype for
identifying vulnerable habitations, explaining settlement risk, comparing
Protect / Adapt / Relocate options, finding candidate relocation sites,
checking carrying capacity, and producing an officer-approved relocation
plan and report. An SIH 2026 hackathon prototype, not a production or
India-wide system.

## Pilot geography
India → Uttarakhand → Pauri Garhwal → **Bhitai Malli** (primary demo
settlement).

## Demo settlement — Bhitai Malli
| Field | Value |
|---|---|
| District | Pauri Garhwal |
| State | Uttarakhand |
| Population | 383 |
| Households | 86 |
| Elevation | 991 m |
| Slope | 18.91° |
| Latitude | 30.167112 |
| Longitude | 78.781266 |

No other quantitative figures (hazard %, risk score, rainfall, distances,
capacity, ML predictions) exist yet. Do not invent them.

## Core workflow
Officer Login → Uttarakhand Overview Dashboard → Map Intelligence →
Select Bhitai Malli → Settlement Evidence → Explainable Risk Assessment →
Protect / Adapt / Relocate → Candidate Destination Ranking →
Carrying-Capacity Check → Officer Review / Approval → Evidence-Backed
PDF Report.

## Current implementation status (accurate as of Task 32)
This section exists because the "Task history" list below stops at
Task 12 and no longer reflects the current repository — see
[DECISIONS.md](DECISIONS.md) for the full task-by-task record.

**Implemented (real, live, evidence-backed — not fabricated):**
Overview dashboard; MapLibre GIS map; Bhitai Malli settlement GeoJSON;
Uttarakhand district boundary context; CartoDEM terrain data and
derived slope processing; GSI field-validated landslide inventory
integration; Hazard Exposure evidence-gated scoring; Risk API with
correct pending states for the four not-yet-scoreable dimensions;
Decision API/framework (Protect/Adapt/Relocate) with correct
`not_evaluated`/`pending` states; Destination API/framework (6
suitability dimensions) with correct pending/empty states.

**Pending / not implemented (do not claim otherwise):** scoring rules
and required data for Terrain, Historical Disaster Evidence, and
Population/Household Exposure; any Vulnerability data; a full
five-dimension composite risk score; real Protect/Adapt/Relocate
recommendations; government-approved destination candidates;
destination ranking; carrying-capacity calculation; a relocation
planning workflow; an officer approval workflow; an evidence-backed PDF
report; JWT authentication; audit logging; a grounded conversational
LLM Copilot (if any AI Copilot is ever built for the MVP, it is a
deterministic template/explanation layer over verified VIKALP outputs,
never an LLM or RAG system — see [DECISIONS.md](DECISIONS.md) Task
31); a RAG/vector database; ML-based risk prediction; scenario
simulation (no "Scenario Simulator" exists or is planned for MVP — the
nav item previously mislabeled "Scenario Lab" is the Decision
Workspace, corrected Task 32).

## Documented technology stack
- **Frontend:** React, TypeScript, Vite, Tailwind CSS, MapLibre GL JS, Recharts
- **Backend:** Python, FastAPI, Pydantic
- **Local DB:** SQLite (dev) → PostgreSQL + PostGIS (production target)
- **GIS:** GeoPandas, Shapely, Rasterio, GDAL, PyProj
- **Reports:** Python ReportLab
- **Security:** JWT auth, RBAC, audit logging, env-var secrets, input validation

No other framework, database, or external service may be introduced
without explicit approval (see [DECISIONS.md](DECISIONS.md)).

## Explicitly out of scope
CesiumJS, XGBoost, LightGBM, SHAP, PyTorch, RAG, pgvector, external LLM
APIs, Google Earth Engine, satellite pipelines, OSRM, GraphHopper,
NetworkX, Firebase, Supabase, MongoDB, Next.js, Flask, Django, Redis,
Celery, Docker, WebSockets, SMS/WhatsApp/voice notifications, production
PostGIS, real-time alerting, full India-wide data onboarding,
household-level personal-data management.

## Task history
- **Task 00** — Read-only repository audit (repo was empty; see
  [CODEBASE_AUDIT.md](CODEBASE_AUDIT.md)).
- **Task 02** — Frontend foundation + polished Overview dashboard shell.
- **Task 03** — MapLibre GL JS integration in the Overview map panel
  (DEMO-ONLY basemap, no hazard/GIS layers yet).
- **Task 04** — FastAPI backend foundation: SQLite (stdlib `sqlite3`,
  no ORM), Bhitai Malli seeded as demo planning input, read-only
  `/health` and `/api/settlements` endpoints.
- **Task 05** — Overview's Settlement Evidence panel now fetches
  Bhitai Malli from `GET /api/settlements/1` (native `fetch()`, CORS
  restricted to the local Vite dev origin). Truthful loading/error
  states, no fabricated fallback data. Map and Key Insights card still
  use local demo data.
- **Task 06** — Single source of truth: `AppShell` now fetches the
  settlement once and passes it as props to `SettlementEvidencePanel`,
  `MapLibreMap`, and `KeyInsightsCard` — all three read the same
  backend record, none fetch independently.
- **Task 07A** — Deterministic risk assessment model proposed.
  Deleted `data/demoSettlement.ts`, confirmed unused since Task 06.
- **Task 07B** — Risk model **implemented** as approved: 5 weighted
  dimensions, deterministic scoring, `GET /api/settlements/{id}/risk`,
  real Risk Analysis page. Weights/thresholds are explicit prototype
  policy configuration, not an official standard. No dimension has an
  approved scoring rule yet, so Bhitai Malli's assessment is correctly
  "pending" with `overall_score`/`risk_level` both `null` — not a bug.
- **Task 08** — Protect/Adapt/Relocate Decision Workspace: the
  three-pathway *framework* (definitions, action categories, evidence
  requirements) implemented via `GET /api/settlements/{id}/decision`
  and a real Decision Workspace page — no pathway-evaluation algorithm
  exists yet, so every pathway stays "not_evaluated" and
  `decision_status` stays "pending" for Bhitai Malli, correctly.
- **Task 09** — Destination Explorer: the 6-dimension suitability
  *framework* implemented via `GET /api/settlements/{id}/destinations`
  and a real Destination Explorer page — no candidate-destination
  dataset exists yet (and none was fabricated), so `candidates: []`
  and both `analysis_status`/`ranking_status` stay "pending" for
  Bhitai Malli, correctly.
- **Task 10** — Read-only GIS/data inventory: confirmed no real GIS
  files existed anywhere in the repo. See
  [DATA_INVENTORY.md](DATA_INVENTORY.md).
- **Task 11** — FastAPI → GeoJSON → MapLibre pipeline established
  using only the existing demo settlement record; no new data.
- **Task 12** — First genuinely sourced GIS layer: geoBoundaries' India
  ADM2 districts, filtered to Uttarakhand (735 → 13 features), full
  source/processing/application-use provenance recorded. New
  `GET /api/gis/boundaries`, rendered as an independent MapLibre layer
  that never blocks or is blocked by the Bhitai Malli settlement point.
  District-level only (Bhitai Malli's known coordinates verified via
  point-in-polygon to fall inside Pauri Garhwal's district polygon, not
  an exact village match). New dependencies: GeoPandas, Shapely, PyProj
  (already-approved stack, newly installed) (this build). See
  [DATA_PROVENANCE.md](DATA_PROVENANCE.md),
  [DECISIONS.md](DECISIONS.md#task-12), and
  [MVP_BACKLOG.md](MVP_BACKLOG.md) for what's next.
