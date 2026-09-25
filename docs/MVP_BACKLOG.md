# VIKALP — MVP Backlog

Workflow: Officer Login → Overview Dashboard → Map Intelligence →
Bhitai Malli → Settlement Evidence → Risk Explanation → Protect/Adapt/
Relocate → Candidate Destination → Capacity → Officer Approval →
PDF Report.

## Done
- **Task 00** — Read-only repo audit (repo was empty).
- **Task 02** — Frontend foundation: Vite + React + TS + Tailwind
  scaffold, hash-based page switching, polished Overview dashboard
  shell with static Bhitai Malli demo data, 9 placeholder pages.
- **Task 03** — MapLibre GL JS integration: real map in the Overview
  center panel, centered on Bhitai Malli with a marker/popup showing
  only known demo values. DEMO-ONLY OpenStreetMap raster basemap, no
  API key, no hazard/GIS layers yet. See
  [UI_SPEC.md](UI_SPEC.md#map-task-03) and [DECISIONS.md](DECISIONS.md).
- **Task 04** — Backend foundation: FastAPI app (SQLite via stdlib
  `sqlite3`, no ORM), Bhitai Malli seeded idempotently, read-only
  `GET /health`, `GET /api/settlements`, `GET /api/settlements/{id}`
  (404 for unknown ids). Not yet connected to the frontend — the
  dashboard still reads its own hardcoded `demoSettlement.ts`. See
  [DECISIONS.md](DECISIONS.md).
- **Task 05** — Settlement Evidence panel now fetches Bhitai Malli from
  `GET /api/settlements/1` via native `fetch()`
  (`frontend/src/services/settlements.ts`), base URL from
  `VITE_API_BASE_URL`. Backend CORS restricted to
  `http://localhost:5173`, `GET` only. Truthful loading/error states
  with retry, no fabricated fallback data. The map marker and Key
  Insights card are unchanged — still reading local
  `data/demoSettlement.ts`, not the API. See
  [DECISIONS.md](DECISIONS.md).
- **Task 06** — Single source of truth: the settlement fetch moved up
  to `AppShell`, which now fetches `GET /api/settlements/1` exactly
  once and passes the same `SettlementRequestState` down as props to
  `SettlementEvidencePanel`, `MapLibreMap`, and `KeyInsightsCard`. None
  of the three fetch independently any more. The map marker/popup and
  Key Insights now show the real backend values (previously hardcoded
  local demo data). `frontend/src/data/demoSettlement.ts` is unused as
  of this task — **not deleted**, per the task's own instruction to
  report rather than auto-remove it; a future task should either
  delete it or repurpose it. See [DECISIONS.md](DECISIONS.md).
- **Task 07A** — Deterministic risk assessment model **proposed** for
  approval (design only — no engine, no endpoint, no risk numbers).
  Confirmed `frontend/src/data/demoSettlement.ts` was still unused and
  deleted it. See [DECISIONS.md](DECISIONS.md#task-07a) for the full
  proposal.
- **Task 07B** — Risk engine **implemented** per the approved model:
  5 dimensions (Terrain/Physical Susceptibility 20%, Hazard Exposure
  30%, Historical Disaster Evidence 15%, Population/Household Exposure
  20%, Vulnerability 15%), 0–100 score, Low/Moderate/High/Critical
  bands at 24/49/74/100 — all explicitly prototype policy config, not
  an official standard. New `GET /api/settlements/{id}/risk`
  (`backend/app/services/risk.py` for the calculation,
  `backend/app/api/risk.py` for the route). No dimension has an
  approved scoring rule yet, so for Bhitai Malli today:
  `assessment_status: "pending"`, `overall_score: null`,
  `risk_level: null` — by design, not a bug. Real Risk Analysis page
  (`frontend/src/pages/RiskAnalysisPage.tsx`) replacing the
  placeholder, with its own fetch (separate from Task 06's settlement
  fetch — no duplicate settlement-fetch mechanism). See
  [DECISIONS.md](DECISIONS.md#task-07b).
- **Task 08** — Protect/Adapt/Relocate Decision Workspace
  **implemented as a framework only** — pathway definitions, action
  categories, and evidence requirements, with no evaluation/scoring
  algorithm (none was approved). New
  `GET /api/settlements/{id}/decision`
  (`backend/app/services/decision.py` + `backend/app/api/decision.py`,
  which calls `services/risk.py` in-process — no second HTTP
  round-trip). For Bhitai Malli: `decision_status: "pending"`, all
  three pathways `status: "not_evaluated"`, `recommended: false` —
  unconditionally, since no pathway-evaluation rule exists yet even
  hypothetically. Real Decision Workspace page
  (`frontend/src/pages/DecisionWorkspacePage.tsx`, the existing
  "Scenario Lab" nav tab) replacing its placeholder — own fetch, no
  duplicate settlement or risk fetch. See
  [DECISIONS.md](DECISIONS.md#task-08).
- **Task 09** — Destination Explorer **implemented as a framework
  only** — 6 suitability dimensions (Hazard Safety, Land Suitability,
  Available Capacity, Accessibility, Infrastructure Availability,
  Social/Administrative Feasibility) as evaluation categories with no
  weights (none approved, none needed since nothing is scored yet).
  New `GET /api/settlements/{id}/destinations`
  (`backend/app/services/destination.py` + `backend/app/api/destination.py`,
  independent of risk/decision status — no approved destination
  dataset exists at all, regardless). For Bhitai Malli: `candidates:
  []`, `analysis_status: "pending"`, `ranking_status: "pending"`,
  `ranked_candidates: []` unconditionally — no fabricated destination
  names, coordinates, capacity, or scores anywhere. Real Destination
  Explorer page (`frontend/src/pages/DestinationExplorerPage.tsx`, the
  existing "Capacity Intelligence" nav tab) replacing its placeholder
  — own fetch, no duplicate settlement/risk/decision fetch, no map
  embedded (see [DECISIONS.md](DECISIONS.md#task-09) for why). Caught
  and fixed a real bug during verification (a missing required field
  caused a 500) — documented, not silently patched.
- **Task 10** — Read-only GIS/data inventory. Confirmed no real GIS
  files, hazard layers, DEM, roads, POIs, or destination data exist
  anywhere in the repo — the only spatial record is the one SQLite
  settlement row. See [DATA_INVENTORY.md](DATA_INVENTORY.md).
- **Task 11** — Established the FastAPI → GeoJSON → MapLibre pipeline
  using only the existing Bhitai Malli record (per Task 10's own
  recommendation). New `GET /api/settlements/{id}/geojson` returns a
  standard GeoJSON `Feature` (longitude-first coordinates, per RFC
  7946) built from the same `Settlement` dataclass the other two
  settlement routes already use — no new data, no schema change. The
  Overview map now sources its point from a real MapLibre GeoJSON
  source + circle/symbol layers instead of a hand-built `Marker`, with
  a "Bhitai Malli — Demo planning input" label and an
  XSS-safe DOM-built popup. Settlement Evidence panel's "Data quality"
  text now reads "Demo planning input — source validation pending"
  (was "Verified demo terrain and settlement context"), plus a new
  CRS-convention disclosure line. `AppShell` now owns two fetches
  (settlement + geojson, approved as acceptable — different resources,
  not a duplicate). See [DECISIONS.md](DECISIONS.md#task-11) —
  **including a reported limitation**: on-screen pixel rendering of
  the point/label could not be visually confirmed in the sandboxed
  headless test environment used for verification (backend response
  and MapLibre's internal state are both confirmed correct; a
  same-pipeline raster layer renders fine in the same environment,
  pointing at a vector-layer-specific sandbox limitation rather than a
  code defect, but this was not provable with certainty). Real
  boundary, road, POI, DEM, hazard, and destination layers are still
  entirely absent — this task only established the reusable pattern
  using data that already existed.
- **Task 12** — First genuinely sourced GIS layer: geoBoundaries' India
  ADM2 districts, filtered to Uttarakhand's 13 districts (735 → 13
  features), with a full source/processing/application-use provenance
  record. New `GET /api/gis/boundaries` (reads the static processed
  file from disk, no DB table; honest 503 on missing/invalid/empty
  data, never a silent empty `FeatureCollection`). Rendered on the
  Overview map as a separate MapLibre GeoJSON source + fill/line layer,
  independent of the Bhitai Malli settlement point (verified: removing
  the processed file doesn't affect the settlement marker, and vice
  versa). District-level only — Bhitai Malli's coordinates verified via
  point-in-polygon to fall inside the "Garhwal" polygon (= Pauri
  Garhwal), not an exact village match. New dependencies: GeoPandas,
  Shapely, PyProj (approved stack, newly installed). See
  [DATA_PROVENANCE.md](DATA_PROVENANCE.md) and
  [DECISIONS.md](DECISIONS.md#task-12) — **including a reported
  limitation**: same WebGL-vector-layer screenshot limitation as
  Task 11 (verified via MapLibre state inspection instead).
- **Task 12A** — Added visible attribution for the Task 12 boundary
  data: a compact line ("Data sources: Administrative boundaries:
  geoBoundaries India ADM2 (ODbL 1.0). Source metadata: Pathways Data
  Pvt. Ltd. / lgdirectory.gov.in. Uttarakhand subset; district-level
  context.") shown immediately above the Overview map panel — not an
  overlay on the map itself — whenever the boundary layer is actually
  rendered. Wording sourced only from `DATA_PROVENANCE.md`, no new
  claims. Existing OSM attribution (inside the map, bottom-right) is
  unchanged and confirmed still visible. No new dependencies; only
  `frontend/src/components/dashboard/MapLibreMap.tsx` changed. See
  [DECISIONS.md](DECISIONS.md#task-12a).
- **Task 23** — Implemented the Hazard Exposure dimension's GSI
  landslide-inventory scoring rule exactly as designed in Task 21 and
  sensitivity-tested in Task 22 — no constant was invented; all came
  from docs/DECISIONS.md. New `backend/app/services/hazard_exposure.py`
  (1 km evidence gate, three proximity bands, bounded activity
  modifier, capped density bonus; triggering/recency/casualty excluded
  from scoring per Task 21 §8-§10). `risk.py` now dispatches to it for
  the "Hazard Exposure" dimension only — the other four dimensions,
  `DIMENSION_WEIGHTS`, and `RISK_BANDS` are unchanged. New optional
  `hazard_exposure_detail` field on `RiskDimensionResult` carries full
  structured explainability (proximity band, nearest distance/activity,
  density count, 1-5 km contextual records, disclaimers) — additive,
  every other dimension still returns it as `null`. 22 new deterministic
  tests (stdlib `unittest`, no new dependency) using the real 813-record
  GSI dataset. Bhitai Malli confirmed via live API call:
  `assessment_status: "pending"`, Hazard Exposure `score: null`,
  `reason: "no_evidence_found"` — correct, since its nearest record is
  2.04 km away, outside the approved 1 km radius. Minimal frontend fix
  to `RiskAnalysisPage.tsx`'s dimension status text only (handles the
  new `"no_evidence_found"` status correctly); `RiskAnalysisCard.tsx`
  and the raw GSI file untouched. See
  [DECISIONS.md](DECISIONS.md#task-23--hazard-exposure-landslide-inventory-scoring-implemented).
- **Task 31** — Final MVP audit, scope freeze & implementation master
  plan (no code changed). Verified every Task 21-30 conclusion directly
  against the actual repository/data — see
  [DECISIONS.md](DECISIONS.md#task-31--final-vikalp-mvp-audit-scope-freeze--implementation-master-plan-governanceaudit-only-not-implemented).
  Confirmed `VIKALP_MASTER_SPEC.md`/`UI_SPEC.md` are stale (still
  describe Risk Analysis/Decision Workspace/Destination Explorer as
  unbuilt placeholders — they've been real since Tasks 07B/08/09) and
  two nav-label mismatches exist ("Scenario Lab" = Decision Workspace;
  "Capacity Intelligence" = Destination Explorer, no separate Capacity
  page exists). Confirmed zero implementation (not partial) for auth/
  RBAC/audit logging, Reports, Relocation Planner, and AI Copilot; also
  confirmed a "Scenario Simulator" doesn't exist anywhere and was never
  part of the original master workflow. Froze MVP scope: MUST BUILD =
  minimal JWT auth + nav-label fixes + a real ReportLab-based evidence
  report + a minimum test suite; SHOULD BUILD = a deterministic
  (non-LLM) AI Copilot explanation layer + a watermarked demo-scenario
  Relocation Planner + one real Recharts chart; DO NOT BUILD = a
  Scenario Simulator subsystem, any ML/scoring automation, RAG/vector
  DB/external LLM API, GIS-auto-generated destinations, full RBAC
  (nothing to scope at N=1 settlement). **READY TO ENTER
  IMPLEMENTATION** — first task: minimal JWT officer authentication +
  navigation label correction.
- **Task 32** — Navigation label correction + documentation
  synchronization (implemented; nav/docs only, no backend/data/risk/
  decision/destination logic touched). See
  [DECISIONS.md](DECISIONS.md#task-32--navigation-label-correction--documentation-synchronization-implemented).
  Fixed the two nav-label mismatches Task 31 flagged: "Scenario Lab" →
  "Decision Workspace", "Capacity Intelligence" → "Destination
  Explorer" (both pages already said the correct name in their own
  `<h1>`; only the nav tab lagged). Added a "Risk Analysis" nav tab —
  that page has been real and live since Task 07B but had no nav entry
  anywhere until now (not a new page, just exposing an existing one).
  Aligned "Intelligence Map" → "Map Intelligence" for consistency.
  Synchronized `VIKALP_MASTER_SPEC.md` (new "Current implementation
  status" section) and `UI_SPEC.md` (nav tabs, bottom cards, "Pages /
  routes" section, which incorrectly still described Risk Analysis/
  Decision Workspace/Destination Explorer as unbuilt placeholders) to
  match actual current implementation. Reaffirmed no Scenario Simulator
  exists or is planned, and any future AI Copilot must stay a
  deterministic explanation layer, never an LLM/RAG system. Frontend
  TypeScript check, production build, and all 22 backend tests verified
  passing after the change; `docs/CODEBASE_AUDIT.md` and all backend/
  data files confirmed byte-identical to their Task 31 state. Auth,
  reports, AI, and relocation planning were explicitly out of scope and
  not attempted (deferred to a later task per Task 31's plan).
- **Task 33** — Core backend/API smoke & regression test suite
  (implemented; `backend/tests/` only — no production code changed).
  See
  [DECISIONS.md](DECISIONS.md#task-33--core-backendapi-smoke--regression-test-suite-implemented).
  Added 43 new deterministic `unittest` tests across 4 new files
  (`fixtures.py`'s `IsolatedDatabase` + `test_api_settlements_and_gis.py`
  + `test_api_risk_regression.py` +
  `test_api_decision_destination_regression.py` +
  `test_navigation_labels.py`), covering `/health`, settlement list/
  detail/GeoJSON, GIS boundaries, and — most importantly — the
  evidence-gated Risk API (no fabricated score, no evidence-as-
  low-risk, `overall_score` stays `null` while dimensions remain
  unscored) and the honest-pending Decision/Destination APIs (no
  auto-recommendation, empty candidates never read as "unsafe"). Tests
  run without a new dependency (no `httpx`/`TestClient` — not
  installed; route functions are called directly instead, documented
  in each file's docstring) and without touching the developer's real
  `vikalp.db` (a temporary SQLite file is patched in per-test-class via
  `fixtures.IsolatedDatabase`, restored after). The existing 22 hazard-
  exposure tests are retained unchanged. Full suite: **65/65 passing**.
  VIKALP now has a basic regression safety net in place before Tasks
  34+ (reports, auth, audit logging) begin.
- **Task 34** — Evidence-backed PDF Settlement Assessment Report
  (implemented). See
  [DECISIONS.md](DECISIONS.md#task-34--evidence-backed-pdf-settlement-assessment-report-implemented).
  **Implemented**: `backend/app/services/report.py` (a pure
  presentation-layer PDF builder — consumes `RiskAssessment`/
  `SettlementDecision`/`SettlementDestinationAnalysis`, the exact
  Pydantic objects the existing risk/decision/destination endpoints
  already return, and never recomputes a score, weight, or rule);
  `GET /api/settlements/{id}/report` (new `api/report.py`, registered
  in `main.py`); ReportLab (`reportlab==5.0.1`, added to
  `requirements.txt` — it was already part of the locked stack's
  documented "Reports" line but had never been installed since nothing
  generated a report yet); 15 new `unittest` tests
  (`backend/tests/test_report.py`). **Not implemented / not marked
  done**: full risk scoring, destination ranking, a capacity model, any
  relocation recommendation, an AI Copilot, or an officer
  approval/sign-off workflow — the report's "Officer review /
  acknowledgement" line is left blank by design, never a fake
  signature. The 12-section report (title, disclaimer, settlement
  context with the 18.91°/22.58° slope discrepancy disclosed, GIS
  evidence sources, 5-dimension risk status, Hazard Exposure detail,
  Decision Workspace status, Destination/Capacity status, data
  governance table, limitations, officer review, footer with page
  numbers) was generated for the real Bhitai Malli settlement and
  visually inspected page-by-page — no fabricated score, recommendation,
  or approval anywhere. Full backend suite: **80/80 passing**
  (65 existing + 15 new). Frontend untouched; `tsc -b`/`npm run build`
  re-verified clean regardless. All risk/GIS/decision/destination
  business logic, and all raw/processed data, confirmed byte-identical
  to their Task 33 values.
- **Task 35** — Minimal JWT authentication (implemented). See
  [DECISIONS.md](DECISIONS.md#task-35--minimal-jwt-authentication-implemented).
  One environment-configured demo officer account (`VIKALP_OFFICER_
  USERNAME`/`VIKALP_OFFICER_PASSWORD`, required, no fallback), PBKDF2-
  hashed password comparison, and a hand-rolled stdlib HS256 JWT
  (`sub`/`role`/`iat`/`exp` claims) — no new dependency. New
  `POST /api/auth/login` (public, alongside `GET /health`); every other
  existing endpoint (`/api/settlements/*`, `/api/gis/*`, `/risk`,
  `/decision`, `/destinations`, `/report`) now requires a valid officer
  bearer token, added as one `dependencies=[...]` line per router —
  zero route bodies changed. Single-role RBAC (`officer`) with a
  `require_role()` hook for future roles, not a permissions matrix.
  Frontend: `LoginPage.tsx` is now a real form (was a fully disabled
  placeholder), token stored in `sessionStorage` only, a new
  `services/apiClient.ts` centralizes Bearer-token attachment for every
  existing data service, a 401 anywhere clears the session and returns
  to Login (never a silent retry), and a "Log out" control was added to
  the shared `Header.tsx`. 21 new tests (101/101 total passing);
  live end-to-end `uvicorn`+`curl` check confirms Bhitai Malli's risk/
  decision/destination/report output is byte-for-byte unchanged from
  Task 34 through the new authenticated path. Rate limiting/brute-force
  protection and multi-role RBAC expansion are explicitly documented as
  future work (the former would want Redis-like shared state, out of
  the locked stack).
- **Task 36** — Minimal audit logging (implemented). See
  [DECISIONS.md](DECISIONS.md#task-36--minimal-audit-logging-implemented).
  New append-only `audit_logs` SQLite table (same `init_db()`
  conventions as `settlements`, no migration framework). Audits
  `LOGIN_SUCCESS`/`LOGIN_FAILURE`, `VIEW_SETTLEMENT`,
  `VIEW_SETTLEMENT_RISK`, `VIEW_DECISION_WORKSPACE`,
  `VIEW_DESTINATIONS`, `VIEW_GIS_BOUNDARIES`, `GENERATE_REPORT`, and a
  best-effort frontend-triggered `LOGOUT` (new `POST /api/audit/logout`
  — does not revoke the JWT itself, no server-side session invented).
  Never records a password, JWT, or Authorization header — verified
  directly by grepping every stored row. `record_audit_event()` never
  raises; a broken audit table was proven not to break the settlement
  view it accompanies. New protected `GET /api/audit` (newest first,
  bounded to 200, no arbitrary filtering). Six existing route functions
  (`get_settlement`, `get_settlement_risk`, `get_settlement_decision`,
  `get_settlement_destination_analysis`, `get_boundaries`,
  `get_settlement_report`) gained an `officer` parameter — the only way
  to get the authenticated identity into the route body — which broke
  20 existing Task 33-35 tests that called these functions directly
  with no officer argument; fixed by adding a `TEST_OFFICER` test
  double to `tests/fixtures.py`, not by changing any real behavior (the
  actual HTTP contract is unchanged). Frontend: a small, future-ready
  `services/audit.ts` — no audit dashboard/page was built, since both
  natural candidate pages (Reports, Evidence Locker) remain bare
  placeholders with nothing to slot a section into, and this task is
  explicitly about backend accountability, not UI work. 24 new tests
  (125/125 total passing); a live end-to-end check confirms every risk/
  decision/destination/report value is byte-for-byte unchanged from
  Task 35, and the real accumulated audit trail (login attempts, every
  view/generate action) was inspected via `GET /api/audit`.
- **Task 37** — Grounded AI Copilot foundation / evidence explainer
  (implemented; no external LLM). See
  [DECISIONS.md](DECISIONS.md#task-37--grounded-ai-copilot-foundation--evidence-explainer-implemented).
  New `backend/app/services/copilot.py` builds a deterministic
  `CopilotContext` for one settlement by calling the existing risk/
  decision/destination services (which already embed the Hazard
  Exposure result) and reproducing their output verbatim — no new risk/
  hazard/decision/destination calculation anywhere. A companion
  `explain_settlement()` produces a "VIKALP Evidence Explanation" —
  plain string formatting over that context, not an AI-generated
  answer; for Bhitai Malli it correctly preserves `pending`/
  `no_evidence_found`/`not_evaluated` and the exact inventory-bias
  disclaimer, never resolving them into "safe"/"unsafe"/"relocate"
  claims. Two new protected, read-only, audited endpoints
  (`GET /api/settlements/{id}/copilot-context`,
  `GET /api/settlements/{id}/explanation`), two new audit actions
  (`VIEW_COPILOT_CONTEXT`, `VIEW_EVIDENCE_EXPLANATION` — never logging
  the context/explanation body itself). A 12-item `COPILOT_RULES` tuple
  encodes the AI-trust constraints (no authoritative risk/hazard/
  destination/capacity calculation, no relocation approval, officer
  remains final authority) as code, not only documentation. Frontend:
  `types/copilot.ts` + `services/copilot.ts` only — no chatbot, no new
  nav page (no `AICopilotPage.tsx` exists in this codebase to enhance).
  30 new tests (155/155 total passing); live end-to-end check confirms
  both endpoints, 401 without a token, 404 for an unknown settlement,
  and that `risk.py`/`hazard_exposure.py`/`decision.py`/`destination.py`/
  `report.py`/`database.py`/`models/settlement.py` were not modified.
  **No OpenAI/Anthropic/Gemini/Groq/Ollama, RAG, embeddings, or vector
  database of any kind is connected anywhere** — a future model-backed
  Copilot would read from this layer and requires its own separate
  governance/approval, not an incidental follow-on task.
- **Task 38** — Map Intelligence module (implemented). See
  [DECISIONS.md](DECISIONS.md#task-38--map-intelligence-module-implemented).
  `frontend/src/pages/MapIntelligencePage.tsx` is now a real geographic
  evidence workspace (was a `PlaceholderPage` since Task 02) — a new
  dedicated map component
  (`components/map-intelligence/IntelligenceMap.tsx`, separate from
  `MapLibreMap.tsx`, which still serves only the Overview dashboard,
  unchanged) with independently toggleable Administrative Boundary,
  Settlement, and Landslide Evidence layers, plus a layer-control panel,
  a restrained legend (no risk-color scale), and an evidence panel. One
  new backend endpoint, `GET /api/gis/landslides`, exposes the existing
  813-record GSI/NLFC inventory (already used internally by
  `hazard_exposure.py` since Task 20/23) as a minimal, cached, read-only
  GeoJSON layer — same protected/audited/503-on-missing-file pattern as
  the existing `/api/gis/boundaries` route, only 4 of the raw file's
  ~100 columns exposed, geometry copied verbatim, no hazard scoring
  duplicated. The evidence panel shows the real Hazard Exposure numbers
  for Bhitai Malli (0 qualifying records within 1 km, nearest contextual
  record 2.04 km, 21 contextual records within 5 km, read from the
  existing risk endpoint) with the required "does not establish absence
  of hazard" disclosure verbatim, both disclosed terrain slope values
  (18.91° demo/DB vs. 22.58° CartoDEM-derived, neither authoritative),
  and Flood/Cloudburst/Coastal-erosion shown honestly as unavailable/not
  applicable. 12 new tests (167/167 total passing); live end-to-end
  check confirms the new endpoint's 813 features and 401-without-token,
  plus that risk/decision/destination/report/audit are all unchanged.
  `risk.py`, `hazard_exposure.py`, `decision.py`, `destination.py`,
  `report.py`, `database.py`, and `models/settlement.py` were not
  modified. **Reported limitation**: no browser screenshot tool was
  available this session to visually confirm on-screen rendering (same
  limitation Tasks 11/12 reported for the Overview map) — verified
  instead via `tsc -b`, a successful production build, and full live
  backend verification of every value the page displays.
- **Task 39** — Evidence Locker / Data Provenance module (implemented).
  See
  [DECISIONS.md](DECISIONS.md#task-39--evidence-locker--data-provenance-module-implemented).
  `frontend/src/pages/DataGovernancePage.tsx` is now a real, read-only
  evidence/provenance workspace (was a `PlaceholderPage` since Task 02)
  — no upload/edit/delete anywhere. 13 static evidence records
  (`frontend/src/data/evidenceRecords.ts`) classified into exactly four
  categories — source-backed (GSI/NLFC, CartoDEM, geoBoundaries),
  VIKALP-derived (the 22.58° terrain slope), demo planning input
  (Bhitai Malli's settlement values), missing/unavailable (8 entries:
  Terrain/Historical/Population scoring blocked on governance,
  Vulnerability/Flood/Cloudburst with zero data, Destination
  candidates/land-suitability/carrying-capacity all unavailable) — with
  counts computed from the array, never hand-typed. **No new backend
  endpoint**: fixed reference content (source names/licenses/
  descriptions) lives in the static file reusing existing documented
  wording; live numbers (813 landslide records, 13 boundary features,
  Bhitai Malli's population/households/slope, and the Hazard Exposure
  derived output) are fetched from the existing, unmodified
  `/api/gis/landslides`, `/api/gis/boundaries`, `/api/settlements/{id}`,
  and `/api/settlements/{id}/risk` endpoints rather than duplicated as
  a second static copy. The GSI record visually separates "source
  dataset facts" from a distinctly-labeled "Derived VIKALP output —
  not a source dataset fact" box; the terrain discrepancy states both
  18.91° and 22.58° with neither authoritative; two fixed SOURCE →
  DERIVATION → OUTPUT → INTERPRETATION/CONFLICT → LIMITATION/STATUS
  traceability chains are shown (not a graph database). No backend file
  was modified, so the existing 167 backend tests remain unchanged and
  already cover every live value this page displays; live verification
  confirmed all figures match the real API output and that Copilot/
  report/audit endpoints are unaffected.
- **Task 40** — Reports UI integration (implemented; backend report
  logic untouched). See
  [DECISIONS.md](DECISIONS.md#task-40--reports-ui-integration-implemented).
  `frontend/src/pages/ReportsPage.tsx` now calls Task 34's existing
  `GET /api/settlements/{id}/report` (was a `PlaceholderPage` since
  Task 02); `backend/app/services/report.py`/`api/report.py` were not
  modified. New `apiFetchBlob()` in `services/apiClient.ts` (a sibling
  to the existing `apiFetch`, same token/401 handling, never a second
  auth mechanism) handles the binary PDF response; `services/report.ts`
  wraps it; `fetchSettlements()` (new, one line) finally gives the
  frontend a caller for the `GET /api/settlements` list route that has
  existed since Task 04/33. Settlement selection (currently Bhitai
  Malli only, not hardcoded), a "Generating…" disabled-button loading
  state, a fixed non-leaky error message, and "Open PDF"/"Download PDF"
  via a short-lived, auto-revoked object URL — no permanent storage
  anywhere, backend remains the sole document source. Trust copy
  paraphrases the report's own existing disclaimer section rather than
  inventing new claims. No new backend tests needed (no backend file
  changed; Task 34's existing report tests already cover the endpoint);
  **167/167 backend tests still passing**; frontend `tsc -b`/build both
  clean; live verification confirms a real 45 KB PDF with the correct
  `VIKALP_Bhitai_Malli_Evidence_Assessment.pdf` filename, 401/404
  handled correctly, a real `GENERATE_REPORT` audit event, and that
  Map Intelligence/Evidence Locker/Copilot/risk/decision/destination
  are all unaffected.
- **Task 41** — Controlled AI Copilot UI (implemented; backend Copilot
  logic untouched). See
  [DECISIONS.md](DECISIONS.md#task-41--controlled-ai-copilot-ui-implemented).
  New `frontend/src/pages/AICopilotPage.tsx`, wired into the existing
  nav/hash-routing (`"copilot"` added to `PageId`, `useHashRoute.ts`,
  `PageRouter.tsx`, `data/navigation.ts` — labeled "AI Copilot", last
  in the nav order). Calls Task 37's existing, unmodified
  `GET /api/settlements/{id}/copilot-context` and `/explanation`. **No
  free-form chat box and no LLM anywhere** — six fixed controlled
  prompts (`components/copilot/copilotPrompts.ts`) each select which
  already-fetched context/explanation fields to display; no prompt
  triggers a new request or any calculation beyond string formatting.
  A governance panel ("How VIKALP Copilot works" 5-step pipeline +
  explicit "Copilot does not: calculate risk / override rules / select
  destinations / approve relocation / issue orders / invent evidence")
  is always visible. A "View evidence context" panel surfaces all ten
  `CopilotContext` categories (settlement, risk assessment, risk
  dimensions, hazard exposure, decision workspace, destinations,
  provenance, missing evidence, limitations, policy disclaimer)
  read directly, never recomputed. Settlement selection reuses Task
  40's `fetchSettlements()` — not hardcoded. Pending/missing states
  preserved verbatim (Bhitai Malli reads "Assessment Pending," never a
  risk-level word); the required 0-qualifying/2.04 km/21-contextual
  Hazard Exposure figures and inventory-bias disclaimer render
  verbatim from the same backend call every other page already uses.
  No new backend tests (no backend file changed; Task 37's 30 existing
  Copilot tests already cover both endpoints); **167/167 backend tests
  still passing**; frontend `tsc -b`/build both clean; live
  verification confirms both endpoints, 401/404 handled correctly, a
  real `VIEW_COPILOT_CONTEXT`/`VIEW_EVIDENCE_EXPLANATION` audit trail,
  and that Reports/Map Intelligence/Evidence Locker/risk/decision/
  destination are all unaffected.
- **Task 42** — End-to-end demo + UI polish (implemented; zero backend
  files modified). See
  [DECISIONS.md](DECISIONS.md#task-42--end-to-end-demo--ui-polish-implemented).
  Seven new cross-page navigation buttons connect the officer journey
  (Risk Analysis → Decision Workspace → Destination Explorer → Map
  Intelligence → Evidence Locker → Copilot → Reports → back to Risk
  Analysis) — plain `onNavigate` calls, no new routes/business logic.
  Fixed the long-stale Overview `RiskAnalysisCard.tsx` placeholder
  ("will be connected in a later task") by wiring a fourth parallel
  fetch in `AppShell.tsx` (`fetchSettlementRisk`) so it shows real
  live assessment status; Overview's four quick-action cards
  (`IntelligenceCard` gained an optional `onClick`) now navigate to
  their real pages instead of being inert. New shared
  `utils/formatStatus.ts` fixed a three-way badge-capitalization
  inconsistency ("Assessment Pending"/"Assessment pending"/"Destination
  analysis pending") and a plain-text-vs-Badge inconsistency on the
  Decision Workspace's pathway table. Added the task's requested
  disclaimer text to Decision Workspace ("VIKALP does not issue
  relocation orders — officer approval remains final.") and Destination
  Explorer ("no candidate data" ≠ "no safe destination exists" made
  explicit, plus a "Carrying capacity: not assessed" line). A full
  terminology audit (BHUVIGIL, "command center", "autonomous AI", "AI
  prediction", "certified", "official", "unsafe", fake risk-level
  copy) found **zero** problematic matches anywhere in the frontend —
  already clean from Tasks 32-41's own discipline. Settlement-selection
  architecture (6 pages hardcode the id, 2 fetch-and-default) was
  reviewed and deliberately left as-is, since exactly one settlement
  exists today so no actual divergence is reachable — documented as a
  reviewed decision, not rebuilt into a new Context/store per the
  task's own "if needed"/no-new-dependencies instruction. No new
  tests (no backend change; no frontend test runner in this repo);
  **167/167 backend tests still passing, unchanged**; frontend
  `tsc -b`/build both clean; live verification confirms the entire
  demo journey's backend dependencies healthy end-to-end.
  **Correction (same task, same day)**: the running app was reviewed
  and found still white/navy — the approved black + gold direction
  (already proven on `LoginPage.tsx` since Task 35, but never applied
  elsewhere) was rolled out app-wide via one shared theme-token file
  (`styles/index.css`) plus a mechanical `bg-white`→`bg-vikalp-card`
  sweep across 23 files, not a per-page rewrite. A dead-control audit
  found and fixed three: "3D Terrain"/"Hybrid" (Overview sidebar,
  previously clickable but non-functional — no terrain-tile pipeline
  exists; now honestly "Not available in prototype", not faked),
  Overview's legacy 8-checkbox `LayersPanel` (replaced with the same 3
  real + 3 honestly-unavailable layers Map Intelligence already uses,
  plus a working link to it), and an unwired location-search input
  (now genuinely `disabled` with an honest placeholder). See
  [DECISIONS.md](DECISIONS.md#task-42-correction--blackgold-visual-direction--dead-control-honesty-pass)
  for the full breakdown. Still zero backend files touched;
  **167/167 backend tests remain passing**; `tsc -b`/build re-verified
  clean after every change.
- **Task 43** — Officer Workspace + map-based Relocation Planner
  (implemented; zero backend files modified). See
  [DECISIONS.md](DECISIONS.md#task-43--officer-workspace--map-based-relocation-planner).
  Overview now reuses Map Intelligence's own `IntelligenceMap` +
  `LayerControlPanel` (real layer toggles, fit/reset) instead of a
  second, weaker map implementation — `MapLibreMap.tsx`,
  `LocationExplorer.tsx`, and the old `LayersPanel.tsx` are deleted. A
  new compact right-hand "Settlement Intelligence" panel
  (`SettlementEvidencePanel.tsx`, rewritten) adds a live risk-dimension
  count, landslide evidence stats, and four working quick actions (View
  Risk / View Evidence / Ask Copilot / Generate Report). The bottom row
  grew from four static cards to five live ones — Risk / Decision /
  Destination / Relocation / Copilot — all fed by one new
  copilot-context fetch in `AppShell.tsx` instead of three separate
  fetches; `KeyInsightsCard.tsx` is deleted (duplicated the right
  panel). Added a small raw-status → officer-phrase translation table
  to `formatStatus.ts` (`no_scoring_rule` → "Assessment rule pending",
  etc., per the task's own five-item list). Risk Analysis and
  Destination Explorer were redesigned into compact, scannable cards
  with expand-on-demand detail instead of always-visible paragraphs.
  **Relocation Planner is now a real map-based workspace** (was a
  `PlaceholderPage` since Task 06): a 4-step tracker, a new
  `RelocationMap.tsx` (settlement marker always; destination marker
  only when a real candidate exists — currently dormant, since Bhitai
  Malli has 0 candidates), and an honest "No government-curated
  destination" empty state — no route/line is ever drawn between
  settlement and destination, since no route/distance data source
  exists. No backend file touched; **167/167 backend tests remain
  passing**; `tsc -b`/build clean; live Playwright verification (dev
  tool only, not a project dependency) confirmed the full Overview
  shell, working layer toggles, all navigation buttons, Destination
  Explorer, Relocation Planner, and the auth-guard redirect.
- **Task 44** — state-level Officer Workspace Overview + real weather
  (implemented). See
  [DECISIONS.md](DECISIONS.md#task-44--state-level-officer-workspace-overview--real-weather).
  Rebuilt the Overview page to match a supplied reference image's
  layout/density: unchanged shared top nav, a new State/District/
  Settlement/Search filter bar with a real "Current Selection" pill,
  a dominant Uttarakhand map (`StateMap.tsx`, new — all 13 real
  districts, the one real settlement, the real GSI landslide
  inventory), and a compact right-hand stack (Key Information /
  Weather Forecast / Assessment Status / Key Evidence Summary / Ask
  Copilot). Supersedes Task 43's settlement-drill-down Overview
  concept for this page only — that functionality (real layer
  controls, Settlement Intelligence panel, 5-card status row) is
  untouched and still lives on Map Intelligence and the dedicated
  Risk/Decision/Destination/Relocation pages. **New: real weather** —
  `backend/app/services/weather.py` calls Open-Meteo (free, keyless,
  stdlib `urllib.request` only — no new pip dependency) for Bhitai
  Malli's own coordinates, never presented as a state-wide figure;
  new `GET /api/weather/pilot` (protected + audited like every other
  route); 9 new network-mocked backend tests. Every state-level
  number is real (settlement/population/household counts summed over
  the real settlements list; Area reads "Not available" — no source
  exists); no 3D/hillshaded terrain (the only processed DEM covers
  the Pauri Garhwal pilot clip, not the whole state); map markers
  only for real settlements/hazard data, never invented per-district
  dots. Deleted 10 Task 43 components (`Sidebar.tsx`,
  `BottomIntelligencePanels.tsx`, `SettlementEvidencePanel.tsx`, the
  4 status cards, `VisualizationControls.tsx`, `IntelligenceCard.tsx`)
  that became orphaned once `AppShell.tsx` was rewritten — confirmed
  zero remaining references before removal. Found and fixed a real
  bug during implementation: a district-name mismatch between the
  boundaries dataset ("Garhwal") and the settlements table ("Pauri
  Garhwal") was permanently disabling the Settlement dropdown after
  selecting a district; fixed with a lenient match consolidated into
  one place. Backend: **176/176 passing**; `tsc -b`/build clean.
  Extensive live verification passed (filter bar cascading, card
  navigation, refresh, auth guard, zero console errors) **except** the
  map's own visual layer rendering (settlement marker, district
  boundaries), which could not be confirmed by screenshot in this
  session due to what was isolated to be a test-environment WebGL
  issue (reproduced identically on Map Intelligence's own unmodified,
  previously-working map and on an app-independent test page) —
  flagged for a manual browser check.
- **Task 45** — Overview visual correction (implemented). See
  [DECISIONS.md](DECISIONS.md#task-45--overview-visual-correction-map-framing-terrain-basemap-layout-ratio).
  Presentation-only follow-up to Task 44 after reviewing a live
  screenshot. Map now `fitBounds`-fits the real Uttarakhand district
  bbox on load instead of a fixed zoom guess; basemap swapped from OSM
  roads to Esri's free/keyless World Terrain Base (real global
  elevation relief, not a VIKALP DEM render — CARTO's free tiles were
  tried first but now require an API key, confirmed live and abandoned
  before shipping); map/sidebar ratio changed to a proportional 68:32
  flex split (was a fixed 320px sidebar); gold boundary glow +
  settlement halo/label added as a styling layer over the same real
  data; Inter typography finally wired up project-wide (`index.html` +
  `styles/index.css` — was specified since early tasks but never
  actually loaded). `tsc --noEmit`/build clean; filter cascading,
  search, Current Selection, navigation, and the auth guard all
  reverified working with zero console errors. **Still unresolved**:
  the gold boundary/settlement/landslide vector layers could not be
  visually confirmed on the Overview map by screenshot — this time
  more precisely isolated than Task 44's issue (Map Intelligence's own
  map, same session, renders its equivalent layers correctly; sixteen
  targeted tests ruled out style-object sharing, timing, basemap
  choice, resize loops, and CSS compositing, without finding a root
  cause) — flagged again for a manual browser check.
- **Task 45.6** — fix "Map data not yet available" at high zoom
  (implemented). See
  [DECISIONS.md](DECISIONS.md#task-456--fix-map-data-not-yet-available-at-high-zoom).
  Note: the brief referenced a "Task 45.5" `raster-dem`/`setTerrain()`
  3D terrain feature that does not exist in this codebase (verified by
  grep) — what exists is Task 45's flat 2D Esri terrain-relief *image*
  basemap. Root cause verified by direct HTTP requests: Esri's World
  Terrain Base has real tile data through zoom 9 for the Uttarakhand/
  Himalayan region, and returns the exact same 2521-byte placeholder
  (HTTP 200, so undetectable as an error) at every zoom 10+ tile tested
  near Bhitai Malli. Task 45's `maxzoom: 13` was an unverified guess;
  fixed to the verified real value (`maxzoom: 9`), letting MapLibre's
  standard overzoom behavior stretch the last real tile instead of
  requesting the placeholder — map interaction itself stays fully
  unrestricted. Added a small non-blocking "Basemap imagery shown at
  reduced detail beyond zoom 9" notice for extreme overzoom. Verified
  live across the full zoom matrix (overview → district → Bhitai Malli
  → 5 more zoom levels → reset): zero console errors, zero non-200
  Esri responses, "Map data not yet available" never reappeared.
  `tsc --noEmit`/build clean; backend untouched, 176/176 still passing.
  Did **not** touch or re-diagnose Task 45's separate, already-
  disclosed vector-layer rendering limitation (boundary/settlement/
  landslide markers) — that remains open.
- **Task 45.7** — real root cause of the missing map layers, found and
  fixed + Overview redesigned as the state-level entry point
  (implemented). See
  [DECISIONS.md](DECISIONS.md#task-457--the-real-root-cause-of-the-missing-map-layers-and-the-overview-redesign).
  The boundary/settlement/landslide rendering issue left open since
  Task 45 was **not** a `StateMap.tsx` code bug at all — it was Vite's
  dev-server dependency pre-bundler breaking `maplibre-gl`'s internal
  worker script reference (confirmed by network capture: the worker
  404'd from its pre-bundled path on every page, every time; without a
  working worker no GeoJSON layer ever gets tessellated, so vector
  layers rendered nothing while raster tiles, needing no worker,
  always looked fine). Fixed with `optimizeDeps: { exclude:
  ['maplibre-gl'] }` in `vite.config.ts` plus clearing the stale
  `node_modules/.vite` cache — confirmed via network capture that the
  worker now loads with a real 200. District boundaries, district
  labels, the Bhitai Malli marker, and landslide evidence all now
  render correctly, live-verified at both the state-overview and
  settlement-focus zoom levels. Overview also redesigned per this
  task's brief: basemap swapped to Esri's natural-color "World
  Physical Map" (green/brown/white/blue, real verified coverage to
  zoom 8) replacing the grayscale terrain basemap; map/sidebar ratio
  raised to ~75/25 (was ~68/32); weather relabeled "Pilot Location
  Weather" everywhere it appears, not "Weather Forecast"; fitBounds
  padding increased slightly. Confirmed already compliant with the
  rest of the brief (state-level initial view, fully data-driven
  settlement dropdown, compact non-dominant sidebar/Copilot, existing
  data-honesty states, no unnecessary flyTo calls, listener hygiene).
  Backend untouched, 177/177 passing; `tsc --noEmit`/build clean.
- **Historical Replay mode (Risk workspace)** — audited, shipped as a
  disabled/unavailable state (implemented). See
  [DECISIONS.md](DECISIONS.md#task--historical-replay-mode-risk-workspace--audited-shipped-disabled).
  Before writing UI, audited the repo for verified event-specific
  historical hazard data (a real named/dated event with impact
  records): none exists. The only hazard dataset, the 813-record
  GSI/NLFC landslide inventory, is a location dataset with 0%
  populated casualty/damage fields and an "initiation year" field
  populated for only 19.2% of records that Task 24B already classified
  "probable, not confirmed." `services/risk.py`'s Historical Disaster
  Evidence dimension remains a permanent `no_data` stub. Per the
  brief's own instruction for this exact situation, built a compact
  Current Assessment / Historical Replay switch on
  `RiskAnalysisPage.tsx` (default Current Assessment, unchanged
  behavior) and a new `HistoricalReplayPanel.tsx` disabled state — no
  invented event, date, rainfall, casualty, or score anywhere. Backend
  untouched, 177/177 passing; `tsc -b`/build clean; live-verified both
  switch directions with the exact required unavailable text and zero
  console errors.
- **Overview map: React-Leaflet `AdvancedMap` integration** (approved,
  intentional exception to the MapLibre-only architecture — implemented).
  See [DECISIONS.md](DECISIONS.md#task--integrate-the-supplied-react-leaflet-advancedmap-into-overview).
  Replaced Overview's MapLibre `StateMap.tsx` internals with an adapted
  version of the user-supplied React-Leaflet `AdvancedMap` component —
  Map Intelligence and Relocation keep MapLibre unchanged, including
  the Task 45.7 worker fix. Every demo-specific piece of the supplied
  component was stripped or replaced with real VIKALP data/behavior:
  no external marker-icon CDN (custom CSS divIcons instead), no
  Nominatim search (VIKALP's own settlement search already existed),
  no Locate Me/Satellite/Traffic (no verified data source for any of
  the three), no London/Hyde Park demo data. `StateMap.tsx` kept its
  exact exported name/prop API/`StateMapHandle`, so `AppShell.tsx`
  needed zero edits. New dependencies: `leaflet`, `react-leaflet`,
  `react-leaflet-cluster` (+ `@types/leaflet`,
  `@types/leaflet.markercluster` dev-only); `npm audit` 0
  vulnerabilities. Installing them exposed a real, previously-hidden
  type-strictness gap that broke `tsc -b` on `IntelligenceMap.tsx` (a
  file this task couldn't touch) — root-caused to `types/gis.ts`'s
  loose `geometry: { type: string; coordinates: unknown }` typing,
  which had silently relied on an inactive ambient `GeoJSON` namespace
  until my `@types/leaflet` install activated it project-wide; fixed
  with a type-only tightening (`GeoJSON.Polygon | GeoJSON.MultiPolygon`
  / `GeoJSON.Point`, verified against the real source files) that
  changed zero runtime behavior and required no edit to
  `IntelligenceMap.tsx` itself. Real data only: 13 district boundaries
  + labels, data-driven real settlement markers (not hardcoded to
  Bhitai Malli), clustered real GSI/NLFC evidence markers (popup shows
  only the 4 real backend fields, "Not available" per-field otherwise,
  explicitly disclaimed as not a risk zone), unchanged real "Pilot
  Location Weather." A live-verification pass found floating control
  buttons had no explicit z-index and could lose real mouse clicks to
  a Leaflet boundary layer after certain zoom sequences — fixed with
  `z-1200` on every map overlay div, re-verified with real
  Playwright clicks in the exact reproducing state. Backend untouched,
  177/177 passing; `tsc -b`/build/lint clean (zero new lint warnings);
  two full live-browser verification passes, zero console errors,
  zero fabricated data found anywhere on the page.
- **Historical Replay — Evidence, Risk, Destination & Relocation**
  (implemented). See
  [DECISIONS.md](DECISIONS.md#task--historical-replay-across-evidence-risk-and-destination--relocation).
  Extended the earlier single-page Risk-only audit across rainfall,
  terrain provenance, infrastructure/access, settlement vintage, and
  destination/capacity governance — confirmed no verified historical
  event exists (same GSI inventory limitation as before), no
  historical rainfall, no infrastructure/access data (current or
  historical), and destination candidates/carrying capacity remain
  "NOT IMPLEMENTATION-READY" per Task 30. Built a shared, cross-page
  `HistoricalReplayContext` (new, additive — `App.tsx` wraps it
  alongside the untouched `SelectionProvider`) so the Current
  Assessment/Historical Replay toggle persists across all three
  workspaces, plus a shared evidence catalog
  (`data/historicalReplay.ts`) classifying every real data point as
  Historical Record/Current Data/Scenario Output/Unavailable so the
  three pages can't drift into disagreeing. Evidence gained its first-
  ever map (new component, since Map Intelligence's and Relocation's
  maps couldn't be modified) plus a timeline/category/provenance
  review (provenance reuses the existing `DerivedOutputTraceability`
  component verbatim). Risk's prior simple "unavailable" panel was
  replaced with a full 5-dimension evidence review — critically,
  **zero numeric score anywhere**, since no dimension meets all three
  of the brief's own conditions for showing one (approved historical
  scoring logic + genuinely existing data + governance approval) —
  plus three neutral, non-preselected Protect/Adapt/Relocate pathway
  cards. Destination & Relocation reuses the existing, **unmodified**
  `RelocationMap.tsx` with a watermark composed on top from outside,
  showing the brief's three required unavailable strings verbatim
  (no destination/capacity/route ever fabricated). No backend file
  touched — every existing governance regression test still passes
  unmodified. Backend 177/177 passing; `tsc -b`/build clean; lint has
  2 new warnings, both matching pre-existing accepted patterns
  elsewhere (no new warning category). Live-verified all 25 of the
  brief's own checklist items PASS, including cross-workspace state
  persistence and clean reversion to each workspace's original Current
  Assessment UI, zero console errors.
- **Evidence workspace visual redesign** (implemented). See
  [DECISIONS.md](DECISIONS.md#task--evidence-workspace-visual-redesign-gis-intelligence-page).
  UI/UX-only redesign of `DataGovernancePage.tsx` — no evidence
  governance, historical replay governance, scoring logic, APIs, or
  data values changed, only presentation. Replaced the narrow (~672px)
  text-list-plus-permanent-side-panel layout with one unified visual
  system used by both Current Assessment and Historical Replay: wide
  content (100% of a 1440px viewport, measured live), a dominant real
  MapLibre map (~58% of the content row), a big-number evidence
  snapshot strip with a real segmented availability bar, 6 icon-led
  category cards (Terrain/Hazard/Historical Disaster/Rainfall-Weather/
  Settlement/Infrastructure-Access) with visually distinct dashed/muted
  styling for unavailable ones, a right-side slide-in drawer (new
  generic `Drawer.tsx`) replacing the old permanent panel, a restyled
  visual provenance chain (same two real derivation chains as before —
  GSI→Hazard Exposure, CartoDEM→derived slope), and a compact "Ask
  VIKALP" Copilot chip. Typography raised throughout (28px title, 16px
  card headings, 14-16px body — was 10-11px almost everywhere).
  Historical Replay gained an Evidence-specific larger banner and badge
  wording rather than editing the shared components Risk/Destination &
  Relocation already use (kept those two pages' already-verified text
  untouched). 5 dead files deleted (confirmed zero remaining imports
  first). Backend untouched, 177/177 passing; `tsc -b`/build clean;
  lint has 1 new warning matching an existing accepted pattern (no new
  category). Live-verified all 22 of the brief's own checklist items
  PASS via actual measured `getComputedStyle`/`getBoundingClientRect`
  values (not just element-existence checks) — no horizontal overflow
  at 1440×900 or 1920×1080, zero console errors beyond benign headless-
  GPU driver noise.
- **Task 45.8 — GSI vector tiles + spatial/radius visuals + 7-category
  evidence matrix** (implemented). See
  [DECISIONS.md](DECISIONS.md#task-458--evidence-workspace-gsi-vector-tiles-radiusspatial-visuals-expanded-evidence-category-matrix).
  The GSI/NLFC landslide inventory (813 real records) is now served as
  real Mapbox Vector Tiles from a new minimum local FastAPI endpoint
  (`GET /api/evidence/gsi-landslides/tiles/{z}/{x}/{y}.pbf`,
  `backend/app/services/gis_tiles.py` + `api/evidence_tiles.py`) —
  correct Web Mercator `quantize_bounds` math (not a naive lon/lat
  scale, which would visibly distort points at this latitude), same
  unmodified source file and auth pattern as every other GIS endpoint.
  The browser now fetches only the tiles in view instead of the full
  dataset (`fetchLandslides()` removed from this page); a tiny new
  `/count` endpoint provides the real "813 total records" figure
  without ever sending geometry. Evidence map basemap switched to Esri
  World_Physical_Map (natural terrain relief, reused from Task 45.7,
  not a new source). Added: 1 km/5 km radius ring control, a compact
  layer toggle (boundaries/settlement/GSI), a real-numbers spatial-
  relationship diagram and summary strip (0 within 1 km / 21 within
  5 km / nearest 2.04 km — Hazard Exposure's own existing output,
  unchanged), and an expanded 7-category/5-state evidence matrix
  (Available/Review Required/Blocked/Unavailable — Terrain=Review
  Required and Hazard=Available exactly as the brief's own worked
  examples specify; Destination Evidence=Blocked, distinct from a
  flat Unavailable, since `destination.py`'s empty-candidate design is
  a deliberate policy decision, not just missing data). Provenance
  chains are now clickable into the evidence drawer; while touching
  that file, fixed a real pre-existing data-honesty gap (a `null`
  hazard value was silently rendered as "0 qualifying records" instead
  of "Not available"). Hit and fixed one non-application issue: the
  backend dev server's `--reload` watcher never picked up the new
  files, causing 404s until the process was restarted — confirmed via
  the test suite that the code itself was correct throughout. Backend
  183/183 passing (6 new tests); `tsc -b`/build clean; lint has 1 new
  warning matching an existing accepted pattern. Live-verified 20/20
  checklist items, including — most importantly — that the hand-
  written vector-tile Y-axis math has no flip (checked by decoding
  tile coordinates against real ground-truth lat/lon, and visually).

## Not started (in rough dependency order)
- Verify Task 11 and Task 12's map layers (point/label and boundary
  polygons) render correctly in an actual browser (not just the
  sandboxed headless test environment) — see the reported limitations
  in [DECISIONS.md](DECISIONS.md#task-11) and
  [DECISIONS.md](DECISIONS.md#task-12).
- Add the next genuinely sourced GIS layer (roads, POIs, or a DEM) now
  that the FastAPI → GeoJSON → MapLibre pattern (Tasks 11–12) exists
  for both a database-backed point and a static-file-backed polygon
  layer.
- Approve the remaining dimensions' scoring rules (Terrain, Historical
  Disaster Evidence, Population/Household Exposure, Vulnerability) so
  the engine can eventually produce a real overall (non-`null`) score
  — each still needs its own explicit approval per Task 07A/07B's
  data-honesty rules. **Hazard Exposure's landslide-inventory
  sub-evidence is now implemented** (see "Done" below) — it is the
  first of the five dimensions with a working scoring rule, though
  Hazard Exposure itself still can't reflect flood/cloudburst/
  multi-hazard evidence (entirely unavailable, Task 16), and the
  settlement-level `overall_score` still requires all five dimensions
  scored, so it remains `null` for Bhitai Malli today. **Task 24**
  audited the same GSI file for Historical Disaster Evidence and
  proposed a candidate methodology (Occurrence/Recency/Repeated-events,
  using the dated `initiati_1` subset only — genuinely different from
  Hazard Exposure's proximity/activity/density signal) — see
  [DECISIONS.md](DECISIONS.md#task-24--historical-disaster-evidence-data-audit--scoring-rule-design-design-only-not-implemented).
  **Design only, not implemented, `risk.py` untouched** — casualty/
  damage evidence is 0% populated dataset-wide so that component is
  currently inert, and five governance decisions remain open (relevance
  radius reuse, the inert-component score cap, `initiati_1`'s true
  meaning, the exact recency/repetition band cutoffs, and whether to
  keep the Casualty/Damage component in the schema at all). Bhitai
  Malli would score `no_evidence_found`/`null` under this design too —
  its nearest record (2.04 km) is outside the proposed 1 km relevance
  radius, and even the wider 21-record/5 km context set is entirely
  undated. **Task 24A** reviewed those five governance items: four
  resolved (1 km radius reuse **approved**; casualty/damage **removed
  from the live MVP formula** and kept only as a reserved, always-null
  schema field; repeated-event distinct-year cutoffs **approved**,
  confirmed well-behaved against the real 156 dated records) but the
  proposed recency cutoffs were **rejected** (tested against the real
  data: 87.2% of dated records fell into one band — not a genuine
  discriminator) and, most importantly, `initiati_1`'s semantic meaning
  (disaster year vs. survey/mapping year) remains **unresolved even
  after checking the source service's own field metadata** — see
  [DECISIONS.md](DECISIONS.md#task-24a--historical-disaster-evidence-governance-review-review-only-not-implemented).
  **Task 24B** investigated that blocker against official GSI sources
  and found GSI's own published "Landslide Inventory (Field Validated)"
  PDF report (904 pages, India-wide) uses a column literally called
  "History" whose values **exactly match `initiati_1`** for 728/728
  automatically cross-matched records (including Bhitai Malli's own
  nearest record: both show no date) — strong evidence `initiati_1`
  represents landslide occurrence timing, not survey/mapping metadata,
  but still classified **PROBABLE BUT NOT CONFIRMED** (no explicit GSI
  prose definition of "History" was found) rather than CONFIRMED — see
  [DECISIONS.md](DECISIONS.md#task-24b--gsi-field-provenance-investigation-for-initiati_1-investigation-only-not-implemented).
  **Historical Disaster Evidence remains NOT IMPLEMENTATION-READY** —
  the blocker is now well-characterized rather than resolved.
- **Task 25** designed a candidate Population/Household Exposure
  methodology (population as the primary scored signal, households as
  context/a data-integrity check only, to avoid double-counting a
  single correlated signal twice) and evaluated 6 approaches, ruling
  out density and relative-ranking scoring outright (no settlement
  area/boundary data exists; only 1 settlement record exists in the
  system, so there is no distribution to rank against). Unlike
  Historical Disaster Evidence's blocker (ambiguous field meaning),
  Population/Household Exposure's data (383/86 for Bhitai Malli) is
  unambiguous and internally consistent — the blocker here is that
  **every candidate's numeric constants (population band edges, or a
  log-scale reference ceiling) are currently NOT JUSTIFIED**: no
  official Indian settlement-size classification was found/confirmed,
  and no data-derived alternative is possible with only one settlement
  record — see
  [DECISIONS.md](DECISIONS.md#task-25--population--household-exposure-scoring-design-design-only-not-implemented).
  **NOT IMPLEMENTATION-READY.** Design only; not approved or
  implemented; `risk.py` untouched.
- **Task 26** designed a candidate Vulnerability methodology: a
  two-part susceptibility + coping-capacity structure that maps
  directly onto `risk.py`'s own pre-existing `missing_inputs` list
  (`housing_construction_type`/`economic_vulnerability_index` ≈
  susceptibility; `distance_to_hospital`/`distance_to_road` ≈
  coping-capacity) — confirmed NDMA formally recognizes disability as a
  DRR vulnerability category (a real, checked guideline title:
  "Guidelines on Disability Inclusive Disaster Risk Reduction," 2019).
  **Vulnerability has zero backing data of any kind, anywhere in this
  repository** — the most severe gap of any dimension addressed so far
  (worse than Historical Disaster Evidence's ambiguous data or
  Population/Household Exposure's present-but-unthresholded data).
  Every candidate's numeric constants are NOT JUSTIFIED, and
  percentile/index-based candidates are additionally ruled out by the
  same N=1-settlement problem Task 25 established — see
  [DECISIONS.md](DECISIONS.md#task-26--vulnerability-scoring-design-design-only-not-implemented).
  **NOT IMPLEMENTATION-READY.** Design only; not approved or
  implemented; `risk.py` untouched (still reports `status: "no_data"`,
  unchanged since Task 07B).
- **Task 27** designed a candidate Terrain/Physical Susceptibility
  methodology (slope as the primary signal, elevation demoted to
  context-only since its susceptibility role is ambiguous; a
  multi-signal index — slope + relief + aspect + terrain position +
  drainage — recommended as the long-term target, matching `risk.py`'s
  own pre-existing `dem_derived_susceptibility_index`/`aspect` missing
  inputs). A real sensitivity check against the actual processed Pauri
  Garhwal DEM/slope rasters (median slope 26.44°, Bhitai Malli's own
  22.58° sits below that) confirmed no single-band saturation locally,
  but flagged that this data is Himalayan-hill-terrain-only —
  insufficient to ground India-wide constants without a future
  physiographic-region-based normalization. **The blocker here is
  distinct from Tasks 24-26's**: Terrain has real, well-documented data
  from two independent sources that disagree — DEM-derived slope
  22.58° vs. the existing database scalar 18.91° (first found Task 15,
  **still explicitly unreconciled, per this task's own instruction not
  to resolve it**) — see
  [DECISIONS.md](DECISIONS.md#task-27--terrain--physical-susceptibility-scoring-design-design-only-not-implemented).
  **NOT IMPLEMENTATION-READY.** Design only; not approved or
  implemented; `risk.py` untouched; the 22.58°/18.91° discrepancy
  remains explicitly documented and unresolved.
- **Task 28** — governance synthesis of Tasks 21-27's per-dimension
  audits into one MVP risk policy (no new data, no code changes).
  **Confirmed VIKALP's MVP risk policy**: no fabricated/renormalized
  overall score, ever (rejected outright — see
  [DECISIONS.md](DECISIONS.md#task-28--risk-engine-governance--mvp-scoring-decision-governance-only-not-implemented)
  §2); Hazard Exposure remains the sole implemented, evidence-gated
  dimension (**IMPLEMENT NOW** — already done, correctly returns
  `null`/`no_evidence_found` for Bhitai Malli); Terrain, Historical
  Disaster Evidence, and Population/Household Exposure are all
  **BLOCKED** on specific, named governance decisions that do **not**
  require new data (mainly: approve policy-configuration numeric
  constants, following the same precedent already accepted for Hazard
  Exposure's 1 km radius); Vulnerability alone is **FUTURE** — genuinely
  blocked on missing data, not resolvable by decision. Reaffirmed the
  existing four-way evidence-status vocabulary
  (`no_data`/`no_scoring_rule`/`insufficient_evidence`/
  `no_evidence_found`) and confirmed the downstream Decision
  Workspace/Destination Explorer (Tasks 08/09) already don't depend on
  a real overall score, so the SIH demo can proceed end-to-end in
  evidence/assessment-pending/scenario mode without fabricating
  anything. **NOT IMPLEMENTATION-READY** for a complete five-dimension
  numeric risk engine; the evidence-first multi-dimensional dashboard
  (already built) is confirmed as the correct MVP experience today.
- Approve a pathway-evaluation rule (how a completed risk assessment
  should determine Protect/Adapt/Relocate feasibility) before the
  Decision Workspace can produce anything beyond "pending" — Task 08
  deliberately built only the structural framework, no algorithm.
  **Task 29** designed (not implemented) the full rule structure for
  this — see
  [DECISIONS.md](DECISIONS.md#task-29--decision-framework-governance--rule-design-governance--design-only-not-implemented).
  Key findings: today's `decision.py` gates on the risk service's
  single top-level `assessment_status` flag (all-or-nothing across all
  5 dimensions); redesigned to instead gate per-pathway on
  dimension-level evidence (no overall/renormalized score required,
  consistent with Task 28 §2). Relocate is split into 3 explicit
  levels — **assessment warranted** (the only one VIKALP's MVP may ever
  reach), **recommended** (requires an approved multi-dimension
  comparison rule — none exists), **approved** (a human/government
  act, permanently out of scope for VIKALP). Protect and Adapt are both
  additionally blocked on datasets that don't exist anywhere in VIKALP
  (mitigation-feasibility data for Protect; infrastructure/access data
  for Adapt — confirmed absent in DATA_INVENTORY.md). Explicitly
  rejected "high hazard evidence = automatic relocate." Confirmed
  Bhitai Malli's current live output (`not_evaluated`/`pending` for all
  three pathways) is already exactly correct — no code change needed.
  Destination Explorer (Task 09) reaffirmed fully independent, requires
  no change. **NOT IMPLEMENTATION-READY** for any real recommendation;
  the structural framework and "pending" presentation are already the
  correct MVP experience.
- Source/approve an actual candidate-destination dataset (names,
  coordinates, land/infrastructure data) before the Destination
  Explorer can show anything beyond "pending" — Task 09 deliberately
  built only the structural framework, no data, no ranking algorithm,
  no dimension weights. **Task 30** designed (not implemented) the full
  suitability/capacity rule structure for this — see
  [DECISIONS.md](DECISIONS.md#task-30--destination--carrying-capacity-governance--rule-design-governance--design-only-not-implemented).
  Key findings: of the 6 suitability dimensions, only **Hazard Safety**
  has a working scoring rule today (reuses Task 23's coordinate-agnostic
  landslide-inventory function) — blocked purely on having a candidate
  coordinate, not on policy; the other 5 are blocked on datasets that
  don't exist anywhere in VIKALP (land-use, roads, water/electricity/
  health/school, land ownership). Carrying capacity is defined as a
  4-tier model (physical/service/safe-occupancy/final-planning) that
  explicitly rejects "land-area-only" capacity and any invented
  density constant (e.g. "1 hectare = 50 families"); the recommended
  formula (constraint-based exclusion + minimum-of-component) is
  POLICY PENDING, not implemented. Relocation population is **never**
  auto-set to total settlement population — VIKALP's point-geometry
  data model cannot even in principle compute an "affected population"
  subset, so this stays officer-defined pending a future schema change.
  Candidate generation should be government-curated only for MVP (never
  GIS-generated "nearby land" auto-labeled as a destination). Confirmed
  Bhitai Malli's current live output (empty candidates, all 6
  dimensions `not_evaluated`) is already exactly correct — no code
  change needed. **NOT IMPLEMENTATION-READY** for any real destination
  score or capacity number; the structural framework and pending-state
  UI are already the correct MVP experience.
- Carrying-capacity check.
- Officer review/approval workflow — officer-controlled, no autonomous
  decision.
- PDF report generation (ReportLab).
- JWT authentication + RBAC (replaces the visual-only Login page).
- Audit logging.
- Settlements list / Data Governance (Evidence Locker) pages.

## Explicitly deferred (approved technologies not yet applicable)
- Recharts (whichever task first needs a chart — none yet).
- Hazard/terrain/DEM map layers, sidebar Layers checkboxes wired to
  real data, any live/government GIS source, satellite imagery — all
  deferred past Task 03, which only establishes the map foundation.
