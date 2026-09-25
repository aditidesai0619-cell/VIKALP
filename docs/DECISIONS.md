# VIKALP — Decisions Log

Records only decisions actually made, with the "why." Does not
restate the full spec — see [VIKALP_MASTER_SPEC.md](VIKALP_MASTER_SPEC.md)
and [UI_SPEC.md](UI_SPEC.md) for that.

## Task 02

**Page navigation: hand-rolled hash routing, not react-router-dom.**
`react-router-dom` was not in the documented stack. Per project rule
("if routing requires an additional dependency that is not documented,
stop and ask"), the user was asked and chose hash-based routing with no
library. Implemented in `frontend/src/components/navigation/useHashRoute.ts`
(`window.location.hash`, listens for `hashchange`). Bookmarkable URLs
(`#/overview`, `#/reports`, etc.) without adding a dependency.

**Tailwind CSS installed via v4 + `@tailwindcss/vite`, not the v3
postcss pipeline.** Fewer dependencies (no `postcss`/`autoprefixer`
needed) and CSS-first `@theme` token config, which maps directly onto
the fixed color/radius tokens in the visual spec. Tailwind CSS itself
is the documented technology; this is just its current recommended
install method.

**`oxlint` kept as the lint tool, not swapped for ESLint.** The
installed `create-vite` React-TS template now scaffolds `oxlint` by
default. It's dev-time lint tooling, not an architectural technology
choice, so it was left as-is rather than substituted.

**MapLibre GL JS and Recharts not installed yet.** Both are documented
technologies, but Task 02's center map and bottom panels are static
placeholders — no real map render, no charts. Installing either now
would be an unused dependency. Deferred to the tasks that actually use
them (Task 03 for MapLibre; whichever task first needs a chart, for
Recharts).

**Header stays visible on all pages, including placeholders.** The
spec only detailed the Overview dashboard's placeholder behavior for
other pages, but a bare placeholder with no header would strand the
user with no way back once they left Overview via a nav tab. Kept the
header (with working nav + a clickable "VIKALP" wordmark back to
Overview) on every page except Login.

## Task 03

**MapLibre GL JS v6.9.0 installed as the only new dependency.** It has
no required peer dependencies — the ~25 packages `npm install` added
are all its own internal/transitive deps, not separate libraries
chosen here. Types ship with the package; no `@types/maplibre-gl`
needed.

**Basemap: switched from MapLibre's own demo vector style to plain
OpenStreetMap raster tiles, mid-task.** First tried
`https://demotiles.maplibre.org/style.json` (MapLibre's official
demo/testing style, explicitly safe for this use, no key). At zoom 13
(needed to show Bhitai Malli's surrounding area, per the task) it has
no tile detail — the map rendered as a flat color with no roads,
place names, or terrain. That didn't satisfy "Bhitai Malli and its
surrounding area are visible," so it was replaced with a raw MapLibre
raster style pointing at `tile.openstreetmap.org` — a standard,
free, no-API-key basemap appropriate for development/demo use (the
task's own fallback instruction: "use only a source that is
appropriate for development/demo purposes and clearly document that
it is a DEMO BASEMAP"). This is unrelated to the banned OSM Overpass
API (that's a feature-query API; this is plain XYZ map tiles). Labeled
in the UI ("Demo basemap — not an official GIS layer") and in
[UI_SPEC.md](UI_SPEC.md#map-task-03). No dependency was added for
this — it's a runtime style/source configuration passed to the
already-approved MapLibre GL JS.

**Map resizing handled with a `ResizeObserver` on the map container,
not just MapLibre's default window-resize tracking.** The map sits
inside a flex layout where its container's size can change without
the window resizing. The observer calls `map.resize()` whenever the
container itself changes size, so the map never overflows or leaves
stale canvas dimensions.

**Old `MapPlaceholder.tsx` deleted, not kept alongside the new
component.** It was the exact thing this task replaces, had no other
usages, and leaving dead code around would contradict "do not
introduce unnecessary abstractions."

## Task 04

**`uvicorn` installed as the ASGI server.** Not itself named in the
documented stack (only "FastAPI" is) — FastAPI cannot run without one.
Flagged at the dependency-approval gate and explicitly approved before
installing, same reasoning as `@vitejs/plugin-react` in Task 02.
`fastapi==0.141.1`, `uvicorn==0.52.4` — latest stable at install time,
confirmed via `pip index versions`. `pydantic==2.13.4` pinned to match
what was already present on the machine.

**No ORM — raw `sqlite3` from the standard library.** SQLAlchemy is
explicitly banned. `app/database.py` opens connections directly and
runs plain SQL; `app/models/settlement.py` is a frozen dataclass that
maps a `sqlite3.Row` to a typed object, not an ORM model.

**No `python-dotenv`.** The only configuration this task needs is one
optional DB-path override, read via `os.environ.get(...)` with a
sensible default in `app/config.py`. Adding a `.env`-loading library
for a single variable would be an unused dependency; `backend/.env.example`
documents the variable for manual/shell export instead.

**Idempotent seed via `UNIQUE(name)` + `INSERT OR IGNORE`,
no migration framework.** Migrations were explicitly not approved for
this task. A `UNIQUE` constraint on `settlements.name` plus
`INSERT OR IGNORE` in `seed_demo_data()` is enough to guarantee
restarting the backend never duplicates Bhitai Malli — verified by
starting the server twice against the same `vikalp.db` and confirming
one row both times.

**Backend runs in its own venv (`backend/.venv/`), not the machine's
global Python.** Standard library (`venv`), not a new dependency or
architectural decision — isolates backend package versions from
whatever else is installed globally (which already had a different
Pydantic version present).

## Task 05

**No new dependency on either side.** Frontend uses the browser's
native `fetch()`; backend CORS uses `fastapi.middleware.cors.CORSMiddleware`,
already bundled with FastAPI/Starlette. Confirmed via `pip` — no
packages installed this task.

**CORS scoped to exactly `http://localhost:5173`, `allow_methods=["GET"]`,
no wildcard.** Matches the frontend's actual Vite dev port (confirmed
from Tasks 02–03's own dev-server runs, not assumed). `GET` only
because the backend currently exposes no other HTTP methods —
widening this is a decision for whichever task adds writes/auth.
Verified with a raw `curl -H "Origin: ..."` check: the allowed origin
gets `access-control-allow-origin` back, an arbitrary origin does not.

**Settlement Evidence panel fetches from the backend; the map and Key
Insights card still use the local `data/demoSettlement.ts` constant.**
Task 05 scoped the integration to the Settlement Evidence panel only
("do NOT make the map fetch settlement data in this task"). Connecting
`MapLibreMap.tsx` and `KeyInsightsCard.tsx` to the same backend record
is left for a later task, to avoid two different fetches racing for
the same data before there's a shared data layer worth building.

**Error state has no offline/demo fallback — a failed fetch always
shows a truthful error, never stale-looking data.** The task's own
guidance ("prefer a truthful API error state") and the project's
"no fabricated fallback risk/hazard values" rule pointed the same
way. A `RequestState` union (`loading` / `error` / `success`) in
`SettlementEvidencePanel.tsx` makes "no data yet" and "real data"
impossible to visually confuse — there's no partially-populated
in-between state a viewer could mistake for a live number.

**The existing "Data quality: Verified demo terrain and settlement
context" caption was kept as static UI copy, not replaced by the
backend's `data_note`.** That caption predates this task (Task 02) and
isn't something the backend returns — inventing a backend field for it
would violate "do not invent additional fields." Instead, the panel
shows both: the existing caption, and a new line rendering the
backend's actual `data_note` ("Demo planning inputs") verbatim,
prefixed "Source:" — satisfying the task's requirement that the
backend's own demo-data disclaimer "must remain visible wherever
appropriate" without fabricating a field to hold it.

**oxlint's `set-state-in-effect` warning fixed by removing a redundant
`setState` on mount, not suppressed.** The original `load()` called
`setState({status:"loading"})` synchronously inside the mount effect,
which is a no-op (state is already `"loading"` from `useState`'s
initializer) and is exactly what the rule warns about. Split into
`runFetch` (effect-only, no redundant reset) and `retry` (the button's
handler, which does need to reset to `"loading"` before re-fetching).

## Task 06

**The settlement fetch moved from `SettlementEvidencePanel` up to
`AppShell`.** `AppShell` is the actual Overview/dashboard parent that
composes the map, evidence panel, and bottom panels — the natural
single owner of "the currently selected settlement" data. It now holds
the `SettlementRequestState` (`loading`/`error`/`success`) and the
`retry` handler, and passes both down; `MapLibreMap`,
`SettlementEvidencePanel`, and `KeyInsightsCard` became pure
presentation components with no `fetch()` calls of their own.

**`SettlementRequestState` moved into `types/settlement.ts` as a
shared type**, rather than staying as a private union inside
`SettlementEvidencePanel.tsx`. All three consumers need to agree on
its shape; duplicating the union in three files risked them drifting
apart.

**Only `SettlementEvidencePanel` keeps a visible Retry button.**
`MapLibreMap` and `KeyInsightsCard` show a plain "unavailable" message
in error state with no button of their own — the task asked that
child components not independently retry the API, and one retry
action (owned by `AppShell`, triggered from the panel that already had
it since Task 05) refreshes all three at once. Adding two more
functionally-identical buttons would be pure duplication.

**`MapLibreMap` no longer initializes a MapLibre instance until
settlement data exists.** The map `<div>` container always renders
(so the ref is stable), but the `useEffect` that constructs
`maplibregl.Map` bails out (`if (!container || !settlement) return`)
until `state.status === "success"`. While loading/error it shows the
same calm placeholder text pattern as the other two components. This
avoids ever centering a real map on a stale/hardcoded coordinate and
only re-initializes (via the `[settlement]` dependency) when a new
settlement object actually arrives — confirmed via headless-browser
check: 0 `.maplibregl-canvas` elements while loading/error, exactly 1
right after a successful (re)fetch.

**Marker popup now built from `settlement.data_note` instead of a
hardcoded "Demo planning inputs" string.** Same displayed text today,
but it's no longer a second, independently-typed copy of the backend's
disclaimer — if the backend's wording ever changes, the popup follows
it automatically instead of silently going stale.

**`KeyInsightsCard`'s last line changed from the local
`dataQualityNote` ("Verified demo terrain and settlement context") to
the backend's `settlement.data_note` ("Demo planning inputs").** The
task's instructions were explicit that this card should use
`data_note` specifically, not invent a new field to carry the old
caption. (`SettlementEvidencePanel`'s separate "Data quality" caption
box is a different, pre-existing piece of static UI copy — see
Task 05's decision above — and was left exactly as it was.)

**`frontend/src/data/demoSettlement.ts` is now unused but was NOT
deleted.** After this task's changes, nothing imports it (confirmed by
search, and by the production build's module count dropping from 54
to 53). The task instructions were explicit: don't auto-delete, just
report it as obsolete and let a human decide. It's flagged here and in
`MVP_BACKLOG.md` rather than removed.

**Verified the request-count requirement is architectural, not
literal-count-under-any-conditions.** A headless-browser check of a
normal `npm run dev` session showed 2 requests to
`/api/settlements/1`, not 1 — but that's React 19 `StrictMode`
deliberately double-invoking effects in development (a standard,
long-documented React behavior, unrelated to this change; it would
have equally affected Task 05's original fetch-in-`SettlementEvidencePanel`
if anyone had measured it then). The number that actually matters —
whether there is one fetch call-site or three — was confirmed by the
count itself: 3 independent fetchers under `StrictMode` would show up
as 6 requests, not 2. Getting exactly 2 proves exactly one call-site.
Serving the production build (`vite build` + `vite preview`, which
does not double-invoke effects) was attempted to get a literal "1" in
network logs too; a loopback binding quirk in this sandbox (`vite
preview` bound `[::1]` even when passed a hostname, and Chromium's
`localhost` resolution didn't reliably reach a `127.0.0.1`-bound
instance either) made that harder to demonstrate cleanly than
expected, so it's noted here rather than silently claimed.

## Task 07A

**Status: APPROVED and IMPLEMENTED in Task 07B** (see that section
below for what was actually built). This section is kept as-written
for the historical record of what was proposed and why; treat the
"PROPOSED, requires approval" language below as resolved by the
specific choices Task 07B records, not as still-open options.

Original framing, for context: nothing in this section was live at
the time it was written. Every dimension, weight, threshold, and score
range below was a numbered *option*, not a decision made unilaterally.

### 1. Current available risk inputs

From `GET /api/settlements/1` (backend `app/models/settlement.py` /
`app/schemas/settlement.py`), all explicitly "demo planning inputs":

| Field | Value |
|---|---|
| population | 383 |
| households | 86 |
| elevation_m | 991 |
| slope_degrees | 18.91 |
| latitude / longitude | 30.167112 / 78.781266 |

That's the entire inventory. No other settlement-specific number
exists in the database or anywhere in the codebase.

### 2. Missing risk inputs

None of the following exist in the backend today — not landslide
susceptibility, flood hazard, coastal erosion, cloudburst hazard,
rainfall (historical or intensity), disaster history, infrastructure
exposure (roads/hospitals/schools), vulnerability indicators (housing
quality, socio-economic data, vulnerable population subgroups),
geology/soil data, or any DEM-derived susceptibility index. This
proposal does not assign numbers to any of them.

### 3. Proposed risk dimensions — PROPOSED, requires approval

Five dimensions, matching the shape you sketched, with each input's
current status:

1. **Terrain / Physical Susceptibility** — slope_degrees (AVAILABLE
   NOW, raw value only — see the warning below), elevation_m
   (AVAILABLE NOW, raw value only), geology/soil type (REQUIRED
   LATER), slope aspect/curvature (REQUIRED LATER), DEM-derived
   susceptibility index (REQUIRED LATER — a GIS/GeoPandas+Rasterio
   task).
2. **Hazard Exposure** — landslide susceptibility class (REQUIRED
   LATER), flood hazard class (REQUIRED LATER), cloudburst/extreme
   rainfall hazard (REQUIRED LATER), multi-hazard overlay flags
   (REQUIRED LATER). Nothing in this dimension exists today.
3. **Historical Disaster Evidence** — past incident count/severity/
   recency near the settlement (REQUIRED LATER). Nothing exists today.
4. **Population / Household Exposure** — population (AVAILABLE NOW),
   households (AVAILABLE NOW), vulnerable-subgroup counts — elderly,
   children, disabled (REQUIRED LATER, not in current schema).
   Average household size (population ÷ households) is a legitimate
   *arithmetic derivation* of two available fields, not an invented
   external fact — flagged separately from genuinely missing data.
5. **Vulnerability (socio-economic & infrastructure)** — housing
   construction type/quality (REQUIRED LATER), distance to nearest
   hospital/road/school (REQUIRED LATER), economic vulnerability
   indicators (REQUIRED LATER). Nothing exists today.

**⚠ Important caveat on dimension 1:** having `slope_degrees` and
`elevation_m` available does **not** mean Terrain Susceptibility can
be scored today. Turning a raw slope value into a susceptibility
*class* requires a documented classification rule (e.g. "15–25° →
Moderate"), and no such rule is approved anywhere in VIKALP's
documentation. Per the task's own instruction, this proposal does
**not** claim "18.91° slope → High Risk" or any other mapping — that
mapping itself is part of what needs approval (see §7).

### 4. Proposed scoring approach — PROPOSED, requires approval

Deterministic weighted sum: `overall = Σ(dimension_score_i × weight_i)`,
each `dimension_score_i` itself produced by explicit, documented rules
(threshold tables) applied to that dimension's raw inputs — never a
model, never a black box.

Two variants for how weights behave when a dimension has no data:

- **4a — Renormalize over available dimensions.** Exclude any
  dimension with zero usable data from the sum, and rescale the
  remaining weights so they still total 1.0.
- **4b — Refuse to produce a numeric overall score below a data-
  completeness floor.** If fewer than N of 5 dimensions have usable
  data, return `overall.status = "assessment_pending"` with
  `overall.score = null` instead of any number.

These aren't mutually exclusive — 4b could gate whether an overall
score is computed at all, with 4a used underneath once the floor is
met. See §8 for why 4b is the more defensible default given today's
data reality.

### 5. Proposed score range — PROPOSED, requires approval

- **5a — 0–100.** More legible to a non-technical officer audience;
  reads like a percentage/index.
- **5b — 0–1 (normalized).** More conventional in a scientific/GIS
  context, less immediately readable in a dashboard.

No recommendation forced — 5a is the more common choice for
officer-facing government tools, noted only as a lean, not a pick.

### 6. Proposed risk thresholds — PROPOSED, requires approval

Illustrative only, assuming a 0–100 range (§5a):

| Category | Range |
|---|---|
| Low | 0–24 |
| Moderate | 25–49 |
| High | 50–74 |
| Critical | 75–100 |

These are placeholder boundaries, not derived from any cited standard
(e.g. NDMA or state DRR guidelines) — no such standard is currently
referenced in VIKALP's documentation. If one should be adopted, that's
a separate decision this proposal doesn't make.

### 7. Proposed weighting options — PROPOSED, requires approval

Three illustrative weighting schemes, each reflecting a different,
legitimate disaster-risk-management philosophy. None is recommended
over the others — the choice is a policy decision, not a technical one:

| Dimension | 7a — Equal | 7b — Hazard-first | 7c — Exposure-first |
|---|---|---|---|
| Terrain / Physical Susceptibility | 20% | 25% | 15% |
| Hazard Exposure | 20% | 30% | 20% |
| Historical Disaster Evidence | 20% | 20% | 10% |
| Population / Household Exposure | 20% | 10% | 30% |
| Vulnerability | 20% | 15% | 25% |

7a is the most neutral default (no judgment call about which factor
matters most); 7b emphasizes physical hazard likelihood; 7c emphasizes
who/what is exposed, a common lean in vulnerability-first DRR
frameworks. This table is not exhaustive — a fourth, VIKALP-specific
weighting is equally valid if you'd rather define one directly.

Separately from the *dimension* weights above, the per-dimension
*threshold rules* (e.g., which slope band counts as "Moderate" terrain
susceptibility) also need their own approval before Task 07B can
implement dimension 1, since none currently exist in VIKALP's
documentation (§3's caveat).

### 8. Missing-data strategy — PROPOSED, requires approval

Given that, right now, only dimension 4 (Population/Household
Exposure) has any real data at all — the other four dimensions are
100% empty — this proposal recommends **§4b (refuse a numeric score
below a data-completeness floor)** as the honest default, for two
reasons: (1) it matches the *existing* UI, which already shows
"Assessment pending" for Bhitai Malli rather than a number; (2) a
weighted sum over 4 empty dimensions and 1 populated one would be
mathematically well-defined but substantively meaningless — a
"score" built almost entirely from missing data renormalized upward
would misrepresent confidence.

A third option, considered and **not recommended**: silently
defaulting missing dimensions to a neutral mid-range score. This is
called out only to rule it out — it would manufacture a number for
data that doesn't exist, directly conflicting with the project's
repeated "do not fabricate" instruction, and is not offered as a
live choice.

Whichever option is approved, every dimension (and the overall
result) must carry an explicit `data_completeness` marker
(`"none"` / `"partial"` / `"complete"`) — never silence about what's
real versus absent.

### 9. Proposed explainability structure — PROPOSED, requires approval

Every dimension entry should carry, at minimum:
- `name` — the dimension
- `score` (or `null` if no data)
- `data_completeness`
- `evidence_used` — each raw input actually consumed, with its value
  and source (e.g. `{"input": "slope_degrees", "value": 18.91,
  "source": "GET /api/settlements/1"}`)
- `missing_inputs` — named list of what this dimension still needs
- `explanation` — a short citation of the *specific rule* that
  produced the score (never free-text/AI-generated prose — a
  deterministic system must point at its own rule, e.g. "Rule:
  slope 15–25° → Moderate, per [pending: cite approved
  classification]")

This is what makes "explainable" concrete rather than aspirational:
every number traces to a named rule plus the raw evidence behind it.

### 10. Proposed Risk Analysis UI — PROPOSED, requires approval, not implemented

Reviewed `frontend/src/pages/RiskAnalysisPage.tsx` (currently the
shared `PlaceholderPage`, "VIKALP — Module coming in a later
implementation task.") and `frontend/src/components/dashboard/RiskAnalysisCard.tsx`
(currently a static "Assessment pending" card on the Overview
dashboard). Neither is touched by this task. Eventual design:

- **Overview's Risk Analysis card** — once data exists, an overall
  category badge (reusing the existing `safe`/`warning`/`critical`
  color tokens already defined in `styles/index.css`) plus a one-line
  summary and a link into the full page. Until real dimension data
  exists, it should keep showing "Assessment pending" — never a
  placeholder number.
- **Full Risk Analysis page** — settlement header with overall
  category + `assessed_at` timestamp + the existing
  "Officer review required." styling (reused verbatim from
  `SettlementEvidencePanel`); one row/card per dimension showing its
  score or an explicit "No data available yet" state, its evidence
  list, and its missing-inputs list; a consolidated explanation
  section listing the rule citations; a dedicated "data still needed"
  disclosure block. A Recharts bar/radar of dimension scores is a
  natural fit here (Recharts is already an approved but still-unused
  dependency) — but only once real scores exist; charting
  "Assessment pending" has no value and would risk looking like a
  real result.
- No number anywhere on this page may exist that isn't traceable to
  an `evidence_used` entry in the API response.

### 11. Proposed future API response structure — PROPOSED, NOT IMPLEMENTED

Conceptual shape only — no endpoint exists, this is not a contract yet:

```jsonc
// GET /api/settlements/{id}/risk — NOT IMPLEMENTED
{
  "settlement_id": 1,
  "settlement_name": "Bhitai Malli",
  "assessed_at": "<ISO 8601 timestamp>",
  "overall": {
    "status": "assessment_pending" | "low" | "moderate" | "high" | "critical",
    "score": null,              // number once §8's completeness floor is met
    "score_range": [0, 100],    // pending §5
    "data_completeness": "none" | "partial" | "complete"
  },
  "dimensions": [
    {
      "name": "Terrain / Physical Susceptibility",
      "score": null,
      "weight": null,           // pending §7
      "data_completeness": "partial",
      "evidence_used": [
        {"input": "slope_degrees", "value": 18.91, "source": "GET /api/settlements/1"},
        {"input": "elevation_m", "value": 991, "source": "GET /api/settlements/1"}
      ],
      "missing_inputs": ["geology", "aspect", "dem_derived_susceptibility_index"],
      "explanation": null       // pending an approved classification rule
    }
    // ...one entry per dimension from §3
  ],
  "methodology": {
    "model_type": "deterministic_weighted_scoring",
    "version": "proposed-v0 (unapproved)"
  },
  "officer_review_required": true,
  "officer_review_note": "Officer review required."
}
```

### 12–13. Data-honesty and cleanup confirmations

- No fabricated hazard, rainfall, disaster-history, infrastructure, or
  vulnerability values were created anywhere in this task — every
  number in this document is either an existing backend field (§1) or
  explicitly marked `null`/PROPOSED/pending.
- `slope_degrees` and `elevation_m` were not interpreted as a hazard
  score anywhere (§3's caveat) — no classification rule is claimed to
  exist.
- `frontend/src/data/demoSettlement.ts` — reconfirmed unused (no
  remaining imports; production build module count unaffected by its
  absence) and **deleted**, the one cleanup this task authorized.
  `npx tsc -b`, `npm run lint`, and `npm run build` all still pass
  clean afterward. The `DemoSettlement` TypeScript interface in
  `types/settlement.ts` was left in place — deleting it wasn't
  authorized ("do not delete anything else").

### 14–16. Files changed / dependencies / conflicts

- **Deleted:** `frontend/src/data/demoSettlement.ts`.
- **Modified (documentation only):** this file, `MVP_BACKLOG.md`,
  `VIKALP_MASTER_SPEC.md`, root `README.md`. `docs/CODEBASE_AUDIT.md`
  untouched.
- **Dependencies:** none added, none removed, none upgraded — no
  `npm install` or `pip install` run this task.
- **Conflicts with existing documentation:** none found. This
  proposal stays inside the documented stack (no ML/LLM/SHAP/XGBoost,
  matches "Explicitly out of scope" in `VIKALP_MASTER_SPEC.md`),
  preserves the "Officer review required." requirement on every
  result, and treats every current settlement field as a "demo
  planning input" consistent with existing wording throughout the
  project's docs.

## Task 07B

**Approved model implemented exactly as specified — no substitutions.**
Five dimensions at weights Terrain/Physical Susceptibility 20%, Hazard
Exposure 30%, Historical Disaster Evidence 15%, Population/Household
Exposure 20%, Vulnerability 15% (sums to 100%); 0–100 score range;
bands Low 0–24 / Moderate 25–49 / High 50–74 / Critical 75–100. Encoded
as `DIMENSION_WEIGHTS` and `RISK_BANDS` in `backend/app/services/risk.py`,
both explicitly commented **"PROTOTYPE POLICY CONFIGURATION... NOT an
official government standard"** in the source, and the same sentence is
returned to the client verbatim as `policy_disclaimer` on every API
response — the disclaimer isn't only in docs, it travels with the data.

**No dimension can produce a score yet — including the two dimensions
with real inputs (Terrain, Population/Household).** This is the
central constraint from the task and from Task 07A's §3 caveat: having
`slope_degrees`/`elevation_m`/`population`/`households` available does
not mean those dimensions can be scored, because no classification
rule converting them into a score is approved. So `assess_settlement_risk()`
always returns `score: null` for all five dimensions today, which
forces `assessment_status: "pending"`, `overall_score: null`,
`risk_level: null` for Bhitai Malli — matching the task's specified
expected result exactly. The weighted-sum formula is implemented
(`services/risk.py`'s `assess_settlement_risk`) and will compute a
real number automatically once every dimension has an approved rule,
but nothing in that path executes today; verified live via `curl`.

**Two distinct "why is this dimension empty" states, not one generic
"pending."** Hazard Exposure, Historical Disaster Evidence, and
Vulnerability have zero backend fields backing them → `status:
"no_data"`, empty `evidence`. Terrain and Population/Household have
real backend fields → `status: "no_scoring_rule"`, non-empty
`evidence` (the actual raw values), but still `score: null`. This
wasn't explicitly asked for as a separate field value, but it's what
makes the task's own requirement concrete — "make it obvious that the
assessment is pending because hazard, historical-disaster, and
vulnerability evidence is unavailable" needs the response to actually
distinguish "no evidence exists" from "evidence exists, no rule yet,"
otherwise that distinction could only live in prose, not structured
data. Top-level `data_completeness: "partial"` reflects that 2 of 5
dimensions have real evidence even though 0 of 5 have a score.

**New `backend/app/services/` package, kept separate from
`backend/app/api/`.** `services/risk.py` contains only the deterministic
calculation function (`assess_settlement_risk`) and its config
constants; `api/risk.py` contains only the route (DB read, 404
handling, calling the service, wrapping in the Pydantic response
model) — mirrors the existing `models/`/`schemas/`/`api/` separation
already used for settlements, per the task's "keep scoring logic
separate from the API route."

**New endpoint nests under the existing settlements prefix:
`GET /api/settlements/{id}/risk`**, not a top-level `/api/risk/{id}`.
Matches the shape already sketched in Task 07A §11, keeps risk
conceptually attached to "a settlement's risk," and required zero
changes to `api/settlements.py`'s two existing routes — Starlette
resolves `/api/settlements/1` and `/api/settlements/1/risk` to the
correct router without ambiguity since neither pre-existing route has
a trailing path segment. Reuses the exact same no-ORM
`get_connection()` + raw-SQL-by-id pattern already used in
`api/settlements.py`, rather than inventing a second data-access style.

**Frontend: a new, separate `services/risk.ts` / `types/risk.ts`
pair, not an extension of the settlement fetch.** Risk assessment is a
different resource (a different endpoint, different shape, different
lifecycle) from settlement identity — reusing `fetchSettlementById`/
`ApiSettlement` for it would conflate two unrelated things. This does
**not** reintroduce a second settlement-fetch mechanism: `RiskAnalysisPage`
fetches only the risk endpoint (confirmed via headless-browser request
log — zero requests to `/api/settlements/1` on that page), and gets
the settlement's display name for free from `settlement_name` already
present on the risk response, so it never needs the settlement
endpoint at all. The Task 06 single-source-of-truth architecture
(`AppShell` owning the one settlement fetch for the Overview page) is
completely untouched — `AppShell.tsx`, `SettlementEvidencePanel.tsx`,
`MapLibreMap.tsx`, and `KeyInsightsCard.tsx` were not edited this task.

**`RiskAnalysisPage` fetches on its own mount, independent of
Overview's fetch, because it's a different route with a different
component tree.** `PageRouter.tsx` only renders `AppShell` for
`"overview"`; `RiskAnalysisPage` is a sibling top-level page with no
access to `AppShell`'s local state. Given today's single-settlement
scope (Bhitai Malli, id 1, hardcoded the same way `AppShell` already
hardcodes it), a page-local `loading`/`error`/`success` fetch — the
same pattern used throughout this codebase since Task 05 — was the
smallest correct implementation; a cross-page settlement-selection
store would be solving a problem (multiple settlements, navigation
between them) that doesn't exist yet.

**Overview's `RiskAnalysisCard.tsx` bottom-row summary widget was left
unchanged**, still reading "Risk assessment will be connected in a
later task." The task's "Implement the existing Risk Analysis page"
instruction and its bulleted content list both referred to the page,
not this separate Overview widget, and the task separately warned
against redesigning the whole application — so this one static string
is now slightly stale but was left alone rather than assumed in
scope. Flagged as a concern in the final report, not silently patched.

## Task 08

**Decision Workspace implements only the pathway *framework*, never
pathway evaluation logic.** Unlike Task 07B (which had an explicitly
approved weight/threshold model to implement), this task gave no
approved algorithm for turning risk into a Protect/Adapt/Relocate
recommendation — and explicitly forbade inventing one ("do not invent
pathway scores... do not invent feasibility values"). So
`backend/app/services/decision.py` defines the three pathways'
definitions, action categories, and evidence requirements as static
data, and `assess_settlement_decision()` unconditionally returns
`decision_status: "pending"` and `status: "not_evaluated"` /
`recommended: false` for every pathway — there's no hypothetical
"if risk were complete" branch that produces a score, because no rule
exists for that branch to run even if risk were complete. This is
deliberately more conservative than `risk.py`'s design (which does
implement a real weighted-sum *formula*, just currently unreachable) —
here, no formula was given, so none was written.

**Decision endpoint calls the risk service function directly (Python
function call), not a second HTTP round-trip to `/risk`.**
`assess_settlement_decision()` imports and calls
`assess_settlement_risk()` from `services/risk.py` in-process to read
`risk_assessment_status` — both already run inside the same FastAPI
process against the same `Settlement` object, so there's no reason to
have the backend make an HTTP call to itself. This keeps
`GET /api/settlements/{id}/decision` a single request from the
frontend's perspective, confirmed via headless-browser request log
(zero requests to `/risk` when loading the Decision Workspace page).

**`SettlementDecision` schema includes `settlement_district` and
`settlement_state`, not just `settlement_id`/`settlement_name`.** The
required UI shows "Bhitai Malli" / "Pauri Garhwal, Uttarakhand" as two
lines, but the task also forbids the Decision Workspace from creating
"another settlement fetch mechanism" to get that second line. Since
`api/decision.py` already loads the full `Settlement` row to build the
response, exposing its two already-present district/state fields
costs nothing extra and avoids a second fetch — same reasoning Task
07B used for `settlement_name` on the risk response, extended by two
fields because this page's required UI needed more identity detail
than Risk Analysis did. Not a new/duplicate settlement-fetch path —
still exactly one HTTP call per page load.

**New endpoint nests under `/api/settlements/{id}/decision`**, same
convention as `/risk`. `api/settlements.py`'s two existing routes are
untouched; Starlette disambiguates all three suffixes
(`/1`, `/1/risk`, `/1/decision`) without conflict.

**`DecisionWorkspacePage.tsx` replaces the existing
`decision-workspace` route's placeholder** (the header nav still
labels this tab "Scenario Lab" — unchanged, that labeling is a Task 02
UI decision this task didn't touch). Same page-local
`loading`/`error`/`success` fetch pattern as `RiskAnalysisPage.tsx`
(own mount, independent of `AppShell`'s Overview-only fetch, since
it's a sibling top-level page in `PageRouter.tsx` with no access to
`AppShell`'s state) and the same reasoning for why that's correct
today: a cross-page settlement-selection store would solve a problem
(multiple settlements) that doesn't exist yet in this single-settlement
demo.

**Pathway comparison table shows an evidence-required item *count*,
not a score.** E.g. "3 items pending" / "8 items pending" — this is
`evidence_required.length` from the real API array, not a fabricated
number. Included because the task asked for a genuine side-by-side
comparison section and a plain count is the only way to compare
pathways' evidence burden without inventing a feasibility/likelihood
value, which is explicitly banned.

## Task 09

**No candidate destinations, no ranking, no weights — the entire
module is a framework with an always-empty result.** Unlike
`decision.py`, `destination.py` has no dependency on any other
service's status (risk/decision completeness doesn't matter) — the
sole reason `candidates` is always `[]` is that no approved
destination dataset exists anywhere in the project, full stop. The 6
suitability dimensions (`SUITABILITY_DIMENSIONS`) are defined as
evaluation *categories* only — name, definition, `status:
"not_evaluated"` — with no `weight` field at all. The task explicitly
said not to assign weights unless already approved, and since no
candidate is ever scored, there is nothing for a weight to multiply —
adding one now would be inventing unused policy config. If real
ranking logic is approved later, weights become that task's decision.

**Caught and fixed a real bug during verification: the initial
`SUITABILITY_DIMENSIONS` list omitted the `status` field**, which
`SuitabilityDimension` (Pydantic) requires — the live endpoint 500'd
with 6 validation errors before the fix. Added `"status":
"not_evaluated"` to all six dimension dicts, restarted, re-verified
`GET /api/settlements/1/destinations` returns 200 with the full
expected body. Documented here rather than silently fixed, since it's
a concrete example of why byte-compiling isn't enough — Pydantic
validation errors only surface at request time.

**`SettlementDestinationAnalysis` includes `settlement_district`/
`settlement_state`, same reasoning as Task 08's decision schema.** The
required UI shows "Bhitai Malli" / "Pauri Garhwal, Uttarakhand"; the
route already loads the full `Settlement` row, so exposing those two
existing fields avoids a second settlement fetch rather than adding
one — the task explicitly invited this ("the destination endpoint may
return the settlement name/district/state... if that avoids another
settlement request").

**Endpoint nests under `/api/settlements/{id}/destinations`**, no
dependency on `services/risk.py` or `services/decision.py` (unlike
`decision.py`'s in-process call to `risk.py`) — since destination
pending-ness doesn't depend on risk/decision status, there was nothing
to call. `api/settlements.py`, `api/risk.py`, `api/decision.py` all
untouched; Starlette disambiguates the fourth path suffix
(`/1/destinations`) the same way it already does for `/risk` and
`/decision`.

**No MapLibre map embedded on this page**, even though the task
allowed reuse "if it can be done without creating fake destination
markers." Two reasons: (1) `MapLibreMap.tsx` requires a
`SettlementRequestState` prop carrying the origin settlement's
lat/long — supplying that here without a second settlement fetch
would mean adding lat/long to the destination schema for a marker that
would just re-show Bhitai Malli's own location again, not a
*destination*, which risked being confusing on a page named
"Destination Explorer" (a marker with no destination on it); (2) it
matches the precedent already set by `RiskAnalysisPage.tsx` and
`DecisionWorkspacePage.tsx`, neither of which embeds the map either —
only the Overview dashboard does. Flagged as a decision, not silently
assumed.

**Frontend candidate-list rendering includes a live (if currently
unreachable) branch for `candidates.length > 0`**, rendering each
candidate's name in a plain list. This code path never executes today
(`candidates` is always `[]`) but exists so a future real dataset
doesn't require redesigning the page from scratch — commented in the
source as unreachable-by-design, not a placeholder inviting fake data.

## Task 11

**GeoJSON schema added to `schemas/settlement.py`, route added to the
existing `api/settlements.py` router — no new `services/` module, no
new router file.** Unlike risk/decision/destination (which each
involved real branching logic that justified a `services/*.py`
module), this endpoint is pure reformatting of the same `Settlement`
dataclass instance the other two settlement routes already use — no
computation, no missing-data logic, nothing to separate out. Adding a
`services/geojson.py` for a single reshaping function would have been
an abstraction with nothing to abstract.

**No backend test added — none exists in the project (confirmed: no
`pytest`, no test files anywhere in `backend/`), matching the task's
own instruction not to introduce a framework.** Verified with `curl`
instead, the same way every prior backend endpoint in this project has
been verified (Tasks 04–09).

**`AppShell` now owns two independent fetches — settlement and
geojson — not one.** This was flagged explicitly in the pre-approval
plan and you approved it as acceptable for this task. The GeoJSON
feature is a genuinely different resource/shape from the plain
settlement record (matching the same "different endpoint → its own
fetch, not a duplicate" principle already established for
Risk/Decision/Destination in Tasks 07B–09), not a second copy of the
same fetch. `SettlementEvidencePanel`/`KeyInsightsCard` keep reading
the original settlement fetch unchanged; only `MapLibreMap` switched
to the new `geojsonState`, dropping its old `SettlementRequestState`
prop entirely (it no longer needs the plain settlement object — the
GeoJSON feature's `properties` bag carries everything the map needs).

**Old `Marker`/`Popup`-from-hand-built-HTML-string approach replaced
by a MapLibre GeoJSON source + circle layer + symbol (text) layer**,
per the approved plan. Popup content is now built from DOM nodes and
`textContent` exclusively — never `innerHTML` with interpolated
values — per your required safeguard; verified directly by invoking
the popup-builder with a deliberately malicious `<img onerror=...>`
payload as the settlement name and confirming it rendered as inert
escaped text (`&lt;img ...&gt;`) with no script execution.

**Lifecycle safety implemented exactly per your required safeguards:**
`getSource`/`getLayer` existence checks before every `addSource`/
`addLayer` call; cleanup removes `settlement-point-label` and
`settlement-point` before `settlement-source`; `click`/`mouseenter`/
`mouseleave` listeners are registered and unregistered with the same
stable function references (`handleClick`, `handleMouseEnter`,
`handleMouseLeave`, defined once per effect run); a `cancelled` flag
guards the async `map.on("load", setupLayers)` callback so a
React-StrictMode-driven unmount-before-load can't add layers to a map
that's already being torn down.

**A second layer, `settlement-point-label`, was added alongside the
required `settlement-point` circle** — the task named `settlement-point`
as the one required layer id, but also required the point to be
"visually labelled: 'Bhitai Malli — Demo planning input'". A `circle`
layer alone can't render text, so a `symbol` layer (MapLibre's native
text rendering, no icon/sprite, no new dependency) was added to carry
that exact label via a `["concat", ["get", "name"], " — Demo planning
input"]` expression — driven live by the GeoJSON `name` property, not
a hardcoded string. Both layers share `settlement-source` and follow
the identical existence-check/cleanup-ordering pattern as the required
layer.

**WARNING — could not visually confirm on-screen pixel rendering of
the circle/label in this sandboxed headless test environment**, despite
extensive investigation. The MapLibre *state* is unambiguously correct
(`map.getSource`/`map.getLayer` confirm the source holds exactly the
Bhitai Malli feature, the circle layer has the specified paint
properties, layer order is above the raster base layer), and the same
scenario reproduces even when the layer is added manually via direct
API calls that bypass this project's code entirely — while the raster
basemap layer, going through the identical WebGL pipeline, renders and
screenshots correctly. The browser's reported WebGL renderer string in
this sandbox ("WebKit WebGL") is not what real Chromium normally
reports, pointing at a sandbox/software-rendering limitation specific
to vector (circle/symbol) layers in *this test environment*, not a
code defect — but this could not be proven with 100% certainty, so it
is reported here rather than silently assumed. Every previous task's
map work (03–09) only ever used DOM-based `Marker`/`Popup` elements,
never an actual MapLibre GL *style layer* — this is the first time
this exact rendering path has been exercised in this project, and the
first time this limitation would have had a chance to surface. Please
verify visually in a real browser before relying on this as confirmed
working; see WARNINGS/LIMITATIONS in the final report for the full
evidence trail.

## Task 12

**No boundary dataset existed anywhere in the repo — stopped and asked
before downloading anything.** The task named a specific file path
(`data/processed/static/boundaries_uk_demo.geojson`) as if it might
already exist; a repo-wide search (directory listing + glob for
`*.geojson` and any `boundaries*` path) confirmed it, and everything
else under `data/`, did not exist. Per the task's own "do not download
new external datasets unless explicitly approved" instruction, this
was surfaced to the user rather than assumed or fabricated. Approved
after presenting one concrete, verified candidate (not a vague
proposal): geoBoundaries' India ADM2 dataset, with its exact download
URL, license, and coverage confirmed live via geoBoundaries' own API
before asking for final go-ahead.

**geoBoundaries chosen over GADM.** GADM is the more commonly-cited
global admin-boundary source, but its license explicitly restricts
redistribution/commercial use without permission, which is a worse fit
for embedding a derivative directly in a repository than
geoBoundaries' ODbL-1.0-licensed data (this specific dataset's own
recorded license — see `docs/DATA_PROVENANCE.md`), which permits reuse
with attribution. Not exhaustively compared against every possible
source; chosen as a well-documented, appropriately-licensed, verifiably
real option, not asserted as the only correct choice.

**GeoPandas/Shapely/PyProj installed and pinned in
`backend/requirements.txt`, even though the running API doesn't need
them at request time.** They were required to safely filter and
reproject the raw file (735 → 13 features) during one-time data
processing. Kept installed (rather than uninstalled after use) because
they're already the project's documented GIS stack and the next GIS
data task will need them again — reinstalling for every future
Task 1X would be wasteful. `GET /api/gis/boundaries` itself just reads
the already-processed static file from disk, per the task's own "do
not introduce a database table" / "read directly from disk" guidance.

**District-level match ("Garhwal" polygon) confirmed by point-in-polygon
against Bhitai Malli's real coordinates, not by trusting the source's
name alone.** The source has no `state` field, and its own district
naming differs from common usage in two cases relevant here ("Garhwal"
for Pauri Garhwal, "Hardwar" for Haridwar) — a name-only approach would
have been guesswork. Ran `geometry.contains(Point(78.781266,
30.167112))` against all 735 source polygons; exactly one matched.
This is the strongest available evidence without an official district
boundary to cross-reference against (none exists in this repo) — see
`docs/DATA_PROVENANCE.md`'s VALIDATION STATUS for what remains
unverified (whether "Garhwal"'s polygon precisely matches Pauri
Garhwal's official gazetted extent).

**Uttarakhand's 13 districts identified by exact `shapeName` match,
cross-checked with a bounding-box spatial filter** — not a single
method trusted alone. The name list itself (Almora, Bageshwar, Chamoli,
Champawat, Dehradun, Garhwal, Hardwar, Nainital, Pithoragarh,
Rudraprayag, Tehri Garhwal, Udham Singh Nagar, Uttarkashi) is public,
well-established administrative fact — not invented — but a naive
substring search initially missed "Hardwar" (searched for "haridwar"),
caught only by the independent bounding-box cross-check surfacing all
13 names for direct comparison. Documented as a concrete example of
why a single verification method wasn't trusted.

**No properties invented on the processed/served GeoJSON — the "State:
Uttarakhand" and "Sourced GIS boundary data" text shown to the user
live only in the frontend popup-builder and UI, never written into the
GeoJSON `properties` object itself.** The backend schema
(`schemas/gis.py`) only exposes the five original source fields
(`shapeName`, `shapeISO`, `shapeID`, `shapeGroup`, `shapeType`) verbatim.
"Uttarakhand" is true of every feature in this file by construction
(it's the entire filter result), so stating it in the UI isn't a
per-feature invention — but it was deliberately kept out of the actual
data payload to avoid the appearance of a state field the source
doesn't have.

**Boundaries layer and settlement point are two independent
`useEffect`s sharing the map instance via a ref, not one combined
effect.** The task required that a failed/missing boundary fetch never
remove or block the existing Bhitai Malli marker, and vice versa. A
single effect keyed on both pieces of state would tear down and
recreate the whole map (including the settlement point) whenever
either one changed. Splitting them — `mapRef`/`popupRef` set by the
settlement effect, read by the boundaries effect — lets the boundaries
layer be added, removed, or retried entirely independently, verified
by removing the processed file mid-session and confirming the map
canvas and settlement marker were unaffected while the boundaries
layer showed its own honest error + retry.

**Boundary layers inserted with `beforeId: LAYER_ID` (the settlement
circle layer) when it already exists, falling back to no `beforeId`
otherwise** — ensures district polygons render below the settlement
point/label rather than covering it, without throwing if the boundaries
effect happens to run before the settlement layer exists yet (MapLibre
throws if `beforeId` references a layer that doesn't exist). Verified
via direct map-state inspection: layer order came out as
`osm-demo-tiles-layer, boundaries-fill, boundaries-line,
settlement-point, settlement-point-label` — exactly the intended stack.

**Fill/line colors deliberately avoid the app's safe/warning/critical
palette** (used a neutral slate-blue instead) — this layer carries no
risk/hazard information, and reusing green/amber/red here would
visually imply a status judgment about these districts that doesn't
exist. A small, separate decision from the data-honesty rules but in
the same spirit.

**Boundary status badge moved from bottom-right to top-left mid-task**,
after screenshot review showed it overlapping MapLibre's own compact
attribution control (also bottom-right by default). Caught during
verification, not assumed correct from the code alone — recorded here
since it's exactly the kind of visual-layout mistake that's easy to
make when (per Task 11's established limitation) on-screen rendering
can't be directly screenshotted for WebGL layers in this sandbox, but
DOM-positioned overlay elements like this badge *can* be verified
visually, and were.

**Same WebGL vector-layer screenshot limitation as Task 11 applies
here too** — the fill/line polygon rendering itself was verified via
direct MapLibre state inspection (source feature count, layer
registration, paint properties, z-order), not by visually confirming
pixels on screen. See `docs/DATA_PROVENANCE.md`'s VALIDATION STATUS
and the final report's WARNINGS/LIMITATIONS.

## Task 12A

**Placed the new attribution as a slim bar above the map panel, not
as another overlay badge inside it.** `MapLibreMap.tsx` already had
three overlay badges competing for the map's corners (top-left status
badge, bottom-left "Demo basemap" label, plus MapLibre's own
top-right `NavigationControl` and bottom-right attribution control).
Adding a fourth overlapping element risked the exact bug already
caught once in Task 12 (a badge landing on top of the OSM attribution
control). Instead, the component's return was restructured from a
single `relative` map container into a `flex flex-col` wrapper: a
`shrink-0` attribution bar on top, and the existing map container
below it with `min-h-0 flex-1` so it still fills all remaining space.
This satisfies the task's requirement that the element "remain visible
above the map" literally, and sidesteps every overlap constraint
(OSM attribution, Bhitai Malli marker, the existing boundary-status
badge) by construction rather than by careful z-index/positioning.

**Attribution is conditioned on the boundary layer actually being
rendered** (`feature && boundariesState.status === "success"`) — the
same condition already used for the existing "Sourced GIS boundary
data…" status badge — rather than always showing it. Attributing a
dataset that failed to load or hasn't loaded yet would misrepresent
what's actually on the map.

**Wording used verbatim from the task brief**, itself sourced only
from `docs/DATA_PROVENANCE.md`'s SOURCE table (dataset name, license,
publisher/source-organization fields) — no additional claims (no
"official", "verified", "live", or village-level language) were
added. The existing boundary-status badge inside the map (data-quality/
validation-pending wording) and this new bar (legal/source
attribution) serve different purposes and were kept as two separate
elements rather than merged, since conflating "who published this
data" with "has this application validated it" would blur an
important distinction the project has been careful to keep separate
since Task 12.

**No new dependency was added.** The attribution text is static JSX;
no tooltip/disclosure library was needed, so the task's own
conditional allowance ("only if it can be done without a new
dependency") for an expandable treatment wasn't exercised — the full
three-sentence attribution is simply always shown together, which
already satisfies the requirement to show at least the first sentence
by default.

**Verification**: TypeScript (`tsc -b`), lint (`oxlint`), and
production build all passed clean. Live-rendered the Overview page at
1366×768 via Playwright (Chromium) against the real dev server —
confirmed via DOM query that the new attribution bar's text matches
the required wording exactly, that MapLibre's own OSM attribution
control (`.maplibregl-ctrl-attrib`) is still present and visible, and
that the existing top-left boundary-status badge is still visible —
plus a full screenshot review of the resulting layout. Also re-ran the
full route regression (`#/login`, `#/`, `#/overview`,
`#/risk-analysis`, `#/decision-workspace`, `#/destination-explorer`,
`#/reports`) with zero console/page errors, since `AppShell.tsx` was
not touched but a shared layout change always warrants re-checking
nothing else regressed.

## Task 13

**No DEM/terrain raster exists anywhere in the repository** — verified
fresh (not assumed from Task 10's older finding) via a full listing of
both `data/` directories, a repo-wide filename search for
`dem`/`elevation`/`terrain`/`slope`/`cartodem`/`bhuvan`/`srtm`/`aster`,
and a repo-wide `.tif`/`.tiff` search. The only incidental hit was the
substring `dem` inside `boundaries_uk_demo.geojson`'s own filename and
its internal `"name"` property (from "demo") — not a DEM reference;
this was double-checked with `grep -n` before being written into
`docs/DATA_INVENTORY.md`, after an initial (wrong) guess that it might
be from a district name was caught and corrected rather than left in.
`rasterio` and `gdal`/`osgeo` are not installed (`backend/requirements.txt`
still only has the Task 12 additions: `geopandas`, `shapely`, `pyproj`);
confirmed by attempting to import both in the backend venv, not by
reading `requirements.txt` alone.

**Candidate DEM sources researched, not downloaded** (per the task's
explicit instruction to stop before acquiring anything). Findings
below came from live web searches/fetches against the actual portals
during this task, not from training-data recall, since exact URLs and
access terms are exactly the kind of detail this project has committed
to never guess at.

1. **Bhuvan/NRSC CartoDEM (preferred — Indian government source)**
   - Product: CartoDEM v3 (Cartosat-1 stereo-derived, "1 arc second"
     ≈30 m posting), covering all of India including Uttarakhand.
   - Organization: NRSC (National Remote Sensing Centre), ISRO.
   - Portal: `https://bhuvan-app3.nrsc.gov.in/data/download/` (Bhuvan
     Open Data Archive; confirmed live and reachable during this task).
   - Access: free, no payment; NRSC's stated open-data policy caps
     downloads at 20 tiles/day for Cartosat-1 DEM. Whether the download
     flow itself requires account registration was **not conclusively
     confirmed** — the portal's landing page didn't expose that detail
     to an automated fetch; would need to be confirmed by actually
     starting a download.
   - Reported vertical accuracy: ~8 m at 90% confidence (per NRSC's own
     published validation documents found during search).
   - Format: GeoTIFF tiles, typically distributed as 1°×1° tiles.
   - Why preferred: India-specific product from the national space
     agency, matches the task's own stated preference for an
     Indian government/official source, resolution (~30 m) is
     appropriate for a single-settlement slope/elevation read.
   - Limitations: exact current CRS/vertical-datum/nodata metadata for
     the specific Uttarakhand tile were not verified (would require
     actually downloading a tile); tile-count/coverage boundaries for
     the Bhitai Malli area not confirmed; some cited accuracy
     assessments in the literature found during search are for an
     earlier CartoDEM version (v1/v1.1R1), not necessarily v3.

2. **Copernicus DEM GLO-30, via OpenTopography (alternative — international source)**
   - Product: Copernicus Global DEM GLO-30 (2023_1 / DGED release),
     30 m resolution, a Digital *Surface* Model (includes buildings/
     vegetation, not bare-earth) derived from TanDEM-X.
   - Organization: ESA/Copernicus (data), redistributed via
     OpenTopography (`opentopography.org`) and directly by ESA.
   - Access: OpenTopography's `portal.opentopography.org` — global API
     access with a free account/API key; ESA's own direct-download
     route confirmed to exist but was not itself fetched for exact
     terms during this task.
   - Coverage: global (84°N–85°S), confirmed to include all of India.
   - CRS: horizontal WGS84 (EPSG:4326), vertical WGS84
     ellipsoid/EGM2008 geoid (EPSG:3855) — per OpenTopography's own
     published dataset metadata.
   - Format: Cloud-optimized GeoTIFF (COG).
   - License: "© DLR e.V. 2010-2014 and © Airbus Defence and Space
     GmbH 2014-2018, provided under COPERNICUS by the European Union
     and ESA" — free for general public use per Copernicus's published
     terms, attribution required.
   - Why it's a viable alternative: simpler, better-documented
     programmatic access (a REST API with a free key) than Bhuvan's
     web-portal tile-picker flow; well-documented CRS/format/license
     metadata already confirmed above (less unverified detail than
     option 1).
   - Limitations: it's a *surface* model, not bare-earth — elevation at
     Bhitai Malli would include any building/vegetation height in the
     30 m cell, a real caveat for slope-susceptibility use that would
     need to be disclosed if this source is chosen; not an Indian
     government source.

Neither source was downloaded, and no DEM file, CRS, resolution, or
metadata value for either was written into `docs/DATA_PROVENANCE.md` —
per the task's own rule, a provenance record is only created once data
is actually acquired, and inventing one ahead of that would violate
the project's data-honesty rule as much as inventing elevation values
would.

## Task 14

**Both Bhuvan and the OpenTopography/Copernicus alternative require a
personal registered account to actually download data** — confirmed
live (Bhuvan's own "steps to download" page: "Login to Bhuvan"; NRSC's
own tile-level XML metadata: `<Access_Constraints> Registered Users
</Access_Constraints>`; OpenTopography's developer docs: "API keys are
required for this API... no anonymous or keyless access tier"). This
session has no credentials for either and did not create an account or
request one on the user's behalf — account registration is a
real-world identity action outside what an agent should do
autonomously, distinct from downloading a file once access already
exists. **This was surfaced to the user via `AskUserQuestion` rather
than guessed around**, offering: manual download by the user (chosen),
switching to Copernicus with a user-supplied API key, sharing Bhuvan
credentials directly (flagged as not recommended), or stopping. The
user chose to download the Bhuvan tile manually themselves.

**`rasterio==1.5.1` installed successfully; the standalone `gdal`
(osgeo) PyPI package did not.** `pip install gdal` attempted to compile
GDAL's Python bindings from source on this Windows environment and
failed with "Microsoft Visual C++ 14.0 or greater is required."
Installing a full MSVC C++ Build Tools toolchain (several GB, a
significant and hard-to-reverse system change) was not attempted
without asking first — and turned out to be unnecessary, since
`rasterio`'s Windows wheel bundles its own statically-linked GDAL
(confirmed: `rasterio.__gdal_version__ == "3.12.4"`), which covers
every raster read/validate operation this project needs. This is
recorded in `backend/requirements.txt` as a comment rather than
silently treating the unfulfilled half of the original approval as
satisfied.

**Computed, rather than portal-verified, the target tile's expected
bounding box**, from the documented 7.5′×7.5′ Bhoonidhi/CartoDSM grid
spec found during Task 13's research: lat 30.125–30.25°N, lon
78.75–78.875°E. Task 14A's actual downloaded tile (`H44G`, a 1°×1°
CartoDEM v3 R1 tile, 78–79°E/30–31°N) turned out to be coarser-grained
than that computed sub-tile — the 7.5′ grid applies to a different,
newer NRSC product (the 2.5 m CartoDSM via Bhoonidhi), not to this 1
arc-sec CartoDEM v3 R1 product distributed via Bhuvan. The computed
box was still directionally correct (it sits entirely inside H44G's
actual extent) but is not the product's real tile granularity — noted
here so the earlier computed figure isn't mistaken for a verified one.

## Task 14A

**Reported the ZIP/folder and tile-coverage discrepancy explicitly,
per the task's own "STOP and report" instruction, rather than silently
proceeding as if all 4 downloaded items matched expectations.** Three
separate mismatches from what was expected, all confirmed by direct
inspection rather than assumed:

1. **No ZIP files exist.** The user's instructions referred to "4 ZIP
   files," but a repo-wide search found zero `.zip` files anywhere —
   what's actually present are 4 already-extracted folders. This is
   recorded as a factual correction, not treated as blocking, since
   the folders' contents could still be inspected and validated
   directly.
2. **Only 1 of the 4 items is the needed tile.** `H44G` (78–79°E,
   30–31°N) contains Bhitai Malli; `H44H` (79–80°E, 30–31°N, appearing
   3 times) and `H44N` (79–80°E, 29–30°N) do not — both are a full
   degree east of the target area. Determined by reading each tile's
   own embedded XML `<Coverage>` metadata and independently confirmed
   by opening each `.tif` with rasterio and checking its actual
   bounds — not inferred from filenames alone.
3. **`H44H` is present as three byte-identical copies** (SHA256
   `ee101bc8...` for all three: both top-level "(1)"/"(2)" folders and
   a third copy nested *inside* the `H44G` folder itself). Verified by
   computing SHA256 for every file in all 4 folders, not just the
   `.tif`s — every sibling file (`.xml`, `.shp`, `.dbf`, `.shx`,
   `.prj`, `readme.txt`, `policy.txt`) matches too. This is reported
   as an apparent accidental nested extraction/copy on the user's
   side; nothing was deleted, moved, or renamed, per the task's
   explicit instruction.

**Distinguished `readme.txt` (the actual NRSC data license/citation
terms) from `policy.txt` (the Bhuvan website's cookie/privacy policy)**
after reading both in full — they sit side-by-side in every tile
folder and could easily be conflated; only `readme.txt` is a data
license.

**Verified the DEM's own pixel value at Bhitai Malli (991 m) rather
than just checking bounds overlap**, sampling the exact raster cell
via `rasterio`'s `index()` — this happens to exactly match the
existing `elevation_m` demo value in `vikalp.db`. Recorded in
`docs/DATA_PROVENANCE.md` strictly as an observed coincidence-or-not
fact, not as proof the demo value was originally sourced from this
DEM — no evidence of that causal link was found or claimed.

**No NoData tag is set on `cdnh44g.tif`**, and no `-32768` sentinel
(the value NRSC documents for a *different*, newer CartoDSM product)
appears anywhere in this tile's actual pixel data — checked directly
via `numpy`, not assumed either way. Recorded as-is: an undeclared but
apparently gap-free tile, not resolved into a definitive nodata value
since the file itself doesn't declare one.

**Stopped exactly where instructed**: no slope calculated, no
processed output written to `data/processed/static/terrain/` (none
was necessary to validate the raw file), no API route, no map layer,
no change to the risk engine. `docs/CODEBASE_AUDIT.md` not touched.

## Task 15

**Clipped to the intersection of Pauri Garhwal's district bbox and the
one available DEM tile, rather than the full tile or an arbitrary
radius around Bhitai Malli.** The task asked for "minimum processing
necessary." A raw full-tile copy would be minimum-effort but not
minimum-necessary (it carries 5× the irrelevant area); an arbitrary
fixed-radius box around the point would be simpler code but invents a
boundary with no grounding. Reusing Pauri Garhwal's already-verified
boundary polygon (from Task 12) ties this layer to real, existing data
instead. The consequence — the clip's south/east edges land exactly on
the source tile's own physical boundary, so it does *not* cover the
whole district — is reported as a limitation, not hidden by e.g.
silently expanding the clip or fabricating a boundary that happens to
fit the one tile available.

**Slope computed with rasterio + numpy, not `gdaldem`/`osgeo`.**
`gdaldem slope` (or `osgeo.gdal.DEMProcessing`) would have been the
more standard, one-line way to do this, but the standalone `gdal`
Python package (and its CLI tools) failed to install in this
environment (Task 14 — no MSVC Build Tools), and rasterio's own Python
API doesn't expose `GDALDEMProcessing`. Rather than stopping to ask for
an unrelated new dependency, Horn's (1981) method — the same algorithm
`gdaldem slope` uses internally by default — was implemented directly
with `numpy`, which was already a transitive dependency of the
already-approved/installed stack (`rasterio`/`geopandas` both depend
on it). This is a documented, standard, textbook algorithm, not an
invented one; the exact formula and edge handling are written out in
full in `docs/DATA_PROVENANCE.md` so the method is auditable rather
than a black box.

**Used a single reference-latitude spherical approximation
(111,320 m/degree × cos(lat)) for the degrees-to-meters conversion,
not a per-row-varying ellipsoidal formula, and not `pyproj`.** `pyproj`
is in the approved stack and could compute geodesic distances more
precisely, but the source DEM's own accuracy (~8 m LE90) doesn't
justify that precision, and the clip's latitude range is narrow enough
(~0.26°) that the simplification's error is under 0.3%. Recorded
explicitly as a simplification with a stated numeric justification,
not silently assumed adequate.

**Reported the elevation/slope agreement pattern exactly as found,
without adjusting either value to match.** DEM-derived elevation at
Bhitai Malli (991 m) exactly matches the existing demo `elevation_m`
scalar (a fact first noticed in Task 14A); DEM-derived slope (22.58°)
does **not** match the existing demo `slope_degrees` scalar (18.91°).
Per the task's explicit instruction, `vikalp.db` was not touched, and
no attempt was made to explain away the mismatch — it's recorded in
`docs/DATA_PROVENANCE.md` and `docs/DATA_INVENTORY.md` as an open,
unresolved discrepancy for a future task to decide how to handle (e.g.
which value the risk engine should eventually trust, if either).

**Edge-padding simplification recorded as a limitation rather than
silently fixed.** The 3×3 slope kernel's edge pixels were filled via
1-pixel edge-value replication on the *extracted clip array*, even at
the two edges (west/north) where genuine neighboring source-tile
pixels actually exist but weren't read. This was a deliberate
scope/time tradeoff for this task, explicitly written up rather than
presented as fully rigorous — and doesn't affect Bhitai Malli, which
sits well inside the clip's interior (row 325 of 927, column 2076 of
2863).

Verification: re-ran frontend `tsc -b`/lint/build and backend
compile/health/API regression checks after this task's changes (all
touched only `data/processed/static/terrain/` and documentation) —
all passed, confirming no unrelated functionality was affected.

## Task 16

**Recorded candidate sources in `docs/DATA_INVENTORY.md`, not
`docs/DATA_PROVENANCE.md`** — following the same precedent set in
Task 13 (DEM candidates were listed in the inventory/decisions docs,
not given a provenance record, since provenance is only written once
data is actually acquired). Nothing was downloaded in this task, so no
provenance entry was created for any hazard source.

**Distinguished "discovered" from "accessible" from "downloaded" from
"validated" throughout**, per the task's explicit rule 18 — several
sources found via web search could not be independently confirmed by
directly fetching their own pages this session (`bhukosh.gsi.gov.in`
returned a connection error; two specific `usdma.uk.gov.in` sub-page
URLs returned 404), and those are recorded as unconfirmed rather than
presented with the same confidence as sources that were directly
reached and read (NDMA's two atlas pages, IMD Pune's rainfall page,
Bhuvan's landslide disaster-service page, USDMA's document-category
listing).

**Reported a negative finding plainly rather than omitting it**: NDMA's
Flood Hazard Atlas collection explicitly does not include Uttarakhand
(only AP, Bihar, UP, Odisha, West Bengal) — directly confirmed from
the page's own listing, not inferred. Combined with no other confirmed
Uttarakhand flood-hazard GIS source, this task's §7.6 recommends
treating flood hazard as OPTIONAL/FUTURE for this pilot rather than
forcing a lower-quality substitute into the evidence matrix just to
have "something" for that hazard type.

**Did not conflate rainfall data with hazard evidence**, per the
task's explicit instruction. IMD's gridded rainfall dataset is
recorded as a candidate for the "SHOULD HAVE" rainfall/precipitation
row, separate from and explicitly not substituting for the
"Hazard Exposure" dimension's `flood_hazard_class`/
`cloudburst_hazard_class` missing inputs. Also confirmed and recorded
that no Open-Meteo (or any other weather API) integration exists
anywhere in the repository — this had been referenced only as a
possibility to check, not something previously built, and the audit
found nothing to distinguish from hazard data in the first place.

**Flagged the NetCDF format gap rather than silently assuming
`rasterio` could handle it.** IMD's rainfall data is distributed as
NetCDF; `rasterio` bundles GDAL, which does have a NetCDF driver, but
this was not tested, and a dedicated library (`netCDF4`/`xarray`) is
the more common tool for this format — recorded as an open stack
question for whoever scopes an eventual rainfall-acquisition task,
not resolved or assumed here.

**Confirmed the Terrain/Physical Susceptibility dimension still reads
only the Task 07B database scalars, not the Task 14/15 DEM-derived
raster**, by reading `risk.py` directly rather than assuming the two
were already connected just because both now exist in the repo. This
is an accurate "as-is" finding, not a criticism — connecting them
was never in scope for Tasks 14/15/16.

No dataset was downloaded, modified, processed, or connected to
anything in this task. Verification: re-ran frontend `tsc -b`/
lint/build and backend compile/health/API regression checks — all
passed unchanged, since this task touched documentation only.

## Task 17

**Queried Bhuvan's public WMS service directly rather than relying on
secondary sources**, since Task 16's characterization of Bhuvan (based
entirely on search-result summaries) was a much weaker form of
evidence than actually calling the live service. Fetched
`GetCapabilities` from `https://bhuvan-vec2.nrsc.gov.in/bhuvan/wms`
(a 5 MB response, 9,141 layers) with no login/API key, and found real
Uttarakhand-specific landslide layers under the `disaster:` workspace
(`UK_SLIM_2014_GCS`, `UK_SLIM_2017`, `LS_UTTARAKHAND_2023`,
`ls_Uttarakhand_2014_SLIM`), plus a route-corridor hazard-zonation
layer (`RIRUCHBA_LHZ_01`). This is a materially stronger finding than
Task 16's, and `docs/DATA_INVENTORY.md`'s Bhuvan candidate row was
updated to reflect it rather than left stating the older, weaker
characterization.

**Verified Bhitai Malli coverage using each layer's own
`<LatLonBoundingBox>` from the live capabilities response, not by
inference from India/state-wide availability** — directly satisfying
the task's coverage rule. Bhitai Malli's coordinates (78.781266,
30.167112) fall inside the bounding box of `UK_SLIM_2014_GCS`,
`UK_SLIM_2017`, `LS_UTTARAKHAND_2023`, `ls_Uttarakhand_2014_SLIM`, and
`RIRUCHBA_LHZ_01`; a sixth candidate, `nainital_L_Oct_2021_GCS`, was
checked and confirmed to **not** cover Bhitai Malli (its bbox sits
further east, over Nainital district) — reported as a negative result
rather than omitted. Nine other `*_LHZ_01`-suffixed route-corridor
tiles were also bbox-checked; only `RIRUCHBA_LHZ_01` contains Bhitai
Malli, the rest do not (recorded, not hidden).

**Went one step further than a bbox check: ran live `GetFeatureInfo`
point-queries at Bhitai Malli's exact coordinates** against
`UK_SLIM_2017`, `LS_UTTARAKHAND_2023`, and `RIRUCHBA_LHZ_01`. All
three returned "no features were found" — a real, honest,
non-alarming result (these are sparse inventory/zonation layers; most
of any bbox legitimately has no mapped feature) — reported exactly as
returned, not interpreted as either "the source is broken" or "the
settlement has no hazard." This is explicitly a bounding-box coverage
finding, not a feature-level one; the task's own coverage rule is
respected by stating this distinction rather than blurring it.
Querying `GetFeatureInfo` (a tiny attribute lookup, not a file
download) was judged consistent with "source investigation and
coverage verification" and not a dataset acquisition — no response
content was saved as a project asset.

**Confirmed GSI Bhukosh remains unreachable from this environment** —
`bhukosh.gsi.gov.in` returned a connection error again (same failure
as Task 16, now reproduced twice, strengthening confidence this is a
real network-level block rather than a one-off). **Additionally found
that NGDR (`geodataindia.gov.in`) redirects immediately to `/login`**
— a harder access wall than Bhuvan's (login required for the entire
portal, not just for downloads). This further supports prioritizing
Bhuvan, consistent with the task's own first/second-priority
structure.

**Recommendation**: Bhuvan's public `disaster:` WMS workspace,
specifically `UK_SLIM_2017` (most recent confirmed seasonal inventory)
and `RIRUCHBA_LHZ_01` (the one route-corridor hazard-zonation tile
confirmed to cover Bhitai Malli's bounding box) as the two most
relevant specific layers — not yet acquired, pending explicit
approval. Noted as an open technical question for whenever acquisition
is approved: MapLibre GL JS can generally consume a WMS endpoint as a
raster tile source, but this hasn't been tested in VIKALP, and whether
a sibling WFS exists (for true vector/GeoJSON export, matching the
existing boundaries-layer pattern from Task 12) was not checked in
this task — both are acquisition-task questions, not resolved here.

No landslide data was downloaded or modified. Verification: re-ran
frontend `tsc -b`/lint/build and backend compile/health/API regression
checks — all passed unchanged, since this task touched documentation
only (`docs/DATA_INVENTORY.md`, `docs/DECISIONS.md`, `README.md`).

## Task 18

**Approved source**: Bhuvan's public disaster WMS
(`https://bhuvan-vec2.nrsc.gov.in/bhuvan/wms`), layers
`disaster:UK_SLIM_2017` and `disaster:RIRUCHBA_LHZ_01` — selected in
Task 17 as the only candidate confirmed both authoritative and
accessible without login, with Bhitai-Malli-bbox coverage verified
directly from the live service.

**Confirmed WFS is disabled before attempting anything else**, exactly
as the task instructed ("FIRST investigate whether... a usable
WFS/GeoJSON/vector endpoint"). Queried `service=WFS&request=
GetCapabilities` at both `/bhuvan/wfs` and `/bhuvan/ows`; both returned
the server's own explicit error "Service WFS is disabled." This is a
definitive, server-stated fact, not an inference from a timeout or
404 — there is no ambiguity about whether a vector download path
exists for this service.

**Stopped at a small, fixed number of `GetFeatureInfo` queries rather
than searching for a hit.** With WFS unavailable, `GetFeatureInfo` was
the only remaining interface. The task explicitly forbids "a brittle
scraping workaround" if the proper endpoint can't supply the data. Five
point-queries were made in total across this task and Task 17 (Bhitai
Malli × 2 layers, plus each layer's bbox center × 2, plus a repeat of
the Task 17 Bhitai Malli query) — a small, bounded, purposeful set to
(a) satisfy the task's own required Bhitai Malli test and (b) make one
reasonable attempt to retrieve an example feature for schema
documentation. All five returned byte-identical empty
`<wfs:FeatureCollection>` responses. Rather than iterating a grid
search until something returned a feature — which would cross into
exactly the forbidden scraping behavior — this was reported as a
limitation: no feature-level geometry or attribute was obtainable from
either layer in this session, full stop.

**Distinguished "bounding-box coverage" from "feature intersection"
throughout**, per the task's explicit warning that Task 17 verified
only the former. `docs/DATA_PROVENANCE.md`'s HAZARDS section states
plainly, for both layers: "No feature intersection verified at Bhitai
Malli" — and adds that this null result does not itself imply the
settlement is unaffected, since no feature was retrieved anywhere in
either layer to compare against, not even at a non-Bhitai-Malli sample
point. Avoided the opposite failure mode too — not treating "bbox
covers the settlement" as if it were "the settlement is landslide
country," per the task's explicit prohibition on assuming Bhitai Malli
is affected.

**What was actually saved to `data/raw/static/hazards/`** is service
metadata (two `<Layer>` blocks with real CRS/bbox/title, one of which
revealed `RIRUCHBA_LHZ_01`'s full identity as the
Rishikesh–Rudraprayag–Chamoli–Badrinath pilgrimage-corridor LHZ tile)
plus four empty `GetFeatureInfo` GML responses and a `SOURCE.txt`
sidecar — not a conventional GIS dataset. This was a deliberate,
disclosed choice: saving *something* honestly labeled as "here's
exactly what the proper endpoints returned, including their
limitations" was judged better than saving nothing, and clearly better
than fabricating placeholder geometries to make the acquisition look
more complete than it is.

**No processed output was created** — `data/processed/static/hazards/`
does not exist. There is nothing to clip, reproject, or reduce; the
raw metadata/query files already are the full extent of what was
obtainable.

**Explicitly did not connect anything to `risk.py`** — confirmed by
not touching that file at all this task (verified via the unchanged
backend compile/API regression results below), consistent with the
task's repeated instruction not to integrate, score, or classify this
data yet.

Verification: re-ran frontend `tsc -b`/lint/build and backend
compile/health/API regression checks — all passed unchanged, since
this task touched only `data/raw/static/hazards/` (new files) and
documentation.

## Task 19

**Went past the rendered HTML to find the portal's real backend**,
since static page fetches of `bhusanket.gsi.gov.in` mostly returned
"Unable to fetch data from the server" placeholders (a JS-rendered
Esri ArcGIS SPA, confirmed by finding `js.arcgis.com/4.29` in the page
source). Fetched the site's own `json/config.json` directly — a
legitimate, publicly served static file, not a bypass of anything —
which listed every real ArcGIS Server REST service URL the map viewer
itself uses. This is the same category of technique as Task 18's use
of `GetCapabilities` to find real layer names instead of guessing:
reading the service's own configuration rather than assuming.

**Tested every discovered service's actual access level directly**
rather than assuming "found a URL" meant "found accessible data."
Three services (`Hosted/India_All_Landslided`, `GSI/Landslide_Polygon`,
`GSI/Susceptibility/ImageServer` — the last being the Task 19 SPECIAL
PRIORITY NLSM target) all returned the identical, unambiguous
ArcGIS error `{"code":499,"message":"Token Required"}`. This is
reported as a confirmed, specific blocker (an authentication wall),
not a vague "couldn't access it."

**Found one genuinely public, genuinely useful service**
(`Hosted/Public_Portal_Dashboard_Map/FeatureServer/0`,
"Landslide_Public") by working through the ArcGIS folder listing
(`/gisserver/rest/services?f=json`, itself public) rather than
stopping once the first three attempts hit a token wall. This is the
field-validated landslide inventory — 31,545 India-wide records,
5,217 in Uttarakhand, 569 in Pauri Garhwal district, all confirmed via
live `returnCountOnly=true` queries against the real service, not
estimated or read off a report.

**Ran the required Bhitai Malli coverage test as a real spatial query,
not a bounding-box check**, using the service's own `query` endpoint
with `geometryType=esriGeometryEnvelope` centered exactly on
(78.781266, 30.167112). A ±0.01° (~1.1 km) query returned zero
features — reported per the task's required exact wording, "Feature
intersection at Bhitai Malli not verified." A second, explicitly
separate ±0.05° (~5.5 km) query (clearly labeled as proximity context,
not a coverage claim) surfaced 28 nearby records, giving a genuine,
quantified sense of how close the nearest known evidence is (roughly
2–3 km) without overstating what was found at the settlement itself.

**Did not chase the "Impact Probability Map" or "LSM 10K" products
further once the config.json and folder-listing approach stopped
surfacing new public URLs for them** — both are reported as
"mentioned on the portal, not confirmed accessible," rather than
guessed at or assumed to share the Susceptibility ImageServer's
(inaccessible) status without evidence. This is a deliberate stopping
point, not an oversight — the task's own decision tree treats
"cannot confirm" as a valid, reportable outcome distinct from either
"confirmed available" or "confirmed unavailable."

**Recommended the Landslide_Public inventory over the higher-authority
but inaccessible NLSM susceptibility raster**, since a dataset that
cannot currently be reached has no acquisition path today, while the
inventory layer's exact `query` URL, format, and access method are
already fully known and immediately actionable if approved. The NLSM
raster is recorded as the better long-term source *if* GSI grants
token access in the future — not discarded, just correctly ranked
behind what's actually usable now.

No file was written to `data/` this task — every query above was a
read-only HTTPS request whose response was inspected and discarded
(saved only to this session's local scratch area, outside the
repository), per the task's "investigation only, do not download yet"
instruction. Documentation was touched (`docs/DATA_INVENTORY.md`,
`docs/DECISIONS.md`, `README.md`), so per the task's own "run existing
verification only if documentation/code was touched" instruction, the
full frontend/backend verification suite was re-run anyway, even
though no application code changed — see the final report for
results.

## Task 20

**Discovered the `district` field's real inconsistency before
choosing a query strategy, rather than trusting the obvious attribute
filter.** A first check (`district='Pauri Garhwal'`) returned 569
records. Before treating that as final, the records nearest to Bhitai
Malli from Task 19's own proximity test were re-examined — they were
labeled `district="Garhwal"`, not `"Pauri Garhwal"`. A distinct-values
query confirmed three separate labels exist in this data:
`"Garhwal"` (256 India-wide), `"Pauri Garhwal"` (569), and `"Tehri
Garhwal"` (a genuinely different, neighboring district). Trusting the
attribute field alone would have silently excluded genuinely local
records — exactly the kind of silent gap this project's data-honesty
standard exists to catch.

**Tried a bounding-box spatial filter next, and rejected it too.** The
same Pauri Garhwal bbox used in Task 15 for the DEM clip returned
1,073 records — but a distinct-values check showed these spanned
eight different districts (Almora, Chamoli, Dehradun, Garhwal,
Nainital, Pauri Garhwal, Tehri Garhwal, Uttarkashi), because Pauri
Garhwal's actual shape is irregular relative to its bounding
rectangle. A bbox was the right tool for Task 15's raster clip (which
only needed to intersect one tile and had no risk of "wrong district"
false positives at that scale); it was the wrong tool here, where
false-positive neighboring-district records were exactly the failure
mode to avoid.

**Used the exact Pauri Garhwal polygon instead, sent via HTTP POST.**
The district polygon already exists in this repo
(`boundaries_uk_demo.geojson`, from Task 12) and was extracted with
GeoPandas (already-approved, already-installed — no new dependency),
converted to Esri JSON ring format, and submitted as the query
geometry. The resulting ~10 KB geometry parameter is too large for a
practical GET URL, so the request was made via POST to the same
official `/query` endpoint — the standard, documented way Esri REST
services accept large geometries, not a scraping workaround or an
unofficial access path. This returned 813 records: fewer than the
bbox's 1,073 (correctly excluding true outsiders) and more than the
attribute filter's 569 (correctly including the mislabeled-but-local
"Garhwal" records) — the intersection of both problems' fixes.

**Reported the residual imprecision rather than presenting 813 as a
clean number.** Even the exact-polygon result still contains 35
records labeled with a neighboring district (Almora 30, Uttarkashi 3,
Tehri Garhwal 1, Chamoli 1) that geometrically fall inside Pauri
Garhwal's polygon — most plausibly GPS/coordinate imprecision in GSI's
own source data. These were not excluded (the polygon test is the
authoritative spatial fact; the district label is presented as
unreliable, not the other way around) and not silently absorbed into
"813 Pauri Garhwal records" without the caveat — both the count and
the caveat are recorded together in `docs/DATA_PROVENANCE.md`.

**Confirmed "No GSI inventory feature intersects the Bhitai Malli
point" directly against the downloaded file**, not by re-trusting
Task 19's single WMS-style API query. Every one of the 813 features'
coordinates was checked by exact match and by haversine distance
against Bhitai Malli's unmodified coordinates — zero exact matches,
zero within 1 km, 21 within 5 km, nearest at 2.04 km. This matches
Task 19's live-query finding but is now independently re-derived from
the actual acquired file, which is the artifact future tasks will
actually use.

**Did not pick or suggest a proximity radius for any future VIKALP
risk-scoring use**, per the task's explicit instruction. The 1 km and
5 km figures reported here are investigative/descriptive choices for
*this report*, not a proposed threshold — that decision is explicitly
left for a future, separately-approved task.

**Did not touch `risk.py`, the frontend, or any existing API** — this
task only added two files under `data/raw/static/hazards/` (the
GeoJSON and its `SOURCE_*.txt` sidecar, distinctly named so as not to
collide with Task 18's existing `SOURCE.txt`) plus documentation.

Verification: re-ran frontend `tsc -b`/lint/build and backend
compile/health/API regression checks — all passed unchanged.

## Task 21 — Hazard Exposure scoring design (design only, not implemented)

**No code was changed for this task** — `risk.py` was not touched;
this is a design record only, per the task's own explicit "STOP after
producing the design report" / "DO NOT IMPLEMENT" instructions. All
findings below come from direct inspection of the actual acquired file
(`data/raw/static/hazards/gsi_nlfc_field_validated_landslides_pauri_garhwal.geojson`,
Task 20), not from assumptions about what the 134 fields probably mean.

### 1. Dataset field audit (all 813 records, all 134 fields inspected)

Fully populated (100%) and **actually informative**: `district`,
`latitude`/`longitude`, `state`, `toposheet`, `slide_no`, `objectid`,
`globalid`, `material_t`, `movement_t`, `length`/`width`/`height`/
`depth`/`ls_area`/`ls_volume` (numeric dimensions).

Fully populated but **NOT informative** — a critical distinction
caught only by inspecting actual values, not null-rates:
`initiation` is "100% populated" but 810/813 (99.6%) of its values are
the literal placeholder `0`; only 3 records carry a real year.
`reactiva_1`/`reactiva_2` are 100% populated and 100% equal to `0` —
carry no information at all.

Near-fully populated (95–99.6%) and genuinely useful:
`activity` (99.6%; Active 640, Reactivated 120, Suspended 19, Dormant
19, Stabilized 10, Abandoned 2), `distributi`, `style`, `geomorphol`,
`hydrologic`, `failure_me` — all describe the *specific mapped
landslide's* own geotechnical character.

Moderately populated (70–94%): `geoscienti`, `pre_remedi`,
`triggering` (82.7%; of the populated values, essentially all mention
rainfall — "Rainfall" 639, "Heavy rainfall" 15, rainfall+other-cause
combinations 18 — i.e. **no meaningful variety**, it is rainfall or
unpopulated), `landuse_la`, `movement_r`, `geology`.

A genuinely useful but *better-hidden* date field: `initiati_1` (100%
"populated" but 657/813 = `0`; the remaining 156 carry real years,
1986–2018) and `reactivati` (nearly identical distribution) — these
are the actual usable recency fields, not `initiation`. None of the
21 records nearest Bhitai Malli have a real year in either field (all
`0`) — recency evidence is unavailable for the specific cluster
closest to the pilot settlement even though it exists elsewhere in
the dataset.

Sparse and unusable as-is: `abstract`/`structure`/`image_land`
(nominally 20–27% "populated" but almost entirely the placeholder
string `"0"`, not real content); `alert` (13.2% populated, values
"III"/"II" — an apparent internal GSI severity code, but with no
definition available in the retrieved metadata, so its polarity
(is III worse than II, or the reverse?) cannot be determined from the
source alone); `slide_name` (8.6%, free text, no structure).

Essentially empty in this Pauri-Garhwal-scoped extract (0–0.4%):
**every casualty/damage field** — `peopledead`, `peopleinju`,
`housesbuil`, `infrastruc`, `othersaffe`, `people_aff`, `persons_de`,
`livestockd`/`livestocki`/`livestock_` — and every date field except
`initiati_1`/`reactivati` (`date`, `date_acc`, `date_and_t`,
`datetimety`, `exactdatei`, `history_da` are all 0% populated), plus
`village`, `source`, `vulnerabil`, `photos`, most media/report fields.
79 of the 134 fields are 0% populated in this extract.

A concrete, source-grounded fact that materially shapes the proximity
design below: the `runout_dis` field (documented landslide runout
distance) has 71 non-zero values across all 813 records, ranging
5–200 m, **median 30 m**. Units are not explicitly stated in the
retrieved field metadata, but the magnitude is consistent with meters
(standard for this measurement in landslide science) — noted as an
inference from value scale, not a confirmed unit declaration.

### 2–3. Recommended evidence fields vs. excluded fields

**Recommended for scoring** (deliberately small, per the task's
"prefer a small number of strong, defensible evidence components"):
- Point geometry (`latitude`/`longitude`) — for distance calculation.
- `activity` of the nearest/contributing record(s) — as a bounded
  *modifier*, not an independent component (see §7).
- Record count within a small, capped radius — as a bounded density
  *modifier* (see §6).

**Recommended for explainability/display only, never scoring**:
`triggering`, `slide_no`, `toposheet`, `movement_t`, `geology`,
`material_t`, `runout_dis`, `initiati_1`/`reactivati` (when
populated), `district` (already used only for acquisition scoping,
Task 20).

**Excluded entirely, with reasons**:
- `initiation` — nominally complete but 99.6% placeholder zeros; using
  it would be indistinguishable from fabricating a year for almost
  every record.
- `reactiva_1`/`reactiva_2` — 100% zero, zero information content.
- `abstract`/`structure`/`image_land` — nominally populated but
  overwhelmingly placeholder `"0"` strings.
- `alert` — too sparse (13.2%) and its "III"/"II" scale has no
  confirmed definition in anything retrieved from the source; using
  it would require guessing its polarity, which the task explicitly
  forbids ("do not infer field meanings beyond what source
  metadata/values support").
- All casualty/damage fields — 0% populated in this extract; the
  question is moot for now (see §10).
- All date fields except `initiati_1`/`reactivati` — 0% populated.
- `village`, `source`, `vulnerabil`, `photos`, most report/media
  fields — effectively empty in this extract.
- `geoscienti`, `pre_remedi`, `remarks`, `citation`,
  `nh_sh_loca` — free text, useful for officer-facing display/citation
  only, not structured enough to score.
- `distributi`/`style`/`geomorphol`/`hydrologic`/`failure_me`/
  `landuse_la`/`movement_r` — real, well-populated geotechnical
  descriptors of the *specific mapped landslide*, but converting them
  into a hazard-magnitude contribution would require geotechnical
  domain expertise and an authoritative weighting scheme that does not
  exist; recommend display-only for now rather than an invented
  weighting.

### 4. Proposed methodology — overview

A record-proximity-based sub-score for Hazard Exposure's landslide
evidence, computed only when qualifying evidence exists, otherwise
explicitly "Assessment Pending" (never a fabricated or defaulted
number). The whole method is a **VIKALP prototype policy
configuration** — no step below is an official GSI/NDMA standard.

**Step 1 — Evidence collection.** Query the acquired inventory for
records within a *scoring radius* around the settlement point.

**Step 2 — Minimum evidence gate.** If zero records fall within the
scoring radius → the landslide sub-component of Hazard Exposure is
`status: "no_evidence_found"`, **not** a numeric score, **not**
treated as "safe" (§11). Stop here for this settlement.

**Step 3 — If evidence exists**, compute:
`raw_score = proximity_base(nearest_distance) × activity_modifier(nearest_record.activity)`
then add a capped `+ density_modifier(count_in_radius)`, then
`final = clamp(raw_score, 0, 100)`.

### 5. Proposed distance/proximity treatment

**Recommended scoring radius: 1 km** ("immediate vicinity"), not the
5 km figure used for general contextual reporting since Task 19–20.
Reasoning, grounded in the source data itself rather than an arbitrary
round number:
- The dataset's own `runout_dis` field — the closest thing to an
  official "zone of physical effect" measurement GSI records for these
  events — tops out at 200 m and has a median of 30 m across all 813
  records. A 1 km scoring radius is already generous relative to what
  the source's own runout measurements suggest a landslide's direct
  physical reach typically is.
- No official Indian government buffer/influence-radius standard for
  landslide-inventory-to-settlement scoring was found in this or prior
  tasks' research (Tasks 16–19) to cite instead.
- 1 km is also the radius already used for "direct/immediate" spatial
  language elsewhere in this project's reporting (Tasks 19–20),
  keeping the design internally consistent rather than inventing a new
  number.

Within that 1 km radius, propose three simple, monotonic bands (linear
interpolation within each, for an auditable but non-cliff-edged
curve) — **all VIKALP prototype policy configuration**:
- 0–200 m ("at or essentially coincident with a mapped event"): base
  score 80–100.
- 200–600 m ("very near"): base score 50–79.
- 600 m–1 km ("near"): base score 20–49.
- Beyond 1 km: not scored (Step 2's gate — see below for why the
  1–5 km band is context-only, not a fourth scoring band).

**Records between 1 km and 5 km are explicitly treated as
non-scoring context, not a lower-weight band.** This was a genuine
design choice, not an oversight: landslide occurrence is highly
location-specific (slope, aspect, drainage, and local geology at the
*exact* point matter — which is exactly why Task 15's own DEM-derived
slope for Bhitai Malli lives in the Terrain dimension, not here). A
mapped event 2–5 km away establishes regional landslide-prone terrain
context, which is valuable for an officer to see, but does not
reliably indicate hazard at this specific settlement's point the way
a within-1-km record would. This directly follows the task's repeated
caution against turning "nearby" into a risk conclusion. A future task
could propose extending the scored radius if a technically justified
methodology (e.g. citing an official zone-of-influence standard, or a
slope/runout model) is developed and separately approved — not done
here.

### 6. Proposed density treatment

Density (count of records within a radius) and proximity (distance to
nearest record) are **not independent evidence** — a cluster close to
a settlement will always also produce a short nearest-distance value,
so scoring both at full weight would double-count the same underlying
spatial fact. Proposed handling: density contributes only as a small,
**capped, secondary modifier** on top of the proximity base score —
e.g. `+5` (of 100) if the count within the 1 km scoring radius is
`≥ 5`, applied only after Step 2's gate has already been passed (i.e.
it can never turn a "no evidence" case into a scored one by itself).

An additional caution surfaced by inspecting the actual nearby
records: all 21 records within 5 km of Bhitai Malli share sequential
`slide_no` values from apparently one 2015 mapping campaign along a
single corridor/toposheet (`53J16`/`53J12`). A high local count may
reflect **survey effort along one road/route in one campaign year**
rather than independently-occurring events — density should be
labeled to the officer as "documented record count," not "landslide
frequency," to avoid implying more independent evidence than exists.

### 7. Activity/status treatment

`activity` (Active/Reactivated/Suspended/Dormant/Stabilized/
Abandoned, 99.6% populated) describes the *current status of the
specific nearest record*, not the settlement. Proposed: a bounded
**multiplicative modifier** on the proximity base score of the nearest
qualifying record only (not summed across all nearby records, to
avoid re-weighting the same spatial fact repeatedly) — e.g. `×1.1`
(capped at 100) if Active/Reactivated, `×0.85` if
Suspended/Dormant/Stabilized/Abandoned, `×1.0` (no change) if the
field is unpopulated for that record (never fabricated). VIKALP
policy configuration; no official source ties these specific
multipliers to hazard magnitude.

### 8. Trigger treatment

**Recommend explicitly excluding `triggering` from the numeric
score.** Two independent reasons, both grounded in what was actually
found: (a) 95%+ of populated values mention rainfall in some form — the
field has almost no discriminating variety within this dataset, so
using it wouldn't distinguish anything; (b) scoring it would risk
double-counting against a **future rainfall/precipitation dataset**
(already flagged as a "SHOULD HAVE" gap in Task 16) — that dataset
would properly own "current/forecast rainfall exposure," while this
field only restates the historical cause of a past, already-scored
event. `triggering` is retained as **display-only context** ("nearby
recorded landslides were predominantly rainfall-triggered").

### 9. Recency treatment

**Recommend excluding recency from the numeric score in this initial
design**, while keeping it visible as an informational flag when
present. Two reasons: the more reliable year field (`initiati_1`) is
still 81% unpopulated overall, and — decisively — **none of the 21
records nearest Bhitai Malli carry a real year at all** (all `initiati_1`/
`reactivati` = 0 for that specific cluster), so a recency modifier
would have zero effect on the one case this task must dry-run anyway.
Recommend revisiting recency as a modifier only if/when its
completeness improves or a specific record with reliable date evidence
becomes locally relevant.

### 10. Casualty/damage treatment

**Not usable at all right now — 0% populated for every casualty/damage
field in this Pauri-Garhwal-scoped extract.** The question is
currently moot. If a future data refresh populates these fields,
recommend assigning them to **Historical Disaster Evidence**, not
Hazard Exposure: casualty/damage describes the *severity of a past
incident's impact*, which matches Historical Disaster Evidence's
existing `past_incident_severity` missing-input (already named in
`risk.py` since Task 07B) far more directly than Hazard Exposure's
physical-susceptibility framing. Recording this assignment now, before
any data exists to populate it, is meant to prevent a future task from
accidentally scoring the same casualty fact in both dimensions.

### 11. Inventory-bias handling

**This is the central caveat the whole design depends on.** A
field-validated inventory contains only mapped/reported/validated
events — it is a record of documentation effort, not a complete census
of every slope that has ever failed or could fail. Zero records within
a settlement's scoring radius means "no event has been documented and
mapped there in this dataset," never "this location is safe from
landslide hazard." The design enforces this in two ways: (a) the
Step 2 gate returns `"no_evidence_found"` rather than a low/zero
numeric score when nothing is found nearby — a `0` on a 0–100 scale
would look like a *confirmed low-hazard finding*, which is exactly the
false conclusion this must avoid; (b) any future officer-facing
explainability output must carry this disclaimer verbatim wherever the
landslide-inventory evidence is shown, scored or not.

### 12. Missing-data handling

- **No nearby records at all** → `"no_evidence_found"`, not a score
  (§11). This is Bhitai Malli's actual case at 1 km — see §15.
- **Source attributes missing for a contributing record** (e.g.
  `activity` unpopulated for that specific record, true for 3/813) →
  skip that modifier for that record only (`×1.0`, neutral); never
  fabricate a value.
- **Dates missing** → recency stays excluded from scoring per §9;
  never defaulted to "old" or "recent."
- **Geometry unavailable** → not applicable to this file (all 813
  records have valid coordinates), but if it occurred, that record
  would be excluded from distance calculations entirely, not treated
  as distance-zero or distance-infinite.
- **Settlement falls outside the inventory's covered extent entirely**
  (a different situation from "zero records found in a covered area")
  → should be labeled distinctly, e.g. `"not_covered"`, not conflated
  with `"no_evidence_found"` — an officer needs to know whether nobody
  has recorded a landslide near them versus whether this dataset
  simply doesn't reach their area at all. Not Bhitai Malli's case
  (it's inside the acquired Pauri Garhwal extent).

### 13. Double-counting analysis

| Pair | Risk | How this design avoids it |
|---|---|---|
| Proximity vs. density | Both come from the same spatial query; a close record and a nearby cluster are correlated, not independent | Density is a small, capped secondary modifier on the proximity base, not an independently-weighted component |
| Proximity vs. activity | None — different evidence (where vs. current status) | Activity applied as a bounded multiplier on the *already-computed* proximity score for the nearest record only, not summed separately |
| Proximity vs. recency | Could double-emphasize "this specific nearby record" twice | Recency excluded from scoring entirely in this design (§9) |
| Historical triggering vs. a future rainfall/precipitation dataset | A future weather dataset would properly own current/forecast rainfall exposure; scoring historical `triggering` too would count rainfall's role twice, once historically and once prospectively | `triggering` excluded from scoring, display-only (§8) |
| Casualty/damage vs. Historical Disaster Evidence | Same underlying fact (a past event's severity) could be scored in two dimensions | Explicitly assigned to Historical Disaster Evidence, not Hazard Exposure, before any implementation happens (§10) |

### 14. 0–100 scoring method (summary)

```
if count_within_1km == 0:
    return {"status": "no_evidence_found", "score": None}

nearest = closest record within 1 km
base = proximity_band(nearest.distance_km)      # 20-49 / 50-79 / 80-100, linear within band
activity_mod = activity_multiplier(nearest.activity)   # 0.85 / 1.0 / 1.1
density_mod = +5 if count_within_1km >= 5 else 0
score = clamp(base * activity_mod + density_mod, 0, 100)
return {"status": "scored", "score": score, "evidence": {...}}
```

Deterministic, reproducible, auditable by hand from the same 3 numbers
(nearest distance, nearest activity, count within 1 km) an officer can
see directly. No machine learning, no hidden weighting.

### 15. Bhitai Malli dry-run (design demonstration only — not executed against the live system)

Facts, stated plainly, exactly as found:
- 0 direct intersections (exact-coordinate match).
- **0 records within 1 km** — the proposed scoring radius.
- 21 records within 5 km — contextual only under this design, not
  scored.
- Nearest record: 2.04 km away (`slide_no` UK/GAR/53J16/2015/1103,
  `activity` Active, `triggering` Rainfall, `movement_t` Slide) — this
  falls *outside* the 1 km scoring radius, so even though it is the
  single nearest piece of evidence, it does not qualify for scoring
  under this design.

**Applying the proposed rule: Step 2's gate is not satisfied (zero
records within 1 km) → result = "Assessment Pending."** No numeric
Hazard Exposure sub-score is produced. This is not because evidence is
absent everywhere (21 records exist within a wider radius and are
shown as context) but because none of it meets the design's own
threshold for direct scoring. The 5 km/2.04 km facts are reported
alongside this result as situational awareness, never as a risk
conclusion, per the task's explicit instruction.

### 16. Explainability requirements (not implemented — a specification for a future task)

When eventually implemented, an officer-facing view of this
sub-component would need to show: the status
(`no_evidence_found`/`not_covered`/`scored`); if scored, the numeric
sub-score and each factor that produced it (nearest distance, nearest
record's `activity`, count within radius); the nearest record's
`slide_no`, `toposheet`, `movement_t`, `triggering` as supporting
attributes (not scoring inputs); the count and distance range of any
1–5 km context records, labeled explicitly as non-scoring; the
inventory-bias disclaimer (§11) verbatim; a note on data completeness
(e.g. "casualty/damage data: not available for this area"); source
attribution (GSI/NLFC, Bhusanket, retrieval date, the acquired file's
checksum); and an "Officer review required" marker, consistent with
every other dimension already in `risk.py`.

### 17. Limitations

- Every distance band, modifier multiplier, and radius above is
  **VIKALP prototype policy configuration**, not an official
  government standard — none of it should be presented to an officer
  as authoritative without that label attached.
- The 1 km scoring radius is a considered choice grounded in the
  source's own `runout_dis` values, but is still a policy choice, not
  a cited external standard.
- `runout_dis`'s units were inferred from value magnitude, not
  confirmed from source field documentation.
- This design covers only the landslide-inventory sub-evidence within
  Hazard Exposure (30% weight dimension) — `flood_hazard_class`,
  `cloudburst_hazard_class`, and `multi_hazard_overlay` remain entirely
  unavailable (Task 16), so even a fully-implemented version of this
  design would not, by itself, let the overall Hazard Exposure
  dimension produce a score under `risk.py`'s existing
  all-inputs-required pattern — that governance question (whether a
  partial, landslide-only Hazard Exposure score should ever be shown)
  is explicitly left open, not resolved here.
- Not validated against any independent landslide-hazard reference.
- Applies only to the 813-record Pauri Garhwal extract acquired in
  Task 20; a full-India or different-district query could reveal
  different field-completeness patterns that would need re-auditing
  before reusing this design elsewhere.

### 18. Recommendation for implementation

Do not implement until: (a) a human reviewer explicitly approves the
1 km radius, the three proximity bands, and the activity/density
modifier values as VIKALP policy (none are self-evidently correct —
they are this task's best-justified proposal, not a foregone
conclusion); (b) a decision is made on whether Hazard Exposure may
ever report a partial (landslide-only) score, or must wait for all
four sub-inputs; (c) implementation reuses `risk.py`'s existing
`_DimensionSpec`/`available_inputs`/`missing_inputs`/`status` pattern
for architectural consistency rather than introducing a new shape.

"Landslide Hazard Exposure scoring methodology was designed for review
only. No scoring rule was implemented and risk.py was not modified."

## Task 22 — Hazard Exposure scoring sensitivity & sanity check (validation only, not implemented)

**No code was changed for this task** — `risk.py` was not touched.
This is a validation record only: a temporary analysis script
(`sensitivity_task22.py`, scratchpad, not committed to the repo) was
run once against the same acquired file used in Task 20/21
(`data/raw/static/hazards/gsi_nlfc_field_validated_landslides_pauri_garhwal.geojson`,
813 records) to sanity-check the Task 21 candidate methodology before
any implementation is attempted. All numbers below are computed
directly from that file; none are invented.

### 1. Data distribution

Two distinct distance sets were computed — kept separate deliberately,
per the task's own warning not to treat the 813 landslide points as if
they were settlements:

**(a) Landslide-to-landslide spacing** (nearest-neighbor distance
among the 813 records themselves — a data-shape sanity check only,
never a settlement-risk statement): min 0 m (a small cluster of
near-duplicate coordinates), median 320.7 m, p90 1381.4 m, max
19.48 km. Bucketed: <50m 3.7%, 50–100m 14.8%, 100–200m 19.1%,
200–500m 27.1%, 500m–1km 19.2%, 1–2km 12.4%, >2km 3.8%. This confirms
the dataset has real fine-grained spatial structure at the scale the
Task 21 bands (200m/600m/1km) operate at — the bands are not testing
against an empty or overly coarse point cloud.

**(b) Landslide-to-Bhitai-Malli distance** (the actual settlement
case): nearest record 2,039.9 m (2.040 km) — matches Task 20/21's
reported ~2.04 km. 0 records ≤2,000 m; 3 records ≤2,500 m; 21 records
≤5,000 m.

### 2. Radius sensitivity (Bhitai Malli)

| Radius | Count captured | % of 813-record dataset | Status |
|---|---|---|---|
| 500 m | 0 | 0.0% | no_evidence_found |
| 750 m | 0 | 0.0% | no_evidence_found |
| 1 km | 0 | 0.0% | no_evidence_found |
| 1.5 km | 0 | 0.0% | no_evidence_found |
| 2 km | 0 | 0.0% | no_evidence_found |
| 2.5 km | 3 | 0.4% | evidence found |
| 5 km | 21 | 2.6% | evidence found (context only under Task 21 design) |

**Finding:** Bhitai Malli's evidence status is identical
("no_evidence_found") across every candidate radius from 500 m to
2 km — the radius choice among those five candidates does not change
the outcome for this settlement, which is reassuring (no razor's-edge
instability across that range). However, the nearest record sits at
2,039.9 m — just 40 m past the largest tested radius (2 km) — so
Bhitai Malli is a live example of a settlement sitting immediately
outside a scoring threshold. Pushing the radius to 2.5 km would flip
the outcome, but doing so *because* it changes Bhitai Malli's specific
result would be exactly the kind of pilot-fitted threshold the task
warns against — this is flagged as a governance risk (§9), not acted
on.

### 3. Proximity band sensitivity

Task 21 bands (200m/600m/1km) vs. an alternative scheme (250m/500m/
1km), applied to the landslide-to-landslide spacing set (§1a, a
data-shape check, not a settlement statement):

| Band scheme | 0–200/250m | 200–600m / 250–500m | 600m–1km / 500m–1km | >1km |
|---|---|---|---|---|
| Task 21 (200/600/1000) | 37.5% | 33.1% | 13.2% | 16.2% |
| Alternative (250/500/1000) | 43.2% | 21.4% | 19.2% | 16.2% |

Neither scheme leaves a band empty or near-empty — both are
reasonably populated. For Bhitai Malli specifically, both schemes
produce 0/0/0 — the choice between them makes **no difference** to
this settlement, since its evidence gap is at the 1 km gate level, not
at a sub-band boundary. On the discontinuity question: Task 21's
chosen band-score ranges (80–100 / 50–79 / 20–49) happen to abut
almost seamlessly at each boundary (199m→~80, 201m→~79;
599m→~50, 601m→~49), so a small coordinate shift near 200 m or 600 m
would change the score by roughly 1 point, not create a hard cliff.
This smoothness is a property of the specific numbers chosen in
Task 21, not a guarantee — any future retuning of the band-score
ranges would need to be re-checked for the same property by hand.

### 4. Density bonus test

Count of *other* records within 1 km, computed for each of the 813
records (a general clustering check, not settlement-specific):

- 132 records (16.2%) have 0 neighbors within 1 km — isolated.
- 480 records (59.0%) have 1–4 neighbors within 1 km.
- 201 records (24.7%) have ≥5 neighbors within 1 km — the Task 21
  density-bonus threshold.
- Maximum observed: 20 neighbors within 1 km at the single most
  crowded location.

So the ≥5 threshold is neither trivially rare nor almost-always-true
across the dataset generally — roughly a quarter of locations would
qualify. For Bhitai Malli specifically, density is moot: Task 21's
design correctly gates density behind the proximity check (§6), and
Bhitai Malli never reaches that gate (0 within 1 km), so the density
bonus cannot apply regardless of its value.

**Materiality check (no data change, arithmetic only):** a flat `+5`
on a 0–100 scale is individually modest, but because the risk bands
sit at 24/49/74/100, a base score landing at 70–74 (High) would be
pushed to 75–79 (Critical) by the bonus alone — a real, if narrow,
band-crossing case. A capped/no-bonus comparison: with no density
bonus, the same base score stays in its original band; with the
existing `+5`, roughly a 5-point window just below each band boundary
(70–74, 45–49, 20–24 is not applicable since 20 is the floor) is
where the bonus changes the officer-facing risk *label*, not just the
number. This is reported as a limitation (§9), not resolved with a
new number — inventing a smaller cap here would itself be an
unapproved policy change.

### 5. Activity modifier test

Actual `activity` field values, all 813 records (matches Task 21's
count exactly): Active 640 (78.7%), Reactivated 120 (14.8%), Suspended
19 (2.3%), Dormant 19 (2.3%), Stabilized 10 (1.2%), blank/unpopulated
3 (0.4%), Abandoned 2 (0.2%).

**Finding:** 93.5% of all records (Active + Reactivated) would receive
the *same* modifier value under Task 21's proposed scheme (its §7
records the candidate multipliers explicitly — ×1.1 /×0.85/×1.0 — so
they are used here as the recorded candidate, not invented). Only
5.8% of records (Suspended/Dormant/Stabilized/Abandoned) would receive
the discount multiplier. In aggregate, `activity` behaves closer to a
near-constant ~+10% boost than a genuine discriminator across the
dataset — though it remains meaningful for the specific minority of
records where it does vary. Because the modifier is bounded (±15%)
and multiplicative on top of the proximity base, it cannot by itself
turn a "no evidence" case into a scored one, and its swing (≤15
points) is generally smaller than a single proximity band's own range
(20–30 points) — so it cannot dominate spatial evidence, but its
low real-world variance raises a genuine question about whether it's
worth the added complexity (§9, left as a governance call).

### 6. Double-counting table

| Evidence | What it measures | Potential overlap | Recommendation |
|---|---|---|---|
| Proximity | Distance to nearest qualifying record | Baseline; other factors modify it | Keep as the sole primary component |
| Density | Count of records within the same radius | Strongly correlated with proximity — a cluster near a settlement always also yields a short nearest-distance | Small, capped secondary modifier only, gated behind proximity passing (Task 21 §6, reaffirmed) |
| Activity | Current status of the nearest record | None with proximity/density (different question: where vs. current state) — but low real-world variance (§5) limits its practical distinctiveness | Keep as a bounded modifier on the nearest record only, or demote to display-only (governance call, §9) |
| Triggering | Historical cause of a past event | Would double-count against a future rainfall/precipitation dataset (Task 16 gap) if scored | Display-only, not scored (reaffirmed) |
| Recency | Age of the nearest/contributing record | Could re-emphasize the same single nearby record a second time if combined with proximity+activity | Excluded from scoring (reaffirmed); also moot for Bhitai Malli's own nearest cluster, which has no dated values (Task 21 §9) |

### 7. Bhitai Malli sensitivity

Nearest GSI record confirmed: **2,039.9 m (2.040 km)**,
`slide_no=UK/GAR/53J16/2015/1103`, `activity=Active`.

| Candidate radius | Records captured | Evidence status |
|---|---|---|
| 500 m | 0 | Assessment Pending |
| 750 m | 0 | Assessment Pending |
| 1 km | 0 | Assessment Pending |
| 1.5 km | 0 | Assessment Pending |
| 2 km | 0 | Assessment Pending |
| 2.5 km | 3 | Evidence would exist (not tested as a recommendation — see §10) |

Bhitai Malli's status is **stable at "Assessment Pending" across every
radius from 500 m up to 2 km** — a 4x range of candidate radii all
agree. Only crossing to 2.5 km (comfortably past the actual 2.040 km
nearest-record distance) introduces evidence, and even then those 3
records would need to be clearly labeled contextual/proximity evidence,
not a scored result, unless the scoring radius itself were formally
changed to 2.5 km through the same governance process as any other
constant — which this task does not do. This is **not** converted into
a risk conclusion, per the task's explicit instruction.

### 8. Edge-case analysis (conceptual — no fabricated settlement data)

- **A — 0 records within radius** (Bhitai Malli's actual case): gate
  returns `"no_evidence_found"` / Assessment Pending, confirmed
  behavior.
- **B — 1 record very close (e.g. 50 m)**: gate passes; base score
  from the 0–200 m band; activity modifier applies to that one record;
  density modifier is 0 unless other records also qualify. Behaves as
  designed.
- **C — multiple records close together (a real pattern in this
  dataset — 201/813 records have ≥5 neighbors within 1 km, §4)**: gate
  passes, density bonus applies; per Task 21 §6, must be labeled
  "documented record count," not "landslide frequency," since a local
  cluster can reflect one survey campaign rather than independent
  events.
- **D — many records just outside the radius**: not scored at all
  under the gate design — treated purely as context. This is the
  general pattern Bhitai Malli itself instantiates (§7): a settlement
  whose nearest evidence sits just past the chosen radius gets
  identical treatment to one with no nearby evidence at all, even
  though the two cases are informally different. This is a genuine,
  documented limitation of any hard-gated radius design, not a defect
  introduced by this task.
- **E — one "Active" record far away (e.g. 4 km)**: not captured under
  any tested radius ≤2.5 km; remains context-only; activity of a
  distant record never reaches the score.
- **F — many historical records but no recent activity evidence**: no
  effect on score, since recency is excluded from scoring entirely
  (§6/§9 Task 21) — confirmed consistent, no instability introduced.
- **G — missing activity values**: observed at 3/813 (0.4%) records;
  design's existing `×1.0` neutral fallback (Task 21 §12) already
  covers this; confirmed to be a rare, already-handled edge case, not
  a systemic gap.

### 9. Governance / interpretation

1. **Is 1 km defensible as an MVP policy configuration?** Yes, as a
   reasonable prototype configuration — grounded in the source's own
   `runout_dis` statistics and shown here (§2) to be stable across a
   4x range of candidate radii for the pilot settlement. Not a
   scientifically validated threshold.
2. **Are the proposed bands defensible enough for prototype use?**
   Yes, as a reasonable prototype configuration — both tested schemes
   populate reasonably (§3) and neither is shown to be clearly
   superior; the chosen scores avoid a hard cliff at each boundary,
   which is a good but coincidental property of the specific numbers.
3. **Is the +5 density bonus justified?** Justifiable as a capped,
   secondary modifier, but §4 surfaces a real (if narrow) band-crossing
   risk at the High/Critical boundary that should be explicitly
   acknowledged rather than silently accepted.
4. **Is activity useful enough to score?** Marginal — §5 shows 93.5%
   of records fall into a single effective modifier bucket, so it acts
   close to a near-constant boost in aggregate. Defensible either way;
   left as a governance call, not resolved here.
5. **Should triggering remain display-only?** Yes, reaffirmed.
6. **Should recency remain display-only?** Yes, reaffirmed — also
   moot for Bhitai Malli's own nearest cluster (no dated values).
7. **Should Hazard Exposure ever return numeric 0 when the inventory
   contains no qualifying evidence?** No — reaffirmed, and reinforced
   by §2/§7: a `0` would look like a confirmed fact rather than an
   artifact of exactly which radius happened to be chosen (Bhitai
   Malli's own status would flip from "no evidence" to "evidence" with
   only a 460 m radius increase from 2 km to 2.5 km — a fragility a
   numeric `0` would hide entirely).
8. **Should "Assessment Pending" remain the default for insufficient
   evidence?** Yes, reaffirmed.
9. **What should be documented as a limitation?** (a) radius choice
   materially changes evidence status for settlements whose nearest
   record sits near a candidate boundary — Bhitai Malli's own 2.040 km
   distance sits just outside the largest tested 2 km candidate; (b)
   the activity modifier's low real-world variance (93.5% in one
   bucket); (c) the density bonus's narrow but real potential to cross
   the High/Critical band boundary; (d) the landslide-to-landslide
   spacing analysis (§1a/§3) describes the dataset's own point-to-point
   structure, not settlement-to-landslide risk, and must not be
   over-read as such.

### 10. Final recommended methodology for the next implementation task

**APPROVED / RECOMMENDED FOR IMPLEMENTATION** (i.e. sensitivity testing
found no disqualifying flaw in Task 21's candidate — still requires
human policy sign-off before coding, per Task 21 §18):
- Scoring radius: **1 km**, unchanged from Task 21.
- Proximity bands: **0–200 m / 200–600 m / 600 m–1 km**, scores
  80–100 / 50–79 / 20–49, linear interpolation, unchanged from Task 21.
- Density: retained as a capped secondary modifier (`+5` if ≥5 records
  within 1 km), gated behind the proximity check passing, unchanged
  from Task 21 — with the §9(c) band-crossing limitation documented
  alongside it.
- Activity: retained as a bounded modifier (×1.1/×0.85/×1.0 as
  recorded in Task 21 §7) on the nearest qualifying record only — with
  the §9(b) low-discrimination limitation documented alongside it.
- Triggering: **display-only**, not scored.
- Recency: **display-only / excluded from scoring**.
- Missing-data behavior: unchanged from Task 21 §12 (skip modifier,
  never fabricate; distinct `"not_covered"` vs `"no_evidence_found"`
  status).
- Evidence-gating behavior: unchanged — 0 records within the scoring
  radius → `"no_evidence_found"` / Assessment Pending, **never** a
  numeric 0.

**REJECTED / NOT RECOMMENDED:**
- Extending the scoring radius to 1.5 km or 2 km specifically to
  capture Bhitai Malli's nearest record — rejected. §2/§7 show this
  would only be justifiable by an external technical standard, not by
  the convenience of producing a number for one pilot settlement;
  doing so would be exactly the pilot-fitted-threshold pattern the
  task instructions warn against.
- Scoring the 1–5 km band, or scoring `triggering`/recency numerically
  — reaffirmed rejected, no new evidence in this task changes Task 21's
  reasoning.
- Using the landslide-to-landslide nearest-neighbor spacing (§1a/§3)
  as a proxy for settlement risk — explicitly rejected; it is a
  data-shape sanity check only.

**STILL REQUIRES GOVERNANCE DECISION:**
- Whether the density bonus's narrow ability to cross the High/
  Critical band boundary (§4/§9c) is acceptable as-is, or whether its
  cap should be reduced — not resolved here; reducing it now would be
  an unapproved policy change.
- Whether the activity modifier is worth retaining given its low
  aggregate discrimination (§5/§9d), or should be demoted to
  display-only for simplicity.
- Whether Hazard Exposure may ever report a partial (landslide-only)
  score, or must wait for flood/cloudburst/multi-hazard inputs — open
  since Task 21 §17/18, unchanged by this task.
- Formal human approval of the exact radius/band/multiplier constants
  as VIKALP policy (Task 21 §18(a)), unchanged.

### 11. What remains unresolved

Same open items as Task 21 §18, plus the two new governance flags from
§9/§10 above (density cap size, activity retain-vs-display-only). No
new implementation decision was made by this task.

### 12. Files changed

- `docs/DECISIONS.md` — this section.
- `docs/MVP_BACKLOG.md` — pointer update (see below).
- Temporary, not-committed-to-source-control analysis script:
  `sensitivity_task22.py` (scratchpad directory) and its output
  (`sensitivity_output.txt`) — neither is part of the repository; both
  read the existing acquired GeoJSON file only, made no writes to it.

### 13. risk.py confirmation

`backend/app/services/risk.py` was not opened or modified in this
task. No scoring rule was implemented.

"Hazard Exposure scoring sensitivity analysis completed. The scoring
rule remains unimplemented pending approval of the final constants and
methodology."

## Task 23 — Hazard Exposure landslide-inventory scoring implemented

The Task 21 methodology (sensitivity-validated Task 22) is now
implemented for the Hazard Exposure dimension's GSI landslide-inventory
sub-evidence. **Every numeric constant used below is copied verbatim
from Task 21 §5/§6/§7 above — none were invented for this task.**
`backend/app/services/risk.py`, `schemas/risk.py`, and `api/risk.py`
were inspected first (per the task's own instruction) and the existing
`_DimensionSpec` architecture was reused, not redesigned.

### 1. Files changed

- **New**: `backend/app/services/hazard_exposure.py` — the scoring
  module (loads the raw GSI inventory, computes distances, applies the
  approved rule).
- **New**: `backend/tests/test_hazard_exposure.py`,
  `backend/tests/__init__.py` — deterministic tests (stdlib `unittest`;
  no new test-framework dependency was added).
- `backend/app/config.py` — added `gsi_landslides_geojson_path`
  setting, following the exact same pattern already used for
  `boundaries_geojson_path` (Task 12).
- `backend/app/services/risk.py` — added `_score_hazard_exposure_dimension`
  and dispatches to it for the "Hazard Exposure" spec only; the other
  four dimensions still go through the original, unchanged
  `_score_dimension`. `DIMENSION_WEIGHTS`, `RISK_BANDS`, and the
  overall weighted-sum/gating logic in `assess_settlement_risk` were
  **not** touched.
- `backend/app/schemas/risk.py` — added `HazardExposureLandslideDetail`
  and `LandslideContextRecord` models, and one new optional field,
  `hazard_exposure_detail: HazardExposureLandslideDetail | None = None`,
  on `RiskDimensionResult`. Every existing field on
  `RiskDimensionResult`/`RiskAssessment` is unchanged; the four
  dimensions without an approved rule always return
  `hazard_exposure_detail: null`, so their response shape is byte-for-byte
  what it was before this task.
- `backend/app/api/risk.py` — **not changed** (route already generic
  over `RiskAssessment`).
- `frontend/src/types/risk.ts` — added the same optional
  `hazard_exposure_detail?: unknown` field (untyped; not rendered by
  this task, see §6) and widened the `status` comment. No other type
  changed.
- `frontend/src/pages/RiskAnalysisPage.tsx` — one minimal, additive
  change: `DimensionCard`'s status text now handles `"no_evidence_found"`
  explicitly (previously it would have shown the misleading "no
  approved scoring rule exists yet" for a dimension that now *has* one).
  No visual/layout change. `RiskAnalysisCard.tsx` (Overview widget) was
  **not** changed — it is a static placeholder unaffected by this task,
  per the task's own instruction not to touch it unless required.
- `docs/DECISIONS.md` (this section), `docs/MVP_BACKLOG.md` (marked
  complete, see below).
- `docs/CODEBASE_AUDIT.md` — **not modified**.
- `data/raw/static/hazards/gsi_nlfc_field_validated_landslides_pauri_garhwal.geojson`
  — **not modified**; SHA256 confirmed unchanged before and after
  implementation: `b9f73d5a7e0f8d62947ae76ab61d01dd553220ecc507a2940cae7e667d968e99`
  (matches the Task 20 acquisition checksum).

### 2. Implementation approach

`score_hazard_exposure_landslide(lat, lon)` in `hazard_exposure.py` is a
pure function: load the 813-record inventory once (`functools.lru_cache`),
compute the haversine distance from the query point to every record,
split into "qualifying" (≤1 km) and "contextual" (1-5 km, display only),
then:
1. If zero qualifying records → return `status: "no_evidence_found"`,
   `score: None` (the evidence gate).
2. Otherwise, take the nearest qualifying record; compute
   `proximity_base_score(nearest_distance)` (Task 21 §5's three bands,
   linear interpolation), `activity_modifier(nearest.activity)`
   (Task 21 §7), and `density_bonus` (Task 21 §6, `+5` if the qualifying
   count `>= 5`); `score = clamp(base * activity_modifier + density_bonus, 0, 100)`.

`risk.py`'s `_score_hazard_exposure_dimension` wraps this result into the
same dict shape every other dimension returns (`dimension`, `weight`,
`status`, `score`, `inputs_used`, `missing_inputs`, `evidence`,
`rule_reference`), plus the new `hazard_exposure_detail` key carrying the
full structured explainability payload. `assess_settlement_risk`'s
aggregate logic (`all_scored`, `data_completeness`, the weighted-sum
gate) required **no changes** — it already only produces an
`overall_score` when every one of the five dimensions has a non-null
`score`, and Hazard Exposure is still the only one of five with a
scoring rule, so a partial overall score cannot leak out (verified
empirically for Bhitai Malli, §9 below).

### 3. Exact constants used, and their source

| Constant | Value used | Source |
|---|---|---|
| Scoring radius | 1 km | Task 21 §5 |
| Context (display-only) radius | 5 km | Task 21 §5 |
| Band 0-200m score range | 100 (at 0m) → 80 (at 200m) | Task 21 §5 |
| Band 200-600m score range | 79 (at 200m) → 50 (at 600m) | Task 21 §5 |
| Band 600m-1km score range | 49 (at 600m) → 20 (at 1km) | Task 21 §5 |
| Interpolation | Linear within each band | Task 21 §5 |
| Activity modifier — Active/Reactivated | ×1.1 | Task 21 §7 |
| Activity modifier — Suspended/Dormant/Stabilized/Abandoned | ×0.85 | Task 21 §7 |
| Activity modifier — unpopulated/unrecognized | ×1.0 (neutral) | Task 21 §7/§12 |
| Density bonus threshold | ≥5 qualifying records within 1 km | Task 21 §6 |
| Density bonus value | +5 (of 100), capped, gated behind the evidence gate | Task 21 §6 |
| Triggering | Excluded from scoring; display/context only | Task 21 §8 |
| Recency | Excluded from scoring | Task 21 §9 |
| Casualty/damage | Excluded from Hazard Exposure entirely | Task 21 §10 |
| No qualifying evidence | `status="no_evidence_found"`, `score=None`, never 0 | Task 21 §11 |

No constant was missing or ambiguous; implementation proceeded without
needing to invoke the "STOP and report the missing governance decision"
clause. (Task 21's boundary *convention* — which side of an exact 200m/
600m/1km boundary belongs to which band — is an implementation detail,
not a policy value; documented explicitly in code comments and applied
consistently: each band is `[near, far)` except the last, `[near, far]`,
since `far` there is also the 1km evidence-gate boundary.)

### 4. Spatial-distance method

Haversine (spherical great-circle) distance, `R = 6371.0088 km` — the
same formula and radius already used for every landslide-distance figure
published in Tasks 19-22 (including the "2.04 km" and "21 within 5 km"
figures this task's own Bhitai Malli expectation cites), so results stay
internally consistent with everything already documented. This is a
genuine geodesic calculation, not a planar treatment of lat/lon degrees
as meters. No new dependency was added — GeoPandas/Shapely/PyProj remain
installed and available for a future task that needs true WGS84
ellipsoidal geodesics or projected-CRS operations, but haversine's
sub-1%-at-this-range error was judged an acceptable, already-established
choice rather than a reason to introduce a different method for this
specific implementation (documented as a limitation, not hidden).

### 5. Evidence-gating behavior

Zero qualifying (≤1 km) records → `status: "no_evidence_found"`,
`reason: "no_evidence_found"`, `score: None` — never a numeric 0.
Source file missing/unreadable/invalid JSON/not a FeatureCollection/no
valid point features → `status: "source_data_unavailable"`, `score: None`.
Settlement latitude/longitude unavailable → `status:
"settlement_geometry_unavailable"`, `score: None`. All three are
surfaced identically through `risk.py` (the dimension's own `status`
field), so `assessment_status` at the settlement level stays `"pending"`
and `overall_score`/`risk_level` stay `None` whenever Hazard Exposure
itself isn't scored — consistent with every other unscored dimension.

### 6. Explainability fields

`hazard_exposure_detail` (new, Hazard-Exposure-only) carries: `status`,
`reason`/`reason_detail`, `score`, `scoring_radius_km`,
`context_radius_km`, `qualifying_record_count`,
`nearest_qualifying_distance_km`, `nearest_qualifying_slide_no`,
`proximity_band`, `proximity_base_score`, `activity_value_used`,
`activity_modifier_applied`, `density_bonus_applied`/`density_bonus_value`,
`contextual_record_count`, `nearest_contextual_distance_km`,
`contextual_records` (slide_no/distance/activity/triggering/toposheet for
every 1-5 km record — context, never scoring input), `source_dataset`,
`source_feature_count`, `inventory_bias_disclaimer`,
`policy_disclaimer`, `limitations`. All deterministic structured fields;
no free text/AI narrative generation anywhere. The existing top-level
`RiskAssessment.policy_disclaimer` and `officer_review_required`/
`officer_review_note` fields are unchanged and still present.

### 7. Tests added/updated

`backend/tests/test_hazard_exposure.py`, 22 deterministic `unittest`
tests, covering all 13 items from the task brief: exact proximity-band
math at the 200m/600m/1km boundaries and the boundary "no cliff" check;
activity modifier for every observed value plus missing/unrecognized
fallback; Bhitai Malli's real coordinates (0 within 1km, 21 within 5km,
`score is None` not `0`); synthetic query points anchored on real,
provably-isolated GSI records to exercise each of the three bands and
the just-past-1km non-contribution case; a real dense-cluster anchor
(discovered programmatically from the actual data, not hand-picked) for
the density-bonus case, plus a real isolated record for the no-bonus
case; structural proof (`LandslideRecord`'s dataclass fields, and
source-inspection of the two scoring helper functions) plus an
arithmetic reproducibility check that casualty/damage, triggering, and
recency never influence the score; and a hash-based check that scoring
never writes to the raw source file. No synthetic/fabricated landslide
*records* were created anywhere — only query coordinates, always
described as such.

### 8. Test results

All 22 tests pass (`python -m unittest discover -s tests`, run from
`backend/`, 0.5s). `python -m py_compile` succeeded on every changed
backend file. No lint/type-checker is configured for the backend in
this project (checked: no `pytest`/`mypy`/`ruff`/`flake8` installed, no
config file) — this matches the project's existing state, not a gap
introduced by this task. The frontend's `tsc --noEmit` passed with no
errors after the two frontend changes.

### 9. Bhitai Malli API result

Live call to `GET /api/settlements/1/risk` (dev server started
temporarily for this validation, then stopped):
`assessment_status: "pending"`, `overall_score: null`, `risk_level: null`.
Hazard Exposure dimension: `status: "no_evidence_found"`, `score: null`,
`qualifying_record_count: 0`, `contextual_record_count: 21`,
`nearest_contextual_distance_km: 2.04`. The other four dimensions are
byte-for-byte what they were before this task (`no_scoring_rule`/
`no_data`, `score: null`). Top-level `policy_disclaimer` present and
unchanged; a second, Hazard-Exposure-specific `policy_disclaimer` and
the `inventory_bias_disclaimer` are present inside
`hazard_exposure_detail`. Exactly matches the task's required expected
result.

### 10. Confirmations

- Raw GSI data: untouched (checksum verified identical before/after, §1).
- Overall risk weights (`DIMENSION_WEIGHTS`) and risk bands
  (`RISK_BANDS`): untouched — asserted by test
  `test_overall_weights_unchanged` and confirmed by direct read of
  `risk.py`.
- No other risk dimension was implemented: Terrain, Historical Disaster
  Evidence, Population/Household Exposure, and Vulnerability all still
  return their original `no_scoring_rule`/`no_data` status with
  `score: null`, verified both by the live API call (§9) and by a
  dedicated test loop over the other four dimensions.
- `docs/CODEBASE_AUDIT.md`: not modified.

### 11. Limitations (carried into the module's own `limitations` field)

- Covers only the landslide-inventory sub-evidence within Hazard
  Exposure; flood/cloudburst/multi-hazard-overlay evidence remains
  entirely unavailable (Task 16), unchanged by this task.
- Haversine (spherical) distance, not true WGS84 ellipsoidal geodesic —
  an established, documented approximation, not a defect (§4).
- No distinct `"not_covered"` status for a settlement genuinely outside
  the inventory's district-level coverage extent — such a settlement
  currently reports `"no_evidence_found"` identically to one inside the
  extent with zero nearby records (Task 21 §12's distinction was
  designed but not implemented in this MVP; flagged, not silently
  dropped).
- The two governance flags Task 22 raised (density bonus's narrow
  High/Critical band-crossing risk; activity modifier's low real-world
  discrimination, 93.5% in one bucket) were **not** re-litigated here —
  Task 23's brief treated Task 21's exact constants as already approved
  for MVP implementation, so they were implemented as documented, with
  both limitations carried forward into the response's own
  `limitations` field for officer-facing visibility.
- Every constant remains VIKALP prototype policy configuration, not an
  official government standard (surfaced in both the top-level and
  Hazard-Exposure-specific policy disclaimers).

"Hazard Exposure landslide-inventory scoring was successfully
implemented exactly as approved in docs/DECISIONS.md (Task 21,
sensitivity-tested Task 22) — no constant was missing or invented.
Bhitai Malli correctly returns assessment_status=\"pending\",
Hazard Exposure score=null, reason=\"no_evidence_found\"; overall risk
weights, the four other dimensions, and the raw GSI dataset are all
unchanged."

## Task 24 — Historical Disaster Evidence: data audit + scoring rule design (design only, not implemented)

**No code was changed for this task.** `backend/app/services/risk.py`
was inspected but not modified; no API, schema, or frontend file was
touched. This is a design record only. All field statistics below were
re-verified fresh against the live file in this task (not carried over
unverified from Task 21) — see §1.

### 1. Files inspected

`docs/DECISIONS.md`, `docs/MVP_BACKLOG.md`, `docs/DATA_PROVENANCE.md`,
`docs/DATA_INVENTORY.md` (specifically §7.4-7.7, which had already
concluded — pre-Task-20 — that Historical Disaster Evidence had zero
backing data and named `past_incident_count`, `past_incident_severity`,
`most_recent_incident_recency` as the still-missing inputs, and had
identified USDMA Hotspot Plans/DRA reports and Bhuvan's event inventory
as *unacquired* candidate sources for a genuinely independent
historical-incident dataset — neither was acquired then or now);
`backend/app/services/risk.py`, `backend/app/services/hazard_exposure.py`,
`backend/app/schemas/risk.py`, `backend/app/api/risk.py`,
`backend/tests/test_hazard_exposure.py`; a full listing of every file
under `data/raw/static/` and `data/processed/static/` (confirms: the
GSI landslide GeoJSON remains the *only* hazard/historical-event
dataset in the repository — no separate incident/casualty database
exists); and the GSI file itself, re-audited fresh with a new script
(`task24_audit.py`/`task24_audit2.py`/`task24_audit3.py`, scratchpad,
not committed) rather than trusting Task 21's numbers unverified.
Confirmed: **813 records, 134 fields** — matches the task's stated
figures, verified rather than assumed.

### 2. Historical evidence data available

The repository has exactly one hazard-relevant dataset:
`data/raw/static/hazards/gsi_nlfc_field_validated_landslides_pauri_garhwal.geojson`
— the same 813-record inventory Hazard Exposure (Task 23) already uses.
**No independent historical-disaster/incident database exists anywhere
in the repository.** `docs/DATA_INVENTORY.md` §7.5 already identified
two *candidate* external sources for a genuinely separate
historical-incident record (USDMA Hotspot Plans + District Disaster
Management Authority reports; Bhuvan's event/route-wise inventory) —
neither was ever acquired, and this task's own scope explicitly
forbids acquiring new datasets except to verify an already-approved
source, so neither is used here. **This means any Historical Disaster
Evidence design proposed now must draw from the same GSI file Hazard
Exposure already uses** — the double-counting risk this raises is
addressed head-on in §8.

### 3. Field-quality findings (fresh re-audit, all 134 fields; results below only list history-relevant ones)

| Field | Meaning | Population | Distinct/notes | Scoring disposition |
|---|---|---|---|---|
| `slide_no` | Unique record ID | 100% (813/813) | 813 distinct | Display-only |
| `village` | Settlement name | **0%** (0/813) | — | **Excluded** — no settlement-name matching is possible from this field at all; confirms spatial (haversine) matching is the *only* available linkage method, same conclusion as Task 20/23 |
| `toposheet` | Survey sheet ID | 100% | 13 distinct | Display-only |
| `district` | District label | 100% | 6 distinct: Pauri Garhwal 565, **Garhwal 213**, Almora 30, Uttarkashi 3, Tehri Garhwal 1, Chamoli 1 | **Excluded from any filtering** — reconfirms Task 20's finding that this field is inconsistently labeled (the 21 records nearest Bhitai Malli are *all* labeled `"Garhwal"`, not `"Pauri Garhwal"`); display-only with that caveat attached |
| `state` | State label | 100% | 1 (`Uttarakhand`) | Display-only, no discriminating value |
| `activity` | Current status of the mapped feature | 99.6% | 6 values (Active/Reactivated/Suspended/Dormant/Stabilized/Abandoned) | **Display-only here** — already the scoring input for Hazard Exposure's activity modifier (Task 21 §7/Task 23); reusing it as a Historical Disaster Evidence scoring input too would directly double-count the same fact |
| `triggering` | Documented cause | 82.7% | Overwhelmingly "Rainfall" (639/672 populated) | **Excluded** — same no-discrimination finding as Task 21 §8, and already excluded from Hazard Exposure scoring for the identical reason; display-only context only |
| `movement_t`, `geology`, `material_t`, `geoscienti` | Geotechnical descriptors of the mapped feature | 100%/70.2%/100%/93.8% | — | Display-only — describe the physical mechanism, not historical *occurrence timing or impact* |
| `initiation` | Nominal "initiation year" | 100% | **810/813 (99.6%) = literal placeholder `0`**; only 3 real years | **Excluded** — reconfirmed Task 21's finding fresh; using it would fabricate a year for 99.6% of records |
| `initiati_1` | The *actual* usable initiation-year field | 100% "populated", **156/813 (19.2%) carry a real year** (1986, 2005, 2009-2018) | 13 distinct values incl. `0` | **Scored** — the sole reliable date field (see below) |
| `reactiva_1`, `reactiva_2` | Nominal reactivation fields | 100% | **100% = `0`**, zero information | **Excluded** — reconfirmed |
| `reactivati` | The "actual" reactivation-year field | 100% "populated", 156/813 carry a real year | — | **New finding this task (not in Task 21's audit): `reactivati` is entirely redundant with `initiati_1`.** Checked directly: of the 156 records with a real `initiati_1` year, **153 also have `reactivati` populated, and in every one of those 153 cases the two years are identical** (0 cases differ); the remaining 3 have `reactivati = 0`. `reactivati` is *never* populated when `initiati_1` is not, and never disagrees with it when both are populated. It adds **zero** incremental information — treating it as a second, independent "reactivation event" (as opposed to just a duplicate of the initiation year) would double-count a single documented year as two. **Excluded from scoring**, display-only at most. |
| `date`, `date_acc`, `date_and_t`, `datetimety`, `exactdatei`, `history_da` | Various other date fields | **0%** all six | — | Excluded — no data |
| `peopledead`, `peopleinju`, `housesbuil`, `infrastruc`, `othersaffe`, `people_aff`, `persons_de`, `livestockd`, `livestocki`, `livestock_` | Casualty/damage fields | **0% — every single one, all 813 records** | — | **Excluded — this is a dataset-wide gap, not a Bhitai-Malli-specific one.** No settlement in this entire 813-record extract can produce a casualty/damage-backed score from this file. |
| `source` | Intended per-event source citation | **0%** | — | Excluded — empty |
| `citation` | GSI survey/report reference | 100% | 135 distinct (e.g. "Kumar P., and Balaji P., 2015. Macro-scale... FS 2014-2015...") | **Display-only, with an important caveat**: this cites the *macro-scale susceptibility-mapping survey report* the record came from, not a disaster-impact/incident report. It is source-attribution metadata for the mapping campaign, **not** documented historical-disaster evidence about a specific settlement — must not be presented to an officer as if it were an incident report. |
| `remarks` | Free-text notes | 35.5% (214/813 of which = placeholder `"0"`); ~75 records have real text (e.g. "No habitation" ×23, "Trees are uprooted") | 46 distinct | Excluded from scoring (unstructured); may be surfaced as free-text context for a specific qualifying record only, never scored |
| `abstract` | Long-form event narrative | 26.6% (213/813 of which = placeholder `"0"`); **only 3 genuine narratives in all 813 records**, and those describe Uttarkashi district NH-damage events, unrelated to Pauri Garhwal/Bhitai Malli | 4 distinct | Excluded |
| `alert` | Internal GSI severity code | 13.2% | "III" (100), "II" (7) — polarity undefined in any retrieved metadata | Excluded — reconfirmed Task 21's finding |
| `vulnerabil`, `photos` | — | 0% | — | Excluded — empty |
| `pre_remedi` | Recommended remediation | 87.2% | — | **Excluded** — forward-looking engineering advice, not evidence of past occurrence; irrelevant to this dimension |
| `nh_sh_loca` | Road/highway corridor reference | 55.7% | — | Display-only, corridor-level not settlement-level |

### 4. Recommended scoring methodology

**Historical Disaster Evidence answers a different question than Hazard
Exposure.** Hazard Exposure (Task 21/23): *"how much qualifying hazard
evidence is spatially near the settlement, weighted by proximity/
activity/density?"* Historical Disaster Evidence: *"is there a
documented, **dated** historical occurrence in the settlement's
immediate vicinity, how recent is it, and has it recurred over time?"*
The second question can only be answered using the **dated subset**
(`initiati_1`) of the inventory — records without a usable date cannot
support a historical-timeline claim at all, regardless of how close
they are.

**Step 1 — Spatial relevance filter.** Restrict to records within a
*relevance radius* around the settlement point. **Recommended: reuse
the already-approved 1 km "immediate vicinity" radius from Task 21 §5**
— not a new invented number. Rationale: (a) avoids introducing a second,
unjustified spatial constant; (b) Task 21 §5's own reasoning for why
1-5 km records must stay context-only for Hazard Exposure ("landslide
occurrence is highly location-specific... does not reliably indicate
hazard at this specific settlement's point") applies with *equal or
greater* force here, since claiming "historical disaster evidence"
implies an even stronger settlement-impact claim than Hazard Exposure's
physical-exposure framing. **This reuse is flagged as its own item
requiring sign-off — see §12.**

**Step 2 — Temporal evidence gate.** Of the records within the
relevance radius, keep only those with a populated `initiati_1` year
(the sole reliable date field; `initiation` and `reactivati` excluded
per §3). Two sub-cases:
- **Zero records of any kind within the relevance radius** →
  `status: "no_evidence_found"`.
- **≥1 record within the relevance radius, but none carry a usable
  year** → `status: "insufficient_evidence"` — spatial hazard evidence
  exists, but it cannot be placed on a historical timeline, which is a
  genuinely different (and weaker) finding than "nothing is there at
  all," so it gets its own status rather than being folded into either
  neighbor.
- **≥1 dated ("qualifying") record** → proceed to Step 3, `status:
  "sufficient_evidence"`.

**Step 3 — Score computation** (only reached once the gate passes),
four transparent, additive components, each independently explainable:

| # | Component | Definition | Input field(s) | Range | Rationale |
|---|---|---|---|---|---|
| 1 | Event Occurrence | Flat award once ≥1 qualifying dated record exists | `initiati_1` (presence) | **25** (flat, binary) | A confirmed, dated historical occurrence is itself the baseline finding; kept as its own labeled, explainable line rather than buried in the gate |
| 2 | Recency | How recent the *most recent* qualifying record's year is, relative to the assessment year | `initiati_1` (max) | **0-25**, 3 bands | Bands are grounded in the dataset's own observed temporal structure (§5): the documented years cluster in a ~10-year mapping window (2009-2018) with a single 1986 outlier spanning back 32 years — so "within 10 years" (same documentation generation), "10-25 years" (one generation prior), ">25 years" (legacy) is a data-grounded, not arbitrary, 3-way split |
| 3 | Repeated Events | Count of **distinct years** (not raw record count) among qualifying records in the relevance radius | `initiati_1` (distinct count) | **0-25**, 3 bands (1 year→0, 2→12, ≥3→25) | Deliberately counts *distinct years*, not record count, to avoid Task 21 §6's documented bias (one survey campaign along one corridor can produce many same-year records that look like "many events" but are really one documentation event). §9's dataset-wide check confirms this is a real, non-degenerate signal elsewhere in the district (up to 4 distinct years found within 1 km of one real record) — the rule is not vacuous, just inapplicable at Bhitai Malli specifically. |
| 4 | Casualty/Damage | Any documented casualty or damage on a qualifying record | `peopledead`/`housesbuil`/etc. | **0-25**, currently **permanently inert** | **Cannot be scored with current data — 0% populated dataset-wide (§3), not just near Bhitai Malli.** Design is specified for forward-compatibility only; see §12 for the governance question this creates. |

`score = clamp(25 [occurrence] + recency_band + repetition_band + casualty_band, 0, 100)`
— achievable range today: **25 to 75** (component 4 always contributes
0 with current data; see §12 for whether this cap should be addressed).

### 5. Exact proposed constants (all newly derived here, grounded in the data re-audited in §3; none copied from Task 21's Hazard Exposure constants, which score a different question)

| Constant | Value | Grounding |
|---|---|---|
| Relevance radius | 1 km (**reused** from Task 21 §5, not new) | See Step 1 rationale above; flagged for sign-off, §12 |
| Occurrence award | 25 (flat) | Equal 25-point share across the 4 conceptually distinct components (25×4=100); no data-derived reason to weight one above another, so equal-split is the least-arbitrary default — labeled VIKALP prototype policy configuration |
| Recency bands | ≤10 yrs → 25; 10-25 yrs → 12; >25 yrs → 5 | Grounded in the dataset's own observed year clustering (2009-2018 core window vs. the 1986 outlier), §3 |
| Repetition bands | 1 distinct year → 0; 2 → 12; ≥3 → 25 | ≥3 distinct years is a meaningfully high bar relative to the dataset's own overall spread (12 distinct years total across all 813 records); confirmed reachable (not vacuous) at another real location in the district, §9 |
| Casualty/damage band | Any documented casualty/damage → 25; none/unknown → 0 | Cannot be grounded in real examples — **zero populated casualty/damage records exist anywhere in this file** to calibrate against. Placeholder design only; **GOVERNANCE DECISION REQUIRED before use** (§12) |

### 6. Missing-data behavior

Five statuses, matching exactly what §7 of the task requires and
nothing more:
- `sufficient_evidence` — ≥1 qualifying (spatially relevant + dated)
  record; numeric score 25-75 produced.
- `no_evidence_found` — zero records of any kind within the relevance
  radius. Never presented as "safe" — same inventory-bias caveat as
  Hazard Exposure (Task 21 §11) applies identically here.
- `insufficient_evidence` — records exist within the relevance radius,
  but none carry a usable date. Score stays `null`; this is explicitly
  *not* the same finding as `no_evidence_found` and must be labeled
  differently to the officer.
- `source_data_unavailable` — GSI file missing/unreadable/invalid.
- `settlement_geometry_unavailable` — settlement lat/lon unavailable.

`score = null` in every status except `sufficient_evidence`. Never `0`
for missing evidence, per the task's explicit requirement and the same
principle already applied in Task 21/23.

### 7. Double-counting analysis

| Pair | Risk | Mitigation |
|---|---|---|
| Historical Disaster Evidence's Occurrence/Recency/Repetition vs. Hazard Exposure's proximity/activity/density | Both ultimately draw from the same 813-record file and the same settlement point | **Genuinely disjoint computational logic**: Hazard Exposure never reads `initiati_1`; Historical Disaster Evidence never uses proximity bands, the `activity` multiplier, or the raw-count density bonus — it uses *distinct years*, a different derived quantity from a different field, answering "when/how often" rather than "how close/how many." `activity` and `triggering` are explicitly excluded from Historical Disaster Evidence's scoring for exactly this reason (§3). |
| Both dimensions reusing the identical 1 km relevance radius | Structural correlation: any settlement that clears Hazard Exposure's gate is likely to also have dated records nearby, so the two dimensions will often move together rather than being independent evidence | **Not fully resolved — flagged as a limitation, not hidden.** True independence would require a genuinely separate historical-incident dataset (USDMA/DDMA records, per `docs/DATA_INVENTORY.md` §7.5), which does not exist in this repository. Documented as a data-source limitation, §12. |
| Historical Disaster Evidence's Casualty/Damage component vs. any future population/vulnerability data | A documented casualty count could plausibly also inform Vulnerability if that dimension is later built from incident data | Not yet a live risk (0% populated), but flagged for whoever eventually sources casualty/damage data: assign it to Historical Disaster Evidence only, per this document, to prevent a future double-assignment |

**If the same GSI file is the only available source, full independence
between Hazard Exposure and Historical Disaster Evidence cannot be
guaranteed — this is stated plainly, not minimized.**

### 8. Bhitai Malli dry run

Using the 1 km relevance radius (§4 Step 1): **0 records of any kind
within 1 km** — identical to Hazard Exposure's Task 23 finding (the two
dimensions agree here because Bhitai Malli's nearest record, at
2.04 km, is outside *both* dimensions' relevance radius, not because of
any shared scoring logic). Result: `status: "no_evidence_found"`,
`score: null`.

For completeness, the wider 21-record, 5 km context set (already
documented in Task 20/21/23) was also checked for dates: **all 21 have
`initiati_1 = 0`** — none are dated. So even if a wider relevance
radius had been chosen instead of 1 km, Bhitai Malli's result would
still be `null` (though the status would become `insufficient_evidence`
rather than `no_evidence_found`, since records — just undated ones —
would then exist within radius). **Historical Disaster Evidence for
Bhitai Malli must remain `score: null`, `assessment_status: "pending"`
under any reasonable choice of relevance radius tested here** — this is
not a radius-sensitivity artifact, it is a genuine absence of dated
evidence near this settlement specifically, correctly distinguished
(per §5's requirement) from "an event exists 2-5 km away" (true) vs.
"an event affected Bhitai Malli" (not established by this data).

### 9. Edge-case results

| # | Case | Status | Score |
|---|---|---|---|
| 1 | No historical records within radius | `no_evidence_found` | `null` |
| 2a | One record, dated | `sufficient_evidence` | 25 + recency band (+0 repetition, +0 casualty) |
| 2b | One record, undated | `insufficient_evidence` | `null` |
| 3 | Multiple records, all the same single year (one campaign) | `sufficient_evidence` | Repetition = 0 (only 1 distinct year) — correctly resists inflation from raw count |
| 4 | Multiple records, several distinct years | `sufficient_evidence` | Repetition up to 25; confirmed reachable elsewhere in the district (up to 4 distinct years found within 1 km of a real record, §5) |
| 5 | Very old record only (e.g. the single 1986 record) | `sufficient_evidence` | Recency = 5 (bottom band) — real evidence, not discarded, just weighted low |
| 6 | Recent record (e.g. 2018, the newest in this extract) | `sufficient_evidence` | Recency = 25 (top band, since <10 yrs old as of 2026) |
| 7 | Repeated historical events | Same as case 4 | — |
| 8 | Record(s) with casualty information | Would be `sufficient_evidence` with Casualty=25 | **Not currently possible — 0% populated (§3)** |
| 9 | Record(s) with damage information | Same as case 8 | **Not currently possible** |
| 10 | Casualty/damage fields blank | Casualty component = 0 | **Never presented as "confirmed zero casualties"** — must read "not documented," not "none occurred" (mirrors the inventory-bias caveat) |
| 11 | Numeric `0` as a placeholder | `initiation`/`reactiva_1`/`reactiva_2` are exactly this case, already excluded (§3); if casualty fields are ever populated, they must be re-audited for the same placeholder-vs-genuine-zero ambiguity before being trusted — not assumed safe by analogy |
| 12 | Nearby event, no evidence of settlement impact | This is Bhitai Malli's actual situation beyond 1 km (§8) — reported as context only, **never** converted into an impact claim |
| 13 | Dated evidence outside the relevance radius | Excluded from scoring entirely, shown as context only (mirrors Hazard Exposure's 1-5 km treatment) |
| 14 | Missing source dataset | `source_data_unavailable`, `null` |
| 15 | Missing settlement coordinates | `settlement_geometry_unavailable`, `null` |
| 16 | Conflicting/inconsistent location labels (`district` mislabeling, `village` 0% populated) | Confirms matching must stay purely spatial (haversine), never via text fields — reconfirms Task 20/23's existing approach, not a new workaround |

### 10. Explainability fields (design only, not implemented)

A future `historical_disaster_detail` object (mirroring
`hazard_exposure_detail`'s pattern from Task 23) would carry: `status`,
`reason`, `score`, `relevance_radius_km`, `qualifying_dated_record_count`,
`distinct_years` (list), `most_recent_year`, `occurrence_points`,
`recency_points`, `repetition_points`, `casualty_points` (always 0
today, with a note explaining why), `excluded_undated_record_count`
(records within radius but excluded for lacking a date — so an officer
can see the difference between "0 within radius" and "records exist but
none are dated"), `contextual_records_outside_radius` (same
1-5 km-style context pattern as Hazard Exposure), `source_dataset`,
`source_feature_count`, `settlement_impact_disclaimer` (verbatim:
*"documented occurrence near the settlement is not the same as
documented impact on the settlement"* — the §5/§9 case-12 distinction,
made explicit), `inventory_bias_disclaimer` (reused/adapted from Task 21
§11), `policy_disclaimer`, `limitations`. Entirely deterministic,
reproducible from the same underlying fields and rules — no free text
or AI-generated narrative anywhere, consistent with Task 23's pattern.

### 11. Governance / limitations

**Assumptions:**
- That `initiati_1` genuinely represents the landslide's documented
  initiation year (as its name and Task 21's prior audit suggest) —
  not independently confirmed against GSI field documentation; could
  instead represent the year of *field survey/mapping* rather than the
  year of *occurrence*. Not resolved here.
- That reusing Hazard Exposure's 1 km radius for a conceptually
  different dimension is an acceptable simplification rather than a
  conflation — argued for in §4, but genuinely debatable.

**Data limitations:**
- Casualty/damage: 0% populated dataset-wide — a dataset-level gap,
  not fixable by better scoring logic.
- Only 19.2% of records are dated at all; the entire 21-record set
  nearest Bhitai Malli is undated.
- `village` 0% populated — no settlement-name matching possible,
  spatial-only forever unless a different dataset is sourced.
- `district` field internally inconsistent — cannot be used as a
  location filter (reconfirmed).
- Single-source risk: this design and Hazard Exposure's Task 23
  implementation currently share their *only* data source — see §7.

**Possible inventory bias:** identical caveat to Task 21 §11 — absence
of a dated record means "not documented," never "did not happen" or
"safe."

**Spatial attribution limitation:** a record within the relevance
radius establishes *proximity of a dated event*, not *documented impact
on the settlement* — §5/§9 case 12's distinction; the settlement never
had a "village" match to any record in this file.

**Temporal coverage limitation:** the dated subset spans 1986-2018 with
a dense 2009-2018 core — a single ~10-year GSI mapping-campaign window
dominates the "recent" signal; nothing in this file is dated after 2018
(the file was acquired in Task 20, so this is expected, not a defect).

**Field-quality limitation:** `reactivati`'s complete redundancy with
`initiati_1` (§3, new finding) means the two date fields together carry
no more information than `initiati_1` alone — documented so a future
task doesn't accidentally treat them as independent evidence.

**Double-counting risk:** see §7 — not fully resolved while both
dimensions share one data source.

**GOVERNANCE DECISION REQUIRED — not silently chosen:**
1. Whether Historical Disaster Evidence should reuse Hazard Exposure's
   1 km radius (§4 Step 1) or have its own independently-justified
   relevance radius, to reduce the structural correlation flagged in §7.
2. Whether the currently-inert 25-point Casualty/Damage component
   should (a) stay reserved, capping the achievable score at 75/100
   until casualty data exists, or (b) have its 25 points redistributed
   across the 3 currently-usable components (making 100 reachable
   today) with a note that the redistribution is provisional. Neither
   option was chosen here.
3. Whether `initiati_1` should be trusted as a true occurrence-year
   field or whether its meaning (occurrence vs. survey/mapping year)
   needs independent confirmation from GSI before being used in a
   recency calculation at all.
4. The exact recency-band and repetition-band cutoffs (§5) — grounded
   in the dataset's observed structure, but still a policy choice like
   Task 21's proximity bands were, requiring the same human sign-off
   before implementation.
5. Whether the Casualty/Damage component's placeholder design (§5) is
   even worth keeping in the schema before any real casualty data
   exists, or should be omitted entirely until a genuinely independent
   incident dataset is sourced.

### 12. Documentation changes

`docs/DECISIONS.md` (this section), `docs/MVP_BACKLOG.md` (pointer
added, not marked complete — this is a design, not an implementation).
`docs/CODEBASE_AUDIT.md`, all raw datasets,
`backend/app/services/risk.py`, the frontend, and all API contracts
were **not modified**.

### 13. Implementation readiness

**Not implementation-ready.** Five governance decisions (§11) remain
open, and one entire component (Casualty/Damage) cannot be populated
from any data currently in this repository. Recommend keeping Historical
Disaster Evidence exactly as it is today in `risk.py`
(`status: "no_scoring_rule"`, `score: null`) until: (a) the five
governance items above are explicitly decided, and (b) a follow-up task
implements the Occurrence/Recency/Repetition components only (Casualty/
Damage genuinely cannot be implemented from this data at all today).

"Historical Disaster Evidence data audit and scoring-methodology design
completed. No scoring rule was implemented and risk.py was not
modified. The dimension should remain score=null,
assessment_status=pending until the governance decisions in §11 are
resolved and, for Bhitai Malli specifically, until dated historical
evidence within a defensible relevance radius exists — which it
currently does not."

## Task 24A — Historical Disaster Evidence governance review (review only, not implemented)

**No code was changed for this task.** `risk.py`, `hazard_exposure.py`,
`schemas/risk.py`, `api/risk.py`, the frontend, and all raw datasets
were not touched. This resolves (or explicitly leaves open) the five
governance items Task 24 §12 raised, one at a time, using only existing
project evidence plus one narrow, read-only metadata check described in
§3 below.

### 1. Decision on spatial radius — **APPROVED**

**Reuse the 1 km radius already approved for Hazard Exposure (Task 21
§5).** Evaluated specifically against the dimension's own meaning
("documented historical occurrence/impact" vs. Hazard Exposure's
"spatial proximity/concentration"): the radius here is used only as a
binary relevance *filter*, not as a scored proximity variable — no
bands exist inside it the way Hazard Exposure's do. A **wider** radius
would only weaken settlement-attribution confidence further, which
directly conflicts with Task 24 §5/Task 24A §7's explicit warning
against conflating "event near settlement" with "event affected
settlement" — Historical Disaster Evidence makes a *stronger* claim
than Hazard Exposure, so it needs at least as tight a boundary, not a
looser one. A **narrower, invented** radius (e.g. 500 m) has no data
grounding and would violate the explicit "do not invent a radius
simply for variety" instruction. The residual concern from Task 24 §7
— that reusing the same radius correlates the two dimensions — remains
real and is recorded as a documented limitation (§9), not a blocker:
no alternative radius is better justified by any evidence available.

### 2. Decision on casualty/damage component (MVP scoring treatment) — **APPROVED (Option C)**

Option A (keep the 25-point component, inert) is explicitly rejected —
it fails Task 24A's own stated requirement not to let a permanently
unavailable component silently cap the achievable score at 75/100.
Between B (redistribute in place) and C (remove from the live MVP
scoring formula, reserve for future data): **C is adopted.** Reasoning:
B keeps a 0-100 scale that *looks* like it could reflect impact
severity once weighted in, inviting an officer to read a high score as
including confirmed casualty/damage evidence when it never does under
current data. C is more architecturally honest — the MVP formula
becomes `Occurrence + Recency + Repetition` only, mechanically
rescaled so the three remaining components' shares sum to 100 (each
component's point share becomes `original_points ÷ 75 × 100`, i.e.
roughly a third each) — this is a deterministic *consequence* of
removing component 4 under Task 24's original equal-split principle,
not a newly invented weighting. The **exact final integer point
values** (e.g. how a 33.33/33.33/33.33 split gets rounded to sum to
100) are left open alongside item 4 below, not decided here. Every
future response must carry an explicit disclaimer that the score does
not reflect casualty/damage severity — see §6/§10.

### 3. Decision on initiati_1 semantic meaning — **GOVERNANCE / DATA PROVENANCE UNRESOLVED**

Checked what's actually available before concluding this, per the
task's instruction not to infer from the field name alone: `docs/DATA_PROVENANCE.md`,
the Task 20 acquisition sidecar
(`data/raw/static/hazards/SOURCE_gsi_nlfc_field_validated_landslides_pauri_garhwal.txt`),
and — as a narrow, read-only check against the same already-approved
FeatureServer endpoint Task 20 already uses (not a new dataset; a
metadata-only request, `GET .../FeatureServer/0?f=json`, made
2026-09-12) — the service's own field/alias definitions. Result: the
server declares `initiati_1`'s alias as literally `"Initiati_1"` and
`reactivati`'s as `"REACTIVATI"` — i.e. **the field's own alias is just
its name re-cased, with no human-readable definition attached anywhere
in the service's own metadata.** (One incidental technical fact
surfaced by this check: `initiati_1`/`reactiva_1`/`reactiva_2`/
`reactivati` are all typed `esriFieldTypeDouble` while `initiation` is
`esriFieldTypeInteger` — confirming they are genuinely distinct fields
in the source schema, not a formatting artifact, but this says nothing
about their semantic meaning.) No codebook, data dictionary, or GSI
publication defining `initiati_1` was found in anything already
acquired by this project. **Verdict: cannot be confirmed as (A)
disaster/event occurrence year, (B) initiation date/year in some other
sense, or (C) survey/mapping year — marked (D) unknown / insufficiently
documented.** This is the single most consequential unresolved item in
this review: `initiati_1` is the *only* input behind three of the four
methodology components (Occurrence, Recency, Repetition) — see §8.

### 4. Decision on recency cutoffs — **REJECTED (as proposed)**

Task 24A required checking the proposed bands (≤10 yrs→25, 10-25
yrs→12, >25 yrs→5) against the real 156 dated records, not just
their internal logic. Result, computed fresh:

| Band | Records | % of dated records |
|---|---|---|
| ≤10 yrs | 19 | 12.2% |
| 10-25 yrs | **136** | **87.2%** |
| >25 yrs | 1 | 0.6% |

**This fails the "reasonable behavior across the actual dataset"
check.** The real dated records cluster tightly in 2009-2018 (ages
8-17 as of 2026), almost entirely inside the single "10-25 yrs" middle
band — 87.2% of all dated evidence would receive the *same* 12-point
recency score, making the component behave as a near-constant rather
than a genuine discriminator (the same failure mode Task 22 found for
Hazard Exposure's activity modifier). It also creates exactly the
"artificial precision" risk flagged in the task brief: the boundary
sits close enough to the real cluster (ages 8-17 vs. a 10-year cutoff)
that ordinary calendar drift (this same dataset re-assessed in 2028
instead of 2026) would silently reshuffle many records across the
10-year line with zero new evidence. **The proposed cutoffs are
rejected as-is.** The general 3-band *structure* is not rejected, but
new boundary values — actually informed by the 2009-2018 clustering
this check surfaced — are needed before approval; **not invented here**
(§9).

### 5. Decision on repeated-event cutoffs — **APPROVED**

Checked the same way, using distinct-year counts within 1 km of each
of the 156 dated records (not raw record count, per the task's
explicit requirement):

| Distinct years within 1 km | Records | % of dated records |
|---|---|---|
| 1 (proposed: 0 pts) | 80 | 51.3% |
| 2 (proposed: 12 pts) | 54 | 34.6% |
| ≥3 (proposed: 25 pts) | 22 | 14.1% |

This is a well-behaved, non-degenerate distribution — no single band
dominates the way recency's did, and the majority case (a single
documented year, no repetition) correctly landing in the 51.3% "0
points" band is the expected, not a flaw. The rule is also confirmed
non-vacuous (Task 24 §5/§9: up to 4 distinct years found within 1 km of
one real record). **The distinct-year-based repeated-event bands are
approved as proposed.**

### 6. Decision on casualty/damage schema presence — **APPROVED**

Per Task 24A's own stated principle ("the MVP should not score
unavailable data, but the architecture can remain extensible"):
casualty/damage stays **out of the live scoring formula** (§2) but
**remains a reserved field in the future `historical_disaster_detail`
explainability structure** (Task 24 §10) — always `null`/`"not
available"` under current data, with a fixed explanatory note (e.g.
"casualty/damage evidence: not available in the current dataset —
excluded from this score, not confirmed absent") rather than being
omitted from the schema entirely. This avoids a future schema-breaking
change if/when casualty data is ever sourced, while guaranteeing today's
score can never silently imply impact evidence it doesn't have.

### 7. Bhitai Malli final status — **no_evidence_found (unchanged)**

Under the approved 1 km radius (§1), Bhitai Malli has **zero GSI
records of any kind** within it — not merely zero *dated* ones. Per
Task 24's own status design (§6/§7 there): `no_evidence_found` is for
"zero records of any kind within the relevance radius"; `insufficient_evidence`
is reserved for the different case where records exist within radius
but none carry a usable date. Bhitai Malli is the former, not the
latter — its nearest record (2.04 km) sits outside the radius entirely,
so there is nothing there to be "insufficient" about. `score` stays
`null`. This is **not** a claim that no disaster has ever affected
Bhitai Malli — only that no documented GSI record exists within the
settlement's immediate vicinity in this one inventory, which is not a
complete historical-disaster record of any kind (§9).

### 8. Final implementation readiness — **NOT IMPLEMENTATION-READY**

**Primary blocker: item 3.** `initiati_1`'s semantic meaning is
confirmed unresolved even after checking the source service's own
metadata (§3), and it is the sole input behind three of this
methodology's four components (Occurrence, Recency, Repetition) — if
its meaning turns out to be "year of field survey/mapping" rather than
"year of landslide occurrence," every numeric output of this dimension
would be systematically mischaracterizing survey activity as disaster
history, which a government-facing risk dashboard cannot responsibly
do. **Compounding blocker: item 4** — the recency cutoffs that would
consume this same field are empirically shown not to discriminate
across the real dataset and must be redesigned. Items 1, 2, 5, and 6
are resolved and do not block; items 3 and 4 do. Per the task's own
final rule, this is stated plainly rather than worked around: **NOT
IMPLEMENTATION-READY.**

### 9. Remaining unresolved governance decisions

- **`initiati_1`'s true semantic meaning** (§3/§8) — would require an
  authoritative GSI field dictionary or direct confirmation from the
  source agency; not resolvable from anything currently in this
  repository or the service's own metadata. This is the central open
  item.
- **Redesigned recency-band cutoffs** (§4) — needs a fresh pass
  grounded in the dataset's actual 2009-2018 clustering (surfaced by
  this task, not by Task 24), then its own approval; not invented here.
- **Exact final integer point values** for the 3-component rescaled
  MVP formula (§2) — the proportional-rescaling *method* is approved,
  the specific resulting numbers are not yet finalized.
- **Whether to pursue a genuinely independent historical-incident
  source** (USDMA Hotspot Plans/DRA reports, Bhuvan's event inventory —
  Task 24 §2/§12, unchanged by this review) — the only way to ever
  populate the Casualty/Damage component or to cross-check `initiati_1`
  against an independent source.

"Task 24A governance review complete. Four of five governance items
were resolved (spatial radius reuse, casualty/damage MVP scoring
treatment, repeated-event cutoffs, casualty/damage schema presence);
one central item — the semantic meaning of `initiati_1` — remains
GOVERNANCE / DATA PROVENANCE UNRESOLVED even after checking the
source's own field metadata, and the recency cutoffs were found, on
evidence, not to behave reasonably across the real dataset. Historical
Disaster Evidence is **NOT IMPLEMENTATION-READY**. No scoring rule was
implemented and risk.py was not modified. Bhitai Malli remains
score=null, status=no_evidence_found."

## Task 24B — GSI field provenance investigation for `initiati_1` (investigation only, not implemented)

**No code was changed for this task.** `risk.py`, `hazard_exposure.py`,
`schemas/risk.py`, `api/risk.py`, the frontend, and all raw datasets
were not touched. This investigates Task 24A's central blocker using
official GSI/NLFC sources only.

### 1. Official sources investigated

- `https://bhusanket.gsi.gov.in/faq.html` — no field-schema content.
- `https://bhusanket.gsi.gov.in/LandslideReport_new.html` — the public
  landslide-reporting *form* is behind a login wall; only the
  authentication shell was reachable, no field definitions visible.
- `https://bhusanket.gsi.gov.in/LS_hazard.html` — general programme
  description only, no attribute-level detail.
- `https://bhusanket.gsi.gov.in/` (portal homepage) — raw HTML
  inspected directly (not just the rendered summary) to find every
  download link.
- **`https://bhusanket.gsi.gov.in/gisserver/rest/services/Hosted/Public_Portal_Dashboard_Map/FeatureServer/0?f=json`**
  — the same FeatureServer endpoint Task 20 already uses, read-only
  metadata request (re-confirms Task 24A §3's finding: field aliases
  are just re-cased field names, no definitions).
- **`https://bhusanket.gsi.gov.in/pics/landslide_report.pdf`** — found
  via the portal homepage's own "Landslide Inventory (Field Validated)"
  card (raw HTML: `onclick="window.open('./pics/landslide_report.pdf',...)"`).
  **This is the single most important source found in this task.** An
  official, GSI-published, India-wide landslide inventory report, 904
  pages, 36,048 numbered records (Sl.No./Slide_No/State/District/
  Slide_Name/NH_SH_Location/Latitude/Longitude/Material Involved/
  Movement Type/**History**). Retrieved in full (315,565,262 bytes;
  a first 30 s request truncated at 15 MB, re-fetched with a 180 s
  timeout to get the complete file) and read with a temporary,
  non-project `pypdf` install (used only for this investigation —
  never added to `backend/requirements.txt` or any committed file).
  Not saved into the repository (315 MB, and not itself project data —
  cited by URL/retrieval date below, consistent with how Tasks 17-19
  cited external sources they didn't acquire as files).
- `https://bhusanket.gsi.gov.in/statewiseLandslideReport.html` (the
  other, smaller "State Wise Landslide Report" link, ~1,179 records) —
  its raw HTML has no static download link (content loads dynamically);
  not pursued further, consistent with this task's "do not download a
  new dataset" instruction for §9's independent-source question — noted
  as unexplored, not concluded either way.

### 2. `initiati_1` provenance findings

The FeatureServer's own metadata (re-checked, matches Task 24A) gives
no definition. **The GSI-published PDF report does.** Its table has a
column literally labeled **"History"**, populated with either `NA` or
a date/year value — for recent (2023) entries, some values carry
**hour-level precision** (e.g. `"24 July 2023 at 06:00hrs"`,
`"2nd to 8th August 2023, 23 August 2023"`) — a precision level that is
only meaningful for an actual event occurrence, not a survey/mapping
date.

**Direct cross-validation against our acquired file**: every `slide_no`
in our 813-record extract that could be automatically located in the
PDF's Uttarakhand section (782/904 pages onward) was compared field-
for-field. **728 of 813 records were matched by slide_no; all 728
(100%) agree exactly** between our `initiati_1` value (0 → treated as
"no date") and the PDF's "History" column value (`NA` → "no date", or
a matching year). Zero disagreements. (The remaining 85/813 were not
automatically matched due to multi-line PDF text wrapping around long
location-name cells — a parsing limitation of this task's extraction
script, not a data discrepancy; none of the 85 were found to
*disagree*, they simply weren't confidently parsed.) A manually spot-
checked sample of 8 records, including Bhitai Malli's own nearest
record, also matched exactly (below).

**This means the field-correspondence question is effectively settled
by direct empirical evidence from an official GSI document**:
`initiati_1` is the FeatureServer's machine-readable export of the same
value GSI itself publishes as "History" in its own inventory report.
What remains open is the deeper *semantic* question — does "History"
mean landslide occurrence date, or something else? No explicit GSI
prose definition of the word "History" was found anywhere in the
material investigated. The contextual evidence (table position
immediately after "Movement Type" in an event-attribute table; no
competing "survey year"/"mapping year"/"field visit date" column
exists anywhere in the report or the 134-field FeatureServer schema —
checked directly, none found; the hour-level precision on recent
entries) all point the same direction, but this is contextual
inference, not an authoritative definition sentence — see §6 for why
this is classified as **PROBABLE BUT NOT CONFIRMED**, not CONFIRMED.

### 3. `reactivati` provenance findings

The PDF report has **only one** temporal column ("History") — no
separate initiation/reactivation split anywhere in GSI's own published
presentation of this data. Combined with Task 24's finding that
`reactivati` is byte-identical to `initiati_1` in every one of the 153
records where both are populated (0 disagreements), and this task's
new finding that the *single* official "History" value matches
`initiati_1` in all 728 automatically-matched records: **classification
(B) field transformation/export artifact is best supported** —
`reactivati` most plausibly carries a duplicated copy of the same
underlying "History" value during the FeatureServer's internal schema/
export process, rather than (A) two intentionally distinct temporal
events (no evidence of a genuine "initiation vs. reactivation" date
pair exists anywhere in the official report) or (C) survey/mapping
metadata (no evidence for this either). One plausible *mechanical*
explanation, offered as inference rather than confirmed fact: the
`_1`/`_2` suffix pattern seen across several fields (`initiati_1`,
`reactiva_1`, `reactiva_2`, `landslid_1`-`landslid_4`) is consistent
with legacy Esri shapefile 10-character field-name truncation, where
two differently-named original fields whose names happened to truncate
to the same 10-character prefix get disambiguated with `_1`/`_2`
suffixes on import — this would explain why `initiati_1` and
`initiation` *look* related by name while behaving as fully unrelated
fields (Task 21/24 already established `initiation` is 99.6%
placeholder-zero and structurally different from `initiati_1`). Not
confirmed, offered as the most parsimonious technical explanation
available.

### 4. GSI concept → dataset field mapping

| GSI concept (from investigated sources) | Dataset field | Evidence | Confidence |
|---|---|---|---|
| "History" (PDF report column) | `initiati_1` | 728/728 exact-value cross-match across real matched records (§2) | **High** (empirical) |
| "History" (PDF report column) | `reactivati` | Byte-identical to `initiati_1` wherever both populated (Task 24 + §3) | **High** (empirical, but redundant not independent) |
| "Occurrence of Landslide (Date & Time)" (implied by the public reporting form's field name, per the task brief — the form itself was not reachable past its login wall, §1) | Not confirmed to map to any specific field | The login-walled form's exact field list could not be inspected | **Unconfirmed** — could not verify this concept exists in the form at all from what was reachable |
| "Movement Type" | `movement_t` | Identical column position/values across PDF and FeatureServer records | High (already established, Task 21) |
| Landslide identifier | `slide_no` | Identical string format across both sources (e.g. `UK/GAR/53J16/2015/1103`) | High (already established, Task 20) |
| Survey/mapping year, project year, field-investigation year | **No corresponding field found anywhere** | Checked all 134 FeatureServer field names and every PDF column — no field named or resembling "survey"/"FS year"/"visit date"/"project year" exists in either source | N/A — this competing interpretation has no supporting field to map to, which itself is evidence *against* interpretation (C) in Task 24A §3 |

### 5. Meaning of the 1986-2018 values (and the wider PDF's 1986-2023 range)

Not inferred from statistical clustering (explicitly excluded per the
task's instruction) — inferred only from documentation/context:
the PDF's own "History" values for the most recent (2023) entries
include full dates and times (`"24 July 2023 at 06:00hrs"`), which is
only sensible as an occurrence timestamp — GSI would have no reason to
log a field survey to the hour. Since our 813-record extract's dated
values (1986, 2005, 2009-2018) were shown in §2 to be the *same*
values as the PDF's "History" column for the same records, the same
interpretation applies to them by direct correspondence, not by
separate inference. No GSI document was found that instead describes
these years as survey/mapping/project years.

### 6. Confidence classification: **PROBABLE BUT NOT CONFIRMED**

Not CONFIRMED, specifically because: no authoritative GSI text was
found that states in so many words "History records the landslide's
occurrence date" (as opposed to some other reading of the word
"History"). What *was* found and is unusually strong for a "probable"
finding: an official GSI-published document, 728/728 exact empirical
value-matches against our own acquired data (not inference — direct
comparison), no competing field/concept found anywhere in either
source for the alternative interpretations (survey/mapping/project
year), and decisive contextual precision evidence (hour-level
timestamps on recent entries) inconsistent with a survey-date reading.
This is a substantially stronger "probable" than Task 24A's "unknown"
— the blocker is now well-characterized, not merely unresolved.

### 7. Evidence supporting the conclusion

Summarized: (a) FeatureServer field metadata — no definition (Task
24A, reconfirmed); (b) GSI's public landslide-reporting form — the
concept-level "Occurrence of Landslide (Date & Time)" terminology named
in this task's own brief could not be independently verified because
the actual form is login-walled — the task's premise here is taken from
the task brief itself, not independently confirmed in this
investigation; (c) the GSI-published "Landslide Inventory (Field
Validated)" PDF report — official, same inventory family (matching
`slide_no`, coordinates, `movement_t`), single "History" column,
728/813 records cross-matched with **zero disagreements**, hour-level
date precision on recent entries; (d) no competing survey/mapping-year
field exists anywhere in either source, checked directly.

### 8. Independent GSI historical-event sources found

- **The "Landslide Inventory (Field Validated)" PDF itself** — while
  extremely useful for resolving §2-§6 above, it is **not** a
  genuinely independent dataset from our FeatureServer extract (same
  `slide_no` identifiers, same coordinates, same movement-type
  conventions — almost certainly the same underlying GSI database,
  differently exported). It also has **no casualty/damage column at
  all** (checked its full column header: Sl.No/Slide_No/State/
  District/Slide_Name/NH_SH_Location/Latitude/Longitude/Material
  Involved/Movement Type/History) — so it does **not** resolve Task
  24/24A's separate casualty/damage data gap.
- **`statewiseLandslideReport.html`** (~1,179 records) — exists, not
  explored (dynamically-loaded content, and this task's own
  instruction not to download/integrate a new dataset for §9) —
  genuinely unresolved, not concluded viable or not.
- **`viewBulletin.html`** (forecast bulletin) and **`impactmap.html`**
  (impact probability map) — seen in the portal's navigation (Task
  24B §1) but not investigated in depth; both are, by name, forward-
  looking/forecast products rather than historical-incident logs, so
  unlikely to help with historical evidence, but not definitively ruled
  out.
- **No authoritative GSI casualty/damage incident-report source was
  found** within this task's scope. The casualty/damage gap identified
  in Task 24 remains unresolved by this investigation.

### 9. Effect on the Task 24 blocker

The blocker is **not removed**, but it is now **much better
characterized**. Per the task's own §8 rule for a PROBABLE-BUT-NOT-
CONFIRMED finding: implementation is **not automatically approved**.
**Additional evidence that would upgrade this to CONFIRMED**: an
explicit GSI-published data dictionary/codebook/proforma document that
defines the "History" field in prose (e.g. "History: date/time of
landslide occurrence, as reported/verified"), or direct written
confirmation from GSI/NLFC. Access to the login-walled public reporting
form (§1) might also help, since the task brief itself suggests it
distinguishes "Occurrence of Landslide (Date & Time)" from "History" as
two separate concepts — if the form does distinguish them, that
would need to be reconciled with this task's finding that our data
only has one such field, mapped to "History"; this was not resolvable
without form access.

### 10. Bhitai Malli — unchanged

`status: "no_evidence_found"`, `score: null` — unchanged, as instructed.
Corroborating finding: the PDF's own "History" value for Bhitai Malli's
nearest record, `UK/GAR/53J16/2015/1103`, is **`NA`** — matching our
`initiati_1=0` exactly. Even GSI's own separately-published report
confirms no documented date exists for the record nearest Bhitai Malli.
The 21 records within 5 km are still not reinterpreted as historical
impact on the settlement.

### Recommended next step

Do not implement Historical Disaster Evidence yet. If a future task can
reach GSI's login-walled public landslide form (§1/§9) or locate an
official GSI data-dictionary/proforma document, that is the specific,
targeted piece of evidence that would resolve the remaining semantic
gap and could plausibly upgrade this finding to CONFIRMED. Absent that,
Historical Disaster Evidence should remain `no_scoring_rule`/`score:
null` in `risk.py`, unchanged from Task 24A.

"Task 24B provenance investigation complete. `initiati_1` is now
empirically confirmed (728/728 exact matches) to correspond to GSI's
own published "History" field, and strong contextual evidence (hour-
precision timestamps, no competing survey-date field anywhere)
indicates this represents landslide occurrence timing rather than
survey/mapping metadata — classified PROBABLE BUT NOT CONFIRMED, not
CONFIRMED, because no explicit GSI prose definition of "History" was
found. No independent casualty/damage-capable historical source was
found. Historical Disaster Evidence remains NOT IMPLEMENTATION-READY.
No scoring rule was implemented and risk.py was not modified. Bhitai
Malli remains score=null, status=no_evidence_found."

## Task 25 — Population / Household Exposure scoring design (design only, not implemented)

**No code was changed for this task.** `risk.py`, schemas, APIs,
frontend, and raw data were not touched. All figures below were
re-verified fresh against the live repository, not assumed.

### 1. Existing population/household data audit

Inspected: `backend/app/database.py`, `backend/app/models/settlement.py`,
`backend/vikalp.db` (schema), `docs/VIKALP_MASTER_SPEC.md`,
`docs/DATA_INVENTORY.md`, `docs/DATA_PROVENANCE.md`, `docs/DECISIONS.md`
(Task 07A/07B), `backend/app/services/risk.py`,
`backend/app/schemas/risk.py`, `backend/app/api/risk.py`, frontend risk
types.

| Item | Status |
|---|---|
| Bhitai Malli population | **AVAILABLE NOW** — `383` (`settlements.population`, `INTEGER NOT NULL`) |
| Bhitai Malli households | **AVAILABLE NOW** — `86` (`settlements.households`, `INTEGER NOT NULL`) |
| Source-backed or demo input? | **Demo planning input, uncited.** `docs/DATA_INVENTORY.md` states plainly: *"No cited external survey, census, or government dataset backs this row."* `docs/VIKALP_MASTER_SPEC.md` lists both figures as fixed demo values with the explicit line *"No other quantitative figures... exist yet. Do not invent them."* Neither number has ever been traced to Census of India, a state survey, or any other authoritative source in this project. |
| Population/households for other settlements | **NOT AVAILABLE** — exactly one row exists in `settlements` (confirmed via `database.py`'s seed logic: a single hardcoded `BHITAI_MALLI` dict, `INSERT OR IGNORE` with a `UNIQUE(name)` constraint — idempotent, never duplicated, never extended). |
| Population density | **NOT AVAILABLE** — no settlement-area figure exists anywhere in the schema or any data file. |
| Settlement area | **NOT AVAILABLE** — confirmed, no field for it in `settlements`, no processed/raw file computes it. |
| Village-boundary polygons | **NOT AVAILABLE** — confirmed against Task 12's boundary work: only **district-level** (ADM2) polygons exist (`data/processed/static/boundaries_uk_demo.geojson`); no village/habitation-level polygon exists anywhere in the repository. |
| Census of India data | **NOT AVAILABLE** — not merely "not yet cited": no Census file, extract, or derived value exists anywhere in `data/raw/` or `data/processed/`. Census is referenced only as a **future/planned source** in `DATA_INVENTORY.md`'s "AVAILABLE LATER" columns — its presence there must not be mistaken for actual data, per this task's own explicit warning. |
| Age/sex/disability/dependency data | **NOT AVAILABLE** — `risk.py`'s own `_DimensionSpec` for this dimension already lists `vulnerable_subgroup_counts` as a `missing_inputs` entry (confirmed fresh, unchanged since Task 07B); no such field exists in the schema. |
| Household-level personal data | **NOT AVAILABLE, and explicitly out of scope** — `docs/VIKALP_MASTER_SPEC.md`'s "Explicitly out of scope" list names *"household-level personal-data management"* directly. Only an aggregate household **count** exists, never names/composition/contact details. |

### 2. Exact Bhitai Malli inputs

`population = 383`, `households = 86` — both plain `INTEGER NOT NULL`
columns, no confidence flag, no source-citation column, no as-of date.
Implied average household size: `383 ÷ 86 ≈ 4.45` people/household —
computed here only to check internal arithmetic consistency (a
positive, non-degenerate ratio), **not used as a risk signal or
compared against any threshold**, per this task's explicit instruction.
No source in this repository supports treating 4.45 as "normal,"
"high," or "low" — that comparison would require a cited average-
household-size reference, which does not exist here.

### 3. Definition of Population / Household Exposure

**Proposed definition**: *the number of people and households
physically present in the settlement who would be exposed if a hazard
event affected this location* — a pure **exposure-count** dimension,
not a severity or susceptibility judgment.

**Explicitly excluded** (belong to other dimensions, per the task's
own instruction and consistent with how Task 21/24 already assigned
casualty/severity concepts elsewhere):
- Poverty, income, livelihood → **Vulnerability**.
- Age, disability, health status, dependency → **Vulnerability** (the
  *severity of impact given exposure*), while a raw **count** of
  elderly/children/disabled people (i.e. "how many additional people
  are exposed," not "how badly would they be affected") would belong
  to *this* dimension if ever sourced — see §8 for why this split
  avoids double-counting the same `vulnerable_subgroup_counts` input
  risk.py already lists as missing.
- Hazard intensity, landslide proximity → **Hazard Exposure** (Task 23,
  already implemented).
- Historical casualties → **Historical Disaster Evidence** (Task 24,
  already assigned there specifically to avoid this exact conflict).

**Why this must stay independent from Vulnerability**: exposure
answers *"how many"*; vulnerability answers *"how badly would they be
affected, and how well could they cope."* A settlement with a large,
wealthy, well-housed population and a settlement with a small,
impoverished, poorly-housed population can have identical exposure
counts but very different vulnerability — collapsing them into one
number would hide exactly the distinction VIKALP's 5-dimension model
was designed (Task 07A) to preserve.

### 4. Candidate scoring approaches evaluated (Step 3, all six)

| Approach | Data required | Advantages | Disadvantages | Supported by current VIKALP data? | India-wide generalization | Arbitrary assumptions |
|---|---|---|---|---|---|---|
| A. Absolute population bands | Population only | Simple, transparent, officer-readable | Band edges are inherently a policy choice; can saturate (everything above the top edge scores identically) if edges are set for one settlement's scale | **Partially** — population exists; band edges do not | Poor unless edges are log-scaled or periodically re-validated against real distribution | Band edge values (unless sourced) |
| B. Household bands | Households only | Same simplicity as A | Households are a *derived proxy* for population (see §8), so scoring them independently double-counts settlement size under a different name | Partially — households exist; band edges do not | Same generalization problem as A | Band edge values |
| C. Population + household combined | Both | Naively "uses more data" | High correlation between the two inputs (§8) risks double-counting the same underlying fact twice unless one is explicitly demoted to a modifier/context role | Data available; combination rule/weights are not | Same problem as A/B, doubled | Combination weights *and* both sets of band edges |
| D. Population density | Population + settlement area | Normalizes for settlement size/shape, arguably closer to "exposure concentration" | **No settlement area or boundary polygon exists anywhere in this repository** | **NOT AVAILABLE NOW** — no denominator | Would generalize well *if* area data existed | Density band edges, plus the area data itself |
| E. Relative ranking / percentile against available settlements | Multiple settlement records | No band edges to invent — purely data-derived | **Meaningless with N=1** — a percentile of one point is undefined/trivial | **NOT AVAILABLE NOW** | Would generalize well once enough settlements exist, but not before | None once enough data exists — but currently just as arbitrary as any other approach, since "1st of 1" carries no information |
| F. Population-normalized exposure (vs. a reference distribution/ceiling) | A reference population distribution or ceiling value | Fewer discrete edges than banding; smoother | Still requires at least one reference constant (a ceiling or a real distribution) that doesn't exist yet | **NOT AVAILABLE NOW** without a chosen reference constant | Best long-term option *if* the reference constant is eventually sourced (e.g. Census-derived) | The single reference constant, until sourced |

**Explicit statement per this task's Step 4 instruction**: with exactly
one settlement record in the system, **relative ranking/percentile
scoring (E) cannot be responsibly used for the current MVP** — there
is no distribution to rank against. This is not a data-quality
complaint about Bhitai Malli; it is a structural fact about an N=1
dataset.

### 5. Government/official basis investigated

Checked `docs/DATA_INVENTORY.md`/`docs/DECISIONS.md` for any
already-recorded Census/NDMA/MHA research from prior tasks (found
general NDMA landslide/flood-hazard-atlas research, Task 16-19; nothing
population-exposure-specific) and did one direct, targeted check of
`ndma.gov.in`'s homepage for population-exposure terminology — found
only high-level programmatic language (Prevention/Mitigation/
Preparedness/Response, vulnerability reduction, capacity building), no
specific "population exposure," "affected population," or numeric
scoring methodology visible on the page itself.

**Conclusion**: the general **Hazard–Exposure–Vulnerability–Capacity**
framing that international/India disaster-risk-management guidance is
broadly built around (of which "exposed population/households" is a
standard, uncontroversial concept) supports VIKALP's existing
5-dimension separation *conceptually* — it does **not** supply a
specific numeric 0–100 formula or India-specific population/household
thresholds. **Census of India's village-level Primary Census
Abstract/Village Directory is the natural authoritative source for
population/household counts and a real settlement-size distribution,
but it has not been acquired or cited anywhere in this repository** —
confirmed directly, not assumed. Per this task's explicit instruction:

**"VIKALP's 0-100 population/household exposure score is a prototype
policy configuration, not an official government standard."**

No official numeric population-exposure scoring standard was found or
is claimed.

### 6. Candidate scoring methodologies (Step 6, concrete designs)

**Candidate A — Population-primary absolute bands + household as
context/consistency check.**
- Formula: `score = band_score(population)`, 4-5 monotonic bands
  (illustrative shape only — e.g. very small / small / medium / large
  / very large — **no specific edge values are proposed here**, since
  none can currently be justified; see below).
- `households` is **not** independently scored. It is used only for:
  (a) officer-facing context/display, and (b) a data-integrity check
  (average household size = population ÷ households; flagged only if
  outside a broad sanity range, not scored).
- Every band edge: **NOT JUSTIFIED** — no official source was
  confirmed (§5), and N=1 settlement means no data-derived edges are
  possible (§4). This candidate cannot be implemented with real
  numbers until either an official settlement-size classification is
  sourced and cited, or enough real settlement records exist to derive
  edges responsibly.
- Missing-data behavior: see §7.
- Scalability: **structurally reusable India-wide** (any population
  count can be banded), but **linear/fixed bands calibrated near
  Bhitai Malli's scale (~380) would saturate** for larger settlements
  — everything above the top edge would score identically, destroying
  discrimination exactly where India-wide deployment needs it most
  (§9).

**Candidate B — Population-only continuous normalized score.**
- Formula (illustrative structure only):
  `score = clamp(100 * log(population + 1) / log(REFERENCE_MAX + 1), 0, 100)`
  — a smooth, monotonic transform with **one** constant
  (`REFERENCE_MAX`, "largest plausible settlement population this
  system will ever score") instead of 4-5 band edges.
- `households` not used at all in the score — sidesteps the
  double-counting question by construction, at the cost of losing
  household-level explainability in the score itself (still shown as
  context).
- `REFERENCE_MAX`: **NOT JUSTIFIED** — no source confirms a specific
  value; would need either an official ceiling (e.g., a Census-derived
  "largest rural settlement" figure) or an explicit policy choice,
  neither of which exists today.
- Scalability: the **log transform generalizes much better India-wide**
  than fixed linear bands (§9) — this is this candidate's main
  advantage over A, not its data-readiness (identical to A: one
  unjustified constant instead of several).

**Candidate C — Population + household weighted combination (evaluated
and NOT recommended).**
- Formula: `score = w1 * population_band_score + w2 * household_band_score`.
- Presented specifically to show why it is rejected: population and
  households are **highly correlated, not independent signals** (§8)
  — Bhitai Malli's own 383/86 pair moves together arithmetically
  (`households ≈ population ÷ average_household_size`). Weighting and
  summing two correlated measurements of essentially the same
  underlying fact ("how big is this settlement") inflates its
  influence on the dimension score without adding genuinely new
  information — the same double-counting failure mode already
  identified and avoided in Task 21 (proximity vs. density) and Task 24
  (proximity vs. repeated-event count).
- **Not recommended.** Kept in this report only as the rejected
  alternative Step 6 requires documenting.

### 7. Missing-data behavior

Statuses reused from the existing vocabulary where they genuinely
apply; **`settlement_geometry_unavailable` does not apply to this
dimension** — Population/Household Exposure needs no coordinates, only
the settlement's `population`/`households` fields, so this status is
noted as inherited-but-inapplicable rather than force-fitted.

| # | Case | Status | Notes |
|---|---|---|---|
| 1 | Population available + households available | `sufficient_evidence` | Bhitai Malli's actual case — see §10 for why this still doesn't produce a score today |
| 2 | Population available + households missing | `sufficient_evidence` (Candidate A/B only — population is primary) | Household-based context/consistency-check simply omitted, never fabricated. Under Candidate C this case would be `insufficient_evidence` instead — a genuine, design-dependent difference worth noting |
| 3 | Population missing + households available | `insufficient_evidence` | Households are never silently treated as a population proxy (no cited average-household-size conversion exists, §2) — **GOVERNANCE DECISION REQUIRED** if a fallback conversion is ever proposed |
| 4 | Both missing | `no_evidence_found` | Currently structurally impossible under the live schema (`INTEGER NOT NULL` on both columns) — defined anyway for a future, less-complete India-wide dataset |
| 5 | Population = 0 | `insufficient_evidence` (data-quality flag), unless explicitly confirmed as an intentional currently-uninhabited record | A settlement record existing with population 0 is more likely a data error than a real "zero exposure" state — never silently scored as 0 |
| 6 | Households = 0 (population > 0) | Population-based score may proceed (Candidate A/B); flagged as a data-quality inconsistency | People existing with zero households is logically inconsistent — never silently accepted |
| 7 | Invalid/negative values | `source_data_unavailable` (data-quality rejection) | The live schema has **no `CHECK` constraint preventing negative values** — a real, currently-unenforced gap worth flagging for a future implementation task, not fixed here |
| 8 | Extremely large values | Flagged for officer review before scoring, not silently scored | Any specific "too large" ceiling is **POLICY CONFIGURATION**, not sourced — not proposed with a specific number here |
| 9 | Only one settlement available | Blocks Candidate E/D only (§4) — does not block A/B/C | Bhitai Malli's actual situation |
| 10 | Insufficient data for normalization (no `REFERENCE_MAX`, no distribution) | Dimension-level: methodology not yet approved (`no_scoring_rule`-equivalent), distinct from any single settlement's own evidence status | This is the actual current state (§13/§14) |

### 8. Double-counting analysis

Population and households are **not independent signals** —
`households ≈ population ÷ average_household_size`, so a settlement's
household count is largely *derivable* from its population rather than
new information. Recommendation: **population is the primary, scored
signal; households serve only as supporting context and a data-
integrity check**, never as a second independently-weighted component
(rules out Candidate C, §6). Separately, the `vulnerable_subgroup_counts`
input risk.py already lists as missing for this dimension could, if
ever sourced, overlap with Vulnerability's concerns — resolved the same
way Task 24 resolved casualty/damage-vs-Historical-Disaster-Evidence:
a raw **count** of vulnerable individuals (elderly/children/disabled —
"how many more people are exposed") belongs here; the **severity/
coping-capacity** implications of that (housing quality, economic
capacity, service access) belong to Vulnerability (§3). Recording this
split now, before either input exists, is meant to prevent a future
task from scoring the same fact twice.

### 9. India-wide scalability analysis

A fixed linear band scheme (Candidate A with naively-chosen round-number
edges) calibrated near Bhitai Malli's scale would **saturate** for
larger settlements — every settlement above the top edge would score
identically, which is exactly the "near-constant, low-discrimination"
failure mode Task 22 already found for Hazard Exposure's activity
modifier (93.5% in one bucket) and Task 24A found for the original
recency bands (87.2% in one bucket). Population in India genuinely
spans orders of magnitude (small hamlets of a few dozen people through
census towns of tens of thousands), so **a log-scaled or otherwise
non-linear transform (Candidate B) generalizes structurally better**
than fixed linear bands, independent of which specific constant is
eventually chosen. Whichever candidate is approved, the actual
reference constant(s) — `REFERENCE_MAX`, or real band edges — should
eventually be grounded in **Census of India's village-level population
distribution** (Primary Census Abstract/Village Directory), the only
dataset type that could responsibly supply either a real distribution
(enabling Candidate E once enough VIKALP settlement records also
exist) or a defensible national ceiling (Candidate B). This dataset has
not been acquired or cited in this repository (§5) — flagged as a
future sourcing task, not resolved here.

### 10. Bhitai Malli dry run (design demonstration only — no score produced)

Inputs: `population=383` (present, non-null, non-negative, not
suspiciously large), `households=86` (same), average household size
4.45 (internally consistent, not flagged by the data-integrity check).
**Per-settlement evidence status: `sufficient_evidence`** under
Candidate A or B — both required inputs are present and pass every
data-quality check in §7.

**But the dimension-level methodology itself is not approved**: no
band edges (Candidate A) or `REFERENCE_MAX` constant (Candidate B) has
been sourced or policy-approved (§6/§13). So, exactly like every other
unscored dimension in this project, **having sufficient per-settlement
evidence does not mean a score can legitimately be calculated today.**
This dry run does not change Bhitai Malli's real behavior in the
deployed system in any way — `risk.py` already reports this dimension
as `status: "no_scoring_rule"`, `score: null`, `evidence`: the two raw
values — exactly right, and unchanged by this task. No score is
produced or implied here, consistent with the task's explicit
instruction not to manufacture one.

### 11. Explainability schema (design only, not implemented)

A future `population_exposure_detail` object (mirroring
`hazard_exposure_detail`/the Task 24 `historical_disaster_detail`
design pattern) would carry: `status`, `score`, `population`,
`households`, `average_household_size` (derived, display-only),
`population_source`/`household_source` (today: `"Demo planning input —
uncited"`, per `docs/DATA_INVENTORY.md`), `methodology_id`/`version`
(which candidate + constant set was used, once approved),
`thresholds_or_normalization_constants` (each one individually labeled
SOURCE-BACKED / DATA-DERIVED / POLICY CONFIGURATION / NOT JUSTIFIED —
never silently presented as settled), `data_quality_flags` (e.g.
"unusual average household size," "zero population with nonzero
households"), `missing_inputs`, `evidence_limitations` (including the
single-settlement/no-comparison-distribution limitation, always shown,
not just when it happens to matter), `policy_disclaimer`. Fully
deterministic, reproducible from the same two DB fields and documented
rules — no free text or AI-generated narrative anywhere.

### 12. Governance decisions

| Decision | Status | Reason |
|---|---|---|
| Dimension definition (pure exposure count, independent from Vulnerability) | **APPROVED** | Consistent with Task 07A's original 5-dimension design and this task's own instruction |
| Population as primary signal; households as context/consistency-check only | **APPROVED** | Resolves the double-counting risk in §8 without discarding household data entirely |
| Relative ranking / percentile scoring (Candidate E) | **BLOCKED BY MISSING DATA** | N=1 settlement — no distribution exists to rank against |
| Population density scoring (Candidate D) | **BLOCKED BY MISSING DATA** | No settlement area/boundary polygon exists anywhere in the repository |
| Specific population band edges (Candidate A) | **REQUIRES POLICY APPROVAL / NOT JUSTIFIED** | No official source confirmed; no data-derived alternative possible with N=1 |
| `REFERENCE_MAX` constant (Candidate B) | **REQUIRES POLICY APPROVAL / NOT JUSTIFIED** | Same reason |
| Weighted population+household combination (Candidate C) | **REJECTED** | Double-counts a single underlying signal (§8) |
| Sourcing Census of India village-level data to ground constants | **REQUIRES OFFICIAL SOURCE CONFIRMATION** | Natural authoritative source identified (§5/§9) but not acquired; a future task's scope |
| `vulnerable_subgroup_counts` inclusion | **BLOCKED BY MISSING DATA** | Field does not exist in the schema or anywhere else |
| Households-only fallback when population is missing | **GOVERNANCE DECISION REQUIRED** | No cited average-household-size conversion exists to responsibly support this; currently recommended against (`insufficient_evidence`) but not finally decided |
| Missing-data status vocabulary (§7) | **APPROVED** | Reuses existing project terminology consistently; `settlement_geometry_unavailable` explicitly marked not applicable |
| Explainability schema (§11) | **APPROVED (design only)** | Not implemented in this task |
| Negative-value / extreme-value validation | **REQUIRES POLICY APPROVAL** | The live schema has no `CHECK` constraint preventing invalid values; specific sanity-bound numbers are not proposed here (would be NOT JUSTIFIED without a source) |

### 13. Implementation readiness verdict

**NOT IMPLEMENTATION-READY.**

Unlike Historical Disaster Evidence's blocker (an *ambiguous field
meaning*), this dimension's data is unambiguous, complete, and
internally consistent for Bhitai Malli — the blocker here is different:
**every numeric constant any candidate methodology needs (band edges or
a reference ceiling) is currently NOT JUSTIFIED**, no official source
was found or confirmed (§5), and the N=1 settlement dataset rules out a
data-derived alternative (§4/§9). Per this task's own final rule,
implementation is recommended only once the methodology is sufficiently
grounded and governance decisions are resolved — neither condition is
met yet. Recommend keeping this dimension exactly as it is today in
`risk.py` (`status: "no_scoring_rule"`, `score: null`, `evidence`: the
two raw values) until either (a) an official Indian settlement-size
classification is sourced and cited, or (b) enough real settlement
records exist to derive edges responsibly, and a specific candidate
(A, B, or a refinement) is formally approved as VIKALP policy
configuration.

"Population/Household Exposure scoring methodology was designed for
review only. No scoring rule was implemented and risk.py was not
modified. The dimension should remain score=null,
status=no_scoring_rule until a specific candidate methodology's
numeric constants are sourced or policy-approved — which they
currently are not."

## Task 26 — Vulnerability scoring design (design only, not implemented)

**No code was changed for this task.** `risk.py`, schemas, APIs,
frontend, and raw/processed data were not touched. All figures below
were re-verified fresh against the live repository.

### 1. Complete vulnerability data audit

Inspected: `backend/app/services/risk.py`, `backend/app/schemas/risk.py`,
`backend/app/api/risk.py`, `backend/app/models/settlement.py`,
`backend/app/database.py`, `backend/vikalp.db` schema, everything under
`data/raw/` and `data/processed/`, `docs/DATA_INVENTORY.md`,
`docs/DATA_PROVENANCE.md`, `docs/DECISIONS.md`, `docs/MVP_BACKLOG.md`.

`risk.py`'s `_DimensionSpec` for Vulnerability, confirmed fresh:
`available_inputs={}` (empty), `missing_inputs=["housing_construction_type",
"distance_to_hospital", "distance_to_road", "economic_vulnerability_index"]`,
weight 15% — unchanged since Task 07B.
`docs/DATA_INVENTORY.md` states, for this dimension, plainly:
**"Available evidence: None."**

| Search term | Finding |
|---|---|
| Age / elderly / children | **NOT AVAILABLE** — no age-structure field anywhere |
| Disability / chronic illness / mobility limitations | **NOT AVAILABLE** — no field anywhere |
| Gender-related indicators | **NOT AVAILABLE** — no field anywhere |
| Dependency ratio | **NOT AVAILABLE** — not derivable, no age data exists to compute it from |
| Poverty / income | **NOT AVAILABLE** — no field anywhere |
| Housing condition / construction type | **AVAILABLE LATER** — already named as `housing_construction_type` in `risk.py`'s own `missing_inputs` (Task 07B) — a known future need, not present data. Distinct from `households` (the household **count**, already assigned to Population/Household Exposure, Task 25) |
| Livelihood dependence | **NOT AVAILABLE** — `docs/DATA_INVENTORY.md` states directly: *"Livelihoods/environment: None"* |
| Road accessibility | **AVAILABLE LATER** — `distance_to_road` already named in `missing_inputs`; no road GIS layer exists anywhere in the repository to compute it from yet |
| Evacuation / hospital accessibility | **AVAILABLE LATER** — `distance_to_hospital` already named in `missing_inputs`; no healthcare-facility POI dataset exists |
| Social vulnerability index | **NOT AVAILABLE** — no such field or dataset exists; `economic_vulnerability_index` is named in `missing_inputs` as a future single economic-capacity input, not a full composite social-vulnerability index |
| Vulnerable subgroup counts / any existing structure | **NOT AVAILABLE, and not this dimension's concern even once sourced** — `vulnerable_subgroup_counts` is named in **Population/Household Exposure's** `missing_inputs` (Task 25 §1), not Vulnerability's. This boundary is deliberate — see §5. |

**Verdict: AVAILABLE NOW = nothing.** This is the most severe data gap
of any dimension addressed so far in this project — more severe than
Historical Disaster Evidence's *ambiguous* GSI data (Task 24) and
Population/Household Exposure's *present-but-unthresholded* demo data
(Task 25). Vulnerability has zero backing data of any kind, and this
has been true, unchanged, since Task 07B.

### 2. Definition of Vulnerability

**Exposure** (Population/Household Exposure, Task 25): *how many
people/households are physically present and would be exposed to a
hazard event.*

**Vulnerability** (this dimension): *given that exposure, how
susceptible are those people/households to harm, and how limited is
their ability to cope with, respond to, or recover from a hazard
event* — a function of (a) individual/household characteristics that
increase physiological or economic susceptibility (age, disability,
health, economic capacity, housing quality), and (b) settlement-level
coping/response infrastructure (access to medical care, access to a
road for evacuation or relief). It is **not** a function of hazard
characteristics, population size, or past event history — those are
Hazard Exposure's, Population/Household Exposure's, and Historical
Disaster Evidence's concerns respectively (§5).

### 3. Candidate vulnerability signals (evaluated individually)

| Signal | What it measures | Why it's vulnerability, not exposure/hazard | Data required | In VIKALP now? | India-wide measurable? | Overlap risk | Authoritative Indian source? |
|---|---|---|---|---|---|---|---|
| Elderly / children **proportion** (not count) | Age-based physiological susceptibility per capita | A rate answers "how susceptible is this population," distinct from a raw count answering "how many are exposed" | Census age-group tables, village-level | **No** | Yes — Census methodology is nationally uniform | Would overlap Population/Household Exposure **only if scored as a raw count** — kept to proportions, per §5 | Census of India (age-structure tables are a well-established Census output; not independently re-verified live in this task — see §4) |
| Persons with disabilities (proportion) | Disability-based susceptibility, incl. evacuation difficulty | NDMA has a dedicated guideline naming this exact concept (§4) | Census disability data, village-level | **No** | Yes, in principle — currency/granularity not independently verified | Low, if proportion-based | **Confirmed**: NDMA's own guideline list includes "Guidelines on Disability Inclusive Disaster Risk Reduction" (Sept 2019) — see §4 |
| Chronic illness / general health status | Health-based susceptibility | Plausible in principle | A uniform, India-wide, village-level health dataset | **No** | **Weak** — health data is typically held by state health departments, not standardized nationally at this granularity | Low | Not confirmed — no uniform national source identified |
| Mobility limitations | Physical capacity to evacuate | Plausible, but substantially overlaps disability | Same as disability | **No** | Same caveats as disability | **High overlap with disability** — recommend not scoring as a separate signal | Not separately confirmed; subsumed under disability guidance |
| Gender-related indicators (e.g. female-headed households, sex ratio) | Documented in DRR literature as a vulnerability dimension in some contexts | Real concept in the field, but requires careful non-stereotyping design if ever scored | Census sex-ratio/household-headship tables | **No** | Yes, Census-derivable | Low if handled carefully | Not independently confirmed this task (no specific NDMA title found, unlike disability) — flagged, not asserted |
| Dependency ratio | Economic-capacity proxy (non-working-age ÷ working-age population) | A settlement with a high dependency ratio has fewer able-bodied responders/earners per dependent | Census age-group data | **No** | Yes, Census-derivable | Low (a derived rate, not a duplicate count) | Standard demographic concept; not a scored government standard confirmed here |
| Poverty / income (e.g. SECC-based deprivation) | Economic capacity to prepare/recover (rebuild, relocate, absorb loss) | Directly matches `economic_vulnerability_index`, already named in `risk.py`'s `missing_inputs` | SECC 2011 or equivalent deprivation data | **No** | Yes, India-wide, though SECC 2011's currency/village-level public accessibility is not verified here | Low | SECC 2011 is a known real Indian government dataset used in welfare-scheme (e.g. PMAY-G) deprivation ranking — general knowledge, not independently re-fetched this task |
| Housing condition / construction type | Physical structure resilience (e.g. kutcha/semi-pucca/pucca) | Directly matches `housing_construction_type`, already named in `missing_inputs` | Census housing-census tables | **No** | Yes — kutcha/pucca classification is a standard, nationally uniform Census housing-census category | Low — distinct from the household **count** (Population/Household Exposure) | Census of India housing tables (general knowledge; not independently re-verified live this task) |
| Livelihood dependence | Economic exposure to land/agriculture-based loss | Plausible | A livelihood/occupation survey | **No** — `docs/DATA_INVENTORY.md`: "Livelihoods/environment: None" | Uncertain | Low | Not investigated — no VIKALP data exists to evaluate against |
| Road accessibility (`distance_to_road`) | Evacuation/relief-response capacity | A coping-capacity signal, not a hazard-proximity signal (§5) | Road GIS layer (none exists in VIKALP) + settlement point | **No** | Yes, once road data is sourced — computable via the same geodesic-distance pattern Task 23 already established | Low, if never used to infer hazard likelihood | Concept-level only; no specific numeric standard found |
| Hospital/medical accessibility (`distance_to_hospital`) | Medical-response capacity | Same reasoning as road accessibility | Healthcare-facility POI dataset (none exists) + settlement point | **No** | Yes, once facility data is sourced | Low, same caveat | Concept-level only |
| Composite social vulnerability index (e.g. SoVI-style) | A single blended index | Attractive in theory | Multiple indicators + a reference distribution | **No** | Contingent on all sub-indicators existing | Depends entirely on indicator selection | **No India-specific official composite index was found** — adopting a foreign academic framework (e.g. SoVI, US-Census-based) directly would need to be labeled an adapted policy configuration, never an official Indian standard |

### 4. Official-source research findings

Checked NDMA's guidelines listing page directly
(`https://ndma.gov.in/ndma-guidelines`). **Confirmed, by official
document title** (not inferred): NDMA has published *"Guidelines on
Disability Inclusive Disaster Risk Reduction"* (Sept 2019),
*"Updated National Guidelines For Mental Health and Psychosocial
Support Services in Disasters"* (2023), *"Guidelines on Temporary
Shelters for Disaster-Affected Families"* (2019), and *"National
Guidelines on Community-Based Disaster Risk Reduction"* (2024). These
titles **confirm NDMA formally recognizes disability, mental health,
household shelter needs, and community-level vulnerability as
legitimate disaster-management planning concerns** — concept-level
confirmation only; the page itself shows titles/dates/links, not
full-text content, so no specific numeric methodology was found or is
claimed from these documents.

A direct check of Census of India's table listing
(`censusindia.gov.in/census.website/data/census-tables`) **failed with
a TLS certificate error** — reported honestly rather than silently
omitted. Census of India's age-structure, disability, and housing
(kutcha/pucca) data categories are widely known, well-established
public information, cited here as **general knowledge, not
independently re-verified live in this task**. The same caveat applies
to SECC 2011 (mentioned §3) as a known real deprivation-data source.

**No official Indian source defining a 0-100 (or any numeric)
population/household vulnerability scoring formula was found or is
claimed.** Per this task's explicit instruction:

**"VIKALP's eventual Vulnerability score is a prototype policy
configuration, not an official government standard."**

### 5. Double-counting analysis (all four other dimensions)

| Pair | Overlap risk | Resolution |
|---|---|---|
| **Population/Household Exposure vs. Vulnerability** | Both could touch age/disability data | **Counts → Population/Household Exposure** ("how many are exposed" — Task 25 §8's `vulnerable_subgroup_counts` assignment, unchanged). **Proportions/rates and conditions → Vulnerability** ("how susceptible are they, per capita," plus housing *condition*, economic capacity). Household **count** stays with Population/Household Exposure; housing **construction type/quality** stays with Vulnerability — already cleanly split in `risk.py`'s own existing `missing_inputs` lists, reconfirmed here rather than re-invented. |
| **Hazard Exposure vs. Vulnerability** | `distance_to_road`/`distance_to_hospital` could be mistaken for hazard-proximity signals | They measure **response/evacuation capacity**, not hazard likelihood or location — a settlement can have zero nearby hazard evidence (low Hazard Exposure, Task 23) yet still have poor road access (high Vulnerability). Genuinely independent axes as long as Vulnerability's accessibility signals are never used to infer hazard presence, and Hazard Exposure's landslide-inventory evidence is never used to infer coping capacity. |
| **Historical Disaster Evidence vs. Vulnerability** | Casualty/damage severity could be scored in either | Already resolved in Task 24 §10: casualty/damage severity belongs to Historical Disaster Evidence (a past-event-impact fact), not Vulnerability (a present-day susceptibility characteristic) — reaffirmed, unchanged here. |
| **Terrain / Physical Susceptibility vs. Vulnerability** | Steep terrain plausibly *causes* poor road access, so the two could seem related | Terrain scores the **land's** physical stability (slope, elevation, geology); Vulnerability scores the **settlement's** socio-economic/infrastructural condition (housing, economic capacity, accessibility). Related in real-world cause, but each dimension scores only its own defined input — Terrain never scores accessibility, Vulnerability never scores slope/elevation. |

### 6. Candidate methodologies (Step 8, all four)

**Candidate A — Weighted vulnerable-subgroup proportion.**
- Formula: `score = clamp(Σ w_i × proportion_i, 0, 100)` for subgroups
  {elderly%, children%, disabled%, ...}.
- Constants: per-subgroup weights `w_i` — **NOT JUSTIFIED** (no
  official weighting scheme found); proportion-to-score scaling —
  **NOT JUSTIFIED**.
- Data requirement: Census-derived village-level demographic
  breakdown — **NOT AVAILABLE**.
- Strengths: maps directly to NDMA-recognized categories (§4);
  transparent, officer-explainable, no reference-distribution needed.
- Weaknesses: a missing subgroup complicates the combined sum — must
  never default a missing subgroup's contribution to 0 (§8).
- Scalability: strong once Census data is sourced (nationally uniform
  methodology).
- Double-counting risk: **low**, strictly proportion-based (§5).

**Candidate B — Vulnerability-index approach (composite, e.g.
SoVI-style).**
- Formula: a weighted/normalized blend (e.g. z-scores or PCA-style
  combination) of multiple indicators into one index.
- Constants: normalization ranges and indicator weights — mostly **NOT
  JUSTIFIED** without either an explicitly-cited, adapted academic
  framework (clearly labeled as an *adaptation*, never an official
  Indian standard — §3) or a real reference distribution.
- Data requirement: same indicators as A, **plus a reference
  distribution or percentile basis — blocked by the same N=1-settlement
  problem Task 25 §4 already established** for Population/Household
  Exposure's Candidate E.
- Strengths: statistically captures indicator correlation.
- Weaknesses: harder to keep fully officer-explainable step-by-step;
  requires data this project does not have a path to yet.
- Scalability: good in theory at national scale, **unusable today**.
- Verdict: **not recommended for the current MVP** — blocked by data
  availability, not a flaw in the concept.

**Candidate C — Susceptibility + coping-capacity approach (two
sub-components).**
- Formula: `score = w1 × susceptibility_component + w2 ×
  coping_capacity_component`, where `susceptibility_component` is a
  Candidate-A-style demographic/economic proportion score, and
  `coping_capacity_component` is derived from accessibility/housing
  signals (`distance_to_road`, `distance_to_hospital`,
  `housing_construction_type`).
- Constants: `w1`/`w2` split, plus each sub-component's internal
  thresholds — **NOT JUSTIFIED**.
- Data requirement: **all of it** — the most data-hungry candidate,
  currently furthest from implementable.
- **Notable finding**: this two-part structure is not an invented
  framework — it maps directly onto `risk.py`'s own `missing_inputs`
  list for this dimension, unchanged since Task 07B:
  `housing_construction_type` + `economic_vulnerability_index` read as
  a susceptibility-side pairing, and `distance_to_hospital` +
  `distance_to_road` read as a coping-capacity-side pairing. This
  structure was implicitly anticipated by the project's own
  architecture years before anyone designed it explicitly.
- Scalability: **does not require a reference distribution** (unlike
  B) — accessibility is computed via direct geodesic distance (the
  same pattern Task 23 already established for Hazard Exposure), not
  population-relative ranking. Each sub-component sources
  independently (Census for susceptibility, road/facility POI data for
  coping-capacity), which scales cleanly to new regions one dataset at
  a time.
- Double-counting risk: **low**, per §5.
- Verdict: **recommended as the target long-term structure** (§7) —
  explicitly not implementable today.

**Candidate D — Data-derived percentile/index.**
- Same blocker as Population/Household Exposure's Candidate E (Task 25
  §4): a percentile against a distribution of **one** settlement is
  meaningless. Ruled out for the current MVP; not re-derived in full
  here, cross-referenced to Task 25's established reasoning.

### 7. Recommended methodology

**Candidate C's conceptual two-part structure (susceptibility +
coping-capacity) is recommended as the target design** — not chosen
arbitrarily, but because it (a) matches internationally-recognized
disaster-risk framing (susceptibility vs. coping capacity), (b) aligns
with NDMA's own confirmed guideline categories (§4), (c) maps cleanly
onto `risk.py`'s pre-existing `missing_inputs` split (§6), and (d)
avoids Candidate B/D's reference-distribution problem entirely. **This
recommendation is structural only — no constant within it is
implementable today** (§6/§13).

### 8. Missing-data policy (all 8 cases)

| # | Case | Status |
|---|---|---|
| 1 | All vulnerability indicators available | `sufficient_evidence` — score computed, once a methodology and its constants are approved |
| 2 | Some indicators available | `insufficient_evidence` **by default** — whether Vulnerability may ever report a partial (e.g. susceptibility-only, before coping-capacity data exists) score is an open **GOVERNANCE DECISION REQUIRED**, mirroring Hazard Exposure's still-unresolved partial-dimension-scoring question (Task 21 §17/18) — not resolved here either, for consistency |
| 3 | No indicators available | `no_evidence_found` — **Bhitai Malli's actual, current, total-data-absence case** (§10) |
| 4 | Indicator explicitly zero (e.g. 0 documented disabled residents) | Treated as a possible real value, but flagged for data-quality review if suspiciously zero across many indicators simultaneously — never silently equated with "confirmed zero," same inventory-bias caution as Task 21 §11 applied to demographic data |
| 5 | Invalid values (negative, >100% proportion) | `source_data_unavailable` / data-quality rejection — never scored |
| 6 | Contradictory values (e.g. subgroup proportions summing past 100%) | Data-quality flag, excluded from scoring, never silently auto-corrected |
| 7 | Unavailable source (extract file missing/corrupt) | `source_data_unavailable` |
| 8 | Settlement with population but no vulnerability data | `no_evidence_found` — **explicitly not inferred as "low vulnerability"** — this is the task's central warning and is treated as an absolute rule, not a default-to-favorable assumption |

### 9. India-wide scalability analysis

Candidate C's *structure* is geography-agnostic: susceptibility scales
via Census's nationally uniform methodology; coping-capacity scales via
direct GIS distance computation once road/healthcare-facility data is
sourced per region — the formula itself needs no Uttarakhand-specific
or hill-terrain-specific tuning, only its **input datasets** need
per-region sourcing (the same "source once per hazard/region type"
pattern already established for hazard layers, Task 16). One genuine,
unresolved generalization risk, flagged rather than resolved: urban
settlements plausibly need different coping-capacity assumptions than
remote hill villages (e.g. "nearest hospital" matters less in a dense
city with several nearby options) — **GOVERNANCE DECISION REQUIRED**
whether urban/rural differentiated thresholds are needed, and if so,
based on a settlement-classification input that does not currently
exist either. Future datasets needed for India-wide deployment: Census
of India village-level age/disability/housing tables (all states), a
road-network GIS layer, and a healthcare-facility POI dataset — none
of which are acquired today.

### 10. Bhitai Malli dry run (design demonstration only — no score produced)

Population = 383 exists, but that fact belongs to Population/Household
Exposure (Task 25), not here. **Zero vulnerability indicators of any
kind exist for Bhitai Malli** — no age breakdown, no disability data,
no housing-construction-type, no `distance_to_road`/`distance_to_hospital`.
Per §8 case 8: **status = `no_evidence_found`. No score is computed
or implied.** Population/household counts are explicitly **not**
converted into a vulnerability signal, per the task's central
instruction.

**Clarifying today's actual, unchanged system behavior**: `risk.py`
currently reports Vulnerability as `status: "no_data"` (the generic
status any dimension with `available_inputs={}` receives, per Task
07B's original design — this task does not change that). The
`no_evidence_found` status above is this task's proposed *future*
vocabulary for the eventual `vulnerability_detail` object once/if this
dimension is implemented — a more specific status than today's generic
`no_data`, not a change to what the system reports right now.

### 11. Explainability design (design only, not implemented)

A future `vulnerability_detail` object would carry: `status`, `score`,
`susceptibility_component`/`coping_capacity_component` (once
Candidate C is implemented), `indicators_used`, `indicator_values`
(each with its own `source` citation, e.g. "Census of India, year X" —
never asserted without one), `methodology_id`/`version`, `missing_inputs`
(mirroring `risk.py`'s existing 4-item list), `data_quality` flags
(e.g. "indicator explicitly zero — unverified," "contradictory subgroup
proportions"), `limitations` (including, always shown, the current
"zero vulnerability data exists" fact and the double-counting-avoidance
rules of §5), `policy_disclaimer` ("VIKALP's Vulnerability score, once
implemented, is a prototype policy configuration, not an official
government standard"). Fully deterministic and reproducible from cited
source data and documented rules — no free-text or AI-generated
narrative anywhere.

### 12. Governance table

| Decision | Status | Reason |
|---|---|---|
| Dimension definition (susceptibility + coping-capacity, independent from exposure/hazard/history/terrain) | **APPROVED** | Consistent with §2/§5's clean separation from the other four dimensions |
| Candidate C's two-part structure as target design | **APPROVED (structure only)** | Matches NDMA's confirmed categories and `risk.py`'s pre-existing `missing_inputs` split (§6/§7) |
| Candidate A as a possible interim simplification | **APPROVED as a fallback option**, not primary | Simpler, but still blocked by the same missing demographic data as C |
| Candidate B / D (index/percentile) | **REJECTED for current MVP** | N=1 settlement — no reference distribution exists (same blocker as Task 25) |
| Specific indicator weights / score bands (any candidate) | **REQUIRES POLICY APPROVAL / NOT JUSTIFIED** | No official numeric weighting scheme found (§4/§6) |
| Vulnerable-subgroup proportions (not counts) belong here; counts belong to Population/Household Exposure | **APPROVED** | §5's double-counting resolution |
| Sourcing Census of India age/disability/housing tables | **REQUIRES OFFICIAL SOURCE CONFIRMATION** | NDMA confirms conceptual relevance (§4); Census of India itself not independently re-verified this task (certificate error) |
| Sourcing SECC-based economic/deprivation data | **REQUIRES OFFICIAL SOURCE CONFIRMATION** | Known real Indian dataset, not independently re-fetched this task |
| Sourcing road-network and healthcare-facility POI data | **BLOCKED BY MISSING DATA** | Neither dataset exists anywhere in this repository |
| Whether Vulnerability may report a partial (susceptibility-only) score | **GOVERNANCE DECISION REQUIRED** | Mirrors Hazard Exposure's still-open partial-scoring question (Task 21 §17/18); not resolved here either |
| Urban/rural differentiated coping-capacity thresholds | **GOVERNANCE DECISION REQUIRED / NOT JUSTIFIED** | §9 — no settlement-classification data exists to support this even if approved in principle |
| Missing-data status vocabulary (§8) | **APPROVED** | Reuses existing project terminology; clarified that today's live system still shows the generic `no_data` (§10) |
| Explainability schema (§11) | **APPROVED (design only)** | Not implemented in this task |

### 13. Implementation readiness verdict

**NOT IMPLEMENTATION-READY.**

Vulnerability has **zero backing data of any kind**, in any file, in
this repository — the most severe data gap among all five dimensions
addressed across Tasks 21-26. Every candidate methodology's numeric
constants are **NOT JUSTIFIED**, no official Indian source defines a
numeric vulnerability-scoring formula (§4), and Candidate B/D are
additionally blocked by the N=1-settlement problem already established
in Task 25. Recommend leaving `risk.py`'s Vulnerability dimension
completely unchanged (`status: "no_data"`, `score: null`, exactly as
today) until real, cited demographic (Census), economic (SECC-type),
and accessibility (road/healthcare POI) data is sourced, and a specific
candidate methodology's constants are formally approved as VIKALP
policy configuration.

"Vulnerability scoring methodology was designed for review only. No
scoring rule was implemented and risk.py was not modified. The
dimension should remain score=null, status=no_data — unchanged —
because zero vulnerability data of any kind currently exists in this
repository, and every candidate methodology's numeric constants remain
unjustified."

## Task 27 — Terrain / Physical Susceptibility scoring design (design only, not implemented)

**No code was changed for this task.** `risk.py`, schemas, APIs,
frontend, and raw/processed data were not touched. The DEM-vs-database
slope discrepancy is **not** resolved by this task, per its own
explicit instruction — both values remain exactly as previously
recorded.

### 1. Terrain data audit / 2. Source-provenance audit

Re-verified fresh against the live repository and files (not assumed
from prior tasks' summaries):

| # | Item | Value |
|---|---|---|
| 1 | DEM source | CartoDEM (Cartosat-1 DEM), Version-3 R1 |
| 2 | Source authority | NRSC/ISRO, Dept. of Space, Govt. of India, via the Bhuvan Open Data Archive |
| 3 | DEM resolution | 1 arc-second (~30 m), confirmed both from the file's own metadata and independently from the raster's actual pixel size (0.00027777778°) |
| 4 | CRS | `EPSG:4326` (geographic WGS84) — confirmed via `rasterio` and the sidecar `.prj` |
| 5 | Vertical units | Meters, `int16`, no declared NoData tag (confirmed no `-32768` sentinel or negative/zero values anywhere in the source tile) |
| 6 | Processing performed | Clipped (no resampling/reprojection) to the intersection of Pauri Garhwal's district bbox and the one downloaded tile (`H44G`); slope derived via Horn's (1981) method — see §4 |
| 7 | Elevation at Bhitai Malli | **991 m** (DEM-derived, re-confirmed fresh: pixel row 325, col 2076 of the processed clip) |
| 8 | Derived slope at Bhitai Malli | **22.58°** (22.584474..., re-confirmed fresh, same pixel) |
| 9 | Existing database slope | **18.91°** (`settlements.slope_degrees`, unchanged since Task 07B) |
| 10 | Known discrepancy | **22.58° (DEM) vs. 18.91° (DB) — a real, unexplained mismatch.** Elevation, by contrast, matches exactly (991 m both sources) |
| 11 | Discrepancy resolved? | **No.** First recorded in Task 15 (`docs/DATA_PROVENANCE.md`), never reconciled since, and **not reconciled by this task either**, per its own explicit instruction |

Checksums of both processed rasters re-verified identical to Task 15's
recorded values
(`fd3dd359...ea6534` elevation clip, `3835042d...063762d` slope clip) —
confirmed unchanged, not re-derived.

`docs/DATA_PROVENANCE.md`'s own framing is reused rather than
re-invented: elevation match is recorded as an *observed fact*, not
proof of a shared origin; the slope mismatch is recorded plainly, with
plausible-but-unconfirmed explanations (different algorithm/window
size, DEM pixel-averaging vs. a smaller original footprint, or the
demo figure simply not being DEM-derived at all) — none asserted as
fact.

`risk.py`'s `_DimensionSpec` for this dimension, confirmed fresh:
`available_inputs={"slope_degrees": ..., "elevation_m": ...}`,
`missing_inputs=["geology", "aspect", "dem_derived_susceptibility_index"]`,
weight 20% — unchanged since Task 07B. Both `slope_degrees` and
`elevation_m` come from the **database scalar**, not the DEM raster —
`risk.py` has never read the Task 14/15 processed rasters (reconfirmed
directly, matching Task 16's original finding).

### 3. Slope methodology audit (Step 4)

From `docs/DATA_PROVENANCE.md` Task 15, re-verified against the actual
files rather than re-derived:

- **Algorithm**: Horn's (1981) 3×3 finite-difference gradient method —
  the same default algorithm `gdaldem slope`/ArcGIS use. A documented,
  standard textbook method, not invented for this project.
- **Neighborhood/window**: fixed 3×3 pixel kernel (no alternative
  window size was evaluated).
- **Horizontal distance conversion**: pixel-degree spacing converted to
  meters via the spherical approximation `111,320 m/degree × cos(lat)`,
  using a single reference latitude (30.1288°, the clip's own center)
  rather than a per-row-varying one — justified in the original
  record by the clip's narrow (~0.26°) latitude range (<0.3% error).
- **CRS implications**: computed directly on the geographic
  (EPSG:4326, degree-based) grid with the above meters-conversion
  correction, not on a reprojected equal-distance/equal-area grid —
  a standard, reasonable approximation, not textbook-pure.
- **Edge handling**: 1-pixel edge-value replication (`numpy.pad(...,
  mode="edge")`) on all four sides of the *extracted clip array* —
  affects only the outermost pixel ring; Bhitai Malli sits deep in the
  clip's interior (row 325/927, col 2076/2863) and is unaffected.
- **Units**: degrees.
- **Output resolution**: identical to the source (no resampling) —
  same 2863×927 grid, same 1 arc-second pixel spacing.
- **Resampling**: none.
- **Reprojection**: none — stayed in `EPSG:4326` throughout.

**Suitability as a deterministic input**: the raster is fully
deterministic and reproducible (same inputs always produce the same
output) and its exact method is documented in enough detail to audit
— suitable as an input *mechanically*. Whether it is *scientifically*
preferable to the database scalar is a separate, unresolved question
(§5). The raster itself was not changed by this task.

### 4. Terrain signal evaluation (Step 3, all six)

| Signal | Data source | Available now? | Resolution | Calc. method | Settlement-level appropriate? | Independently meaningful? | Double-counting risk | India-wide scalable? |
|---|---|---|---|---|---|---|---|---|
| A. Slope | CartoDEM (DEM-derived) or DB scalar — **disputed, §5** | **AVAILABLE NOW** (two conflicting values) | ~30 m | Horn's (1981), §3 | Yes — the standard primary landslide-susceptibility terrain parameter | Yes | **Low vs. other dimensions** (confirmed `hazard_exposure.py` never reads slope/DEM — see §12); **high vs. itself** until the discrepancy is resolved | Structurally yes; absolute thresholds need regional adjustment (§7-9) |
| B. Elevation | CartoDEM or DB scalar — **these two agree exactly** (991 m) | **AVAILABLE NOW** | ~30 m | Direct DEM sample | Yes, as context | **Weak as a standalone susceptibility driver** — elevation's relationship to landslide susceptibility is context/hazard-type dependent, unlike slope (§6) | Low | Only as regional context, not as a universal susceptibility scorer — 991 m means something different in the Himalaya vs. the Deccan plateau vs. coastal India |
| C. Local relief (neighborhood elevation range) | Computable from the existing DEM | **NOT AVAILABLE — not yet computed** (future-only, but no new dataset needed) | Depends on chosen window | Focal max-min, not implemented | Plausible | Partially independent of slope (captures ruggedness, not just steepness) | Low | Needs a window-size policy choice first |
| D. Aspect | Computable from the existing DEM | **NOT AVAILABLE — not yet computed** | ~30 m | Standard directional derivative, not implemented | Plausible but weaker justification than slope | Yes, if used | Low | Predictive value is much more region/climate-dependent than slope — needs a stronger, specific citation before use than slope does |
| E. Terrain position (e.g. TPI: ridge/mid-slope/valley) | Computable from the existing DEM | **NOT AVAILABLE — not yet computed** | Depends on window | Focal comparison, not implemented | Plausible, hazard-type-dependent | Low | Needs a window-size policy choice, same as C |
| F. Drainage/topographic wetness (TWI, flow accumulation) | Computable from the existing DEM, with more processing | **NOT AVAILABLE — not yet computed, most complex to derive** (needs flow-routing/pit-filling, not just a focal window) | ~30 m | Not implemented | Plausible (soil-saturation proxy) | Low | Highest remaining implementation cost of the six |

**Already explicitly named in `risk.py`'s own `missing_inputs`**:
`aspect` (signal D above) and `dem_derived_susceptibility_index`
(closest to a Candidate-C-style composite, §7) — confirming the
project's own architecture already anticipated needing more than slope
alone, consistent with the pattern already found for Vulnerability
(Task 26 §6).

### 5. Bhitai Malli terrain audit (Step 5 — no score produced, no value silently selected)

- **DEM-derived value**: slope 22.58°, elevation 991 m —
  `data/processed/static/terrain/{cartodem_v3r1_h44g_pauri_garhwal_clip.tif, slope_degrees_pauri_garhwal_clip.tif}` (Task 15).
- **Database value**: slope 18.91°, elevation 991 m — `settlements`
  table (Task 07B demo input, itself uncited — same "demo planning
  input" provenance pattern already established for
  `population`/`households`, Task 25 §1).
- **Elevation**: both sources agree (991 m) — no discrepancy here.
- **Slope**: the two sources disagree (22.58° vs. 18.91°) — **this
  task does not select one as correct.**
- **Which should be authoritative for future scoring?** Not decided
  here, but the DEM-derived value has a materially stronger
  *methodological transparency* case: its exact derivation (source
  tile, algorithm, window, edge handling) is fully documented and
  auditable (§3); the database scalar has no documented derivation at
  all — it is only known to be an uncited demo planning input. This
  observation is offered as a factor for a future governance decision,
  **not** as this task selecting the DEM value as authoritative.
- **Should scoring be blocked until resolved?** **Yes, recommended.**
  Scoring against either value while the other exists unreconciled
  would silently pick a winner — exactly what this task was told not
  to do. See §14.
- **Can both be retained as separate provenance fields?** **Yes,
  recommended** — see §11's `terrain_detail` design, which carries
  both values with distinct `source` tags rather than collapsing them.

### 6. Official-source research findings (Step 6)

Checked GSI's own Bhusanket portal directly for slope/terrain
susceptibility methodology documentation: `LS_hazard.html` (already
fetched in Task 24B) confirms GSI operates a "nation-wide landslide
inventory and susceptibility database" programme, and the portal's own
navigation confirms a dedicated **National Landslide Susceptibility
Mapping (NLSM)** product line (`NLSM_10K_Map.html`, directly fetched
this task) — **confirming the programme exists**, by its own published
page. Its actual parameter/methodology document (which would state
whether and how slope is weighted) was **not reachable** — the page
itself contains only a title and a map-viewer instruction, no
methodology text. Two independent fetches (this task and Task 24B)
both found GSI's public pages describe *what* the programme is, never
*how* susceptibility is computed.

Slope angle as a primary landslide-susceptibility parameter is
well-established, general engineering-geology/geomorphology domain
knowledge (the existence of "slope stability analysis" as a discipline
presupposes it) — cited here as general domain knowledge, **not** as a
specific verified GSI numeric standard, since no such document was
reachable.

**No official source (Indian or otherwise) was found that defines a
specific 0-100 slope-to-score transformation.** Per this task's
required phrasing:

**"The signal [slope] is source-supported, but VIKALP's numeric
transformation would be a prototype policy configuration."**

### 7. Candidate scoring methodologies (Step 7, four candidates)

**Candidate A — Slope-only deterministic bands.**
- Formula: `score = band_score(slope_degrees)`, 4-5 monotonic bands.
- Inputs: `slope_degrees` — **blocked before this even matters, by
  §5's unresolved discrepancy.**
- Constants: band edges — **NOT JUSTIFIED**. General geotechnical
  convention treats slopes above roughly 30° as steep/high-risk, but
  this is domain folklore, not a specific cited Indian numeric
  standard (§6) — using it directly would be **POLICY CONFIGURATION**
  at best, never SOURCE-BACKED.
- Strengths: simple, matches the widely-recognized "slope is the
  primary factor" convention.
- Weaknesses: fixed absolute bands saturate outside Himalayan terrain
  (§8/§9).
- Double-counting risk: low vs. other dimensions (§12).
- Missing-data: per §10.

**Candidate B — Slope + elevation.**
- Formula: `score = w1 × slope_band_score + w2 × elevation_component`.
- Evaluated specifically to show its weakness: elevation's causal
  relationship to susceptibility is ambiguous (§4 signal B) — scoring
  it as a linearly-weighted component risks presenting an unjustified
  input as if it were as well-grounded as slope. **Not recommended**
  unless elevation is reframed as a regional-context classifier only
  (e.g. "high Himalaya" / "mid-hill" / "valley" zone), not a linearly
  scored driver.
- Constants: `w1`/`w2`, elevation bands — **NOT JUSTIFIED**.

**Candidate C — Multi-signal terrain susceptibility index (slope +
relief + aspect + terrain position + TWI).**
- Formula: a weighted composite across all six §4 signals.
- Data requirement: 5 of 6 signals are **NOT AVAILABLE NOW** (§4) —
  the most complete candidate conceptually, furthest from
  implementable today, the same pattern already found for
  Vulnerability's Candidate C (Task 26 §6).
- Constants: all weights and per-signal thresholds — **NOT
  JUSTIFIED**.
- Verdict: **recommended as the long-term target structure**, not
  implementable today — most directly matches `risk.py`'s own
  `dem_derived_susceptibility_index` missing input.

**Candidate D — Continuous normalized terrain transformation.**
- Formula (illustrative): `score = clamp(100 × slope_degrees ÷
  REFERENCE_MAX_SLOPE, 0, 100)` — a smooth transform instead of
  discrete bands, the same structural pattern already preferred in
  Task 25/26 (Population's Candidate B, Vulnerability's continuous
  alternatives) for the same reason: fewer arbitrary edges, better
  cross-region behavior.
- Constants: `REFERENCE_MAX_SLOPE` — **NOT JUSTIFIED**, but a single
  constant is easier to eventually source/defend than 4-5 band edges.
- Verdict: **preferred over A** for India-wide scalability reasons
  (§9), still blocked by §5's input-level discrepancy today.

### 8. Sensitivity / sanity analysis (Step 8, using the real processed raster)

Computed directly from `slope_degrees_pauri_garhwal_clip.tif`/
`cartodem_v3r1_h44g_pauri_garhwal_clip.tif` (1,653,801 pixels):

| Slope band | Pixels | % |
|---|---|---|
| 0-5° | 166,274 | 6.3% |
| 5-10° | 140,438 | 5.3% |
| 10-15° | 169,147 | 6.4% |
| 15-20° | 278,122 | 10.5% |
| 20-25° | 427,422 | 16.1% |
| 25-30° | 531,214 | 20.0% |
| 30-35° | 486,474 | 18.3% |
| 35-40° | 296,646 | 11.2% |
| 40°+ | 158,264 | 6.0% |

Slope: min 0.00°, max 68.56°, mean 25.09°, **median 26.44°** (percentiles:
p10=8.44°, p25=18.64°, p50=26.44°, p75=32.69°, p90=37.75°, p95=40.71°,
p99=46.51°). Elevation: 232-2597 m, mean 1103.7 m, median 1091 m.

**Bhitai Malli's own DEM-derived slope (22.58°) sits below this
clip's median (26.44°)** — i.e. Bhitai Malli is not an extreme value
relative to its own surrounding terrain; no threshold was tuned to
flatter it, per the task's explicit warning.

**No severe single-band saturation within this Himalayan sample** —
the distribution is reasonably spread (no band exceeds 20%). However,
**two important caveats, not hidden**:
1. This is a **terrain-pixel distribution across the whole processed
   clip**, not a *settlement-location* distribution — there is only
   one settlement (Bhitai Malli) in the entire system. Using these
   percentiles directly as settlement-susceptibility bands would
   conflate "typical random point on mountainous terrain" with
   "typical settlement location" — settlements systematically avoid
   the steepest terrain when built, so a real settlement-location
   distribution would likely skew gentler than this raw pixel
   distribution. Directly analogous to Task 22's landslide-point-vs.
   -settlement-point distinction — the same caution applies here.
2. **This data is 100% Himalayan hill terrain** — it provides zero
   information about how any threshold would behave in plains,
   plateau, or coastal India. See §9.

### 9. India-wide scalability analysis (Step 9)

The Pauri Garhwal clip's own distribution (§8: median slope 26°,
range 0-68°) is unmistakably steep, hill-terrain-specific. Applying
bands calibrated to this distribution elsewhere would badly
misrepresent risk in both directions:
- **Plains** (e.g. Indo-Gangetic): typical slope is under 2-3° almost
  everywhere — Himalayan-calibrated bands would put essentially 100%
  of plains settlements in the lowest band, providing zero
  differentiation (plains risk, where it exists, is more plausibly
  flood/subsidence-driven — arguably outside what Terrain/Physical
  Susceptibility as currently scoped is meant to capture at all).
- **Plateaus** (e.g. Deccan): moderate, variable, generally gentler
  rolling terrain with occasional steep escarpments — would sit
  awkwardly between Himalayan and plains calibration.
- **Coastal**: mostly flat near sea level, with localized steep
  sections (e.g. Western Ghats-adjacent coast) — same low-differentiation
  risk as plains for most of the terrain, with isolated exceptions.
- **Urban areas**: natural slope may be a poor proxy at all — grading,
  retaining structures, and engineered drainage change the effective
  susceptibility profile independent of the underlying natural terrain.

**A single fixed national slope-threshold set cannot be responsibly
universal.** Recommended future direction (not implemented, not
decided here): **physiographic-region-based normalization** — separate
band/threshold sets per broad terrain classification (Himalayan/hill,
plateau, plains, coastal) — preferred over a single national
percentile (which has the same not-yet-enough-representative-data
problem already flagged for Population/Household Exposure's percentile
candidate, Task 25 §4, compounded here by physiographic heterogeneity)
or purely local-distribution-based normalization (would need many
settlements per region to be statistically meaningful — the same N=1
problem, generalized). **MVP feasibility: none of this is implementable
today** — stated as a future direction only.

### 10. Missing-data policy (Step 10, all 9 cases)

| # | Case | Status |
|---|---|---|
| 1 | DEM available + slope available | `sufficient_evidence` for input availability — still blocked overall by §5's discrepancy today |
| 2 | DEM available + slope missing (computation failed) | `insufficient_evidence` — elevation-only context may still display, but is not scored (Candidate B's weakness, §7) |
| 3 | DEM missing entirely for a settlement's location | Recommend a **distinct `not_covered` status** (reusing the precedent Task 21 §12 already established for Hazard Exposure), not conflated with `no_evidence_found` |
| 4 | Slope value invalid (negative, NaN, implausible e.g. >90°) | `source_data_unavailable` — data-quality rejection, never scored |
| 5 | Elevation value invalid | Same treatment; noted that a strict "must be ≥0" rule would itself need a documented, policy-labeled bound (a few real Indian locations are below sea level) — not resolved with a specific number here |
| 6 | Settlement coordinate missing | `settlement_geometry_unavailable` — **this status genuinely applies to this dimension** (unlike Population/Household Exposure, Task 25 §7, Terrain *is* spatial/DEM-based) |
| 7 | Settlement falls outside DEM coverage | Same as case 3 — `not_covered`, distinct from "coverage exists but is empty" |
| 8 | Terrain data available but resolution insufficient | A `data_quality` flag/limitation note, not a hard block — ~30 m is a generally accepted regional-analysis resolution; very local micro-terrain effects may still be missed |
| 9 | Conflicting terrain values from different sources | **Bhitai Malli's actual, real situation.** None of the five existing statuses exactly fits "evidence exists but disagrees with itself" — recommend either reusing `insufficient_evidence` (closest existing fit: evidence exists but isn't sufficient to produce one defensible score) or introducing a new, more specific status (e.g. `conflicting_evidence`) — **flagged as a governance decision, not decided here**, the same way Task 21 §12 introduced `not_covered` as a new, more specific status when the existing vocabulary didn't fit |

Never converts missing/conflicting terrain evidence into a score of
zero or any other fabricated number, in any case above.

### 11. Explainability design (Step 11, design only)

A future `terrain_detail` object would carry: `status`, `score`,
`elevation`, `elevation_source` (`"db_scalar"` / `"dem_derived"` — both
shown when they agree, as here), `slope`, `slope_source` (same, and
**both values shown separately when they disagree**, never collapsed
to one), `terrain_signals_used`, `methodology`/`methodology_id`,
`constants` (each individually labeled SOURCE-BACKED / DATA-DERIVED /
POLICY CONFIGURATION / NOT JUSTIFIED), `missing_inputs` (mirroring
`risk.py`'s existing 3-item list), `data_quality` flags (e.g.
"resolution ~30 m, local micro-terrain not resolved"),
`discrepancy_flags` (explicitly: *"slope_degrees discrepancy: DB=18.91°,
DEM=22.58°, unresolved since Task 15 — see docs/DATA_PROVENANCE.md"*),
`limitations`, `policy_disclaimer` ("VIKALP's terrain susceptibility
score, once implemented, is a prototype policy configuration, not an
official government standard"). Fully deterministic, reproducible from
cited raster/DB values and documented rules — no free text or
AI-generated narrative anywhere.

### 12. Double-counting review (Step 12, all four other dimensions)

| Pair | Analysis |
|---|---|
| **Terrain vs. Hazard Exposure** | **Confirmed zero input overlap today** — `hazard_exposure.py` was checked directly and never reads `slope_degrees`, `elevation_m`, or any DEM/raster data; it uses only the settlement's lat/lon and the GSI point inventory (Task 23). Conceptually, the two answer different questions: Hazard Exposure = *"has a hazard event been documented/observed near here?"* (evidence-based); Terrain = *"is the ground itself physically prone, regardless of whether anything has been documented yet?"* (intrinsic-characteristic-based). **Recommendation: slope should influence Terrain only, never Hazard Exposure** — this complementarity (steep-but-undocumented vs. gentle-but-documented settlements can and should score differently on each) is a deliberate feature of the 5-dimension model, not a gap to close by merging them. |
| **Terrain vs. Historical Disaster Evidence** | No overlap — Historical Disaster Evidence concerns documented past event dates/recurrence (Task 24), entirely independent of underlying ground physical characteristics. |
| **Terrain vs. Vulnerability** | No overlap in what's *scored*, though a real-world causal link exists (steep terrain can make roads harder to build/maintain). Vulnerability's `distance_to_road`/`distance_to_hospital` (Task 26 §5) score actual connectivity/distance, never slope itself; Terrain never scores accessibility. Same boundary already established from the other side in Task 26 §5, cross-referenced here rather than re-derived. |
| **Terrain vs. Population/Household Exposure** | No plausible overlap — population/household counts vs. physical ground characteristics are unrelated concepts; confirmed trivially. |

### 13. Governance table (Step 13)

| Decision | Status | Reason |
|---|---|---|
| Dimension definition (intrinsic physical susceptibility, independent of hazard evidence/history/people) | **APPROVED** | Consistent with §2/§12's clean separation |
| Slope as the primary terrain signal | **APPROVED (signal only)** | GSI's NLSM programme confirmed to exist (§6); general geomorphological domain knowledge supports slope as the standard primary parameter |
| Elevation as a linearly-scored susceptibility driver (Candidate B) | **REJECTED** | Causal role is ambiguous/context-dependent (§4/§7) |
| Elevation as context/display-only field | **APPROVED** | Retains the value without overclaiming its scoring justification |
| Relief / aspect / terrain position / TWI (Candidate C's remaining signals) | **FUTURE-ONLY** | Not yet computed; derivable from the existing DEM without new acquisition, but not implemented (§4) |
| Specific slope band edges / `REFERENCE_MAX_SLOPE` constant (any candidate) | **NOT JUSTIFIED / REQUIRES POLICY APPROVAL** | No official numeric standard found (§6) |
| **The 22.58°/18.91° slope discrepancy** | **UNRESOLVED — BLOCKS SCORING** | Explicit central blocker; this task was instructed not to reconcile it (§5) |
| Whether DEM-derived or DB-scalar slope is eventually authoritative | **GOVERNANCE DECISION REQUIRED** | DEM value has stronger methodological-transparency grounding (§5), but this is not a final selection |
| Retaining both slope values as separate provenance fields | **APPROVED** | §5/§11 |
| Physiographic-region-based normalization (future India-wide direction) | **APPROVED (direction only)** | §9 — not implemented, not a national single-threshold approach |
| Fixed single national slope-threshold set | **REJECTED** | §8/§9 — would saturate/misrepresent across physiographic regions |
| Terrain/Hazard Exposure boundary (slope excluded from Hazard Exposure) | **APPROVED, reaffirmed** | §12 — confirmed zero overlap today, recommended to stay that way |
| New `not_covered`/`conflicting_evidence`-style statuses | **GOVERNANCE DECISION REQUIRED** | Existing 5-status vocabulary doesn't exactly fit cases 3/7/9 (§10) |
| Sourcing GSI's actual NLSM parameter/methodology document | **REQUIRES OFFICIAL SOURCE CONFIRMATION** | Programme confirmed to exist; methodology document not reachable in two attempts (§6) |
| Explainability schema (§11) | **APPROVED (design only)** | Not implemented in this task |

### 14. Bhitai Malli dry run

Elevation: 991 m, agreed by both sources — not itself a blocker.
Slope: **22.58° (DEM) vs. 18.91° (DB) — unresolved, not reconciled by
this task.** Per §10 case 9, the correct design status is
`insufficient_evidence` (or a future dedicated `conflicting_evidence`
status, §13) — **no score is computed or implied.** Even setting the
discrepancy aside, no candidate methodology's numeric constants are
justified (§7) — a second, independent reason no score could be
produced today. This does not change `risk.py`'s real, current
behavior in any way: Terrain already reports `status: "no_scoring_rule"`,
`score: null`, with both raw values shown as evidence — exactly
correct, unchanged by this task.

### 15. Implementation readiness verdict

**NOT IMPLEMENTATION-READY.**

Terrain/Physical Susceptibility has a **distinct type of blocker** from
the other three dimensions addressed in Tasks 24-26: unlike Historical
Disaster Evidence's field-semantic ambiguity or Vulnerability's total
data absence, Terrain has **real, well-processed, thoroughly documented
data from two independent sources that disagree with each other**
(22.58° vs. 18.91°), which this task was explicitly told not to
reconcile. Even if that were resolved, every candidate methodology's
numeric constants remain **NOT JUSTIFIED** (§7), and the only real
sensitivity data available (§8) is Himalayan-hill-terrain-only,
insufficient to ground India-wide constants (§9). Recommend leaving
`risk.py`'s Terrain dimension completely unchanged (`status:
"no_scoring_rule"`, `score: null`, both raw values as evidence) until:
(a) the slope discrepancy is investigated and either explained or
formally resolved by governance decision (with both values retained in
the explainability record regardless, §11), and (b) a specific
candidate methodology's numeric constants are sourced or
policy-approved.

"Terrain/Physical Susceptibility scoring methodology was designed for
review only. No scoring rule was implemented and risk.py was not
modified. The 22.58°/18.91° slope discrepancy remains explicitly
documented and unreconciled, as instructed. The dimension should
remain score=null, status=no_scoring_rule until the discrepancy is
resolved by governance decision and a specific candidate methodology's
numeric constants are sourced or policy-approved — neither of which
has happened."

## Task 28 — Risk engine governance & MVP scoring decision (governance only, not implemented)

**No code was changed for this task.** `risk.py`, `hazard_exposure.py`,
schemas, APIs, frontend, database, and raw/processed data were not
touched. This synthesizes Tasks 21-27's audits/designs into one MVP
policy — no new data was gathered; every finding below is a citation of
already-established work.

### 1. Master five-dimension status table

| Dimension | Data availability | Methodology | Governance | Implementation | MVP Status |
|---|---|---|---|---|---|
| **Hazard Exposure** (30%) | Real, acquired GSI/NLFC inventory (813 records, Task 20) | Designed (Task 21), sensitivity-tested (Task 22), approved | Approved for MVP implementation (Task 23 brief) | **Implemented, tested (22 passing tests), deployed** (Task 23) | **IMPLEMENT NOW** — already done; correctly returns `no_evidence_found`/`null` for Bhitai Malli because that is the true evidence state, not a placeholder |
| **Terrain / Physical Susceptibility** (20%) | Real DEM (Task 14/15) *and* real DB scalar — **but they disagree** (22.58° vs 18.91°) | Designed (Task 27), all constants NOT JUSTIFIED | **Discrepancy explicitly unresolved** (Task 27 §5, by instruction); no constants approved | Not implemented (`risk.py` unchanged, `no_scoring_rule`) | **BLOCKED** — resolvable via governance decision (does not strictly require new data — see §7), but not resolved today |
| **Historical Disaster Evidence** (15%) | Real GSI data; field semantics PROBABLE BUT NOT CONFIRMED (Task 24B) | Designed (Task 24), recency constants empirically **rejected** on real-data evidence (Task 24A) | Semantic confirmation and recency methodology both open | Not implemented | **BLOCKED** — partially resolvable via decision (recency redesign) and partially via a difficult/uncertain confirmation path (§7) |
| **Population / Household Exposure** (20%) | Real, uncited demo values (383/86); N=1 settlement, no comparison distribution | Designed (Task 25), all constants NOT JUSTIFIED | No official source found or approved policy constant | Not implemented | **BLOCKED** — resolvable via governance decision to accept policy-configuration constants (same precedent as Hazard Exposure's 1 km radius), or via future Census sourcing |
| **Vulnerability** (15%) | **Zero data of any kind, anywhere in the repository** (Task 26) | Conceptual structure designed (susceptibility + coping-capacity), no real inputs to calibrate against | Moot until data exists | Not implemented | **FUTURE** — qualitatively different from the other three: there is nothing to even sanity-check a policy-configuration constant against; requires new external data acquisition before any governance decision is actionable |

**Classification rule used, stated explicitly**: `BLOCKED` = a specific,
nameable blocker exists and a governance decision alone (with or
without a small follow-up design task) could resolve it, using data
that already exists in this repository. `FUTURE` = the blocker is
genuinely new-data-dependent; no governance decision on its own can
unblock it. `IMPLEMENT NOW` = the scoring rule is already implemented,
tested, and operating correctly (its current `null` output for one
settlement is a correct evidence-based result, not evidence the
dimension itself is unready).

### 2. Overall-risk policy decision (Step 2)

| Option | Verdict | Reasoning |
|---|---|---|
| A. Single 0-100 overall score | **REJECTED** | Cannot be computed today (`risk.py`'s existing `all_scored` gate requires every dimension scored); forcing it would mean 4 of 5 dimensions contribute a fabricated number |
| B. Partial weighted score (renormalized to available weights) | **REJECTED — not approved** | Silently renormalizing weights changes what the approved 20/30/15/20/15 split actually means (e.g. a Hazard-Exposure-only score would implicitly become "100% of the answer" instead of the approved 30%) and produces a clean-looking 0-100 number with no visible signal that 70-85% of the intended evidence base is missing. **This is precisely the failure mode the task's own core principle warns against** — an officer cannot distinguish a well-evidenced 62 from a 62 built on one dimension. Also moot for Bhitai Malli specifically today: even Hazard Exposure (the one implemented dimension) currently returns `null` for this settlement, so a "partial" score would have zero real dimensions to partially combine |
| C. No overall score until all dimensions valid | **APPROVED — reaffirms existing `risk.py` behavior** | Matches the `all_scored` gate already built in Task 07B, unchanged through every subsequent task |
| D. Multi-dimensional evidence dashboard, no overall score | **APPROVED — reaffirms existing behavior, recommend treating as the primary experience, not a fallback** | This is what `risk.py`'s `dimensions` array (each with its own `status`/`evidence`) already provides today; recommend leaning into it as the demo's main value rather than treating the missing `overall_score` as a gap to apologize for |

**Decision: C + D together**, as already built — no new behavior is
recommended, this task's role is to explicitly re-endorse the existing
architecture after auditing all five dimensions, not to invent a new
policy.

### 3. Bhitai Malli's current output decision (Step 3)

Using the fixed values given (population 383, households 86, elevation
991 m, DEM slope 22.58°, DB slope 18.91°, 0 GSI records within 1 km, 21
within 5 km): **the correct top-level status is "Assessment Pending"**
— this is exactly `risk.py`'s existing computed `assessment_status`
(not a new label), because not all five dimensions are scored.
`overall_score`/`risk_level` remain `null`. `data_completeness` is
`"partial"`, not `"none"` — Terrain and Population/Household Exposure
both have raw evidence present (`inputs_used` non-empty) even though
neither is scored; Hazard Exposure, Historical Disaster Evidence, and
Vulnerability have no scored/used inputs for this specific settlement.
**Recommend the officer-facing summary say "Assessment Pending," and
the per-dimension breakdown carry the more specific distinction** (raw
evidence present vs. genuinely absent) — "Insufficient Evidence" and
"Partial Assessment" are not adopted as the *top-level* label (they
would either overstate confidence or duplicate what "Assessment
Pending" + the per-dimension statuses already convey), but "Partial
Assessment" language is appropriate *description* of what
`data_completeness: "partial"` already means and should be surfaced
that way in the UI (§9).

### 4. Hazard no-evidence policy (Step 4)

**`no_evidence_found` must never become `0` or "Low Risk."** Already
enforced in `hazard_exposure.py`'s own design (Task 21 §11): the
evidence gate returns `score: None`, never a numeric zero, specifically
because a `0` on a 0-100 scale would read as a *confirmed low-hazard
finding*, when the true fact is only "no documented event within 1 km
in this one inventory" — the inventory-bias caveat applies. **Why this
matters concretely**: converting `no_evidence_found` to `0` or "Low"
would be the single most dangerous mistake this system could make for
Bhitai Malli specifically, since its true situation (nearest record
2.04 km away, 21 within 5 km) is genuinely ambiguous, not confirmed
safe.

**Does the existing hazard implementation need governance
clarification, or can it remain unchanged?** **It can remain
unchanged.** Both the backend (`score: None`, `status:
"no_evidence_found"`) and the frontend (`RiskAnalysisPage.tsx`'s
`DimensionCard`, already patched in Task 23 to show *"Assessment
Pending — no qualifying evidence found within the scoring radius. This
does not mean the location is safe"* for this exact status) already do
this correctly. This is recorded as a genuine "already correct, no
action needed" finding, not manufactured as a task item.

### 5. Dimension-by-dimension scoring decision (Step 5)

| Dimension | Scoreable today? | Why / blocker | What would unblock it |
|---|---|---|---|
| Hazard Exposure | **The rule can score; Bhitai Malli specifically has no qualifying evidence** | Implemented and valid (Task 23) — its `null` result for this settlement is correct, not a sign of unreadiness | Nothing — working as designed |
| Terrain | **No** | Conflicting slope inputs (22.58° vs 18.91°) + no approved numeric transform | A governance decision on which slope value (or both, with a documented precedence rule) is authoritative, plus approval of specific band/transform constants |
| Historical Disaster Evidence | **No** | `initiati_1`'s meaning is PROBABLE, not CONFIRMED; recency bands empirically rejected | Either a governance risk-acceptance decision to proceed on PROBABLE provenance, or stronger confirmation (unlikely to be reachable, §7); a redesigned, data-grounded recency scheme |
| Population/Household Exposure | **No** | No official source for band/reference constants; N=1 settlement blocks any data-derived alternative | A governance decision to approve policy-configuration constants (same precedent as Hazard Exposure's 1 km radius), or future Census sourcing |
| Vulnerability | **No** | Zero data of any kind | New data acquisition (Census age/disability, SECC-type economic data, road/healthcare POI) — no governance decision alone can substitute for this |

**"Implemented" does not mean "valid to score" for a specific
settlement, and "not yet producing a number" does not mean "not
implemented" — Hazard Exposure demonstrates both directions of this
distinction at once.**

### 6. Status vocabulary decision (Step 6)

Three genuinely distinct states, kept separate rather than collapsed:

1. **`no_evidence_found`** — an **approved methodology** executed
   correctly and found zero qualifying records. Requires the
   methodology to already be trusted; "no evidence" is only meaningful
   once the search itself is credible. Example: Hazard Exposure at
   Bhitai Malli.
2. **`insufficient_evidence`** — evidence exists but is contradictory,
   incomplete, or otherwise inadequate to defend one score, even where
   a methodology conceptually exists. Examples: Terrain's conflicting
   slope values (Task 27 §10 case 9); Historical Disaster Evidence's
   undated-nearby-records case (Task 24 §6).
3. **`no_scoring_rule`** — raw evidence exists, is internally
   consistent, but no approved numeric transformation exists yet.
   Example: Population/Household Exposure's 383/86 (real, consistent,
   unambiguous — just unscored).

**A fourth, pre-existing state must not be conflated with #3**:
**`no_data`** — zero raw inputs exist for the dimension at all
(Vulnerability today). `risk.py` already distinguishes `no_data` from
`no_scoring_rule` this exact way (`status = "no_scoring_rule" if
spec.available_inputs else "no_data"`, unchanged since Task 07B) —
reaffirmed, not changed.

**Recommended full vocabulary for the risk engine** (four evidence
states, plus two orthogonal infrastructure-failure states already
established for Hazard Exposure and reusable elsewhere):
`no_data` / `no_scoring_rule` / `insufficient_evidence` /
`no_evidence_found`, plus `source_data_unavailable` /
`settlement_geometry_unavailable` for pipeline failures (distinct from
all four evidence states — a missing file is not the same fact as
missing evidence).

### 7. Blocker resolution analysis (Step 7)

| Dimension | Minimum action | Difficulty | New data needed? | Worth pursuing for MVP? |
|---|---|---|---|---|
| **Terrain** | (a) Governance decision on authoritative slope value; (b) approve specific band/transform constants | **Easy-to-moderate** — a decision, not a data-acquisition task | No — both values already exist | **Yes** |
| **Historical** | (a) Accept PROBABLE-BUT-NOT-CONFIRMED via governance risk-acceptance, OR pursue GSI's login-walled form/data dictionary; (b) redesign recency bands from the dataset's own real year-distribution | (a) accepting PROBABLE = easy; reaching the login-walled form = **already attempted and failed once (Task 24B) — unlikely to succeed with more effort in the MVP timeframe**; (b) easy, uses existing data | (a) no; (b) no | **Partially** — redesign recency now; do not chase the login-walled form further for MVP |
| **Population** | (a) Governance decision to approve policy-configuration constants (same precedent as Hazard Exposure's radius); OR (b) acquire Census data | (a) easy — a decision; (b) a real sourcing task, likely beyond MVP timeline | (a) no; (b) yes | **Yes, via (a)** — the policy-configuration path doesn't require new data |
| **Vulnerability** | Acquire real vulnerability indicator data (Census age/disability, SECC, road/healthcare POI) | **Difficult** — a genuine external-data-sourcing initiative, not a quick task | **Yes, unavoidably** | **No — not worth pursuing for the SIH MVP timeline** |

### 8. MVP strategy recommendation (Step 8)

| Strategy | Verdict |
|---|---|
| A. Force all five dimensions into numerical scoring | **REJECTED** — directly violates "no evidence ≠ low risk" / "unapproved methodology ≠ valid score"; would fabricate four of five dimension scores |
| B. Only score dimensions with approved methodology/data; keep others pending | **RECOMMENDED — this is already `risk.py`'s existing architecture**, not a new strategy to adopt |
| C. Expose no risk scoring at all, only raw evidence | **REJECTED** — too conservative; Hazard Exposure is genuinely implemented and valid, and suppressing it (or the other dimensions' real raw evidence) would discard real work and reduce the demo's credibility rather than protect it |

**Decision: Strategy B, re-endorsed.** Credible government decision
support comes from showing exactly what is and isn't known, per
dimension — not from maximizing the count of numbers on screen.

### 9. Officer-facing risk output design (Step 9, design only)

Deterministic, no AI-generated narrative, extending the pattern already
started for Hazard Exposure in Task 23 to all five dimensions
consistently:

- **Evidence available** — per dimension, the raw values present (e.g.
  Terrain: both DEM slope 22.58° and DB slope 18.91°, flagged as
  conflicting, not merged; Population: population 383, households 86).
- **Evidence missing** — per dimension `missing_inputs` list, already
  present in every `RiskDimensionResult` today.
- **Assessment pending** — the existing top-level `assessment_status`
  badge, unchanged.
- **Policy/configuration pending** — a UI-level distinction **not yet
  made consistently today**: Task 23 already patched
  `RiskAnalysisPage.tsx` to show a specific message for Hazard
  Exposure's `no_evidence_found`; the same specificity should extend to
  `no_scoring_rule` ("evidence exists, but no approved numeric rule
  yet") vs. `no_data` ("no evidence exists yet") vs.
  `insufficient_evidence` ("evidence exists but is contradictory/
  inadequate") — currently the other four dimensions still show the
  older, less specific two-way text. This is a **design recommendation
  for a future implementation task**, not built here.
- **Source attribution** — per dimension, e.g. "CartoDEM v3 R1, NRSC/
  ISRO" vs. "Demo planning input, uncited" — already designed in each
  dimension's `*_detail` explainability object (Tasks 23-27), not yet
  wired into the UI for the four unscored dimensions.
- **Data limitations** — surfacing each dimension's `limitations`/
  `discrepancy_flags` arrays already designed in Tasks 25-27.

### 10. SIH demo implications (Step 10)

The full workflow (Settlement identification → Evidence gathering →
Risk assessment → Protect/Adapt/Relocate → Destination → Capacity →
Relocation planning) **remains demonstrable end-to-end without faking a
risk score**, in three explicit modes:

- **Evidence mode** — real, governed evidence per dimension (Hazard
  Exposure's actual GSI-based result; Terrain's actual DEM/DB values
  with the discrepancy shown, not hidden; Population's actual demo
  counts) — itself a credible demonstration of the platform's rigor.
- **Assessment-pending mode** — the overall assessment correctly shows
  "Assessment Pending" instead of a fabricated score, which is a
  defensible *feature* to present (the system refuses to invent
  numbers), not a gap to apologize for.
- **Scenario mode** — downstream stages already operate this way and
  require no change: `decision.py` (Task 08) returns every pathway as
  `status: "not_evaluated"`, `recommended: false` **unconditionally**
  (confirmed by direct read, unchanged), and `destination.py` (Task 09)
  returns `analysis_status: "pending"`, `ranking_status: "pending"`
  **unconditionally** (confirmed by direct read, unchanged) — neither
  was ever built to depend on a real overall risk score in the first
  place, so keeping Terrain/Historical/Population/Vulnerability
  unscored introduces **no new gap** downstream.

**Confirmed: downstream decision-support flows can already operate in
evidence/assessment-pending/scenario mode without pretending an
unapproved risk score exists** — this was true before this task and
remains true after it.

### 11. Master governance table (Step 11)

| Decision | Status | Rationale | Required Action |
|---|---|---|---|
| Overall-score policy | **APPROVED — no single score until all 5 dimensions scored** | §2 — matches existing `all_scored` gate | None — keep as-is |
| Partial/renormalized-score policy | **REJECTED** | §2 — misleading, hides how little evidence backs a clean-looking number | None — do not implement |
| No-evidence policy (`no_evidence_found` ≠ 0/Low) | **APPROVED, already correctly implemented** | §4 | None — Hazard Exposure needs no change |
| Terrain policy | **BLOCKED, governance-resolvable** | §1/§5/§7 | Decide authoritative slope value; approve numeric constants |
| Historical policy | **BLOCKED, partially resolvable now** | §1/§5/§7 | Accept PROBABLE provenance via governance decision; redesign recency bands; do not chase the login-walled form further |
| Population policy | **BLOCKED, governance-resolvable** | §1/§5/§7 | Approve policy-configuration constants (Hazard Exposure precedent), or defer to future Census sourcing |
| Vulnerability policy | **FUTURE, not resolvable by decision alone** | §1/§7 | Acquire real indicator data — out of scope for SIH MVP timeline |
| Hazard policy | **APPROVED, unchanged** | §4 | None |
| Downstream decision policy (Decision Workspace/Destination Explorer) | **APPROVED, unchanged** | §10 — already built to not depend on a real score | None |
| Status vocabulary | **APPROVED** — `no_data`/`no_scoring_rule`/`insufficient_evidence`/`no_evidence_found` kept distinct | §6 | None — reaffirm existing distinction, extend UI presentation (§9, future task) |

### 12. Implementation gate (Step 12)

**A. Can be implemented immediately** (once separately approved — not
done in this task): extending `RiskAnalysisPage.tsx`'s per-dimension
status messaging (Task 23's pattern) to distinguish `no_data`/
`no_scoring_rule`/`insufficient_evidence` for the four unscored
dimensions (§9) — a low-risk, purely presentational change requiring
no new data or governance decision on numeric constants.

**B. Must remain pending**: `overall_score`/`risk_level` (always, until
all five dimensions are scored); Terrain, Historical Disaster
Evidence, and Population/Household Exposure's individual dimension
scores, until their respective governance decisions in §7/§11 are
made.

**C. Should NOT be pursued for MVP**: Vulnerability data acquisition
(too large a sourcing effort for the SIH timeline); further attempts to
reach GSI's login-walled landslide-reporting form (already attempted
once, Task 24B); India-wide physiographic-region terrain normalization
(explicitly future-scope, Task 27 §9).

**D. Requires explicit future government/policy approval**: Terrain's
authoritative-slope-value decision and its numeric constants;
Population's numeric constants; Historical's PROBABLE-vs-CONFIRMED
risk-acceptance decision and its recency constants; any future
partial/renormalized overall-scoring approach, should one ever be
proposed (currently rejected, §2).

### 13. Final verdict

**NOT IMPLEMENTATION-READY** — scoped specifically to *a complete,
five-dimension numeric risk engine producing a real `overall_score`*.
This is not a blanket judgment on the whole system: Hazard Exposure
**is** implementation-ready and already implemented; the
multi-dimensional evidence dashboard (Strategy B/D) **is** ready to
demonstrate today, exactly as built. What remains not-ready is turning
Terrain, Historical Disaster Evidence, and Population/Household
Exposure into real scores (each blocked on a specific, named governance
decision, §7) and Vulnerability specifically (blocked on missing data,
not decision-resolvable at all for this MVP).

"Risk engine governance review complete. No code was changed. VIKALP's
MVP risk policy is confirmed as: no fabricated overall score, ever;
Hazard Exposure remains the one implemented, evidence-gated dimension;
Terrain, Historical Disaster Evidence, and Population/Household
Exposure remain explicitly pending on named governance decisions;
Vulnerability remains explicitly pending on new data neither approvable
nor acquirable within this task. NOT IMPLEMENTATION-READY for a
complete five-dimension numeric risk engine; the evidence-first
multi-dimensional dashboard is the correct and demonstrable MVP
experience today."

## Task 29 — Decision framework governance & rule design (governance + design only, not implemented)

### 1. Current implementation audit

**Decision response structure** (`schemas/decision.py`
`SettlementDecision`): `settlement_id`/`settlement_name`/
`settlement_district`/`settlement_state`, `decision_status` (string —
only value ever produced today is `"pending"`), `risk_assessment_status`
(mirrors `risk.py`'s `assessment_status`), `pathways`
(`list[PathwayAssessment]`), `missing_evidence` (`list[str]`),
`explanation` (str), `officer_review_required` (bool, defaults `True`),
`officer_review_note` (str).

**Protect/Adapt/Relocate fields** (`PathwayAssessment`): `pathway`,
`definition`, `action_categories` (`list[str]`, empty for Relocate —
Relocate has no "action" list, only evidence categories),
`evidence_required` (`list[str]`), `status` (str — only value ever
produced today is `"not_evaluated"`), `recommended` (bool — always
`False`).

**Current status values**: exactly two are ever emitted, both
unconditionally — `decision_status = "pending"` and, for every one of
the three pathways, `status = "not_evaluated"` / `recommended = False`.
There is no code path anywhere in `decision.py` that can currently
produce any other value — confirmed by reading the full function body
(`assess_settlement_decision()`, 41 lines): it builds the three
`pathways` dicts from the static `PATHWAY_FRAMEWORK` table with those
two literals hardcoded, with no branching on risk content at all.

**How the risk service is consumed**: `decision.py` imports and calls
`assess_settlement_risk()` in-process (same reasoning as Task 08 — one
FastAPI process, no self-HTTP-call) but reads **only one field** from
its return value: `risk["assessment_status"]`. It never reads
`overall_score`, `risk_level`, `data_completeness`, or any individual
`dimensions[i]` entry (score, status, evidence). This is a **binary,
all-or-nothing gate** on whether the entire five-dimension risk
assessment reached `"complete"` — not an evidence-level or
dimension-level consumption. Confirmed by reading the full import and
usage: `risk_status = risk["assessment_status"]`, used once, only to
decide whether to append the "completed risk assessment... is
required" string to `missing_evidence`.

**Is any recommendation currently generated?** No. Not conditionally,
not partially, not for a hypothetical fully-scored settlement — there
is no formula, threshold comparison, or rule anywhere in the module.
This matches Task 08's original design intent exactly (module docstring:
"do not invent pathway scores... do not invent feasibility values") and
remains true unchanged.

**Downstream destination flow**: `destination.py`
(`get_settlement_destinations()`) is **fully structurally independent**
of `decision.py` — no import, no function call, no shared state. It
always returns `analysis_status: "pending"`, `candidates: []`,
`ranking_status: "pending"`, `ranked_candidates: []`, and the 6-item
`SUITABILITY_DIMENSIONS` framework (Hazard Safety, Land Suitability,
Available Capacity, Accessibility, Infrastructure Availability,
Social/Administrative Feasibility — each `status: "not_evaluated"`,
none weighted). Frontend: `DecisionWorkspacePage.tsx` renders pathway
cards + a comparison table + a missing-evidence list, but **hardcodes**
the "Not Evaluated" badge/cell text directly in JSX rather than reading
`pathway.status` (a presentational shortcut that happens to match
today's only possible value, flagged here since it would silently go
stale if `status` ever gained new values without a matching frontend
change — see §16 implementation gate). `DestinationExplorerPage.tsx`
is a separate top-level page with its own independent fetch, matching
`destination.py`'s independence.

### 2. Protect definition

**Protect**: risk-reduction/protective measures applied at the
settlement's existing location, intended to reduce hazard *impact*
without requiring habitation change. Action categories (already defined
in `PATHWAY_FRAMEWORK`, reaffirmed unchanged): drainage improvement,
slope stabilization, protective infrastructure, local hazard
mitigation, monitoring/maintenance.

### 3. Adapt definition

**Adapt**: settlement remains occupied, but changes to infrastructure,
land use, preparedness, accessibility, or building practices are
applied to reduce *vulnerability/exposure* (as distinct from Protect's
hazard-impact focus). Action categories (reaffirmed unchanged):
infrastructure adaptation, safer building practices, access
improvements, land-use controls, preparedness measures.

### 4. Relocate definition

**Relocate** is redefined here with a precision Task 08 did not need to
make explicit, because Task 08 never reached the point of producing any
output beyond "not_evaluated." VIKALP recognizes **three distinct
levels**, only the first of which the MVP can ever legitimately produce
(see §10):

1. **Relocation assessment warranted** — evidence suggests continued
   habitation *may* not be appropriate, or that protection/adaptation
   *may* not sufficiently address the identified risk, so the case
   should proceed into the Destination Explorer pipeline for further
   evaluation. This is **not** a claim that relocation is the right
   outcome — only that it should be evaluated.
2. **Relocation recommended** — VIKALP's own deterministic rule
   concludes, from approved evidence and an approved comparison rule,
   that relocation is preferable to protect/adapt for this settlement.
   Still an internal system output subject to officer review, not a
   final decision.
3. **Relocation approved** — an actual administrative/government
   decision to relocate a population. This is a human governance act,
   never a system output. VIKALP must never emit this value under any
   circumstance.

Level 1 requires severe/persistent hazard evidence. Level 2 additionally
requires an approved multi-dimension comparison rule (none exists).
Level 3 is permanently out of scope for VIKALP software.

### 3.1 Anti-pattern (explicit)

**"High risk = relocate" is explicitly rejected as an automatic rule.**
A high hazard score alone must never auto-produce Relocate =
recommended (or even "assessment warranted") without also considering
protection/adaptation feasibility — because a settlement facing real
hazard exposure that also has strong, feasible protective options is a
Protect/Adapt case, not automatically a Relocate case. This mirrors
Task 28's core principle ("no evidence ≠ low risk") applied in the
opposite direction: "high hazard evidence ≠ automatic relocate."

### 5. Evidence requirements

| Evidence | Source | Available now? | Required for MVP? | Can it independently trigger a decision? |
|---|---|---|---|---|
| Hazard Exposure (dimension) | `risk.py` / `hazard_exposure.py` (GSI landslide inventory) | **Yes** — implemented, evidence-gated (Task 23); returns `no_evidence_found` for Bhitai Malli today | Yes | **No, alone** — even a positive hazard score must be combined with mitigation-feasibility evidence before Protect/Adapt/Relocate can differ (§3.1) |
| Terrain / Physical Susceptibility (dimension) | `risk.py` (raw DEM/slope present, no approved scoring rule — Task 27, BLOCKED) | No (raw data yes, scored dimension no) | Yes | No — same reasoning |
| Historical Disaster Evidence (dimension) | `risk.py` (raw GSI dated/activity fields present, no approved scoring rule — Task 24/24A/24B, BLOCKED) | No | Yes | No — repeated-event history could *corroborate* a Relocate trigger but should not independently create one |
| Population / Household Exposure (dimension) | `risk.py` (raw counts present, no approved scoring rule — Task 25, BLOCKED) | No | Yes | No — population size affects urgency/priority, not the Protect/Adapt/Relocate classification itself |
| Vulnerability (dimension) | `risk.py` (no data at all — Task 26, FUTURE) | No | Yes (long-term); not for MVP | No |
| Settlement location (lat/lon) | `models/settlement.py` | Yes | Yes (routing input only) | No — identifies the case, doesn't score it |
| Infrastructure / access (roads, distance to services) | **No dataset anywhere in VIKALP** — confirmed absent in `docs/DATA_INVENTORY.md` (Roads: "None"; Electricity: "None"; Health/School capacity: "None") | No | Yes for Adapt specifically | No — dataset does not exist; FUTURE |
| Mitigation feasibility (engineering cost/viability of protective works) | **No dataset anywhere in VIKALP** | No | Yes for Protect specifically | No — dataset does not exist; FUTURE |
| Destination availability | `destination.py` (framework only, `candidates: []` always — Task 09) | No | Yes for Relocate specifically | No — structurally cannot exist until a destination dataset is sourced |
| Carrying capacity | Not built anywhere | No | Yes for Relocate specifically | No |
| Legal/land constraints | **No dataset anywhere in VIKALP** (`docs/DATA_INVENTORY.md`: "Land (use/availability): None") | No | Eventually | No |
| Relocation feasibility (social/administrative) | Not built anywhere | No | Eventually | No |
| Authoritative hazard-zone designation (e.g. an official government "unsafe for habitation" order) | Not present in VIKALP's data; would need to be sourced from a state disaster-management authority | No | Would be the **one** category strong enough to independently warrant Relocate Level 1 if it existed | Conditionally yes, if sourced and cited — but does not exist today |

No new datasets are introduced by this task; every "No" above is a
restatement of an already-documented absence (`DATA_INVENTORY.md`),
not a new finding.

### 6. Overall-risk dependency decision

Evaluated the three options the task posed:

**A. Decision requires overall numeric risk** — this is what
`decision.py` **currently implements** (gating on
`risk["assessment_status"] == "complete"`, which itself requires
`all_scored` across all five dimensions). **Rejected as the long-term
design.** It is safe (never produces a premature recommendation) but
is more conservative than necessary and doesn't scale: it would keep
every pathway at `not_evaluated` forever until Vulnerability data
exists — even in a future world where Hazard Exposure, Terrain, and
Historical Disaster Evidence are all scored and strongly agree, and
even though Task 28 already rejected requiring a five-dimension overall
score for the *risk* side of VIKALP. Requiring it again here for
*decisions* would be an inconsistent, stricter standard than the one
already approved for risk itself.

**B. Decision can use dimension-level evidence and status** —
**approved as the underlying mechanism.** Each pathway rule should read
individual `dimensions[i]` entries (score + status), the same evidence
already exposed by `risk.py`'s API response, rather than the single
top-level `assessment_status` flag.

**C. Decision can operate in evidence mode, producing "assessment
pending" only when the specific evidence that pathway's rule needs is
missing** — **approved as the trigger condition.** Different pathways
need different evidence (§5): Protect needs mitigation-feasibility
evidence specifically; Adapt needs infrastructure/access evidence
specifically; Relocate needs hazard/historical severity evidence
specifically. A pathway should reach `assessment_pending` (not
`not_evaluated`) once its *own* rule exists but its *own* required
evidence is incomplete — it should not wait on unrelated dimensions
(e.g. Vulnerability) that its rule doesn't use.

**Decision: B+C together, not A.** No overall/renormalized risk score
is created or required (consistent with Task 28 §2's rejection). This
is a **design decision for future implementation**, not a code change
made now — see §16. It does not change Bhitai Malli's current dry-run
output (§12): even under B+C, today's dimension evidence (no approved
Protect/Adapt/Relocate rule exists at all yet) still yields
`not_evaluated` for all three pathways.

### 7. Decision status vocabulary

Minimum vocabulary, distinguishing exactly the five concepts the task
named, mapped to four pathway-level status values plus one orthogonal
boolean plus a top-level conflict state:

**Per-pathway `status` (4 values):**
- `not_evaluated` — no approved rule exists yet for this pathway.
  (Structural absence of a rule — today's state for all three
  pathways, unchanged.)
- `assessment_pending` — a rule exists, but the evidence that specific
  rule needs is currently incomplete for this settlement.
- `not_recommended` — a rule exists, required evidence is available,
  the rule executed, and its conditions were not met.
- `recommended` — a rule exists, required evidence is available, the
  rule executed, and its conditions were met.

**Orthogonal boolean:** `officer_review_required` (already exists,
unchanged) — stays `True` for every status above without exception;
VIKALP never produces an autonomous, unreviewed decision.

**Top-level `decision_status` (extends, doesn't replace, today's
`"pending"`):** `pending` (no pathway has reached `recommended` or
`not_recommended`) / `evaluated` (at least one pathway reached
`recommended` or `not_recommended`) / `conflict_officer_review_required`
(§8 — multiple pathways reach `recommended` simultaneously, or evidence
across pathways materially disagrees).

Explicitly **not** adopted: `insufficient_evidence`,
`eligible_for_assessment` as separate literal values — both collapse
into `assessment_pending`, which already carries that meaning; adding
near-duplicate literals would fragment the vocabulary without adding
distinguishing power (matching Task 28 §6's "choose the minimum useful
vocabulary" precedent).

### 8. Protect rule design

Structure (not implemented — policy pending):

```
Protect = recommended  IF
    hazard/terrain evidence available AND indicates a manageable,
    non-severe context (POLICY PENDING — no approved numeric
    threshold for "manageable" exists for any dimension)
  AND
    mitigation-feasibility evidence available and favorable
    (BLOCKED — no mitigation-feasibility dataset exists in VIKALP
    at all, not even unscored raw data)
  AND
    no Relocate-triggering condition present (§10)
```

**Can Protect currently be evaluated for Bhitai Malli?** No — on two
independent grounds: (1) no dimension has an approved "manageable
severity" threshold (Terrain/Historical/Population all `BLOCKED` per
Task 28; Hazard Exposure returned `no_evidence_found`, which is an
absence-of-evidence result, not a "manageable" finding — Task 28's
no-evidence-≠-low-risk principle explicitly forbids treating it as
one); (2) mitigation-feasibility evidence does not exist as a dataset
at all, so even a fully-scored risk profile could not complete this
rule. Status: `not_evaluated` (no rule exists yet — see §7).

### 9. Adapt rule design

Structure (not implemented — policy pending):

```
Adapt = recommended  IF
    risk context is moderate/manageable (POLICY PENDING, same
    threshold gap as Protect)
  AND
    settlement can remain occupied (no data suggesting otherwise)
  AND
    infrastructure/accessibility evidence available and improvable
    (BLOCKED — no accessibility/infrastructure dataset exists in
    VIKALP at all)
  AND
    no Relocate-triggering condition present (§10)
```

**Can Adapt currently be evaluated for Bhitai Malli?** No, for the same
two reasons as Protect: no approved severity threshold, and no
infrastructure/access dataset exists at all (confirmed absent in
`docs/DATA_INVENTORY.md`). Status: `not_evaluated`.

### 10. Relocate rule design

Per §4, VIKALP's MVP can only ever legitimately reach **Level 1
("relocation assessment warranted")** — never Level 2
("recommended") without an approved multi-dimension comparison rule
(none exists), and never Level 3 ("approved"), which is permanently out
of scope.

Structure for Level 1 (not implemented — policy pending):

```
Relocate = "assessment warranted"  IF
    at least one of:
      - hazard evidence indicates severe/persistent risk
        (requires Hazard Exposure to actually SCORE — not
        no_evidence_found — POLICY PENDING for the "severe"
        threshold even once scoring exists)
      - repeated historical disaster evidence at this location
        (BLOCKED — Historical Disaster Evidence has no approved
        scoring rule, Task 24A)
      - an authoritative hazard-zone designation exists for this
        settlement (does not exist in VIKALP's data — §5)
  AND
    Protect is not recommended AND Adapt is not recommended
    (i.e. Relocate is never evaluated independently of the other
    two — see §3.1 anti-pattern)
```

**Can Relocate currently be evaluated for Bhitai Malli?** No.
Additionally, even disregarding the missing threshold/rule, Bhitai
Malli's own Hazard Exposure evidence is `no_evidence_found` (zero
qualifying GSI landslide records within 1 km) — an absence-of-evidence
result that must never be read as either "safe" or "unsafe." Status:
`not_evaluated`.

### 11. Conflict handling

| Scenario | Deterministic handling |
|---|---|
| Hazard evidence scored but Terrain evidence still pending | Protect/Adapt/Relocate all stay `assessment_pending` at most — a rule requiring multiple dimensions never partially executes on a subset |
| Terrain and Hazard evidence materially disagree (once both scored) | Neither Protect nor Relocate reaches `recommended`; `decision_status = conflict_officer_review_required` |
| Historical evidence incomplete | Excluded from the Relocate rule's inputs for that run (treated as `assessment_pending` contribution), never silently treated as "no history" |
| Vulnerability data missing | Excluded from all three rules entirely for MVP — no rule in §8/§9/§10 references it, since Vulnerability is `FUTURE` (Task 26) and no rule should depend on evidence that cannot exist yet |
| Destination exists but carrying capacity unknown | Does not affect the Decision Workspace at all — this is a Destination Explorer-internal state (§13); Relocate can still reach "assessment warranted" independent of downstream capacity |
| Protection appears feasible but Relocate's severity trigger also fires | Both cannot be `recommended` simultaneously by rule construction (§10 requires Protect/Adapt both NOT recommended before Relocate can be) — if the rules somehow both fire due to a future rule-design bug, `decision_status = conflict_officer_review_required` is the deterministic fallback, never an automatic tie-break |
| Multiple pathways all reach `recommended` | `decision_status = conflict_officer_review_required` — VIKALP never silently picks a "winner" |

No AI/LLM is used to resolve any of the above — every row is a fixed,
inspectable rule outcome.

### 12. Bhitai Malli dry run

Using only currently available evidence (as listed in the task brief):

| Pathway | Status | Recommended | Why |
|---|---|---|---|
| Protect | `not_evaluated` | `False` | No approved rule exists yet (§8); mitigation-feasibility data doesn't exist |
| Adapt | `not_evaluated` | `False` | No approved rule exists yet (§9); infrastructure/access data doesn't exist |
| Relocate | `not_evaluated` | `False` | No approved rule exists yet (§10); Hazard Exposure's own evidence is `no_evidence_found`, not a severity signal |

`decision_status = "pending"`. This is **exactly what the live API
returns today** — confirmed by reading `assess_settlement_decision()`
(§1): no code path exists that could produce anything else. The dry
run does not surface a gap between "what the design says should
happen" and "what the code does" — they already agree. No code change
is required to make Bhitai Malli's output correct.

### 13. Destination dependency

Boundary, reaffirmed from Task 09 and made explicit for the Decision
framework:

```
Relocate reaches "assessment warranted" (Level 1, §4/§10)
        |
        v
Destination Explorer is where the case is SENT for evaluation
        |
        v
Destination suitability is scored on the CANDIDATE SITE's OWN merits
(hazard safety of that site, land suitability, accessibility, etc. —
the 6 SUITABILITY_DIMENSIONS already defined in destination.py)
        |
        v
Carrying capacity, then relocation planning — both downstream of
destination suitability, not of the origin settlement's risk
```

**Explicit non-goal:** `decision.py` must never call `destination.py`
in-process (unlike its existing in-process call to `risk.py`), and
`destination.py` must never read anything from `decision.py` or
`risk.py`. A destination's suitability is not inherited or derived from
the origin settlement's risk score — "Relocate is warranted" answers
*whether to look for a destination*, never *which destination is
good*. This matches `destination.py`'s existing full independence
(Task 09) exactly — no change needed there.

### 14. Explainability design

For every Protect/Adapt/Relocate result, a future (not built)
`PathwayAssessment` extension would carry: `status`,
`evidence_used: list[str]`, `evidence_missing: list[str]`,
`rules_evaluated: list[str]`, `rules_not_evaluated: list[str]`,
`triggering_conditions: list[str]` (empty unless `status ==
"recommended"`), `source_attribution: list[str]` (mirrors `risk.py`'s
per-dimension `evidence[].source` pattern), `policy_status` (`"POLICY
PENDING"` / `"APPROVED"`, mirrors Tasks 25-27's four-tier constant
labeling), `officer_review_required: bool` (already exists),
`limitations: list[str]`. No AI-generated narrative text anywhere in
this structure — every field is a literal list of names/strings drawn
from already-known evidence and rule identifiers, the same pattern
`risk.py`'s `evidence` array already uses. Design only; not implemented
this task.

### 15. Governance table

| # | Decision area | Decision | Status | Rationale | Required future action |
|---|---|---|---|---|---|
| 1 | Protect definition | Reaffirmed (§2), unchanged from Task 08 | APPROVED | Already correct, no evidence to the contrary | None |
| 2 | Adapt definition | Reaffirmed (§3), unchanged from Task 08 | APPROVED | Already correct | None |
| 3 | Relocate definition | Redefined into 3 explicit levels (§4); MVP may only reach Level 1 | APPROVED | Task 08's single-level definition was ambiguous about "assessment" vs "recommendation" vs "approval" — this task resolves that ambiguity | None — this is the approved definition going forward |
| 4 | Overall-risk dependency | B+C (dimension-level evidence + per-rule evidence gating), not A (§6) | APPROVED (design), NOT IMPLEMENTED | Matches Task 28's rejection of requiring a full five-dimension score; scales correctly once individual dimensions are approved | Implement when at least one pathway rule is approved |
| 5 | Decision status vocabulary | 4 pathway states + 1 boolean + 3 top-level states (§7) | APPROVED (design), NOT IMPLEMENTED | Minimum vocabulary distinguishing the 5 required concepts without fragmenting | Implement alongside §4 |
| 6 | Evidence requirements | Documented per-pathway (§5, §8-10) | DOCUMENTED | No new datasets found or invented | Source mitigation-feasibility and infrastructure/access datasets (neither exists) |
| 7 | Missing-data behavior | `assessment_pending`, never a fabricated `not_recommended`/`recommended` | APPROVED | Matches Task 28's no-evidence-≠-low-risk principle, extended to decisions | None |
| 8 | Conflict handling | Table in §11; converges to `conflict_officer_review_required`, never an automatic tie-break | APPROVED (design), NOT IMPLEMENTED | No AI/heuristic tie-breaking permitted | Implement alongside §4 |
| 9 | Officer-review policy | Always `True`, unconditionally, for every status | APPROVED, already implemented | No status in VIKALP's design ever bypasses officer review | None |
| 10 | Relocation recommendation vs. assessment distinction | 3-level model (§4); MVP caps at Level 1 | APPROVED | Prevents VIKALP from ever appearing to make or approve a relocation decision | None |
| 11 | Destination dependency | Fully independent modules, one-way conceptual handoff only (§13) | APPROVED, already implemented (Task 09) | Destination suitability must never inherit the origin's risk score | None |
| 12 | Explainability | Field-list design, no AI narrative (§14) | APPROVED (design), NOT IMPLEMENTED | Matches `risk.py`'s existing evidence-array pattern | Implement alongside §4 |
| 13 | AI usage policy | Zero AI/LLM involvement in any decision, rule, or explanation | APPROVED, reaffirmed | Explicit project-wide constraint (Task 29 brief §"strict rules"), consistent with every prior task | None |

### 16. MVP implementation gate

**A. Can the current decision API remain structurally unchanged?**
**Yes.** `SettlementDecision`'s shape (settlement identity + pathways +
missing_evidence + explanation + officer_review fields) already matches
the target design — only the `status` field's *value set* needs to
grow from 1 literal to 4, and `decision_status` from 1 to 3. No field
additions/removals to the top-level schema are required by this
design; `PathwayAssessment` would gain the §14 explainability fields
when that work happens.

**B. Should any deterministic rules be implemented now?** **No.**
Protect and Adapt both require a "manageable severity" policy threshold
that doesn't exist for any dimension, plus mitigation-feasibility/
infrastructure-access datasets that don't exist at all. Relocate
requires at least one dimension to produce a real (non-`no_evidence_
found`, non-`no_data`) severe-risk score, which also doesn't exist yet.

**C. Can Bhitai Malli receive an actual Protect/Adapt/Relocate
recommendation?** **No** — confirmed by the dry run (§12); every
required input is either `BLOCKED` (policy pending) or absent (dataset
doesn't exist).

**D. Minimum evidence required before implementation:** (1) at least
one of Terrain/Historical/Population's governance decisions from Task
28 §7 resolved, so at least a second dimension can score; (2) an
approved "manageable severity" policy threshold for at least Protect;
(3) a mitigation-feasibility data source (does not exist); (4) an
infrastructure/access data source (does not exist) for Adapt
specifically. None of these four exist today.

**E. Can downstream Destination Analysis proceed independently?**
**Yes, unchanged.** `destination.py`/`DestinationExplorerPage.tsx`
require nothing from this task's findings — they were already fully
independent (Task 09) and remain correctly demonstrable as "framework,
pending data" regardless of Decision framework progress.

Classification summary: **structure = IMPLEMENT NOW-compatible (no
change needed)**; **status-vocabulary/evidence-gating code = IMPLEMENT
AS PENDING** (design approved, awaiting the dimension-level governance
decisions from Task 28 §7 before it's worth writing); **Protect/Adapt
numeric policy thresholds = BLOCKED**; **mitigation-feasibility and
infrastructure/access datasets = FUTURE**; **Vulnerability-dependent
anything = FUTURE**; **Destination Explorer = unaffected, already
correct**.

### 17. SIH demo strategy

Three explicitly distinguished modes, none of which fabricate data:

**LIVE EVIDENCE** — Bhitai Malli's real API responses end-to-end:
Settlement → Hazard Exposure evidence (real GSI query, real
`no_evidence_found` result) → Risk (`Assessment Pending`) → Decision
(`pending`, all pathways `not_evaluated`) → Destination
(`pending`, empty candidates). This is what today's live demo already
shows and requires no change.

**POLICY-READY LOGIC** — the structural framework itself: pathway
definitions, evidence-requirement lists, the 6 suitability dimensions,
the explainability field design (§14) once built. This demonstrates
that VIKALP's *architecture* is complete and rule-ready even where no
rule has fired — i.e., showing the judges the evidence-requirement
tables and "why is this pending" detail, not just a bare "pending"
label.

**DEMO SCENARIO** — an explicitly, visibly labeled walkthrough (e.g. a
distinct UI mode or a slide, never mixed into the live Bhitai Malli
data path) illustrating what the same screens would show once (a)
governance decisions from Task 28 §7 are made and (b) a settlement's
real evidence happens to satisfy a rule — clearly captioned
"Illustrative — not a real assessment" wherever shown. This is a
presentation-layer distinction only; it must never write synthetic
values into `risk.py`/`decision.py`'s live response path. Design only;
not built this task.

Recommended demo flow: walk the full pipeline live on Bhitai Malli
(honest, evidence-first, currently all "pending" and correctly so),
then separately show the DEMO SCENARIO mode to answer "what does this
look like once real evidence exists," keeping the two visibly distinct
throughout.

### 18. Final recommendation and verdict

The Decision framework's **structure is correct and needs no code
change** — `decision.py`/`destination.py`'s current outputs for Bhitai
Malli are exactly what this task's dry run independently derives (§12).
What is missing is entirely upstream: approved severity/threshold
policy for Protect and Adapt, two datasets that don't exist anywhere in
VIKALP (mitigation feasibility, infrastructure/access), and at least
one risk dimension beyond Hazard Exposure producing a real score. None
of these gaps are things this task is permitted to invent, and none
were invented.

**NOT IMPLEMENTATION-READY** — scoped specifically to *Protect/Adapt/
Relocate producing any real recommendation*. As with Task 28, this is
not a blanket judgment: the pathway *framework* (definitions, evidence
requirements, the three-level Relocate model) is implementation-ready
today as documentation/design; the Decision Workspace and Destination
Explorer pages are already correctly demonstrable in their current
"pending" state; and the current code requires zero changes to remain
correct under this governance review.

"Decision framework governance review complete. No code was changed.
Protect, Adapt, and Relocate are now precisely defined (including a
three-level Relocate model distinguishing assessment-warranted from
recommended from approved), their evidence requirements are documented
without inventing any dataset or threshold, and Bhitai Malli's current
`not_evaluated`/`pending` output is confirmed correct under this
design. NOT IMPLEMENTATION-READY for any real Protect/Adapt/Relocate
recommendation; the existing structural framework and evidence-first
'pending' presentation remain the correct and demonstrable MVP
experience today."

## Task 30 — Destination & carrying capacity governance + rule design (governance + design only, not implemented)

### 1. Current implementation audit

**Response structure** (`schemas/destination.py`
`SettlementDestinationAnalysis`): settlement identity fields,
`analysis_status` (str, only value ever produced today: `"pending"`),
`candidates: list[DestinationCandidate]` (always `[]`),
`ranking_status` (str, only value ever produced: `"pending"`),
`ranked_candidates: list[RankedCandidate]` (always `[]`),
`suitability_dimensions: list[SuitabilityDimension]` (6 entries, each
`status: "not_evaluated"`), `missing_evidence: list[str]`,
`explanation`, `officer_review_required`/`officer_review_note`.

**Six suitability dimensions** (unchanged, name + definition + status
only, no weights): Hazard Safety, Land Suitability, Available Capacity,
Accessibility, Infrastructure Availability, Social/Administrative
Feasibility.

**Statuses**: exactly three literals are ever emitted, all
unconditionally — `analysis_status = "pending"`,
`ranking_status = "pending"`, and every dimension's
`status = "not_evaluated"`. `get_settlement_destinations()` has no
branch that could produce anything else (confirmed by reading the full
79-line function — it returns a fixed dict every time, independent of
the `settlement` argument's content).

**Existing fields — already richer than currently used.**
`DestinationCandidate` already defines a full future shape:
`destination_id`, `destination_name`, `latitude`/`longitude`,
`district`/`state`, `land_area_hectares`, `existing_population`,
`existing_households`, `available_area_hectares`,
`infrastructure_access_notes`, `hazard_evidence: list[str]`,
`suitability_evidence: list[str]`, `source`, `data_note` — every field
beyond identity is nullable by design, per the model's own docstring
("this model exists to describe the shape future real destination data
would take, not to hold invented values"). `RankedCandidate` similarly
defines `destination_id`/`name`/`rank`/`score` but is never populated.

**Existing assumptions — already correct, none found to fix.** The
module docstring and the frontend's empty-state copy ("No approved
destination candidates are currently available... will be performed
when approved destination data is available") never claim or imply
that an empty candidate list means no safe destination exists. No
weights are assigned to the 6 dimensions (deliberate — the module
docstring explains this is because nothing is ever scored, so a weight
would have nothing to multiply). This task's core principle
("missing destination evidence must never become... unsafe/
unavailable") is **already satisfied by the existing code**; nothing
here required correction.

**Completely missing**: any candidate dataset, any dimension weights,
any capacity data or formula, any relocation-population concept, any
capacity-gap concept, any candidate-generation mechanism, any
comparison/ranking logic.

**Does any destination data currently exist?** No candidate
destination dataset exists anywhere in VIKALP (confirmed against
`DATA_INVENTORY.md` §7 below). **One partial exception worth
flagging**: the Hazard Exposure scoring function built in Task 23
(`score_hazard_exposure_landslide(lat, lon)`) is a pure function of
*any* coordinate, not settlement-specific — it already works against
the real 813-record GSI landslide inventory for any point inside Pauri
Garhwal district. This means the "Hazard Safety" suitability dimension
has a **working, already-implemented scoring rule** today; the only
thing missing is a candidate coordinate to feed it (§3, §19).

### 2. Destination definition

Four levels, as posed by the task:

- **A. Candidate location** — a geographic point/area identified as
  potentially assessable: minimally a coordinate, a name/identifier,
  and a source citation. VIKALP's schema (`DestinationCandidate`) is
  already shaped to hold this.
- **B. Suitable destination** — a candidate location with sufficient
  *evidence* (not necessarily all 6 dimensions, but at minimum Hazard
  Safety and Land Suitability) establishing that habitation there would
  be appropriate.
- **C. Relocation-ready destination** — a suitable destination whose
  capacity, accessibility, and essential-services evidence is
  sufficiently established for relocation *planning* to begin.
- **D. Government-approved relocation site** — a formal
  administrative/legal decision. **VIKALP must never claim D** — this
  is reaffirmed as a permanent, non-negotiable boundary (§15).

**Which levels can VIKALP's MVP support?** Only the *structure* for
Level A exists today (the schema can hold a candidate) — but zero real
Level-A instances exist, since no candidate dataset has been sourced.
Levels B and C are designed in this task (§4-§6) but not implemented —
both are blocked on data that doesn't exist and, for some components,
policy that isn't approved. Level D is permanently out of scope.

### 3. Six-dimension audit

| Dimension | Definition | Evidence required | Current data? | Can score now? | MVP status |
|---|---|---|---|---|---|
| Hazard Safety | Candidate site itself is free of the hazard(s) driving relocation from the origin | Same hazard-evidence class used for origin risk (GSI landslide proximity, within GSI's coverage) | **Partially** — GSI inventory (813 records) covers all of Pauri Garhwal district, and the Task 23 scoring function is coordinate-agnostic | **Conditionally yes** — the rule already runs for any Pauri-Garhwal coordinate; blocked only on having a candidate coordinate to give it, not on rule/policy | **IMPLEMENT AS PENDING** — reuses existing, approved code; unblocked the moment any candidate coordinate exists |
| Land Suitability | Physical/terrain suitability (terrain, soil, drainage, buildability) | DEM/slope raster + an approved terrain-susceptibility rule + soil/drainage data | Slope/DEM raster covers part of Pauri Garhwal; **no approved scoring rule exists** (same blocker as origin Terrain dimension, Task 27/28); soil/drainage data absent entirely | No | **BLOCKED** (rule) + **FUTURE** (soil/drainage data) |
| Available Capacity | Unused land/infrastructure capacity able to accommodate relocated population | Land-use/land-availability data + existing population/infrastructure at the candidate | **None** (`DATA_INVENTORY.md`: "Land (use/availability): None") | No | **FUTURE** |
| Accessibility | Road/transport access to and within the candidate site | Road-network dataset | **None** (`DATA_INVENTORY.md`: "Roads: None") | No | **FUTURE** |
| Infrastructure Availability | Water/power/health/education infrastructure at or near the candidate | Water, electricity, health-capacity, school-capacity datasets | **None for all four** (`DATA_INVENTORY.md`: "Water: None", "Electricity: None", "Health: None", "Schools: None") | No | **FUTURE** |
| Social/Administrative Feasibility | Land ownership, jurisdiction, community acceptance | Land/cadastral records + (for acceptance) a fundamentally non-GIS, officer/field-survey input | **None** (`DATA_INVENTORY.md`: "Land (use/availability): None") | No | **FUTURE** for ownership/jurisdiction data; the community-acceptance component is **not a GIS-scoreable input even in principle** — flagged as permanently officer-judgment territory, not a future dataset gap |

Of six dimensions, exactly one (Hazard Safety) has a working rule today
— blocked purely on candidate data, not on policy. The other five are
blocked on missing datasets (Land Suitability additionally on missing
policy). No dimension is replaced; all six are reaffirmed as
architecturally correct.

### 4. Destination suitability

**Definition**: a candidate location has evidence indicating habitation
there would be appropriate — primarily driven by Hazard Safety and Land
Suitability (whether the site is *itself* safe to build on), secondarily
by Accessibility/Infrastructure/Social feasibility (whether it is
*adequate* to live in). Only categories already represented by the
existing 6 dimensions are used — no new dimension is invented. Two
categories the task brief suggested (water availability, livelihood
considerations) are **not** added as new dimensions: water availability
already belongs inside the existing Infrastructure Availability
dimension (per `DATA_INVENTORY.md`'s own "Water" row), and livelihood
considerations have no representation anywhere in VIKALP's architecture
today — explicitly marked FUTURE rather than folded into an existing
dimension it doesn't fit.

**Suitability vs. Capacity — explicitly distinct, per the task's own
framing**: Suitability answers *"should anyone live here at all"*
(safety/adequacy of the site itself). Capacity answers *"how many
people could this site support"* (§5). A site can be perfectly suitable
but hold only 5 households (insufficient capacity for Bhitai Malli's
86); a site can have enormous land capacity but sit inside a hazard
zone (unsuitable regardless of size). Both must be evaluated and
reported independently — VIKALP must never collapse them into one
number.

### 5. Carrying-capacity definition

**VIKALP's definition**: the number of relocated households/population
a candidate destination could safely and adequately accommodate, given
its developable land, essential services, and hazard/environmental
constraints — **not** simply its raw land area (the task's explicitly
rejected naive definition).

Four distinct capacity concepts, in increasing order of what they
account for:

- **Physical capacity** — raw developable/buildable land after
  excluding hazard-, environmental-, and legal-constrained land. A
  land-area-based upper bound only.
- **Service capacity** — the population existing/planned water,
  sanitation, health, school, and electricity infrastructure can
  support without degrading service for current residents.
- **Safe occupancy capacity** — physical capacity further constrained
  by hazard/environmental safety margins (i.e. physical capacity ∩
  hazard-safety evidence — developable land that is itself
  hazard-exposed is excluded).
- **Final planning capacity** — the officer-reviewed number actually
  used for relocation planning: bounded by the minimum of the above,
  further adjusted for administrative/legal/social constraints (land
  ownership, community acceptance). **This number is explicitly not
  purely computable by VIKALP** — it requires officer/administrative
  input by design, not as a current limitation to be engineered away.

None of the four can be computed today — every underlying dataset
(land-use, service infrastructure, ownership) is absent (§3, §7).

### 6. Capacity formula governance

| Approach | How it works | Required data | Misleading-result risk | Appropriate for VIKALP? |
|---|---|---|---|---|
| A. Land-area-only | `capacity = available_hectares ÷ assumed_density` | Land area + an assumed household-per-hectare density constant | **High** — ignores hazard/service/legal constraints entirely; could report "capacity: 500" for a hazard-exposed or service-less parcel; requires an unjustified density constant (the task's own example, "1 ha = 50 families," is exactly the kind of invented value this project forbids) | **Rejected** as a standalone approach |
| B. Minimum-of-component | `capacity = min(physical, service, safe-occupancy)` | All three component datasets | Low, *if* every component is a real number — but an "unknown" component must propagate as unknown, never be treated as infinite (dropped from the min) or zero | Methodologically sound; **appropriate**, but only once components exist |
| C. Weighted capacity score | A single blended number from weighted components | All components + policy-approved weights | **High** — weights need the same policy justification the project already refuses to invent (Task 28 §2's renormalization objection applies identically here); a single blended number also hides which constraint is actually binding, hurting officer explainability | **Rejected** |
| D. Constraint-based | Start from developable land, subtract/exclude zones failing each constraint, report which constraints were applied vs. unknown | Land-use + per-constraint layers | Low — inherently transparent (can show "excluded due to hazard" vs. "excluded due to no data" separately) | **Appropriate**, complementary to B |
| E. Hybrid (B + D) | Use D's exclusion logic to derive safe-occupancy developable land, then take B's minimum against service capacity for final planning capacity; always distinguish "limited by a real constraint" from "limited by missing data" in the output | All of the above | Lowest, if implemented with the "unknown ≠ zero/infinite" discipline maintained throughout | **Approved as the eventual target methodology** |

**Decision: E, marked POLICY PENDING, not implemented.** No housing-
density assumption, exclusion threshold, or component weight is invented
here or anywhere in VIKALP; any such constant would need an authoritative
source (e.g. state urban/housing-development norms) before formula E
could ever run — matching the SOURCE-BACKED/POLICY-PENDING convention
already established in Tasks 25-27.

### 7. Existing destination/capacity data audit

Searched `data/raw`, `data/processed`, `DATA_INVENTORY.md`,
`DATA_PROVENANCE.md`, backend models/schemas, and existing GIS layers:

| Category | Status | Detail |
|---|---|---|
| Land-use data | **NOT AVAILABLE** | Zero land-use layer anywhere (`DATA_INVENTORY.md`: "Land (use/availability): None") |
| Settlement/village boundaries | **NOT AVAILABLE** at village level | Only district/state-level boundary polygons exist (Task 12, `boundaries_uk_demo.geojson`) — too coarse to define a candidate-site parcel |
| Roads | **NOT AVAILABLE** | "Roads: None" |
| Water | **NOT AVAILABLE** | "Water: None" |
| Electricity | **NOT AVAILABLE** | "Electricity: None" |
| Hospitals / health capacity | **NOT AVAILABLE** | Both the POI list and the service-capacity data are "None" |
| Schools | **NOT AVAILABLE** | "Schools: None" |
| Population | **PARTIALLY AVAILABLE** | Only for the origin settlement itself (Bhitai Malli, 383) — zero population data exists for any candidate destination location, since none exist |
| Existing settlements (as a candidate-generation source) | **NOT AVAILABLE** | Exactly one settlement row exists in the entire database — Bhitai Malli itself — confirmed via `backend/app/database.py`'s `BHITAI_MALLI` seed dict; there is no second settlement to ever use as a "candidate" |
| Hazard layers | **PARTIALLY AVAILABLE** | GSI landslide inventory (813 records, district-wide, coordinate-agnostic scoring already implemented — §1, §3) is real and usable for any candidate within Pauri Garhwal; Bhuvan SLIM/LHZ layers are bbox-confirmed reachable via WMS (Tasks 17-18) but never downloaded as vector features |
| Terrain (DEM/slope) | **PARTIALLY AVAILABLE** | Raster covers part of Pauri Garhwal only — coverage of any specific future candidate site is not guaranteed and would need to be checked per-candidate |
| Land availability | **NOT AVAILABLE** | Same as land-use, above |
| Administrative/legal constraints (ownership, land title) | **NOT AVAILABLE** | Same "Land: None" entry — no cadastral/ownership data anywhere |

No new dataset is introduced by this task; every "NOT AVAILABLE" above
restates an already-documented absence.

### 8. Destination candidate generation

| Approach | How it works | Requires | Risk | MVP-appropriate? |
|---|---|---|---|---|
| A. Manually curated, government-approved candidates | An authoritative body (state disaster management authority, revenue department) supplies named, sourced candidate sites | External sourcing effort; no technical blocker | Low — each candidate carries a citation from day one, matching the existing `DestinationCandidate.source` field | **Yes — the only approach recommended for MVP** |
| B. GIS-generated candidate areas | Algorithmic screening (e.g. slope-below-threshold, outside hazard buffer, on public land) using the approved GeoPandas/Rasterio stack | Land-use + ownership layers (neither exists) | **High** — this is precisely the "find any nearby land and call it safe" anti-pattern the task explicitly warns against, unless every output is clearly labeled "GIS-suggested, unconfirmed" and never presented with government-candidate confidence | Not for MVP; FUTURE, and only ever as a *pre-screening* layer subordinate to A |
| C. Existing settlement locations | Use other known settlements as relocation destinations | A real multi-settlement dataset | VIKALP has **exactly one settlement in its database** (Bhitai Malli, the origin itself) — there is no second settlement to draw from | **Not viable today at all**, structurally, not just as a matter of policy |
| D. Land-use-derived candidates | Similar to B, filtered by permitted land-use classes | Land-use dataset (absent) | Same as B | FUTURE |
| E. Combination | GIS pre-screening (B/D) narrows options; government/administrative curation (A) confirms before VIKALP ever labels something a real "candidate"; each candidate's origin (government-provided vs. GIS-suggested-unconfirmed) stays visibly tagged, never merged into one undifferentiated list | All of the above | Lowest, if the tagging discipline is maintained | **The eventual target design**, not implemented |

**Safest MVP approach: A only.** Government/administrative-sourced
candidates exclusively, each required to carry a `source` citation
(the schema already has this field). GIS-generation (B/D) is explicitly
deferred to FUTURE and, even then, must never be silently promoted to
the same confidence level as a government-curated site.

### 9. Destination comparison strategy

Target comparison shape (not implemented):

`| Destination | Suitability | Capacity | Capacity Gap | Evidence Status |`

**No score is ever invented to populate the Suitability/Capacity
columns** until real scoring rules exist (§3, §6). What the MVP *can*
legitimately support today, once real candidates exist:

- **Evidence-completeness comparison** — e.g. "Candidate A: 3/6
  dimensions evidenced, Candidate B: 1/6 evidenced" — a genuine count
  from real data, following the exact precedent already accepted in
  Task 08 for pathway evidence-required counts.
- **Filtering** by evidence completeness or dimension status.
- **Side-by-side raw-evidence display** (not scores).
- **No ranking** until at least one dimension's scoring rule is
  approved — matches the existing `ranking_status: "pending"` design
  exactly; no change needed.
- **Officer review always required**, unconditionally, same as
  Decision Workspace (Task 29 §7).

**Minimum defensible approach**: evidence-completeness comparison and
filtering only; ranking and suitability/capacity score comparison
remain fully deferred.

### 10. Missing-data / status model

Extends (does not replace) the four-state risk vocabulary from Task 28
§6, with one destination-specific addition:

- `no_candidate_data` — no destination dataset exists at all (today's
  actual state for every settlement in VIKALP). **Must never be read
  as "no safe destination exists"** — it means VIKALP has not yet been
  given any candidates to evaluate, full stop.
- `assessment_pending` — candidates exist, but a given dimension's rule
  hasn't run yet or required evidence is incomplete for that candidate.
- `insufficient_evidence` — a rule ran; evidence exists but is
  inadequate or contradictory.
- `no_evidence_found` — a rule ran (e.g. Hazard Safety via the existing
  landslide-inventory function) and found zero qualifying records
  nearby — reused directly from Task 23's existing vocabulary for
  consistency.
- `source_data_unavailable` — an infrastructure/data-source failure,
  not an evidence gap (reused from Task 28's orthogonal
  infrastructure-failure statuses).
- `evaluated` — a rule ran, real evidence-based output was produced.

**`capacity_unknown`** (a value, not a status literal) must never be
interpreted as zero capacity — same discipline as "no evidence ≠ low
risk," applied to capacity specifically (§13).

### 11. Bhitai Malli dry run

Using only currently available VIKALP evidence:

| Field | Value | Why |
|---|---|---|
| `analysis_status` | `no_candidate_data` (today's code says `"pending"` — semantically equivalent; a future refinement could rename it for precision, not required now) | No candidate destination dataset exists anywhere |
| `candidates` | `[]` | Correct — **not** "no safe destination exists," simply no candidates have been provided |
| `ranking_status` | `pending` / not applicable | Nothing to rank without candidates |
| `suitability_dimensions` | All 6 at `not_evaluated` | Unchanged — matches current live output |
| Capacity, capacity gap, relocation population | Not computed, not displayed as any number | No component data exists (§5, §6, §12, §13) |

This is **exactly what the live API already returns** (confirmed by
reading `get_settlement_destinations()`, §1) — no code path exists that
could produce anything else. No code change is required for Bhitai
Malli's output to be correct under this design.

### 12. Relocation population

**Relocation population ≠ total settlement population**, unless policy
explicitly establishes that equivalence — reaffirmed exactly as the
task frames it.

Candidate concepts, in order of increasing evidentiary demand:

- **Total settlement population** (383) — an upper bound only, never
  automatically the relocation population.
- **Affected population** — the subset actually within the
  hazard-evidenced zone. **Cannot be computed even in principle with
  VIKALP's current data model** — `models/settlement.py` represents
  each settlement as a single lat/lon point, with no intra-settlement
  polygon/zone geometry (confirmed via the model definition read in
  Tasks 25-27). This is a structural/schema limitation, not merely a
  missing-dataset problem.
- **Vulnerable population** — requires the Vulnerability dimension,
  which has zero data anywhere (Task 26, FUTURE).
- **Households** (86) — same caveat as total population, just a
  different unit.
- **Officer-defined relocation population** — the officer uses
  VIKALP's evidence plus field assessment/judgment to determine the
  actual number.

**Decision**: relocation population is **never auto-set to total
population**; it remains **officer-defined and not computed by
VIKALP** until (a) VIKALP's data model gains intra-settlement spatial
resolution (a schema change, out of this task's scope) and (b) a
policy for what counts as "affected" is approved. Marked **POLICY
PENDING + structurally FUTURE**.

### 13. Capacity gap

**Definition**: Capacity Gap = Required accommodation (the relocation
population's housing/service need, §12) vs. Available safe capacity
(the destination's Final Planning Capacity, §5).

What VIKALP should eventually display: required capacity, available
capacity, surplus, deficit, or **`unknown`**. **Missing-data behavior**:
if *either* side is unresolved, the gap itself displays as `unknown` —
never defaulted to "surplus" (falsely implying adequate capacity) or
"deficit" (falsely implying inadequate capacity). Both directions are
equally unjustified fabrications from missing data, and neither is
permitted.

### 14. Destination → Relocation Plan boundary

```
Decision (Relocate: "assessment warranted", Task 29 §4/§10)
        |
        v
Destination (candidate + suitability EVIDENCE, not a single score)
        |
        v
Capacity (component evidence + Final Planning Capacity, once real)
        |
        v
Relocation Plan — CONSUMES the above, computes none of it itself
```

The Destination module must never construct a relocation plan. The
Relocation Plan module must never re-derive suitability or capacity
math independently — it only consumes whatever Destination/Capacity
already produced (displaying "pending" if nothing real exists yet).
Information passed downstream: candidate id/name/location, its
suitability-dimension evidence array (not a collapsed score), its
capacity component evidence (not a single number unless genuinely
computed via §6's formula E), and explicit status/evidence-completeness
flags. This preserves the same one-way, non-overlapping module boundary
already established between `decision.py` and `destination.py` (Task
29 §13) and extends it one level further downstream.

### 15. Legal / administrative boundary

VIKALP must never claim to: acquire land, approve land, declare land
legally suitable, resolve ownership disputes, approve compensation,
authorize relocation, or issue government orders. All of these sit at
or beyond Level D (§2) — permanently outside VIKALP's authority as a
decision-*support* system. **Reviewed the existing code and found no
violation anywhere** — `destination.py`, `decision.py`, and their
frontend pages contain no language claiming any of the above; this is
reaffirmed as a permanent constraint, not a correction. Any future UI
copy referencing land acquisition/compensation/legal suitability must
be framed as "for officer/government review," never as an action
VIKALP performs, and marked FUTURE/policy-dependent until such workflow
is explicitly scoped.

### 16. Explainability design

Same field-list pattern established in Task 29 §14, applied to
`DestinationCandidate` (not implemented — design only):
`candidate_location`, `evidence_available: list[str]`,
`evidence_missing: list[str]`, `suitability_dimensions` (each with its
own `status`), `rules_evaluated: list[str]`,
`rules_not_evaluated: list[str]`, `capacity_inputs: list[str]`,
`capacity_calculation` (a real number only once formula E, §6, is
approved and runnable — otherwise `"not computed — policy pending"`),
`limitations: list[str]`, `source_attribution`, `policy_status`
(`"POLICY PENDING"` / `"APPROVED"`), `officer_review_required: bool`.
No AI-generated narrative anywhere in this structure.

### 17. SIH demo strategy

**LIVE EVIDENCE** — Bhitai Malli's real, current `/destinations`
response: empty candidates, honest `no_candidate_data`/`pending`, all
6 dimensions `not_evaluated`. Demonstrates the pipeline doesn't
fabricate, requires no change.

**POLICY-READY LOGIC** — two genuinely real things worth showing
directly: (1) the already-built `DestinationCandidate`/`RankedCandidate`
schema, demonstrating the system is already shaped to receive real
candidate data the moment it's sourced; (2) the Hazard Safety scoring
function (`score_hazard_exposure_landslide`) is **already live and
reusable for any coordinate** — this can be demonstrated directly
against an arbitrary Pauri Garhwal coordinate (as a standalone technical
capability, clearly separated from the settlement-specific demo flow)
to show real evidence retrieval working today, not vaporware.

**DEMO SCENARIO** — an explicitly, visibly labeled walkthrough (e.g. a
distinct UI mode, watermarked "Illustrative — not real data," never
mixed into the live Bhitai Malli response path) showing 2-3 fictional
candidate destinations fully evidenced, to answer "what would this look
like once real candidates and rules exist." Must be visually and
semantically distinct enough that judges cannot mistake it for real
government data — a persistent banner/watermark, not just a caption.
Design only; not built this task. May be used later for UI
demonstration exactly as described here, with that labeling
requirement carried forward as a hard constraint on any future
implementation of it.

### 18. Governance table

| # | Decision area | Decision | Status | Rationale | Required future action |
|---|---|---|---|---|---|
| 1 | Destination definition | 4-level model (A-D), MVP supports only A's structure (§2) | APPROVED | Resolves the ambiguity Task 09 left implicit | None |
| 2 | Candidate location definition | Coordinate + name + source citation, minimum (§2, §8) | APPROVED | Matches existing schema exactly | None |
| 3 | Suitability definition | Evidence-based site appropriateness, distinct from capacity (§4) | APPROVED | Uses only existing 6 dimensions, no new category invented | None |
| 4 | Six suitability dimensions | Reaffirmed unchanged (§3) | APPROVED, no replacement | Architecturally sound; only Hazard Safety currently rule-ready | None |
| 5 | Carrying-capacity definition | 4-tier model: physical/service/safe-occupancy/final-planning (§5) | APPROVED (design), NOT IMPLEMENTED | Rejects "land-area-only" as required by the task | Source component datasets |
| 6 | Capacity components | Land, service infrastructure, hazard/environmental constraints, ownership (§5) | DOCUMENTED | No component dataset exists | Source each component |
| 7 | Capacity formula | Hybrid E (constraint-based exclusion + minimum-of-component) (§6) | APPROVED (design), POLICY PENDING | Rejects land-area-only (A) and weighted-score (C) as misleading/unjustified | Authoritative density/threshold source before any formula runs |
| 8 | Candidate generation | Government-curated only (A) for MVP; GIS-generation (B/D) deferred, always tagged unconfirmed (§8) | APPROVED | Prevents "arbitrary nearby land = destination" anti-pattern | Source a real candidate list from an authoritative body |
| 9 | Destination ranking | No ranking until scoring rules approved; evidence-completeness comparison only (§9) | APPROVED | Matches existing `ranking_status: "pending"` | Implement once ≥1 dimension scores |
| 10 | Missing-data behavior | Extended vocabulary incl. `no_candidate_data`, `capacity_unknown` (§10, §13) | APPROVED (design), NOT IMPLEMENTED | Reuses Task 28's existing vocabulary rather than fragmenting it | Implement alongside §7/§9 |
| 11 | Relocation population | Officer-defined only; never auto-set to total population (§12) | APPROVED | VIKALP's point-geometry data model cannot compute "affected population" even in principle | Requires a settlement data-model change (intra-settlement geometry) — out of scope here |
| 12 | Capacity gap | Surplus/deficit/unknown; unknown whenever either side is unresolved (§13) | APPROVED (design), NOT IMPLEMENTED | Prevents fabricating either a false surplus or false deficit | Implement once §7 and §12 are resolved |
| 13 | Destination → Relocation Plan boundary | One-way evidence handoff, no re-derivation downstream (§14) | APPROVED | Extends the existing decision→destination boundary pattern (Task 29 §13) | None |
| 14 | Legal/administrative boundary | VIKALP never claims acquisition/approval/legal-suitability/compensation/authorization (§15) | APPROVED, already compliant | Reviewed all current code, found no violation | None |
| 15 | Explainability | Field-list design, no AI narrative (§16) | APPROVED (design), NOT IMPLEMENTED | Matches Task 29 §14's pattern exactly | Implement alongside §7 |
| 16 | AI usage | Zero AI/LLM involvement anywhere in destination/capacity logic | APPROVED, reaffirmed | Consistent with every prior task | None |
| 17 | SIH demo scenario policy | 3 explicitly distinct modes; DEMO SCENARIO always visibly watermarked (§17) | APPROVED (design), NOT IMPLEMENTED | Prevents judges mistaking illustrative data for real government data | Build only with the labeling requirement enforced |

### 19. Implementation gate

**A. Can `destination.py` remain structurally unchanged?** **Yes.** The
schema/module shape already matches the target design — only the
literal value sets (`analysis_status`, dimension `status`) would grow,
same pattern as Task 29's decision-framework gate.

**B. Can any destination rule be implemented now?** **Effectively no.**
Hazard Safety's scoring *function* already exists and needs zero new
code, but there is no candidate coordinate anywhere in VIKALP to call
it on — so nothing executable changes today. Classified **IMPLEMENT AS
PENDING**, not IMPLEMENT NOW, because a candidate dataset — not code —
is the actual blocker.

**C. Can carrying capacity be calculated now?** **No.** Zero components
(land-use, service infrastructure, ownership) exist.

**D. Can Bhitai Malli receive a real destination recommendation now?**
**No** — confirmed by the dry run (§11).

**E. Can the destination UI be built as an evidence/pending
experience?** **Yes, already built exactly that way** — no change
needed; `DestinationExplorerPage.tsx`'s current empty-state and
evidence-missing sections already satisfy this design.

**F. What exact data would unblock the next implementation?** A single
government/administrative-sourced candidate-destination list (name,
coordinates, source) would immediately unblock Hazard Safety scoring
(zero new code, reuses Task 23's function) and would let Land
Suitability run once its separate governance blocker (Task 27/28) is
resolved. Beyond that: land-use/availability data (Available Capacity),
road-network data (Accessibility), water/electricity/health/school
datasets (Infrastructure Availability), land-ownership/cadastral data
(Social/Administrative Feasibility, §15), and an authoritative
housing-density/capacity-threshold source (§6, to ever move formula E
off POLICY PENDING).

### 20. Final recommendation and verdict

Destination.py/schemas/frontend require **no code change** — every
current output for Bhitai Malli is exactly what this task's design
independently derives (§11), and the existing empty-candidate
messaging already avoids the "empty = unsafe" anti-pattern without any
correction needed. What's missing is entirely upstream: a real
candidate dataset (government-curated, per §8), 4-5 additional datasets
that don't exist anywhere in VIKALP (land-use, roads, water/
electricity/health/school, land ownership), and an authoritative
capacity-formula source. None of these gaps were invented or
estimated to fill this report.

**One dimension is uniquely close to ready**: Hazard Safety's scoring
rule already exists and is coordinate-agnostic — the moment a single
real candidate coordinate is sourced, it can score with zero new code,
mirroring how Hazard Exposure was the one risk dimension closest to
ready in Task 28.

**NOT IMPLEMENTATION-READY** — scoped specifically to *any real
destination suitability score, carrying-capacity number, or relocation
recommendation*. As with Tasks 28-29, this is not a blanket judgment:
the destination framework (schema, 6-dimension structure, evidence-first
"pending" UI) is implementation-ready today as documentation/design and
requires zero code changes to remain correct under this governance
review.

"Destination and carrying-capacity governance review complete. No code
was changed. Destination suitability and carrying capacity are now
precisely defined (including a 4-level destination model and a 4-tier
capacity model that explicitly rejects land-area-only capacity), their
evidence requirements and formula options are documented without
inventing any dataset, density constant, or score, and Bhitai Malli's
current `no_candidate_data`/`pending`/all-dimensions-`not_evaluated`
output is confirmed correct under this design. NOT
IMPLEMENTATION-READY for any real destination score, capacity number,
or relocation recommendation; the existing structural framework and
evidence-first 'pending' presentation remain the correct and
demonstrable MVP experience today, with Hazard Safety uniquely
positioned to score immediately once any real candidate destination is
sourced."

## Task 31 — Final VIKALP MVP audit, scope freeze & implementation master plan (governance/audit only, not implemented)

Full 24-part report delivered in chat (same session). This entry
records the durable conclusions for future tasks; see the chat
transcript for full narrative detail.

### Master-document status

`docs/VIKALP_MASTER_SPEC.md` (110 lines) and `docs/UI_SPEC.md` (87
lines) are the project's master product/UI references. **Both are
stale**: their task-history/page-status text still describes Risk
Analysis, Decision Workspace, and Destination Explorer as unbuilt
`PlaceholderPage`s, though all three have been real, live, evidence-
gated pages since Tasks 07B/08/09. `DECISIONS.md` (this file) is the
accurate, current record; the master-spec files' *architecture,
stack, pilot geography, and out-of-scope lists* remain fully valid and
unchanged — only their narrative task-history sections are outdated.
**Action**: refresh both files' task-history sections in a future
housekeeping pass (P1/P2, not a blocker).

**AI Copilot and a standalone "Scenario Simulator" are not present
anywhere in `VIKALP_MASTER_SPEC.md`, `UI_SPEC.md`, or any task through
Task 30** — both are introduced for the first time by Task 31's own
brief. Flagged rather than silently treated as pre-existing scope. The
master spec's core workflow has no Scenario Simulator step and no
Copilot step. Since the master spec explicitly bans "external LLM
APIs," any real LLM-backed Copilot would require an explicit amendment
to that document before implementation — outside this task's authority
to grant (see AI boundary below).

### Verified codebase state (confirmed by direct reading, not documentation)

- **Real, live, working**: `GET /health`, `/api/settlements`,
  `/api/settlements/{id}`, `/api/settlements/{id}/geojson`,
  `/api/settlements/{id}/risk`, `/api/settlements/{id}/decision`,
  `/api/settlements/{id}/destinations`, `/api/gis/boundaries` — 8
  endpoints total, all GET, all reading real data (Bhitai Malli row,
  real Uttarakhand ADM2 boundaries, real GSI landslide inventory via
  Hazard Exposure). Overview dashboard is the one fully wired page
  (live map + boundaries + settlement evidence + 4 teaser cards). Risk
  Analysis, Decision Workspace, Destination Explorer pages are real and
  correctly evidence-gated/pending.
- **Confirmed zero implementation** (not partial — literally absent):
  authentication (LoginPage is fully disabled/cosmetic, code comment
  "Real authentication will be connected in a later task"; zero
  `jwt`/`bcrypt`/`passlib`/auth code anywhere in `backend/`), RBAC,
  audit logging, Reports (bare `PlaceholderPage`, no ReportLab in
  `requirements.txt`, no backend report code at all), Relocation
  Planner (bare `PlaceholderPage`, zero schema/service/API), Scenario
  Simulator (does not exist even as a placeholder page or nav item —
  the nav's "Scenario Lab" label is Decision Workspace, mislabeled),
  AI Copilot (zero code anywhere).
- **Two nav-label mismatches confirmed** in
  `frontend/src/data/navigation.ts`: `decision-workspace` is labeled
  "Scenario Lab" (it is Decision Workspace/Protect-Adapt-Relocate, not
  a simulator); `destination-explorer` is labeled "Capacity
  Intelligence" (it is Destination Explorer; no separate Capacity page
  exists at all).
- **Testing**: only `backend/tests/test_hazard_exposure.py` (22
  `unittest` tests, real data) exists. Zero tests for `risk.py`'s
  gate/dispatch logic, `decision.py`, `destination.py`, `gis.py`,
  `settlements.py`, and zero frontend tests.
- **Data** (confirmed via direct `data/` listing, cross-checked
  against `DATA_INVENTORY.md`): exactly 5 real assets exist —
  Uttarakhand ADM2 boundaries, CartoDEM v3R1 (4 raw tiles, 1 processed/
  clipped), derived slope raster, GSI/NLFC landslide inventory (813
  records), and the single uncited Bhitai Malli demo scalar row. Zero
  vulnerability, destination-candidate, land-use, road, water,
  electricity, health, school, ownership, or second-settlement data
  exists anywhere — confirmed by direct inspection, not assumed.
- **Architecture preservation**: confirmed via `requirements.txt`/
  `package.json` — zero prohibited technologies present anywhere
  (no SQLAlchemy, MongoDB, Redis, Docker, ML frameworks, RAG,
  pgvector, external LLM APIs, etc.). Recharts and ReportLab remain
  approved-but-unused (zero current usages, not a violation).

### AI Copilot boundary (final)

Approved MVP scope: a **deterministic, template-based explanation
layer** — pure Python functions (no new dependency, no LLM, no vector
DB) that map VIKALP's already-real, already-typed JSON outputs (status
literals, evidence lists, missing-inputs lists) to pre-authored
explanation sentences. Explicitly **not** an LLM integration. A real
LLM-backed Copilot is FUTURE and requires an explicit master-spec
amendment (currently prohibited by `VIKALP_MASTER_SPEC.md`'s "external
LLM APIs" ban) before any such task may begin.

### Scope freeze (final)

**MUST BUILD**: minimal JWT officer authentication (single demo role,
protects the 8 existing endpoints) + the two nav-label corrections;
evidence-backed PDF report (ReportLab, aggregates only existing real
endpoint data — the master workflow's final named step, currently 0%
built); minimum test suite (endpoint smoke tests + risk-gate unit
tests, `unittest` only).

**SHOULD BUILD IF TIME PERMITS**: deterministic AI Copilot explanation
layer; Relocation Planner as an explicitly watermarked DEMO SCENARIO
(never mixed with live Bhitai Malli data); one real Recharts chart
(approved stack, currently 0 usages).

**DO NOT BUILD FOR MVP**: a Scenario Simulator subsystem (not in the
original master workflow, no existing groundwork, genuine scope-creep
risk); any ML/scoring automation; RAG/vector DB/external LLM API;
GIS-auto-generated destination candidates; a dedicated Settlement
Details page (redundant at N=1 settlement); full multi-role RBAC +
audit logging (nothing to scope with only one settlement/district);
anything from the master spec's existing out-of-scope list.

### Verdict

**READY TO ENTER IMPLEMENTATION.** No architectural drift, no
prohibited technology, no unresolved governance conflict blocks a
first concrete build. The evidence-first pending-state story across
Risk/Decision/Destination is real, honest, and demo-ready today. The
biggest visible gap is the fake/disabled login screen combined with a
completely absent Reports feature — both directly buildable now with
zero new data or dependencies.

**First build task after Task 31**: Officer Authentication (minimal
JWT, single demo role, protects existing endpoints) + Navigation Label
Correction (Scenario Lab → Decision Workspace, Capacity Intelligence →
Destination Explorer), as one combined task.

"Final MVP audit complete. No code was changed. VIKALP's architecture,
data, and governance record are confirmed consistent with the master
spec and with Tasks 21-30's conclusions, with two flagged documentation-
staleness issues and two nav-label mismatches (both trivial to fix).
AI Copilot and Scenario Simulator are confirmed to be new concepts
introduced by Task 31 itself, not prior approved scope — Copilot is
approved for MVP only as a non-LLM deterministic explanation layer;
Scenario Simulator is recommended DO NOT BUILD for MVP. READY TO ENTER
IMPLEMENTATION. First task: minimal JWT officer authentication plus
navigation label correction."

## Task 32 — Navigation label correction + documentation synchronization (implemented)

Executed the first half of Task 31's named first build task (nav-label
correction only — authentication was explicitly out of scope for this
task and was not attempted).

**Navigation changes** (`frontend/src/data/navigation.ts`): the
`decision-workspace` tab's label changed `"Scenario Lab"` →
`"Decision Workspace"`; the `destination-explorer` tab's label changed
`"Capacity Intelligence"` → `"Destination Explorer"`. Both pages'
own on-page `<h1>` headings already said the correct name (confirmed
by reading `DecisionWorkspacePage.tsx`/`DestinationExplorerPage.tsx` —
only the nav tab lagged). Also added a `risk-analysis` nav tab
(label "Risk Analysis") — `RiskAnalysisPage` was confirmed real and
live (Task 07B) but had **no nav entry pointing to it at all**, in any
task through Task 31; this is not a new page, just exposing an
existing, already-wired page via navigation, using a `PageId` already
present in `useHashRoute.ts`'s `VALID_PAGES` list — no route/hash
structure change. Nav order now follows the real workflow (map → risk
→ decision → destination → relocation → reports → evidence). Also
aligned `map-intelligence`'s label from "Intelligence Map" to "Map
Intelligence" (word-order only, matching this task's §7 canonical list
and the id itself) and updated `MapIntelligencePage.tsx`'s
`PlaceholderPage` title to match — purely cosmetic, page remains a
placeholder. `Overview` was deliberately **not** added as a duplicate
nav tab — it's already reachable via the header logo click, a working,
documented (`UI_SPEC.md`) affordance; adding a redundant tab was judged
out of "tiny navigation-only change" scope.

**Dashboard card fix**: `ScenarioLabCard.tsx`'s displayed title changed
`"Scenario Lab"` → `"Decision Workspace"` (string prop only — file
itself was **not** renamed, per the task's explicit instruction not to
rename files merely to match labels; it remains a static, non-clickable
status teaser, unchanged behavior).

**Not changed, confirmed out of scope**: `docs/CODEBASE_AUDIT.md` still
contains the old "Scenario Lab"/"Capacity Intelligence"/"Intelligence
Map" terminology in its Task-00 baseline description — left untouched
per this task's explicit prohibition on modifying that file; it is an
immutable historical snapshot, not a live status document, so this is
correct, not an oversight. `MVP_BACKLOG.md`'s existing Task 07B/09/31
bullets that quote the *old* nav-tab names when describing what was
built *at the time* were also left untouched (they are historical
records of what was true then, matching this task's instruction not to
reopen completed entries) — this Task 32 entry is the record of the
correction itself.

**Documentation synchronized**: `docs/UI_SPEC.md` — nav-tab list,
bottom-row-cards list, and the "Pages / routes" section (which
incorrectly still described Risk Analysis/Decision Workspace/
Destination Explorer as `PlaceholderPage`s — now correctly lists which
pages are real vs. still placeholder) all corrected; "Data rule"
section given a Task 32 addendum clarifying that Hazard Exposure's real
evidence fields are legitimate, not a rule violation. `docs/
VIKALP_MASTER_SPEC.md` — added a "Current implementation status"
section (IMPLEMENTED vs. PENDING, matching this task's exact required
lists) immediately after "Core workflow," since the existing "Task
history" section stops at Task 12 and was not rewritten (out of scope
— "minimal, targeted changes" only). Explicitly reaffirmed: no
Scenario Simulator exists or is planned for MVP; any future AI Copilot
must remain a deterministic explanation layer, never an LLM/RAG system,
unless a future task explicitly amends this document.

**No backend/data/risk/decision/destination/GIS/API code was touched**
— confirmed by re-hashing `risk.py`, `hazard_exposure.py`, `decision.py`,
`destination.py`, every `schemas/`/`api/` file, and `docs/
CODEBASE_AUDIT.md` against their Task 31 values (all unchanged).
`npx tsc -b` (frontend typecheck) and the existing 22 `unittest` tests
(`backend/tests/test_hazard_exposure.py`) both pass unchanged.

"Navigation label correction and documentation synchronization
complete. 'Scenario Lab' and 'Capacity Intelligence' no longer appear
anywhere in the live UI — both now correctly read 'Decision Workspace'
and 'Destination Explorer', matching each page's own actual
functionality. A 'Risk Analysis' nav tab was added, exposing an
existing real page that previously had no navigation entry at all.
VIKALP_MASTER_SPEC.md and UI_SPEC.md now state plainly which features
are implemented and which remain pending, with no claim that a
Scenario Simulator or LLM Copilot exists. No backend, GIS, risk,
decision, destination, or data logic was modified."

## Task 33 — Core backend/API smoke & regression test suite (implemented)

Added a regression safety net for the currently-working behavior
before Tasks 34+ (reports, JWT auth, audit logging) begin changing the
codebase. `backend/tests/` only — no production file was touched.

**New files**: `fixtures.py` (not a test file itself — `IsolatedDatabase`,
a context manager that patches `app.config.settings.database_path`
at runtime via `object.__setattr__` on the frozen-dataclass singleton,
pointing every module that shares that `settings` instance at a fresh
temp SQLite file for the test run, then restores the original path;
the developer's real `backend/vikalp.db` is never read or written by
the suite); `test_api_settlements_and_gis.py` (health, settlement
list/detail/GeoJSON, GIS boundaries); `test_api_risk_regression.py`
(the critical evidence-gated risk regression, plus a real-813-record
GSI integration check); `test_api_decision_destination_regression.py`
(honest-pending Decision/Destination framework behavior);
`test_navigation_labels.py` (protects Task 32's label fix). 43 new
tests; the existing 22 `test_hazard_exposure.py` tests are unchanged
and untouched.

**No `httpx`/`TestClient` used, no new dependency added.**
`from fastapi.testclient import TestClient` was attempted first and
confirmed to fail (`RuntimeError: ... requires the httpx2 package to
be installed`) — `httpx` is not in `backend/requirements.txt` and Task
33 explicitly forbade adding a dependency without approval. Every
FastAPI route function tested here already constructs and returns a
real, validated Pydantic model itself (not a bare dict FastAPI
validates only at the HTTP layer) and does its own real SQLite/file
read, so importing and calling each route function directly exercises
the same business logic, database access, and response validation the
real HTTP layer would — only generic Starlette/ASGI transport and URL
dispatch are not exercised, neither of which is VIKALP business logic.

**Two test-authoring bugs were caught and fixed during verification —
both my own incorrect assumptions, not production issues**: (1) a
boundaries test initially asserted `shapeName == "Pauri Garhwal"`, but
the real geoBoundaries ADM2 data's own field is `"Garhwal"` (already
documented as a known naming quirk, Task 12/20) — fixed the assertion
to match the real, verified data rather than my assumption. (2) a
stale-label regression test initially did a bare substring search for
`"Scenario Lab"`, which false-positived on Task 32's own explanatory
code comment in `navigation.ts` (which names the old label while
explaining why it was replaced) — fixed to check for the precise
`label: "Scenario Lab"` assignment pattern instead of a bare substring.

**Frontend navigation regression** (`test_navigation_labels.py`): no
Jest/Vitest/Playwright is installed anywhere in the repo, and none was
added. Implemented instead as a plain-text read-and-assert check
against `navigation.ts`/`Header.tsx` (stdlib `pathlib` only) —
confirms the 4 correct labels are present, the 3 stale labels
(`"Scenario Lab"`, `"Capacity Intelligence"`, `"Intelligence Map"`)
are absent, and that "Overview" is genuinely reached via the header
logo's `onNavigate("overview")` (Task 32's real, intentional design)
rather than asserting it must appear in `navigation.ts`, which would
test for something that was never the real implementation.

**Full suite result**: 65/65 tests pass
(`python -m unittest discover -s tests`, run from `backend/`).
Frontend `npx tsc -b` and `npm run build` re-verified clean (no
frontend file was modified this task, but both were re-run since the
new navigation test reads frontend source files).

**Issue discovered, flagged for a future task, not fixed here** (per
Task 33 §9's "STOP and report, don't fix" instruction): every test
that touches the database logs a
`ResourceWarning: unclosed database in <sqlite3.Connection ...>`.
This is pre-existing behavior in `database.py`'s `get_connection()` —
`with get_connection() as conn:` uses `sqlite3.Connection`'s own
context-manager protocol, which commits/rolls back on exit but does
**not** call `.close()` (a well-known sqlite3 stdlib quirk, distinct
from most other Python DB-API context managers). It was never visible
before because no prior test exercised the database layer at all. Not
a correctness bug (every query still returns the right data, and
Python's garbage collector eventually closes the connection) and not
fixed here — it is a small, genuine production-code testability/
resource-hygiene issue for a future task to address (e.g. an explicit
`conn.close()` in a `try/finally`, or a `contextlib.closing()` wrapper
around each `get_connection()` call site).

"Regression test suite complete. 43 new deterministic tests added
across 4 new files (plus a shared, database-isolating test fixture);
the existing 22 hazard-exposure tests are retained unchanged. Full
suite: 65/65 passing. No production code, API behavior, risk
methodology, GIS processing, or data file was changed — confirmed by
re-hashing every backend service/schema/API/model file against its
Task 32 value. No new dependency was added; FastAPI's TestClient
requires httpx, which is not installed, so route functions are tested
by direct invocation instead, documented in each test file. One
pre-existing, non-correctness resource-cleanup issue in
`database.py`'s connection handling was discovered and reported, not
silently fixed."

## Task 34 — Evidence-backed PDF Settlement Assessment Report (implemented)

Implemented "VIKALP — Settlement Evidence Assessment Report" — a
real, officer-facing PDF generated from the exact same validated
`RiskAssessment`/`SettlementDecision`/`SettlementDestinationAnalysis`
objects the live `/risk`, `/decision`, `/destinations` endpoints already
return. `backend/app/services/report.py` is a pure presentation layer:
it formats already-computed results and never recalculates a hazard
score, risk score, weight, risk level, decision pathway, or
destination/capacity value. One source of truth is preserved throughout.

**New dependency**: `reportlab==5.0.1` (`backend/requirements.txt`) —
confirmed genuinely missing (`ModuleNotFoundError`) before installing.
Already named in `docs/VIKALP_MASTER_SPEC.md`'s locked stack
("Reports: Python ReportLab"); this task is simply the first to need
it. Pulled in `pillow`/`charset-normalizer` as ReportLab's own
transitive dependencies, not separately chosen. No other new dependency
(no `pypdf`/PDF-parsing library for tests — see below).

**New files**: `backend/app/services/report.py` (the PDF builder, 12
sections, ~500 lines), `backend/app/api/report.py` (new
`GET /api/settlements/{id}/report` route, same
`get_connection()`/`HTTPException(404)` pattern every other
settlement-scoped route already uses), `backend/tests/test_report.py`
(15 new tests). **Modified**: `backend/app/main.py` (one import + one
`app.include_router(report_router)` line), `backend/requirements.txt`
(the one new dependency line).

**All 12 required sections implemented** and verified present in a
real, generated Bhitai Malli PDF (visually inspected page-by-page, 5
pages): report metadata (report ID, UTC timestamp, PILOT/DEMO
designation, "Officer identity: Not authenticated in current MVP" —
no fabricated name); the important-status disclaimer panel; settlement
context (population/households/elevation/slope each labeled "Demo
planning input — source validation pending", the exact phrase already
used in `schemas/settlement.py`'s GeoJSON properties); the 18.91°/
22.58° terrain slope discrepancy explicitly disclosed as
unreconciled (the 22.58° figure is cited from already-documented
Task 15 raster analysis, not recomputed); GIS/evidence sources (A.
boundaries — geoBoundaries India ADM2, ODbL 1.0; B. terrain —
CartoDEM v3 R1, terrain scoring pending; C. landslide evidence — GSI/
NLFC "Landslide Inventory (Field Validated)", called "field-validated
landslide inventory evidence" exactly as instructed, never "current
landslide probability"); risk assessment status (all 5 dimensions in a
table — status/score/evidence-used/missing-inputs — pulled directly
from `risk.dimensions`, `overall_score`/`risk_level` shown as "Not
scored"/"Not classified", never 0/Low); Hazard Exposure detail (pulled
from `hazard_exposure_detail` — 0 qualifying records, nearest
qualifying distance "None within scoring radius", 21 contextual
records at 1–5 km, the real inventory-bias and policy disclaimers
reproduced verbatim, not paraphrased); Decision Workspace status (all
3 pathways `not_evaluated`, explicit "VIKALP does not automatically
recommend relocation from the current evidence" sentence); Destination/
Capacity status (0 candidates, explicit "This is not a statement that
no safe destinations exist" and "Capacity assessment has not been
initiated" sentences, no capacity figure of any kind shown); a 5-row
data governance/provenance table; a 13-item limitations list; an
officer review section with status REQUIRED and a genuinely blank
acknowledgement line (no fake signature, no fake approval); a footer
with "Page X of Y" and "PILOT / DEMO" on every page.

**Visual design**: A4, restrained black (#1A1917 ink) / muted gold
(#A8822F headings, #7C611F accents) / white-neutral (#FAF8F2 panel
background) palette — not the web app's own navy/white `UI_SPEC.md`
tokens, a separate print-oriented treatment as this task's brief
explicitly directed. Clean Helvetica typography, bordered tables with
alternating row shading, a gold-accented disclaimer panel, a thin
gold rule + running header from page 2 onward, a bordered footer with
page numbers on every page. No neon, no cyberpunk, no heavy black
backgrounds, no decorative graphics.

**Tests**: 15 new `unittest` tests, no new test dependency. Same
`fixtures.IsolatedDatabase` pattern as Task 33 (real temp SQLite,
developer's `vikalp.db` untouched). No `pypdf`/PDF-parsing library
added — `SimpleDocTemplate(..., pageCompression=0)` keeps each page's
text content stream uncompressed, so every drawn string is a literal,
searchable substring in the raw PDF bytes; tests decode the raw bytes
as latin-1 and search for stable text markers, exactly as Task 34 §10
permits. **One real test-design bug found and fixed during
verification**: an initial assertion searched for one long contiguous
phrase ("no qualifying evidence was found within the scoring radius")
that ReportLab's own paragraph word-wrap had split across two separate
text-draw calls, so it was never a contiguous byte-string in the first
place — fixed by asserting the shorter, unwrapped fragments instead
("qualifying evidence", "scoring radius") and, separately, the exact
negation sentences ("VIKALP does not state that Bhitai Malli is safe"/
"landslide risk is zero") rather than a bare "is safe"/"risk is zero"
substring search, which would have false-failed on the report's own
correct, honest disclaimer text (that literal substring legitimately
appears inside the negation). Not a production bug — my own test
assertion was checking for the wrong thing.

**Verification**: full backend suite **80/80 passing** (65 existing +
15 new); frontend `tsc -b` and `npm run build` re-run clean (no
frontend file touched this task). Backend started live
(`uvicorn app.main:app`), `GET /api/settlements/1/report` returned
`200`, `application/pdf`, `Content-Disposition: attachment;
filename="VIKALP_Bhitai_Malli_Evidence_Assessment.pdf"`, a real
45,204-byte PDF beginning `%PDF-1.4`; `GET /api/settlements/999/report`
returned `404` (no internal detail leaked). Every risk/GIS/decision/
destination service, schema, and API file re-hashed identical to Task
33; `data/raw`/`data/processed` file count unchanged (59);
`docs/CODEBASE_AUDIT.md` untouched.

**Not implemented, not marked done** (per Task 34 §12): full five-
dimension risk scoring, destination ranking, a carrying-capacity model,
any relocation recommendation, an AI Copilot, an officer approval/
sign-off workflow. The report presents the current, honest pending
state of all of these — it does not implement any of them.

**Frontend not touched.** Task 34's numbered sections cover only the
report service, API endpoint, tests, and dependency declaration —
`ReportsPage.tsx` remains the Task-31/32 placeholder, unwired to this
new endpoint. Wiring the Reports page to fetch and offer this PDF for
download is a natural next step but was not part of this task's
explicit scope and was not attempted.

"PDF report implementation complete. `VIKALP — Settlement Evidence
Assessment Report` is now a real, generated document covering all 12
required sections, built entirely from existing risk/decision/
destination service outputs with zero recalculation and zero
fabrication — every pending/no_data/no_evidence_found/not_evaluated
value is shown exactly as such, every disclosed limitation matches
already-documented project fact, and the officer-acknowledgement line
is genuinely blank. 15 new tests added (80/80 total passing). ReportLab
was the only new dependency, confirmed genuinely missing before
installing. No risk, GIS, decision, destination, or data logic was
changed."

## Task 35 — Minimal JWT authentication (implemented)

**Why JWT for a closed-access MVP**: `docs/VIKALP_MASTER_SPEC.md` locks
"JWT auth, RBAC, audit logging" as part of the security stack from the
start. Every application/data endpoint was unauthenticated through
Task 34 (confirmed by Task 31's audit); this task closes that gap with
exactly what a single-officer, single-settlement SIH pilot needs —
bearer-token auth against one environment-configured demo account —
not a multi-user identity system, which would be scope creep for an
MVP with one settlement and one implicit role.

**One demo officer, no user database.** Username/password come from
`VIKALP_OFFICER_USERNAME`/`VIKALP_OFFICER_PASSWORD` (required, no
fallback). The password is never stored in application state as
plaintext beyond the login-verification step itself: `services/
auth.py` hashes it once with `hashlib.pbkdf2_hmac` (SHA-256, 260,000
iterations, a random 16-byte salt generated per process) and compares
future login attempts against that hash using `hmac.compare_digest`
(constant-time) — never a plain `==` on the raw password.

**Hand-rolled HS256 JWT, stdlib only.** No JWT library existed in
`requirements.txt`; per this task's own instruction to avoid a "large
authentication framework," `services/auth.py` implements HS256 sign/
verify directly from `hmac`/`hashlib`/`base64`/`json`/`time` — zero new
dependency. Claims: `sub` (officer username), `role` (`"officer"`),
`iat`, `exp`. `decode_access_token()` rejects, unconditionally: missing/
malformed structure, any algorithm other than `HS256` (including
`"none"`), an invalid signature (constant-time comparison via `hmac.
compare_digest`), a missing required claim, an expired `exp`, and an
unrecognized `role`. `VIKALP_JWT_SECRET` is required (≥32 chars) —
there is no insecure fallback secret anywhere in the code.

**Fail-safe, not fail-at-import.** `config.py`'s four new settings
(`jwt_secret`, `jwt_expires_minutes`, `officer_username`,
`officer_password`) read the environment with no validation and no
insecure default at import time — validation happens lazily, inside
`services/auth.py`, the first time authentication is actually attempted
(login, or verifying a bearer token), raising `AuthConfigurationError`
(mapped to HTTP 500 — a server misconfiguration, distinct from a
client's bad credentials/token, which is HTTP 401). This was a
deliberate design choice, not a corner cut: validating eagerly at
`config.py` import time would have broken every existing Task 21-34
test file, since they all transitively import `app.api.*` modules
(which now import `app.api.auth` for the shared dependency) but have
nothing to do with authentication and should not be required to
configure it just to keep running. Confirmed directly:
`import app.main` succeeds with zero auth environment variables set,
and all 80 pre-Task-35 tests pass unmodified in that same environment.

**Minimal RBAC hook, not a permissions matrix.** `VALID_ROLES =
frozenset({"officer"})` is the complete role set today; `require_role()`
exists but is unused by any route yet (the one role is already allowed
everywhere) — it exists so a second role can later gate specific routes
without redesigning token creation/verification. No fake second role
was invented to demonstrate this.

**`POST /api/auth/login`** (new `api/auth.py`) is the only public
`/api/*` route; `GET /health` (already public, defined directly on
`app`) is unchanged. Every other existing router — `settlements`,
`risk`, `decision`, `destination`, `gis`, `report` — gained exactly one
line each: `dependencies=[Depends(get_current_officer)]` on their
`APIRouter(...)` constructor. No route function's signature or body was
touched; route-level business logic is byte-identical to Task 34
(confirmed by re-hashing every service/schema file). `CORSMiddleware`'s
`allow_methods` gained `"POST"` (previously `["GET"]` only) — needed
for the one new POST route; every other route is still GET-only,
unchanged.

**Login response** never contains the password — only `access_token`,
`token_type: "bearer"`, `expires_in` (seconds), and `user: {username,
role}`. Verified directly: `response.model_dump_json()` does not
contain the submitted password anywhere.

**Frontend**: `LoginPage.tsx` is now a real form (previously fully
disabled placeholder text saying "Not implemented in this task") —
username/password fields, loading state, a distinct invalid-credentials
message vs. a distinct network/backend-error message, styled in a
restrained black/gold/white treatment applied to this page only (via
literal Tailwind arbitrary-value colors, not a change to the shared
`docs/UI_SPEC.md` navy tokens used everywhere else — same scoping
principle Task 34 already used for the PDF report). On success, the
token + `{username, role}` are stored in `sessionStorage` (never
`localStorage`, never the URL) via a new `services/session.ts`, then
the app navigates to `#/overview` using the existing hash router — no
routing library added.

A new `services/apiClient.ts` centralizes Bearer-token attachment for
every existing data-fetching service (`risk.ts`, `settlements.ts`,
`gis.ts`, `decision.ts`, `destination.ts` were each reduced to a
one-line call into `apiFetch()` — their exported function signatures,
return types, and error-message text for non-401 failures are
unchanged). A 401 response clears the session and dispatches a
`window` event (`vikalp:session-expired`) that `App.tsx` listens for
once, at the top level, to return to Login — never a silent retry.
`services/auth.ts`'s login call deliberately does not go through
`apiFetch` (it must never carry a token). `App.tsx` gained a minimal
route guard (no router library): any page other than `login` renders
Login immediately if no session exists (computed synchronously, so
there is no flash of a protected page before redirecting), with a
`useEffect` correcting the hash to match. A "Log out" button (plus the
signed-in username) was added to the existing persistent `Header.tsx` —
the one place already rendered on every real and placeholder page.

**Tests**: 21 new `unittest` tests (`backend/tests/test_auth.py`),
covering all 16 items Task 35 §J named. No `httpx`/TestClient (still
not installed) — protected-route enforcement is tested two ways: (1)
calling the real `get_current_officer` FastAPI dependency function
directly with missing/invalid/expired/valid credentials (the exact
function every protected route invokes per-request), and (2)
introspecting each router's own `route.dependant.dependencies` to
confirm `get_current_officer` is actually wired in — verifying the real
object FastAPI serves requests through, not a re-implementation of it.
A full live end-to-end check (`uvicorn` + `curl`) was additionally run
manually: `/health` → 200 with no token; a protected route with no
token → 401; wrong password → 401; correct login → a real JWT; that
JWT against `/api/settlements`, `/risk`, `/decision`, `/destinations`,
`/report`, `/api/gis/boundaries` → 200 each, with **identical
values to Task 33/34** (`assessment_status: "pending"`,
`overall_score: null`, Hazard Exposure `no_evidence_found`, all 3
decision pathways `not_evaluated`, destination `candidates: []`, a
real report PDF); an invalid token → 401; `/api/auth/login` → still
200 with no token required. Full suite: **101/101 passing** (80
existing + 21 new). Frontend `tsc -b` and `npm run build` both clean.

**Documented explicitly as future work, not attempted**: multi-role/
RBAC expansion beyond the single `officer` role (the hook exists,
nothing more); rate limiting/brute-force login protection (would
naturally want Redis or similar for shared state across processes —
explicitly out of scope per the master spec's locked technology list).

"Minimal JWT authentication implemented and verified end-to-end. One
environment-configured demo officer account, PBKDF2-hashed password
comparison, hand-rolled stdlib HS256 JWTs (zero new dependency), every
existing application/data endpoint now requires a valid bearer token
while /health and /api/auth/login remain public, and the frontend has a
real login/logout flow storing the token in sessionStorage only. 101/101
backend tests passing (80 pre-existing, unmodified, plus 21 new); a
live end-to-end check confirms Bhitai Malli's risk/decision/destination/
report behavior is byte-for-byte unchanged from Task 34 when accessed
through the new authenticated path. No risk, GIS, hazard, decision,
destination, or report business logic was touched."

## Task 36 — Minimal audit logging (implemented)

**Why audit logging exists**: a government-facing decision-support
platform needs to show *who* accessed *what* evidence/output and
*when* — accountability, traceability, and demonstrable review-
readiness for a real deployment, not a compliance/SIEM system. This is
explicitly an MVP accountability layer, sized for one demo officer and
one settlement, not an enterprise logging platform (no Redis/Kafka/
Elasticsearch/SIEM/background workers were added, per this task's own
constraint).

**Storage**: one new SQLite table, `audit_logs` (`id`, `timestamp`,
`actor`, `role`, `action`, `resource_type`, `resource_id`, `outcome`,
`metadata`), created in `database.py`'s existing `init_db()` alongside
`settlements` — same conventions, no migration framework. **Append-only
from the application's perspective**: no route, service, or API ever
issues `UPDATE`/`DELETE` against this table; `GET /api/audit` is the
only read path and it is read-only.

**Actions currently audited** (`services/audit.py`'s fixed vocabulary,
not free-text): `LOGIN_SUCCESS`, `LOGIN_FAILURE`, `VIEW_SETTLEMENT`
(`GET /api/settlements/{id}`), `VIEW_SETTLEMENT_RISK` (`/risk`),
`VIEW_DECISION_WORKSPACE` (`/decision`), `VIEW_DESTINATIONS`
(`/destinations`), `VIEW_GIS_BOUNDARIES` (`/api/gis/boundaries`),
`GENERATE_REPORT` (`/report`), and `LOGOUT` (via a new, protected
`POST /api/audit/logout`, called best-effort by the frontend
immediately before it clears its own local session). **Deliberately
not audited**: `GET /api/settlements` (list) and `GET /api/settlements/
{id}/geojson` — not in this task's named minimum action list, and
auditing them would add noise without added accountability value at
N=1 settlement; 404s on the audited routes (an authenticated officer
requesting a settlement that doesn't exist is realistically only a
test/typo case with a single settlement in the system, not a
meaningful accountability event) — only the success path is audited
for each of the six view/generate actions, keeping the log
non-noisy as instructed. `GET /health` and `POST /api/auth/login`
itself are never audited as "views" — health is a plain liveness
check, and the login attempt's own outcome is what's recorded, not a
separate "viewed the login page" event (there is no such event —
login has no unauthenticated GET to audit).

**What is intentionally excluded from every audit record**: password
(attempted or configured), the JWT/access_token, the Authorization
header, and any full request body. `metadata` exists in the schema for
future use but is left `null` by every call site added in this task —
no risk of it accidentally carrying something sensitive. Verified
directly: after exercising a real login (success and failure) and all
six view/generate actions with a real bearer token, grepping every
row in the `audit_logs` table for the test password, the real JWT
string, `"Bearer "`, `"Authorization"`, and `"access_token"` finds
none of them (`tests/test_audit.py`'s `TestNoSecretsInAuditLog`).

**`record_audit_event()` never raises** — any failure (a locked/
unavailable database, a serialization error) is caught inside the
function and logged via the standard `logging` module (`vikalp.audit`
logger, `WARNING` level) instead of propagating. Verified directly: 
dropping the `audit_logs` table mid-test and then calling
`get_settlement()` still returns the correct settlement data (the
business operation is unaffected), and calling `record_audit_event()`
against the now-missing table does not raise at all.

**Login auditing** (`api/auth.py`): success records `LOGIN_SUCCESS`
with `actor` = the authenticated username and `role = "officer"`;
failure records `LOGIN_FAILURE` with `actor` = the *attempted*
username (never the password) and `role = "unknown"` (the attempt was
never authenticated, so no real role exists yet). A server
misconfiguration (`AuthConfigurationError` — e.g. `VIKALP_JWT_SECRET`
unset) is explicitly **not** recorded as `LOGIN_FAILURE` — it is a
different kind of event (an infrastructure problem, not a rejected
credential) and conflating the two would misrepresent what happened.

**A necessary signature change, not a business-logic change**: six
route functions (`get_settlement`, `get_settlement_risk`,
`get_settlement_decision`, `get_settlement_destination_analysis`,
`get_boundaries`, `get_settlement_report`) gained an
`officer: AuthenticatedOfficer = Depends(get_current_officer)`
parameter — the only way to get the authenticated identity into the
route body to audit-log it (Task 35 had deliberately kept these
signatures untouched by protecting only at the router level; Task 36
needs the identity *inside* the body). Each router's existing
router-level `dependencies=[Depends(get_current_officer)]` from Task
35 was left in place unchanged — FastAPI caches a dependency's
resolution per request by default, so having it referenced both at the
router level and as a route parameter resolves it exactly once, with
zero behavioral difference; this was chosen over removing the
router-level dependency so that `list_settlements` and
`get_settlement_geojson` (which do not need the officer identity)
remain protected exactly as Task 35 left them, untouched. Route
bodies' actual data-fetching/response logic is byte-identical — only a
new parameter and one audit call, placed immediately before each
route's existing `return`, were added.

**A real regression this change caused, found and fixed during
verification**: adding that parameter with a `Depends(...)` default
broke every existing Task 33-35 test that called these six route
functions directly (this project's established route-testing approach,
since httpx/TestClient still isn't installed) — a direct Python call
bypasses FastAPI's dependency resolution entirely, so `officer` would
bind to the raw, unresolved `Depends` object instead of a real
`AuthenticatedOfficer`, and `officer.username` would raise
`AttributeError` the moment the route tried to audit-log it. Confirmed
by running the pre-existing suite immediately after wiring auditing in:
20 errors, all `AttributeError: 'Depends' object has no attribute
'username'`. Fixed by adding `TEST_OFFICER` (a real
`AuthenticatedOfficer` test double) to `tests/fixtures.py` and passing
`officer=TEST_OFFICER` explicitly at every existing direct-call site
across `test_api_settlements_and_gis.py`, `test_api_risk_regression.py`,
`test_api_decision_destination_regression.py`, and `test_report.py` —
this is a test-fixture update, not a production or business-logic
change; the real HTTP contract (what an actual client sends/receives)
never changed. `TestGisBoundaries` in `test_api_settlements_and_gis.py`
and `test_auth.py`'s `TestLoginEndpoint` also needed `IsolatedDatabase`
added (they previously didn't touch the database at all, since
boundaries come from a static file and JWT tests don't need
settlements) — now that `get_boundaries()`/`login()` also write an
audit row, they need a real `audit_logs` table to write into; without
it the failure is still non-fatal (per the design above) but prints a
noisy warning traceback during a normal test run.

**`GET /api/audit`** (new, protected like every other application
route): newest-first (`ORDER BY id DESC`), bounded result size (default
50, hard-capped at 200 regardless of what `limit` is requested — no
arbitrary size, no arbitrary filter/SQL input accepted), returns
`AuditEvent` Pydantic objects (never a raw dict/SQL row). **`POST
/api/audit/logout`** (new, protected) records a `LOGOUT` event for the
calling officer and returns `204` — it does **not** revoke the JWT
itself (VIKALP's tokens remain stateless/self-expiring exactly as Task
35 designed; no server-side session or token-revocation mechanism was
introduced). The frontend calls this best-effort, fire-and-forget,
immediately before clearing its own local session (`Header.tsx`'s
logout button) — a failed/slow call here never blocks or fails the
actual client-side logout.

**Frontend**: `services/audit.ts` (small, future-ready —
`fetchAuditEvents()` + `recordLogout()`) and `types/audit.ts`. No audit
dashboard/page was built: both natural candidate locations (`Reports`,
`Evidence Locker`/Data Governance) remain the Task 31/32 bare
placeholders with no built-out area to slot a small section into
without doing real page-building work, which this task explicitly said
not to do ("the primary purpose of this task is backend accountability,
not UI work"). This is a deliberate scope decision, not an oversight —
recorded here so a future task building out either page knows
`fetchAuditEvents()` already exists to call.

**Tests**: 24 new `unittest` tests (`backend/tests/test_audit.py`),
covering all 20 items Task 36 §J named, plus a small regression
spot-check re-confirming Bhitai Malli's risk/decision/destination/
report values are unaffected by any of this task's changes. Full
suite: **125/125 passing** (101 existing, all still passing after the
`TEST_OFFICER`/`IsolatedDatabase` fixes above, plus 24 new). Frontend
`tsc -b` and `npm run build` both clean. A full live end-to-end check
(`uvicorn` + `curl`) additionally confirmed: `/health` and login public;
protected routes 401 without/with an invalid/expired token; a real
login issuing a real JWT; that JWT succeeding against every protected
route with **unchanged** values (risk `pending`/`null`/
`no_evidence_found`, decision `pending`/all `not_evaluated`,
destinations `pending`/`[]`, a real report PDF); `GET /api/audit`
returning the real, newest-first accumulated trail including the
`LOGIN_FAILURE`/`LOGIN_SUCCESS`/`VIEW_*`/`GENERATE_REPORT` events from
that same session; `POST /api/audit/logout` returning `204`.

**Documented explicitly as future work, not attempted**: a future
production deployment may move audit storage to a hardened, centralized
system (this MVP's SQLite table is not that); multi-role RBAC beyond
the single `officer` role remains a Task 35-documented future item,
unaffected by this task; no automatic relocation approval was
introduced anywhere — the audit trail records what an officer
*accessed/generated*, never that VIKALP itself approved or recommended
anything.

"Minimal audit logging implemented and verified end-to-end. One
append-only SQLite table records login success/failure and six
officer view/generate actions (settlement, risk, decision, destinations,
GIS boundaries, report) plus a best-effort frontend-triggered logout
event — never a password, JWT, or Authorization header. A protected
`GET /api/audit` lets the officer inspect the recent trail (newest
first, bounded, no arbitrary filtering); a protected `POST /api/audit/
logout` records sign-out without inventing server-side token
revocation. Audit-insert failure is proven non-fatal to the business
operation it accompanies. 125/125 backend tests passing (101
pre-existing, all still passing after two required test-fixture fixes
caused by a necessary route-signature change, plus 24 new); frontend
typecheck and build both clean; a live end-to-end check confirms every
risk/decision/destination/report value is byte-for-byte unchanged from
Task 35. No risk, GIS, hazard, decision, destination, or report
business logic was touched."

## Task 37 — Grounded AI Copilot foundation / evidence explainer (implemented)

**VIKALP's AI trust architecture, established by this task**:

```
OFFICIAL / VERIFIED DATA
        |
GIS / EVIDENCE
        |
DETERMINISTIC VIKALP RULES  (risk.py / hazard_exposure.py / decision.py / destination.py)
        |
VIKALP VERIFIED OUTPUT
        |
AI EXPLANATION LAYER        (services/copilot.py — THIS TASK)
        |
OFFICER REVIEW
        |
AUDIT TRAIL                 (Task 36)
```

The Copilot layer sits **strictly above** the deterministic engine and
**strictly below** officer review. It cannot write to anything above it
in this diagram, and nothing below it (the officer, the audit trail)
is bypassed by it. **No external LLM is connected in this task** — see
"What this is not," below. A future model-backed Copilot would sit
*above* `services/copilot.py`, reading its output; it would still not
sit below the deterministic engine, and integrating one is explicitly
out of scope here and requires its own separate governance/approval,
not an incidental addition to a later task.

**What was built**: `backend/app/services/copilot.py`
(`build_copilot_context()` + `explain_settlement()`),
`backend/app/schemas/copilot.py` (`CopilotContext`/
`EvidenceExplanation` Pydantic models), `backend/app/api/copilot.py`
(two new protected `GET` routes), two new audit actions
(`VIEW_COPILOT_CONTEXT`, `VIEW_EVIDENCE_EXPLANATION` in
`services/audit.py`), and a small frontend service layer
(`frontend/src/types/copilot.ts`, `frontend/src/services/copilot.ts`).

**`build_copilot_context(settlement)` computes nothing new.** It calls
`assess_settlement_risk()`, `assess_settlement_decision()`, and
`get_settlement_destinations()` — the same three functions the existing
`/risk`, `/decision`, `/destinations` endpoints already call — and
reproduces their results verbatim. The Hazard Exposure detail is pulled
out of the risk result's own "Hazard Exposure" dimension
(`hazard_exposure_detail`) rather than calling
`score_hazard_exposure_landslide()` a second time, so there is exactly
one source of truth for that value, not two independent calls that
happen to agree. `risk.py`, `hazard_exposure.py`, `decision.py`,
`destination.py`, `report.py`, `database.py`, and `models/settlement.py`
were **not modified** by this task (confirmed by mtime — all predate
this task's session).

**Context structure** (`CopilotContext`): `settlement` (name/district/
state/population/households/lat/lon plus the same "Demo planning
input — source validation pending" disclosure `SettlementGeoJSONProperties`
already uses), `risk_assessment` (the full `RiskAssessment`, unchanged),
`risk_dimensions` (convenience alias for `risk_assessment.dimensions`),
`hazard_exposure` (the `HazardExposureLandslideDetail`, or `null`),
`decision_workspace` (the full `SettlementDecision`, unchanged),
`destinations` (the full `SettlementDestinationAnalysis`, unchanged —
there is no separate "capacity" object anywhere in VIKALP today; its
"Available Capacity" suitability dimension, like all six, is
`not_evaluated`), `provenance` (four lists — `official_sources`,
`derived_calculations`, `demo_planning_inputs`,
`unavailable_or_missing` — distinguishing what's source-backed from
what VIKALP derived from what's still missing), `limitations`,
`missing_evidence` (deduplicated, aggregated from the risk dimensions'
own `missing_inputs`, plus decision's and destination's own
`missing_evidence` lists — nothing invented, only concatenated from
values the existing services already return), and `policy_disclaimer`.

**Provenance is deliberately conservative**: only three sources are
listed as `official_sources` — the GSI/NLFC landslide inventory
(`hazard_exposure.py`'s own `_SOURCE_DATASET_LABEL`), ISRO/NRSC Bhuvan
CartoDEM terrain data, and geoBoundaries India ADM2 — because a grep of
the backend confirmed OSM is not actually used as a VIKALP data source
anywhere (only inside third-party library internals), so it is not
listed, per the task's own "do not invent citations" rule.

**Limitations include the known, already-documented terrain slope
discrepancy** (18.91° demo/DB value vs. 22.58° CartoDEM-derived value,
Task 15/27) whenever the Terrain dimension's `slope_degrees` evidence is
present. This reuses the exact static constant (`22.58`) and framing
`report.py` (Task 34) already discloses in the PDF report — it is not
recalculated or newly sourced here, only carried into the Copilot
context so it isn't hidden from a reader who never opens the PDF.

**`explain_settlement(context)` is a "VIKALP Evidence Explanation," not
an AI answer.** No model is called. It is pure string formatting over
already-known context values: one sentence per section (overall risk,
Hazard Exposure, decision, destinations), an `evidence` list (population/
households/hazard record counts/nearest-distance, each tagged with its
real source), `missing_evidence` passed through unchanged (never
re-derived or filtered), `decision_status` passed through unchanged,
`limitations` passed through unchanged, and `officer_action` set to the
existing `SettlementDecision.officer_review_note` ("Officer review
required.") rather than a new invented string. For Bhitai Malli today it
reads (live-verified): pending overall risk ("...because the required
scoring evidence/rules are not yet complete..."), Hazard Exposure
`no_evidence_found` with 0 qualifying records, nearest contextual record
2.04 km away, 21 contextual records within 5 km, and the exact
inventory-bias disclaimer ("...does NOT mean this location is safe from
landslide hazard") carried through verbatim — never softened into "no
landslide risk" or "the settlement is safe." Decision and destinations
both read "pending"/"not_evaluated"/"no candidate destination data is
currently available in VIKALP" — never "no safe destination exists."

**Explicit, code-level grounding rules** (`COPILOT_RULES`, a 12-item
tuple in `services/copilot.py`, also asserted directly in
`test_copilot.py`): only supplied VIKALP context may be used; missing
values must remain missing; no evidence must not become evidence of
absence; pending must remain pending; deterministic outputs cannot be
overridden; Copilot cannot calculate authoritative risk, create hazard
evidence, choose destinations, calculate authoritative carrying
capacity, approve relocation, or issue government orders; the officer
remains final authority. These aren't only documentation — this module
simply has no function that computes a risk number, fabricates a hazard
record, picks a destination, computes a capacity figure, or emits an
approval; the constraint is structural, not just asserted in prose.

**API**: `GET /api/settlements/{id}/copilot-context` and
`GET /api/settlements/{id}/explanation`, both on the same protected
router pattern every other settlement route already uses (router-level
`dependencies=[Depends(get_current_officer)]` plus a per-route
`officer: AuthenticatedOfficer = Depends(get_current_officer)` — the
same FastAPI dependency-caching pattern Task 36 established, so no
authentication logic was duplicated). 404 for an unknown settlement id
(live-verified). Both routes are strictly read-only: neither writes to
`settlements`, `audit_logs`, or any other table.

**Audit**: two new actions, `VIEW_COPILOT_CONTEXT` and
`VIEW_EVIDENCE_EXPLANATION`, recorded exactly like every other Task 36
view action — actor/role/action/resource_type/resource_id/outcome only.
Neither the context body nor the explanation body is ever passed to
`record_audit_event()`; verified both by code inspection (the call
sites only pass metadata, never the `result` object) and by a test that
exercises both endpoints then asserts the stored rows contain none of
the explanation's own prose ("VIKALP Evidence Explanation for", "GSI/
NLFC field-validated landslide inventory") nor any bearer
token/Authorization header/`access_token` string.

**What this is not** (explicitly, per the task's restrictions): no
OpenAI/Anthropic/Gemini/Groq/Ollama or any other external model API is
called anywhere in this codebase; no RAG, no embeddings, no vector
database (pgvector or otherwise); no chatbot UI, no streaming, no
WebSocket; no new frontend router or navigation page (no
`AICopilotPage.tsx` exists in this codebase to enhance, and none was
added — the task's own instruction, given that case, is to leave UI
wiring for a later task, not to invent a new nav entry). A future LLM-
backed Copilot integration would be a new, separately governed task —
this one only builds the grounded context/explanation layer such an
integration would eventually read from, never write to.

**Tests**: 30 new `unittest` tests in `backend/tests/test_copilot.py`
(all 28 items the task named, plus two added during this verification
pass: the `COPILOT_RULES` content check and the terrain-discrepancy
limitation check), using the same direct-route-call convention as every
prior test file (no `httpx`/`TestClient`). Full suite: **155/155
passing** (125 existing + 30 new). Frontend `tsc -b` and
`npm run build` both clean (build completed successfully, only the
pre-existing >500kB chunk-size advisory, unrelated to this task). A
live end-to-end check (`uvicorn` + `curl`) confirmed: both endpoints
return the correct Bhitai Malli values under a real JWT; both return
`401` with no token; both return `404` for an unknown settlement id;
`GET /api/audit` shows real `VIEW_COPILOT_CONTEXT`/
`VIEW_EVIDENCE_EXPLANATION` events in sequence with `LOGIN_SUCCESS` and
`GENERATE_REPORT`; the report endpoint still returns a real PDF
unaffected by this task. `data/raw` and `data/processed` file counts
confirmed unchanged (59 files, same as Task 36); `docs/CODEBASE_AUDIT.md`
confirmed untouched (identical mtime, Sep 11).

"A grounded, deterministic evidence-explanation layer sits above
VIKALP's existing risk/hazard/decision/destination engine and below
officer review — it reuses those services' real output verbatim,
computes nothing new, and can only ever preserve 'pending'/'no evidence
found' semantics, never resolve them into a safety or relocation claim.
Two new protected, audited, read-only endpoints expose it. No external
LLM, RAG, embeddings, or vector database is connected anywhere in this
codebase; a future model-backed Copilot would read from this layer, not
replace it, and would require its own separate approval. 155/155
backend tests passing; frontend clean; live end-to-end verification
confirms every existing risk/decision/destination/report value is
unchanged, and that the grounding rules this task defines are enforced
by the module's own design, not only by documentation."

## Task 38 — Map Intelligence module (implemented)

**What changed**: `frontend/src/pages/MapIntelligencePage.tsx` moved
from a `PlaceholderPage` (unbuilt since Task 02) to a real geographic
evidence workspace, and one new read-only backend endpoint,
`GET /api/gis/landslides`, was added to expose the existing GSI/NLFC
inventory (already used internally by `hazard_exposure.py` since Task
20/23) as a map layer. Nothing about hazard/risk/decision/destination
scoring changed.

**Backend — `GET /api/gis/landslides`**: follows `api/gis.py`'s
existing `/boundaries` route exactly (same protected-router pattern,
same 503-on-missing/invalid-file honesty convention via a new
`LandslidesUnavailable` exception in `services/gis.py`, same
audit-on-success call with a new `ACTION_VIEW_GIS_LANDSLIDES`
constant). `services/gis.py`'s new `load_landslides_geojson()` reuses
`settings.gsi_landslides_geojson_path` — a config value that already
existed (added for `hazard_exposure.py` in Task 20/23) — reads the raw
source file read-only, and passes every one of its 813 features
through with geometry copied verbatim (never reprojected/filtered/
simplified). Only four properties are exposed per feature (`slide_no`,
`activity`, `triggering`, `toposheet`) — the same four fields
`hazard_exposure.py`'s own `LandslideRecord` already consumes for
scoring — out of the raw file's ~100 source columns; this is a minimal
evidence/visualization export, not a full data dump. `services/gis.py`
never imports from `hazard_exposure.py` and never recomputes a hazard
score — the two modules independently re-read the same immutable
source file for two different purposes (scoring vs. display). Cached
with `lru_cache(maxsize=1)` (same idea as `hazard_exposure.py`'s own
`_load_records`) once profiling showed re-parsing the 2.3 MB/813-feature
file on every call made the test suite take ~80s instead of ~2.5s.
`risk.py`, `hazard_exposure.py`, `decision.py`, `destination.py`,
`report.py`, `database.py`, `models/settlement.py`, and every other
existing API route file were **not modified** (confirmed by mtime).

**Frontend — new files, no existing component modified**:
`components/map-intelligence/IntelligenceMap.tsx` (a dedicated map
component, deliberately **not** a modification of
`components/dashboard/MapLibreMap.tsx`, which continues to serve only
the Overview dashboard exactly as before — building a second, separate
component was the lower-risk choice over reworking a component another
page already depends on), `LayerControlPanel.tsx`, `MapLegend.tsx`,
`EvidencePanel.tsx`, plus `fetchLandslides()` in `services/gis.ts` and
matching types in `types/gis.ts`. `types/risk.ts` gained a proper
`ApiHazardExposureLandslideDetail` interface (previously `unknown`) so
the evidence panel can read the real nearest-distance/contextual-count
fields the backend already returns — a frontend typing precision
change only, not a new backend field.

**Layer/legend/evidence-panel content is entirely evidence, never a
risk claim**: the settlement/boundary/landslide MapLibre source and
layer ids (`settlement-source`/`settlement-point`/
`settlement-point-label`, `boundaries-source`/`boundaries-fill`/
`boundaries-line`) are identical strings to the Overview map's, per the
task's own "preserve existing naming" instruction; landslide points
render as small muted circles (never red/green, never a filled zone/
polygon), and the legend explicitly labels them "contextual evidence,
not a hazard zone." No 1 km scoring-radius circle is drawn on the map
(the task permits one only if an existing approved UI already has it
clearly labeled as the scoring radius, not a hazard boundary — none
exists, so none was added; the same number is instead stated as text
in the evidence panel). Terrain/Slope has no rendered raster layer (no
new raster-tile server was built, per the task's explicit restriction)
— it's evidence-panel status text plus the real elevation/slope values,
including both disclosed, unreconciled slope figures (18.91° demo/DB
vs. 22.58° CartoDEM-derived) with neither presented as authoritative,
matching `report.py` (Task 34) and `services/copilot.py` (Task 37)'s
existing precedent for that exact disclosure. Flood/Cloudburst/Coastal
erosion are explicit "Unavailable"/"Not applicable" rows, never a fake
enabled checkbox. The Hazard Exposure numbers shown (0 qualifying
records, 2.04 km nearest contextual record, 21 contextual records
within 5 km) are read directly from the existing, unmodified
`GET /api/settlements/{id}/risk` response — never recomputed on the
frontend — and the evidence panel repeats the required disclosure
verbatim: "No qualifying evidence was found within the current scoring
radius from the available GSI/NLFC inventory. This does not establish
absence of hazard."

**Tests**: 12 new backend tests in
`backend/tests/test_api_settlements_and_gis.py` — a `TestGisLandslides`
class (FeatureCollection shape, exact 813-feature count, geometry
integrity, `slide_no` identity survives, only the four minimal
properties are exposed, no `risk_score`/`hazard_zone`/`red_zone` string
anywhere in the response, authentication required) plus a
`TestExistingBehaviorUnchangedByTask38` class re-confirming boundaries/
settlement-geojson/risk/decision/destination are all byte-for-byte
unchanged. Full suite: **167/167 passing** (155 existing + 12 new).
Frontend `tsc -b` and `npm run build` both clean (only the pre-existing
>500 kB chunk-size advisory). A live end-to-end check (`uvicorn` +
`curl`) confirmed: `GET /api/gis/landslides` returns the real 813-record
FeatureCollection with correct geometry/properties and `401` with no
token; `GET /api/settlements/1/risk` still shows
`assessment_status: "pending"`, `overall_score: null`, Hazard Exposure
`no_evidence_found` with `qualifying_record_count: 0`,
`nearest_contextual_distance_km: 2.04`, `contextual_record_count: 21`;
decision still `pending`; destinations still `pending`/`[]`; Copilot
context and the report endpoint both still return `200`; the audit
trail shows a real `VIEW_GIS_LANDSLIDES` event alongside the existing
actions. `data/` file count unchanged (59); the GSI/boundary/DEM/slope-
raster files' checksums were recorded (none were opened for writing —
only read — throughout this task).

**Reported limitation**: as with Tasks 11/12, on-screen pixel rendering
of the new map/layers/panels could not be visually confirmed via a
browser screenshot in this sandboxed session (no `chromium-cli`/
Playwright browser tool was available this session for a live capture);
correctness was instead verified via `tsc -b`, a successful production
`vite build`, careful reuse of `MapLibreMap.tsx`'s already-proven
MapLibre patterns (same source/layer/popup conventions, same demo
basemap), and full live backend API verification of every value the
new page displays. A future task with browser-automation access should
capture a real screenshot to close this gap, as Task 11/12 still note
for the Overview map.

"Map Intelligence is now a real evidence workspace, not a placeholder:
administrative boundary, settlement, and the full 813-record GSI/NLFC
landslide inventory render as independently toggleable map layers, all
reusing existing, unmodified backend endpoints plus one new minimal
read-only `GET /api/gis/landslides` route that mirrors the existing
boundaries endpoint's own honesty/audit conventions exactly. Terrain/
slope, flood, cloudburst, and coastal erosion are shown as honest
evidence-status text, never a fabricated layer. No risk score, hazard
zone, or safety color appears anywhere — the evidence panel states the
real Hazard Exposure numbers for Bhitai Malli (0 qualifying, 2.04 km
nearest, 21 contextual) together with the required 'does not establish
absence of hazard' disclosure, verbatim. 167/167 backend tests passing;
frontend clean; live verification confirms every existing risk/
decision/destination/report value, and the data files/business-logic
modules this task was told not to touch, are all unchanged."

## Task 39 — Evidence Locker / Data Provenance module (implemented)

**Architecture decision — no new backend endpoint.** Task 39 §O asked
to "first inspect whether the evidence information can safely remain
in a frontend static configuration [and] choose the simpler
architecture." The Evidence Locker's content splits cleanly into two
kinds of value: (1) fixed reference text — source organization names,
dataset names, licenses, descriptions, limitations — that already
lives only in `docs/DATA_PROVENANCE.md`/`docs/DECISIONS.md` with no
API serving it today, and (2) live, request-specific numbers (the
current landslide feature count, boundary feature count, settlement
population/households/slope, and the Hazard Exposure derived output
for Bhitai Malli) that **already are served live** by existing,
unmodified endpoints. Adding a new `GET /api/evidence` route would
either (a) re-serve the same static strings a new schema/test file for
zero dynamic benefit, or (b) require copying live numbers into a
second, driftable static location — exactly what §O's "do not
duplicate source data unnecessarily" warns against. The chosen
architecture instead: a static TS data file
(`frontend/src/data/evidenceRecords.ts`) for the fixed reference
content, and the existing `fetchLandslides()`, `fetchBoundaries()`,
`fetchSettlementById()`, `fetchSettlementRisk()` service functions
(all pre-existing, all unmodified) for the live numbers, merged in the
page component. No backend file was touched for this task — confirmed
by mtime (every backend file Task 38 last touched still shows its
Task 38 timestamp, nothing newer).

**Evidence record structure** (`frontend/src/types/evidence.ts`):
`id`, `title`, `category` (`"source-backed" | "derived" | "demo-input"
| "missing"`), `source`, `dataset`, `geographic_scope`, `description`,
`usage_in_vikalp`, `status`, optional `attribution`, `limitations`,
`affected_modules`. This is deliberately close to (but not a copy of)
`services/copilot.py`'s existing four-bucket `provenance` dict
(`official_sources` / `derived_calculations` / `demo_planning_inputs`
/ `unavailable_or_missing`) — the closest existing precedent for a
source/derived/demo/missing split — extended with per-record detail
fields a Copilot context object doesn't need.

**13 records** (`EVIDENCE_RECORDS`, counted directly from the array,
never a hand-typed total): 3 source-backed (GSI/NLFC landslide
inventory, CartoDEM terrain elevation, geoBoundaries India ADM2), 1
derived (VIKALP-derived slope / the terrain discrepancy), 1 demo-input
(Bhitai Malli settlement values), 8 missing/unavailable (Terrain,
Historical Disaster Evidence, and Population/Household Exposure
scoring rules — all blocked on governance, not data; Vulnerability,
Flood/Cloudburst — genuinely no data; Destination candidates, land
suitability/access/service evidence, and carrying capacity — all
unavailable). Every description/limitation string reuses existing
documented wording (`docs/DATA_PROVENANCE.md`'s Task 12/14/15/20
sections, `hazard_exposure.py`'s `INVENTORY_BIAS_DISCLAIMER`,
`report.py`'s `_LIMITATIONS`/provenance table, `copilot.py`'s terrain-
discrepancy phrasing) rather than being reworded a further time.

**GSI record — source vs. derived kept visually distinct** (Task 39
§E/§J): the GSI/NLFC record's detail panel shows the source dataset's
own facts (org, dataset, scope, description) in the normal fields,
then a separately-styled box titled "Derived VIKALP output for Bhitai
Malli — not a source dataset fact" containing the live Hazard Exposure
numbers (qualifying-record count, nearest contextual distance,
contextual count, status) fetched from the existing
`GET /api/settlements/{id}/risk` response — never recomputed, never
presented as if it were itself a source-dataset fact. The required
disclosure — "No qualifying evidence was found within the current
scoring radius from the available GSI/NLFC inventory. This does not
establish absence of hazard." — is shown verbatim beneath it.

**Terrain discrepancy** (Task 39 §F): the VIKALP-derived-slope record
states both figures side by side — 18.91° (existing settlement/demo
planning value) and 22.58° (VIKALP-derived value from CartoDEM, Task
15) — and explicitly: "Neither is presented as authoritative; the
discrepancy is disclosed, not reconciled." Neither database value nor
any file was modified.

**geoBoundaries record** (Task 39 §G): states the exact existing
attribution — "Open Data Commons Open Database License 1.0 (ODbL
1.0)," publisher geoBoundaries (William & Mary geoLab), underlying
source organization Pathways Data Pvt. Ltd. / lgdirectory.gov.in — and
explicitly limits itself to district-level scope: "VIKALP does not
have an authoritative Bhitai Malli village-level boundary polygon."

**Bhitai Malli demo data** (Task 39 §H): labeled "Demo planning input"
throughout, with an explicit limitation stating it is not official
Census data, not government survey data, and not claimed as
authoritative population data — matching the existing
`SettlementGeoJSONProperties`/`copilot.py` disclosure convention. Live
population (383) and households (86) are fetched, not hardcoded, so
the figure can never silently drift from what `GET /api/settlements/1`
actually returns.

**Missing evidence** (Task 39 §I): reuses exact existing terminology
(`no_data`, "blocked on governance decisions, not on missing data,"
"genuinely blocked on missing data, not resolvable by a governance
decision alone" for Vulnerability specifically, distinguishing it from
Terrain/Historical/Population's governance-only blockers per Task 28's
own framework). No numeric completeness percentage is invented
anywhere.

**Derived output traceability** (Task 39 §J): two fixed chains
(`DerivedOutputTraceability` component) — GSI inventory → spatial
distance calculation → qualifying-record output → "no qualifying
evidence... does not establish absence of hazard" interpretation; and
CartoDEM → Horn's-method terrain processing → 22.58° output → conflict
with the 18.91° planning input → "unresolved discrepancy" status. A
simple structured UI, not a graph database, per the task's own
instruction.

**UI**: `frontend/src/pages/DataGovernancePage.tsx` (was a
`PlaceholderPage`), reached via the existing `"data-governance"`
`PageId`/hash route and the existing "Evidence Locker" nav label — no
new router, no new nav entry. A summary bar (counts computed from the
records array), a selectable list (`EvidenceListCard`), a detail panel
(`EvidenceDetailPanel`), and the traceability chains. Status badges use
only the existing neutral and amber ("warning"/gold) `Badge` tones —
gold used strategically, only for demo-input/missing categories that
need officer attention — never the existing green ("safe") or red
("critical") tones, since a provenance/completeness distinction is not
a risk-safety claim.

**No secrets/filesystem paths**: grepped every new frontend file for
absolute paths, `vikalp.db`, `jwt_secret`, and `password` — none found.

**Tests**: no new backend tests were needed or added — no backend file
was modified, so the existing 167 backend tests already cover every
live value this page displays (`TestGisLandslides` for the 813-feature
count, `test_hazard_exposure.py`'s `TestBhitaiMalli` for the 2.04
km/21-contextual/0-qualifying figures, `TestGisBoundaries` for the
district feature set, `TestSettlementDetail` for population/
households). This repository has never had a frontend unit-test
runner (every prior task verified the frontend via `tsc -b` +
`npm run build` only) — Task 39 continues that established
convention rather than introducing a new frontend testing dependency.
The 13-record category counts (3 source-backed / 1 derived / 1
demo-input / 8 missing) were verified directly against the static
data file via `grep -c`/`grep -o | sort | uniq -c`, not by inspection
alone. Full backend suite: **167/167 passing, unchanged** (confirmed
before and after this task). Frontend `tsc -b` and `npm run build`
both clean (only the pre-existing >500 kB chunk-size advisory).

**Live verification**: `GET /api/gis/landslides` → 813 features,
`GET /api/gis/boundaries` → 13 features, `GET /api/settlements/1` →
population 383/households 86/slope 18.91°, `GET /api/settlements/1/
risk` → Hazard Exposure `no_evidence_found`/0 qualifying/2.04 km
nearest contextual/21 contextual records — every one of these is
exactly what the Evidence Locker page displays. Copilot context,
report generation, and the audit trail all still return `200`/real
data, confirmed unaffected by this task.

**Data integrity**: `data/` file count unchanged (59);
`docs/CODEBASE_AUDIT.md` untouched (identical mtime, Sep 11);
`risk.py`, `hazard_exposure.py`, `decision.py`, `destination.py`,
`report.py`, `gis.py`, `database.py`, `models/settlement.py`, and
`services/audit.py` all confirmed untouched by mtime (all predate this
task's session).

"The Evidence Locker is a read-only trust and traceability workspace —
no upload, edit, or delete function exists anywhere in it. Thirteen
evidence records are classified into exactly four categories (source-
backed, VIKALP-derived, demo planning input, missing/unavailable),
counted directly from the data rather than hand-typed. Fixed reference
content (source names, licenses, descriptions) lives in a static
frontend file reusing VIKALP's own already-documented wording; live
numbers (813 landslide records, 13 boundary features, Bhitai Malli's
population/households/slope, and the Hazard Exposure derived output)
are fetched from existing, unmodified endpoints rather than duplicated
as a second, driftable copy — so no new backend endpoint was needed.
The GSI record visually separates 'source dataset facts' from
'VIKALP-derived output,' the terrain discrepancy is disclosed with
neither value treated as authoritative, and the required 'does not
establish absence of hazard' language is preserved verbatim. 167/167
backend tests passing, unchanged; frontend clean; live verification
confirms every value this page displays matches the real API output,
and every risk/hazard/decision/destination/report business-logic file
this task was told not to touch remains untouched."

## Task 40 — Reports UI integration (implemented)

**Scope, precisely**: connect the existing frontend to the existing
Task 34 report backend. Nothing in `backend/app/services/report.py` or
`backend/app/api/report.py` was read for editing purposes beyond the
initial inspection — both are byte-identical to their Task 34/39
state (confirmed by mtime).

**New capability the frontend was missing: a binary (PDF) response
path.** Every existing VIKALP fetch (`apiFetch<T>` in
`services/apiClient.ts`) calls `response.json()` — unusable for a PDF.
Added `apiFetchBlob()` as a sibling function in the same file, sharing
the exact same token-attachment, 401-handling (clears session,
dispatches `SESSION_EXPIRED_EVENT`), and non-OK-status error logic as
`apiFetch` — a deliberate near-duplication of that logic rather than a
second authentication mechanism (Task 40 §L: "Do NOT... create a
second authentication mechanism"). It additionally parses the
`Content-Disposition` response header for the server-assigned filename
(`VIKALP_<Settlement_Name>_Evidence_Assessment.pdf`, unchanged from
Task 34) rather than the frontend constructing its own filename.

**Settlement selection reuses an existing, previously-uncalled backend
route.** `GET /api/settlements` (`list_settlements()`) has existed
since Task 04/33 and is already covered by backend tests, but no
frontend service function ever called it — `ReportsPage.tsx` needed a
settlement list, so `fetchSettlements()` was added to
`services/settlements.ts` (one line, same pattern as every other
function in that file) instead of hardcoding `[{id: 1, name: "Bhitai
Malli", ...}]` in the frontend. Today it still returns exactly one row;
the UI does not assume that will always be true.

**PDF handling** (`ReportsPage.tsx`): `generateSettlementReport(id)`
(new `services/report.ts`) returns `{ blob, filename }`; the page turns
the blob into an object URL (`URL.createObjectURL`), offers "Open PDF"
(`window.open` in a new tab) and "Download PDF" (a programmatic
`<a download>` click, immediately removed from the DOM), and revokes
the previous object URL both before creating a new one and on
unmount. No blob/PDF bytes are ever sent anywhere else, stored in
`sessionStorage`/`localStorage`/IndexedDB, or persisted server-side —
the backend remains the sole generator and source of the document,
exactly as §E required.

**States**: `generationState` is a `"idle" | "generating" | "error" |
"success"` union (same discriminated-union convention as every other
VIKALP request state). The button disables itself and reads
"Generating…" while `status === "generating"`, preventing a duplicate
submission — there is no debounce/queue because the disabled attribute
alone is sufficient here (a single-button, single-in-flight-request
UI). A failed request (401, 404, 500, or a network failure — all
handled identically by `apiFetchBlob`/the existing `.catch`) shows the
exact fixed string the task specified, "Unable to generate the report.
Please try again." — never the underlying `Error.message`, so no
internal detail (the backend's own `ReportGenerationError` handling
already keeps its HTTP 500 body generic, per Task 34's own
`test_report_generation_error_message_has_no_internal_detail` test;
the frontend adds a second layer of the same discipline rather than
relying on the backend alone).

**Trust copy** on the page paraphrases `report.py`'s own
`_build_disclaimer_section` text (Task 34) rather than inventing new
claims — "not an emergency order, not an automatic relocation order,
not a government-certified risk declaration," "absence of evidence is
not evidence of safety," "officer review is required." The
"Evidence included" list names only the sections
`_build_*_section()` functions in `report.py` actually build (settlement
context, GIS evidence, risk status, Hazard Exposure detail, Decision
Workspace, destination/capacity, provenance, limitations, officer
review) — the PDF's own content is never reproduced in JSX.

**Audit**: no new frontend or backend audit action was added — the
existing `GENERATE_REPORT` event (`api/report.py`, Task 34/36) fires
exactly as before, since the frontend calls the same unmodified
endpoint. A failed unauthorized request (401, no valid token) never
reaches the route body at all — `get_current_officer`'s existing
dependency rejects it before any audit call, exactly as it already did
for every other protected route; no new behavior was introduced there.

**Tests**: no new backend tests — no backend file changed, so the
existing Task 34 report tests (`test_report.py`, PDF signature,
settlement-name/pending-state assertions, the safe-error-message test,
404-for-unknown-id) already cover the exact endpoint this task wired
up, unmodified. This repository has no frontend unit-test runner (see
Task 39's same note) — verified instead via `tsc -b`, a successful
production build, and full live verification of every behavior listed
in Task 40 §O/§R (settlement list call, blob/PDF handling, no token in
the URL — confirmed structurally, since `apiFetchBlob` only ever puts
the token in an `Authorization` header — loading/error/success states
read directly from the component's own state-union logic, and a real
generated PDF's headers/bytes/audit trail). Full backend suite:
**167/167 passing, unchanged** (confirmed before and after this task).
Frontend `tsc -b` and `npm run build` both clean (only the pre-existing
>500 kB chunk-size advisory).

**Live verification**: real login; `GET /api/settlements` → Bhitai
Malli; `GET /api/settlements/1/report` → `200`, `content-type:
application/pdf`, `Content-Disposition: attachment; filename="VIKALP_
Bhitai_Malli_Evidence_Assessment.pdf"`, a real 45,204-byte `%PDF-`
document; no-token → `401`; unknown settlement id → `404`; Map
Intelligence's dependencies (`/api/gis/boundaries`, `/api/gis/
landslides`), the Copilot context endpoint, and risk/decision/
destination (`pending`/`null`, `pending`, `pending`/`[]`) all confirmed
unaffected; the audit trail shows a real `GENERATE_REPORT` event from
this session alongside `VIEW_*`/`LOGIN_SUCCESS`.

**Data integrity**: `data/` file count unchanged (59);
`docs/CODEBASE_AUDIT.md` untouched (identical mtime, Sep 11);
`report.py` (both service and API), `risk.py`, `hazard_exposure.py`,
`decision.py`, `destination.py`, and `database.py` all confirmed
untouched by mtime (all predate this task's session).

"Task 40 connects the Reports page to Task 34's existing evidence-
assessment PDF endpoint — no report-generation logic, format, or
content changed anywhere. The frontend gained one new capability it
was missing (a binary/Blob response path, `apiFetchBlob`, built as a
sibling to the existing authenticated `apiFetch`, never a second auth
mechanism) and one previously-unused backend route was finally called
(`GET /api/settlements`, for settlement selection, instead of a
hardcoded list). The generated PDF is opened/downloaded via a
short-lived object URL and never stored anywhere beyond the current
page view; the backend remains the sole source of the document. No
report editing, approval workflow, digital signature, second export
format, or LLM was added. 167/167 backend tests passing, unchanged;
frontend clean; live verification confirms a real PDF is generated
with the correct filename and audit event, and that risk/decision/
destination/Map-Intelligence/Copilot behavior is entirely unaffected."

## Task 41 — Controlled AI Copilot UI (implemented)

**Scope, precisely**: connect a new frontend page to Task 37's existing
deterministic Copilot backend. `backend/app/services/copilot.py`,
`backend/app/schemas/copilot.py`, and `backend/app/api/copilot.py` were
not modified (confirmed by mtime — all predate this task's session).
No LLM, RAG, embeddings, vector database, or any new AI dependency was
added anywhere in this codebase.

**Why a new page, unlike Task 37's own instruction not to add one**:
Task 37 explicitly said "Do not add a new navigation page... leave UI
wiring for a later task" because no `AICopilotPage.tsx` existed to
enhance and the foundation wasn't ready for a UI. Task 41 *is* that
later task — it explicitly asks for the page to be "correctly
available through the existing navigation." `"copilot"` was added to
`PageId` (`types/navigation.ts`), `useHashRoute.ts`'s `VALID_PAGES`,
`PageRouter.tsx`'s switch, and `data/navigation.ts`'s
`primaryNavItems` (labeled "AI Copilot", placed last — it explains
outputs from every earlier workflow stage rather than adding a new
stage of its own). No router library was added; the existing
hash-routing convention is unchanged in shape.

**No free-form chat box — the core governance decision of this task.**
`components/copilot/copilotPrompts.ts` defines exactly six fixed
prompts (`COPILOT_PROMPTS`) and a pure function,
`buildCopilotAnswer(promptId, context, explanation)`, that *selects*
which already-fetched `CopilotContext`/`EvidenceExplanation` fields to
show for that prompt — it performs no calculation beyond string
formatting of values the backend already returned (e.g. counting how
many of the 5 risk dimensions have `score !== null`, which is
presentation logic identical in kind to what `RiskAnalysisPage.tsx`
already does with `dimension.status`, not new business logic). No
prompt click triggers a new network request; the two backend calls
happen exactly once, when a settlement is selected. There is no text
input anywhere on this page — the task's own §8 instruction ("If a
free-text input already exists... remove it or constrain it") did not
apply, since none existed, so the simplest compliant choice (never
add one) was taken.

**Governance is visible, not just documented.** `CopilotGovernancePanel.tsx`
is always rendered (not behind a toggle) — the 5-step "How VIKALP
Copilot works" pipeline and an explicit "Copilot does not" list
(calculate risk / override VIKALP rules / select destinations /
approve relocation / issue government orders / invent missing
evidence), matching §4/§12 verbatim. The page's trust banner —
"Copilot answers are generated only from verified VIKALP assessment
context. Missing evidence remains missing. Deterministic VIKALP rules
remain the source of truth... a controlled explanation layer —
powered by verified VIKALP assessment context, not an external AI
model" — uses only the honest phrasing §19 asked for, never "powered
by advanced AI," "AI prediction," or similar.

**Evidence-grounded response structure.** The "What evidence is
available?" prompt lists `context.provenance.official_sources`,
`derived_calculations`, and `demo_planning_inputs` together — the same
three-category provenance object Task 37's backend already builds, not
a new classification invented on the frontend. `CopilotEvidenceContextPanel.tsx`
(behind a "View evidence context" toggle, §13) surfaces all ten
`CopilotContext` categories the task named — settlement, risk
assessment, risk dimensions, hazard exposure, decision workspace,
destinations, provenance, missing evidence, limitations, policy
disclaimer — reading each field directly, never recomputing or
re-deriving a value.

**Missing/pending state fidelity.** The "What evidence is missing?"
prompt passes `context.missing_evidence` through unchanged, prefixed
only with the task's own suggested framing ("VIKALP cannot make a
complete assessment from the currently available evidence") — never
"the settlement is safe" or a risk-level word. The settlement-status
badge reads "Assessment Pending" whenever
`risk_assessment.assessment_status !== "complete"` and never invents
Low/Moderate/High/Critical. The "Explain the landslide evidence."
prompt reproduces `hazard_exposure.status`,
`qualifying_record_count`, `nearest_contextual_distance_km`,
`contextual_record_count`, and the exact
`inventory_bias_disclaimer` string the backend already returns — for
Bhitai Malli today this renders the same `no_evidence_found`/0
qualifying/2.04 km nearest/21 contextual figures every other page in
this app already shows, sourced from the identical backend call.

**Settlement selection**: `fetchSettlements()` (added in Task 40,
reused unchanged here) populates the selector — not hardcoded to
Bhitai Malli, even though that remains the only row today.

**Frontend typing improvement**: `types/copilot.ts`'s
`ApiCopilotContext.hazard_exposure` was `unknown | null` since Task 37
(deliberately, since no UI read it yet); now typed as
`ApiHazardExposureLandslideDetail | null` (the same interface Task 38
added to `types/risk.ts`) so the landslide-evidence prompt can read
its fields without a cast. A frontend-only typing precision change,
not a backend contract change.

**Authentication/audit**: both calls go through the existing
`fetchSettlementCopilotContext`/`fetchSettlementEvidenceExplanation`
(`services/copilot.ts`, unchanged since Task 37), which use the same
`apiFetch` every other page already uses — same Bearer-token-from-
session, same 401-clears-session-and-redirects behavior, no token ever
in a URL. No new frontend or backend audit mechanism was added; the
existing `VIEW_COPILOT_CONTEXT`/`VIEW_EVIDENCE_EXPLANATION` events
(Task 37) fire exactly as before, once per settlement selection — not
once per prompt click, since prompts trigger no new request (avoiding
audit-trail noise from a chatty UI).

**Tests**: no new backend tests — no backend file changed, and Task
37's existing 30 Copilot tests already cover both endpoints this page
calls, unmodified. No frontend test runner exists in this repository
(the same established convention noted in Tasks 39/40). Verified
instead via `tsc -b`, a successful production build, and full live
verification. Full backend suite: **167/167 passing, unchanged**
(confirmed before and after this task). Frontend `tsc -b` and
`npm run build` both clean (only the pre-existing >500 kB chunk-size
advisory).

**Live verification**: real login; `GET /api/settlements` → Bhitai
Malli; `GET /api/settlements/1/copilot-context` → `200`;
`GET /api/settlements/1/explanation` → `200`; no-token → `401`;
unknown settlement id → `404`; risk `pending`/`null`, decision
`pending`, destinations `pending`/`[]` all confirmed unaffected;
Reports/Map Intelligence/Evidence Locker's own dependency endpoints
(`/report`, `/api/gis/boundaries`, `/api/gis/landslides`) all still
`200`; the audit trail shows real `VIEW_COPILOT_CONTEXT` and
`VIEW_EVIDENCE_EXPLANATION` events from this session alongside the
other `VIEW_*`/`GENERATE_REPORT`/`LOGIN_SUCCESS` actions.

**Data integrity**: `data/` file count unchanged (59);
`docs/CODEBASE_AUDIT.md` untouched (identical mtime, Sep 11);
`copilot.py` (service, schemas, and API), `risk.py`, `decision.py`,
`destination.py`, and `audit.py` all confirmed untouched by mtime (all
predate this task's session).

"Task 41 turns Task 37's deterministic Copilot foundation into a real,
navigable page — without adding an LLM, RAG, embeddings, a vector
database, or a free-form chat box anywhere. Six fixed, controlled
prompts each surface a different already-verified slice of the same
CopilotContext/EvidenceExplanation the backend already computed; no
prompt triggers a new calculation or a new network request. A
governance panel stating what Copilot can and cannot do is shown at
all times, not buried behind a toggle, and an evidence-context panel
lets an officer trace every displayed claim back to its source
category. Pending/missing states are preserved verbatim — the page
never says 'safe,' 'unsafe,' or a risk level unless the backend
actually returned one, and for Bhitai Malli it consistently reads
'Assessment Pending' with the real 0-qualifying/2.04 km/21-contextual
Hazard Exposure figures. 167/167 backend tests passing, unchanged
(no backend file modified); frontend clean; live verification confirms
both Copilot endpoints, correct 401/404 handling, unaffected risk/
decision/destination/report/map/evidence-locker behavior, and a real
audit trail."

## Task 42 — End-to-end demo + UI polish (implemented)

**Scope, precisely**: a consistency/polish pass across the existing
frontend — no new backend endpoint, no new risk/decision/destination
intelligence, no new dataset. **Zero backend files were modified**
(confirmed by mtime — every file under `backend/app/` still carries
its Task 32-41 timestamp, none from this session).

**Repository-wide terminology audit (§8) found nothing to fix.** A
full case-insensitive grep of `frontend/src` for "BHUVIGIL", "command
center", "autonomous AI", "AI prediction/recommends", "powered by
GPT", "certified", "official government", "unsafe", "relocation
recommended", and literal "low/high/critical risk" copy turned up
zero problematic matches — every "safe"/"certified"/"official"
occurrence found was already a negation/disclaimer sentence
deliberately written to avoid implying safety (e.g. "This does NOT
mean this location is safe from landslide hazard"), a CSS color-token
name, or a code comment describing the same constraint. This confirms
Tasks 32-41 already enforced the honesty requirements this task would
otherwise have had to retrofit.

**Cross-page CTA connections added (§17)** — the audit found *zero*
existing in-page navigation actions (every page's `onNavigate` prop
was previously only wired to the shared `Header`'s nav tabs). Seven
new navigation-only buttons were added, exactly matching the task's
suggested journey:
- Risk Analysis → "Review Decision Workspace →"
- Decision Workspace → "Explore Destinations →"
- Destination Explorer → "View Map Intelligence →"
- Map Intelligence's evidence panel → "Open Evidence Locker →"
- Evidence Locker → "Ask Copilot →"
- AI Copilot → "Generate Report →"
- Reports → "← Return to Assessment" (to Risk Analysis)

Each is a plain `onClick={() => onNavigate("...")}` using the existing
hash-routing `PageId` union — no new route, no new business logic.

**Overview dashboard's stale placeholder fixed (§9).** `RiskAnalysisCard.tsx`
said "Risk assessment will be connected in a later task." even though
Task 07B connected it long ago — flagged as stale by `MVP_BACKLOG.md`'s
own prior note. `AppShell.tsx` gained a fourth parallel fetch
(`fetchSettlementRisk`, the same "different resource, not a duplicate"
precedent Task 11 established for settlement+geojson) and the card now
shows the real `assessment_status`/dimension-scored-count — "Assessment
Pending" / "N of 5 risk dimensions currently scored", never a
fabricated score. `IntelligenceCard.tsx` gained an optional `onClick`
prop (backward-compatible; `KeyInsightsCard` still renders as a plain,
non-clickable card since it has no dedicated page) so the Overview's
Risk Analysis / Decision Workspace / Relocation Planner "quick action"
tiles now navigate to their real pages instead of being inert.
`SettlementEvidencePanel.tsx` also now reads the same live risk state
(passed down from `AppShell`) instead of a hardcoded "Assessment
pending" string disconnected from any data.

**Badge/status-label consistency fixed (§10/§11/§29).** The audit
found the pending-state label capitalized three different ways across
pages ("Assessment Pending" / "Assessment pending" / "Destination
analysis pending") and one page (`DecisionWorkspacePage.tsx`'s pathway
comparison table) rendering the same status as plain `<td>` text one
row below the same status rendered as a `Badge` in a card. A new
shared `frontend/src/utils/formatStatus.ts` (`formatStatusLabel`)
turns any backend snake_case status string into one consistent Title
Case label ("not_evaluated" → "Not Evaluated") — used in
`DecisionWorkspacePage.tsx` (both the `PathwayCard` badges and the
comparison table, which now uses a `Badge` there too, not plain text)
and `DestinationExplorerPage.tsx` (`DimensionRow` badges, the analysis/
ranking summary badges). Every remaining "Assessment Pending" literal
across the app (Overview, Risk Analysis, Decision Workspace, the
Copilot page) now uses identical capitalization.

**Decision Workspace disclaimer (§11)**: added "VIKALP does not issue
relocation orders — officer approval remains final." directly beside
the existing backend `officer_review_note`, per the task's explicit
requested wording. Not a backend change — appended in the frontend
alongside the real backend-sourced note, not replacing it.

**Destination Explorer clarity (§12)**: added the explicit distinction
sentence the task asked for — "No candidate destination data currently
available does not mean no safe destination exists — it means VIKALP
has no government-curated candidate dataset for this settlement yet."
— and a "Carrying capacity: not assessed" line attached specifically
to the existing "Available Capacity" suitability-dimension row (no new
capacity field was invented; this surfaces the same dimension status
the API already returns, just more prominently, per the task's
explicit ask to show a distinct capacity line).

**Settlement-context architecture reviewed, not rebuilt (§5).** The
audit confirmed no shared/global settlement-selection state exists
anywhere (no Context, no localStorage key) — six pages
(`AppShell`/Overview, `MapIntelligencePage`, `DataGovernancePage`,
`RiskAnalysisPage`, `DecisionWorkspacePage`, `DestinationExplorerPage`)
hardcode `const BHITAI_MALLI_ID = 1` and skip the settlement list
entirely, while two (`ReportsPage`, `AICopilotPage`, both built in
Tasks 40/41) call `fetchSettlements()` and keep a local `useState`
default to `settlements[0]?.id`. **Deliberately not unified in this
task**: with exactly one settlement row in the system today, every
page already converges on the identical result by construction — there
is no reachable state where "one page shows Bhitai Malli, another
resets, another uses a different id" (the scenario §5 warns against)
is actually possible. Building a shared Context/store to solve a
divergence that cannot currently occur, for a task whose own
instructions say "if needed" and explicitly forbid new state-
management dependencies, was judged to be exactly the "uncontrolled
rewrite" §29 warns against — a bigger, riskier six-file refactor for
zero observable behavior change. This is recorded here as a reviewed,
deliberate scope decision, not an oversight; a future task adding a
second settlement should revisit it then, when the divergence becomes
real and testable.

**Loading/error/empty states (§18) and responsive layout (§19)
reviewed, no changes needed.** Every API-backed page already uses
`apiFetch`'s sanitized error messages (no stack traces, no filesystem
paths, no raw "Failed to fetch") and a consistent
loading/error/success discriminated-union pattern; Map Intelligence
and Evidence Locker (Tasks 38/39) already stack responsively
(`flex-col lg:flex-row`) below desktop widths. No layout defect was
found severe enough to justify a fix, and per the task's own
instruction this is a desktop-first GIS application, not a target for
a mobile redesign.

**Tests**: none added — no backend file changed (Task 34-41's existing
suites already cover every endpoint the new Overview risk fetch and
CTAs call), and no frontend test runner exists in this repository (the
same established convention noted in Tasks 39-41). Verified via
`tsc -b`, a successful production build, and full live verification.
Full backend suite: **167/167 passing, unchanged**. Frontend `tsc -b`
and `npm run build` both clean (only the pre-existing >500 kB
chunk-size advisory).

**Live verification**: a full simulated officer session — login,
settlement list, and every endpoint the demo journey touches
(`/risk`, `/geojson`, `/gis/boundaries`, `/decision`, `/destinations`,
`/gis/landslides`, `/copilot-context`, `/explanation`, `/report`) all
returned `200` with the same evidence-gated values every prior task
already established (risk `pending`/`null`, decision `pending`/all
`not_evaluated`, destinations `pending`/`[]`); a request with no token
returned `401`; the audit trail accumulated a real, ordered sequence of
`VIEW_*`/`GENERATE_REPORT`/`LOGIN_SUCCESS` events across the whole
journey.

**Data integrity**: `data/` file count unchanged (59);
`docs/CODEBASE_AUDIT.md` untouched (identical mtime, Sep 11); every
file under `backend/app/` confirmed untouched by mtime.

"Task 42 makes VIKALP's already-built pages feel like one product
instead of nine independent screens — seven new cross-page navigation
buttons connect the officer journey the task described, a stale
Overview placeholder that claimed risk assessment 'will be connected
in a later task' now shows the real live status, and status-badge
wording is capitalized consistently everywhere instead of three
different ways. A full terminology audit for stale/misleading product
language found the codebase already clean. No backend file was
touched, no new intelligence or dataset was added, and the settlement-
context architecture was deliberately left as-is with the reasoning
recorded, rather than rebuilt to solve a divergence that cannot
currently occur with only one settlement in the system. 167/167
backend tests passing, unchanged; frontend clean; live verification
confirms the entire demo journey's backend dependencies are healthy
and every evidence-gated value remains exactly as honest as before."

### Task 42 correction — black/gold visual direction + dead-control honesty pass

The user reviewed the running application and found it still
predominantly white/navy-blue, not the final approved black + gold
direction, and flagged several controls (3D Terrain, Hybrid, Overview's
8-checkbox legacy layer list, an unwired location search) that looked
interactive but did nothing. This correction addresses both, still
within Task 42's scope — no backend file touched, no new dependency.

**Theme change is one file, not a per-component rewrite.** Every card/
page already referenced shared CSS custom properties
(`--color-vikalp-bg/card/border/navy/safe/warning/critical/text/text-
secondary`, `frontend/src/styles/index.css`) rather than literal colors
— so redefining those eight values re-themes the whole app at once.
`vikalp-navy` keeps its historical name but now holds the gold accent
(`#a8822f`, the exact color `LoginPage.tsx` had already proven out
since Task 35 — that page's own comment said "the rest of the app
keeps its existing navy palette untouched," and this correction is
exactly the moment that stopped being true). `vikalp-warning` shares
the same gold, since "Assessment Pending" is the single most common
status shown throughout VIKALP and is precisely where a strategic
status-highlight belongs. `vikalp-safe`/`vikalp-critical` keep their
own green/red hue family, deliberately never gold — a status color and
the brand accent must stay visually distinct, or status information
would start being conveyed by the same color as "this is important
gold UI," which is not what either is for.

**Mechanical sweep, not a rewrite.** Every hardcoded `bg-white` across
30 components/pages was a literal light-mode leftover the CSS-token
change alone couldn't fix (Tailwind utility classes are static
strings, not theme-aware) — replaced with `bg-vikalp-card` throughout.
Paired contrast fixes where a light `text-white` sat on what is now a
gold `bg-vikalp-navy` background (the active nav tab, the primary
"Generate Evidence Assessment" button) — switched to `text-vikalp-bg`
(near-black text on gold) for real legibility, not a copy-paste
`text-white` left over from the old scheme. `Badge.tsx`'s `neutral`
tone (`bg-slate-100`, a raw Tailwind gray never wired to the theme)
became `bg-vikalp-border/40`. `LoginPage.tsx` — previously the one
page already on-theme, via its own duplicated hex palette — was
rewritten to use the shared tokens instead, so it can never drift out
of sync with the rest of the app again.

**Map paint colors are separate from Tailwind and needed their own
fix.** MapLibre `addLayer` paint properties are plain JS hex strings,
not CSS classes — the settlement marker/label (`#173f6b`, navy) and
administrative-boundary fill/line (`#5b7a99`/`#3d5a75`, blue-gray) in
both `MapLibreMap.tsx` (Overview) and `IntelligenceMap.tsx` (Map
Intelligence) were the literal "blue" the user's screenshot review
called out, invisible to a CSS-only sweep. Settlement marker/label →
`#a8822f` (same gold, since the settlement point is the single most
important feature on the map — strategic, not decorative, gold).
Boundary fill/line → warm neutral grays (`#6b6355`/`#4a4438`) rather
than a second gold element, per "gold should be strategic, not
everywhere." The landslide-evidence point color (`#8a6d3b`, muted
brown) was already coincidentally on-brand and left unchanged. The
basemap itself (OSM demo raster tiles) and label text-halo (white, for
legibility against the still-light basemap) were deliberately left
alone — swapping the demo basemap or its legibility technique is
unrelated to app-chrome theming and outside this task.

**Dead-control honesty pass (Task 42 §"CRITICAL FUNCTIONALITY
REQUIREMENT")** — every visible control was asked "does this actually
perform a working function?":
- **3D Terrain / Hybrid** (`VisualizationControls.tsx`, Overview
  sidebar): previously clickable buttons that changed `useState` but
  drove nothing. Genuine 3D terrain would need the raw CartoDEM
  GeoTIFFs re-encoded as terrain-RGB tiles and served by a new backend
  route — a new rendering pipeline explicitly out of this task's
  scope (and Task 38's own scope before it), so it is not faked.
  "Hybrid" has no second basemap style to switch to. Both now render
  as non-interactive rows reading "Not available in prototype" (the
  task's own suggested exact wording); "2D Map" — the one mode that is
  actually true today — shows as a status pill, not a toggle, since
  there is nothing else to pick.
- **Overview's 8-checkbox `LayersPanel`** (Terrain, Landslide
  Susceptibility, Flood Hazard, Coastal Erosion, Multi-Hazard,
  Settlements & Households, Infrastructure, Administrative Boundaries):
  all eight were `disabled` checkboxes that implied a full layer
  system existed on Overview. Only three ever corresponded to
  anything real, and that reality already lives on the Map
  Intelligence page (Task 38) as genuinely working toggles. Replaced
  with the exact same three real layer names (status dots, not
  checkboxes — this sidebar was never wired to the Overview map's own
  rendering) plus the same three honest "Unavailable" rows Map
  Intelligence already uses, and a working "Open Map Intelligence for
  full layer controls →" link (`onNavigate` threaded through
  `AppShell` → `Sidebar` → `LayersPanel`, a 3-file prop-plumbing
  change). "Multi-Hazard," "Settlements & Households," and
  "Infrastructure" were dropped entirely — they never corresponded to
  anything, so there was no honest status to give them.
- **Location search input** (`LocationExplorer.tsx`): was a plain
  enabled `<input>` with no `onChange`/handler — a user could type into
  it and nothing would happen, with no indication why. Now `disabled`
  with an honest placeholder ("Search — not available (single demo
  settlement)"), since with exactly one settlement in the system today
  a working search genuinely has nothing to search across yet.

**Layout structure re-verified, not changed.** The user's screenshot
review also raised "the map dominates almost the entire screen." Both
`AppShell.tsx` (Overview: `Header` → `Sidebar` + main content
containing a map/evidence-panel row and four bottom intelligence
cards) and `MapIntelligencePage.tsx` (`LayerControlPanel` + map +
`EvidencePanel`, `flex-col lg:flex-row`) already place the map
alongside chrome on every code path — no structural change was made
here, since none was needed; the earlier live-rendering report where
only the map appeared could not be reproduced or explained by static
code review (see the prior diagnosis turn) and may have been a stale
dev-server/HMR state that a hard refresh resolves.

**Tests**: none added/changed — this is a CSS/JSX-only visual and
honesty correction; no backend file, business logic, or GIS data was
touched. Full backend suite: **167/167 passing, unchanged**. Frontend
`tsc -b` and `npm run build` both clean (only the pre-existing >500 kB
chunk-size advisory) after every change in this correction, checked
incrementally.

"This correction makes VIKALP's actual black + gold direction (already
proven on the Login page since Task 35) the whole application's
direction, via one shared theme-token file plus a mechanical
`bg-white`→`bg-vikalp-card` sweep, rather than a per-page rewrite —
and it removes every control that looked interactive but wasn't (3D
Terrain, Hybrid, Overview's legacy 8-layer checklist, an unwired
search box), replacing each with either a genuinely working link to
where the real functionality already lives (Map Intelligence) or an
honest 'Not available in prototype'/disabled state. No backend logic,
GIS data, or dependency changed; 167/167 backend tests remain passing;
frontend typecheck and build stayed clean throughout."

## Task 43 — Officer Workspace + map-based Relocation Planner

Reworked the Overview dashboard into a compact, map-dominant "Officer
Workspace" (real layer controls + right-hand Settlement Intelligence
panel + a five-card bottom intelligence row), built the Relocation
Planner into a genuine map-based workspace (it was a placeholder since
Task 06), redesigned Risk Analysis and Destination Explorer for
scannability, and added a small, explicit raw-status → officer-phrase
translation table. The locked black + gold visual system (Task 42
correction) was not touched — every change here reuses the existing
tokens and existing components.

**Overview now reuses Map Intelligence's own map and layer panel
instead of a second, weaker implementation.** The Overview map was
`components/dashboard/MapLibreMap.tsx` — boundary + settlement only, no
landslide layer, no layer toggles, no fit/reset. Map Intelligence's
`IntelligenceMap.tsx` (Task 38) already does everything Task 43 asked
the Overview map to do (boundary + settlement + landslide layers, real
toggles, popups, fit-settlement/fit-district) — so `AppShell.tsx` now
renders `IntelligenceMap` directly (with its own landslides fetch +
show/hide state + `IntelligenceMapHandle` ref, mirroring
`MapIntelligencePage.tsx`'s own pattern — consistent with this
codebase's standing decision, Task 42, against introducing a shared
map/fetch store), and `Sidebar.tsx` now renders `LayerControlPanel`
(Task 38) instead of the Overview-only `LocationExplorer.tsx` +
`LayersPanel.tsx` pair. `MapLibreMap.tsx`, `LocationExplorer.tsx`, and
the old `LayersPanel.tsx` are deleted — nothing referenced them once
this swap landed. `VisualizationControls.tsx` (the honest "2D Map
active / 3D Terrain, Hybrid — Not available in prototype" rows, Task 42
correction) is kept in `Sidebar.tsx` below the layer panel, since
Task 43's own left-panel spec still expects a 2D-map honesty
indicator and Map Intelligence's page doesn't have one of its own to
reuse.

**Right panel — "Settlement Intelligence"** (`SettlementEvidencePanel.tsx`,
rewritten): compact stat grid (population/households/elevation/stored
slope), a Risk status row (`{scored} / {dimensions}` — never a
fabricated score), a Landslide row (qualifying/nearest/contextual —
the same Hazard Exposure fields Map Intelligence's `EvidencePanel`
already reads), a Data Quality row, and four working action buttons
(View Risk / View Evidence / Ask Copilot / Generate Report), each a
plain `onNavigate` call — no new fetch, no new endpoint. Replaces the
old, purely-static settlement-facts card.

**Bottom row — five live cards, not four static ones.**
`BottomIntelligencePanels.tsx` now renders Risk / Decision / Destination
/ Relocation / Copilot (`grid-cols-2 lg:grid-cols-5`). The Decision,
Destination, Relocation, and Copilot cards are new/reworked
(`DecisionCard.tsx` replaces the always-static `ScenarioLabCard.tsx`;
`DestinationCard.tsx` and `CopilotCard.tsx` are new) and are all driven
by ONE new `AppShell` fetch —
`GET /api/settlements/{id}/copilot-context` (Task 37) — rather than
three separate destination/decision/copilot fetches, since that
endpoint already bundles `decision_workspace` and `destinations`
alongside the risk assessment it was already fetching for other
purposes. The old `KeyInsightsCard.tsx` is deleted — it duplicated
population/household facts the right panel already shows, and Task 43's
own bottom-row spec has no "Key Insights" card. The Copilot card's "N
of 5 dimensions need evidence" line and its bullet list are the real
`risk_assessment.dimensions` array's unscored entries (`score === null`),
capped at 3 shown + a "+N more" line — never invented text, and it
happens to line up with Task 43's own illustrative example (terrain,
hazard, historical-disaster are three of the five dimensions currently
unscored for Bhitai Malli) purely because that's what the live data
says.

**Raw status vocabulary → officer-facing phrases (Task 43 §5).**
`utils/formatStatus.ts`'s `formatStatusLabel` (Task 42 — snake_case →
Title Case) now checks a small explicit table first: `no_scoring_rule`
→ "Assessment rule pending", `no_data` → "Data unavailable",
`not_evaluated` → "Not assessed", `insufficient_evidence` → "More
evidence needed", `source_data_unavailable` → "Source unavailable".
Everything else still falls back to the Title Case reformat (e.g.
"Pending", "Complete", "No Evidence Found") — only the five codes the
task named are translated, nothing else was invented. Same function,
same call sites as before (every existing caller — Decision Workspace's
pathway badges, Destination Explorer's dimension badges — picks up the
more precise phrasing automatically); one raw-status leak was also
fixed in Map Intelligence's `EvidencePanel.tsx`, which previously
printed `{hazard.status}` literally instead of formatting it. The
underlying raw status is never discarded — it stays visible in each
page's "View details"/rule_reference text.

**Risk Analysis redesigned into five compact dimension cards**
(`RiskAnalysisPage.tsx`): each card now shows a short evidence-available/
evidence-missing line, a small dimension-specific "key evidence" line
(Hazard Exposure's qualifying/nearest/contextual; Terrain's
elevation/stored-slope/derived-slope with the disclosed discrepancy
warning; a generic evidence list for the other three), an "Assessment
score: Pending" line with a status badge, and a "View details" toggle
that reveals the missing-inputs list and rule_reference only on demand
— replacing the previous always-visible paragraph of prose per card.
No score is manufactured for Bhitai Malli; every dimension still
correctly shows "Pending."

**Destination Explorer redesigned into a compact stat row**
(`DestinationExplorerPage.tsx`): candidate count / capacity / land
suitability / access as four `StatItem`s instead of a paragraph, with a
"Why is this unavailable?" toggle that reveals the existing
explanation/missing-evidence text on demand. Suitability dimensions are
now compact badge pills instead of six full prose cards. Still zero
invented candidates — the empty-candidates branch is unchanged.

**Relocation Planner is now a real map-based workspace**
(`RelocationPlannerPage.tsx`, previously `<PlaceholderPage title=
"Relocation Planner" />` since Task 06): a 4-step tracker (Current
Site ✓ / Destination / Capacity / Review, each reflecting real fetched
state, never a fabricated "in progress"), a new `RelocationMap.tsx`
(current-settlement marker always; a second, distinctly-styled
destination marker only when a real candidate with coordinates
exists — `candidates.length` is 0 for Bhitai Malli today, so this path
is currently dormant, structurally ready, and will render the moment
an approved candidate is added), and a right panel (Current Site /
Destination / Capacity / Access-when-present / Status / "Explore
Destination →"). Per Task 43 §8's explicit instruction, **no route or
connecting line is ever drawn between the two markers** — the schema
has no route/road-distance field, and a drawn line would read as a
claimed evacuation route; when candidates are empty (today), an honest
"No government-curated destination — Destination analysis cannot begin
until an approved candidate is available" panel replaces the
would-be route/capacity content, with a working "Explore Destination
Evidence →" link into Destination Explorer.

**Dead-control audit result: none found still dead.** Every layer
checkbox, Reset/Fit button, and Overview action button was traced to a
real handler (layer toggles → `IntelligenceMap`'s show/hide props →
actual `setLayoutProperty` calls already in that component since
Task 38; Reset/Fit → the existing `IntelligenceMapHandle` ref methods;
every quick-action/card button → a real `onNavigate` call). Nothing new
was disabled in this task — Task 42's correction had already resolved
3D Terrain/Hybrid/the old layer checklist/the search box.

**Live verification** (Playwright, dev-only tool, not added as a
project dependency): logged in, confirmed the Overview shell (header/
sidebar/map/right panel/bottom five cards) renders with zero console
errors; toggled the Landslide Evidence checkbox and confirmed its
checked state actually flips; clicked Reset/Fit and all four right-panel
action buttons and confirmed each navigates correctly; visited
Destination Explorer (stat row + "Why is this unavailable?" expand) and
Relocation Planner (step tracker + map + empty-state panel) with
real-data screenshots; re-screenshotted Decision Workspace, Map
Intelligence, Evidence Locker, AI Copilot, and Reports to confirm no
regression; verified a direct hash route with no session redirects to
`#/login`, and that a refresh after login preserves the session and the
full Overview composition.

**Tests**: backend untouched, **167/167 passing**. `npx tsc -b` clean.
`npm run build` clean (only the pre-existing >500 kB chunk-size
advisory). No backend file, GIS/raw/processed data, business logic, or
dependency was changed.

## Task 44 — state-level Officer Workspace Overview + real weather

Redesigned the Overview page into a state-level entry point matching a
supplied reference image's layout/density (top nav unchanged, a
State/District/Settlement/Search filter bar, a dominant Uttarakhand
map, a compact right-hand intelligence stack), superseding Task 43's
settlement-drill-down "Officer Workspace" concept for this page — that
functionality (real layer controls, Settlement Intelligence panel, the
5-card status row) is not lost, it now lives on Map Intelligence and
the dedicated Risk/Decision/Destination/Relocation pages Task 43 built,
which this task did not touch and which remain reachable from the new
Overview.

**New: real weather (Open-Meteo).** The reference leaned heavily on
weather (map rain/cloud overlays, a forecast card, a floating current-
weather panel) and no weather integration existed anywhere in VIKALP.
Per explicit approval, added one new backend module —
`services/weather.py` (stdlib `urllib.request` only, no new pip
dependency; a `requests`/`httpx` client was never approved for this
project — see `tests/test_api_settlements_and_gis.py`'s own docstring),
`schemas/weather.py`, `api/weather.py` (`GET /api/weather/pilot`,
protected + audited exactly like every other router, new
`ACTION_VIEW_WEATHER`) — calling Open-Meteo for **Bhitai Malli's own
verified coordinates only**, cached in-process for 15 minutes. This is
never presented as a state-wide Uttarakhand forecast: a single point
cannot honestly represent weather across an entire state with wildly
different elevations, and VIKALP has no other settlement's coordinates
to sample. Every response discloses `"source": "Open-Meteo... not an
official IMD forecast"`. WMO weather codes are mapped to condition
labels via Open-Meteo's own public code table (`_WMO_CONDITIONS`), not
invented text. 9 new backend tests (`tests/test_weather.py`) mock the
one network-calling function (`_fetch_raw`) via `unittest.mock.patch`
— never a real network call in the suite — covering parsing, unknown-
code fallback, network-failure → `WeatherUnavailable` → 503, malformed-
response handling, and caching/force-refresh behavior.

**Honesty deltas vs. the reference mock (deliberate, not oversights):**
- Key Information card: `612 settlements / 11.9M population / 53,483
  km²` in the mock are entirely fabricated. The real card shows
  `Total Settlements`/`Total Population`/`Total Households` as real
  sums over `GET /api/settlements` (today: 1/383/86) and `Area` as
  "Not available" — no source for state area exists anywhere in VIKALP.
- No 3D/hillshaded terrain render: the only processed DEM
  (`data/processed/static/terrain/*_pauri_garhwal_clip.tif`) covers
  the Pauri Garhwal pilot clip only, not the whole state. Rendering a
  state-wide relief would mean fabricating terrain outside that
  coverage, so the map uses the same flat demo OSM basemap as every
  other VIKALP map, clearly labeled "Demo basemap — not an official
  GIS layer."
- Map markers: only Bhitai Malli (the one real settlement) and the
  real GSI/NLFC landslide inventory (which itself only covers Pauri
  Garhwal district) are shown — never invented dots for districts
  VIKALP has no settlement/hazard data for.
- Landslide evidence markers use the same muted, non-alarming color
  already established by Map Intelligence (Task 38) rather than the
  mock's red/orange — a marker shows evidence *exists*, never what it
  means about safety; this was already a deliberate, documented
  decision this task preserves rather than overrides.
- Assessment Status: Destination/Relocation read "Not available," not
  "Pending" — there is no candidate destination dataset at all yet, so
  there is nothing pending to compute (matches the task's own example).
- Key Evidence Summary's "N items need review" is the real count of
  risk dimensions with `score === null` (currently 5, all of them) —
  not a smaller curated number chosen to look tidier.

**State boundary rendering.** All 13 real Uttarakhand districts
(`GET /api/gis/boundaries`) are rendered with a uniform gold fill+line
style. A true single unified state outline (distinct from the internal
district lines) would need polygon-union math this project has no
library for and was not added; every district edge is styled the same
gold tone instead. District labels are placed at each polygon's
vertex-average ("approximate centroid" — not a true area-weighted
centroid, documented in code) using the real `shapeName` field, not an
invented location.

**District-naming reconciliation.** The boundaries dataset's own
`shapeName` for Pauri Garhwal is `"Garhwal"` (a real, pre-existing
naming variance confirmed since Task 12/33), while the settlements
table's `district` field is `"Pauri Garhwal"`. A lenient substring
match (`AppShell.tsx`'s `filteredSettlements`) reconciles the two real
datasets for District-filter → Settlement-list cascading. This was
caught as a real bug during implementation (the Settlement dropdown
became permanently disabled after selecting a district, since the
first version used a strict `===` match) and fixed by consolidating
the filtering into one place instead of duplicating it between the
filter bar and the map.

**Superseded/deleted (Task 43 → Task 44), confirmed zero remaining
references before removal:** `components/dashboard/MapLibreMap.tsx`
already removed in Task 43; this task removes
`components/layout/Sidebar.tsx`, `BottomIntelligencePanels.tsx`,
`components/dashboard/SettlementEvidencePanel.tsx`,
`RiskAnalysisCard.tsx`, `DecisionCard.tsx`, `DestinationCard.tsx`,
`RelocationPlannerCard.tsx`, `CopilotCard.tsx`, `VisualizationControls.tsx`,
`components/common/IntelligenceCard.tsx` — all were used only by
`AppShell.tsx`'s previous (Task 43) internals, which this task fully
rewrote. `AppShell.tsx` itself is kept (still the Overview's shell,
still renders the shared `Header`) rather than renamed, to avoid
touching `OverviewPage.tsx`.

**New files:** `components/overview/{OverviewCard,OverviewFilterBar,
StateMap,KeyInformationCard,WeatherForecastCard,AssessmentStatusCard,
KeyEvidenceSummaryCard,OverviewCopilotCard}.tsx`,
`utils/weatherIcon.ts`, `types/weather.ts`, `services/weather.ts`.

**A real bug found and fixed during implementation (not a data-honesty
issue — a stability one):** `StateMap.tsx`'s camera-focus effect
originally called `flyTo` back to the default Uttarakhand view
unconditionally on every render, including the two independent initial
data arrivals (settlements resolving, then boundaries resolving) —
redundant, self-interrupting animations that were never needed since
the map's own initial view is already that same center/zoom. Fixed by
only moving the camera when a district or settlement is actually
selected. Also fixed a minor listener leak (`map.on("load", setup)`
callbacks were never `off()`'d in each effect's cleanup).

**A verification limitation, disclosed rather than glossed over.**
Extensive live verification (Playwright, dev-only tool, not a project
dependency) confirmed: zero console/page errors across every route;
the filter bar's District→Settlement cascading, search, and Current
Selection pill all update correctly with real data; every card
navigates correctly (Copilot, "N items need review" → Risk Analysis);
refresh preserves session; the auth guard correctly redirects an
unauthenticated request; real network capture confirmed the frontend
receives correct boundary/settlement/landslide/weather data from the
backend. However, this session's headless-Chromium test browser
reached a state late in this task where MapLibre's `load`/`idle`
events stopped firing and canvas-level marker/boundary rendering could
not be visually confirmed via screenshot — and this was verified to
reproduce identically on Map Intelligence's own pre-existing,
completely unmodified map (untouched by this task), and even on a
minimal, app-independent MapLibre test page, ruling out a Task 44 code
defect. Restarting the dev server, clearing ~14 accumulated zombie
Chromium processes, and forcing software WebGL rendering were all
tried and did not resolve it — consistent with an accumulated
environment/GPU-driver artifact from this session's very large number
of automated browser launches, not something reproducible in a normal
browser session. **A manual check in an actual browser is recommended**
to confirm the map's visual layer rendering (gold settlement marker,
district boundaries, landslide points) before considering this fully
verified — every non-map-rendering piece of this task was verified
working directly.

**Tests**: backend 176/176 passing (167 existing + 9 new weather
tests, all network-mocked). `npx tsc -b` clean. `npm run build` clean
(pre-existing >500 kB chunk-size advisory only). No raw/processed GIS
data changed; no existing backend business-logic file (risk/hazard_
exposure/decision/destination/copilot/report) touched.

## Task 45 — Overview visual correction: map framing, terrain basemap, layout ratio

Follow-up to Task 44 after reviewing a live screenshot: the map read as
"OSM + a narrow sidebar" rather than a premium state-GIS view.
Backend, auth, weather, filter logic, and every other page were
explicitly out of scope — this was a presentation-only pass over
`StateMap.tsx` and `AppShell.tsx`, plus two project-wide additions
(Inter typography, `frontend/index.html` + `styles/index.css`).

**Basemap: Esri "World Terrain Base," not CARTO.** The plan was to
swap OSM's road-heavy raster tiles for CARTO's free `dark_nolabels`
tiles (same OSM/ODbL data, dark, label-free). A live request during
implementation showed CARTO's free tier now requires an API key — it
returned an "API KEY REQUIRED" watermark tile — so that was abandoned
*before* shipping. Switched instead to `server.arcgisonline.com`'s
public World Terrain Base tiles: free, keyless, real global elevation-
shaded relief (not a VIKALP-produced DEM render — VIKALP's own
processed DEM still only covers the Pauri Garhwal pilot clip, per Task
14/44). A dark `background` style layer plus a reduced `raster-opacity`
blends the naturally light terrain tiles toward VIKALP's near-black
palette while keeping the relief pattern visible. Map Intelligence and
Relocation Planner's own maps are untouched.

**Map fits the real Uttarakhand extent on load, not a fixed zoom
guess.** `StateMap.tsx` now computes the bbox of every real district
polygon (`GET /api/gis/boundaries`) once boundaries arrive and calls
`fitBounds` on it (skipped if the officer already picked a district/
settlement first) — replacing the old fixed
`UTTARAKHAND_CENTER`/`UTTARAKHAND_ZOOM` guess that left a lot of
Punjab/Nepal/Tibet in frame. The Reset control now fits to this same
real bbox instead of the old fixed guess.

**Map/sidebar ratio changed from a fixed 320px sidebar to a 68:32
flex-grow ratio** (`AppShell.tsx`), so the split holds proportionally
at both 1440×900 and 1920×1080 rather than being tuned for one width.

**Gold boundary glow + settlement halo/label are a styling technique,
not new data.** A blurred, wider gold line layer sits underneath the
existing crisp district-boundary line (same source, same real
polygons) to read as a glow. Likewise a blurred halo circle sits under
the settlement's circle marker, plus a real-name (`Bhitai Malli`)
symbol label — still exactly one real settlement, no invented markers.

**Inter typography added project-wide.** No `font-family` was ever
actually set despite it being specified since early tasks — `index.html`
now loads Inter (400/500/600/700) from Google Fonts and
`styles/index.css` sets it as `--font-sans`/`body`'s font-family.
Applies to every page, not just Overview, since it's a global default.

**Weather card restyled** to a labeled "Current Weather" header +
location + condition/temp row + humidity/wind row, matching the
target's layout more closely, still 100% real Open-Meteo data with the
same "Weather data unavailable" honest-failure path as Task 44.

**A verification limitation found during this task, more precisely
localized than Task 44's, and NOT resolved.** Extensive live testing
(TypeScript clean, production build clean, all 176 backend tests
passing, zero console/page errors across every route, filter
cascading/search/Current-Selection/navigation all confirmed working,
real network capture confirmed correct boundary/settlement/landslide/
weather data reaching the frontend) — but the gold district boundary,
settlement marker, and landslide points could not be visually
confirmed on the Overview's map via screenshot in this session, even
though the terrain basemap itself renders correctly. Unlike Task 44
(where the same symptom reproduced on completely untouched code, i.e.
a session-wide artifact), this time Map Intelligence's own map —
in the same browser session, same page — renders its equivalent
vector layers (boundary, settlement, landslide) perfectly. Sixteen
targeted diagnostic scripts ruled out, one at a time: shared/mutated
style-specification objects across React StrictMode's dev-only double
invoke of the map-creation effect (tested with a per-instance
`structuredClone`), `preserveDrawingBuffer`, the CARTO-vs-Esri basemap
choice, custom raster paint properties, the new initial-`fitBounds`
effect's timing, a container resize loop, cold-start/component-remount
timing (including a genuine unmount+remount via client-side
navigation), an artificial 800ms delay before map construction, being
the first WebGL context created in the browser process (tested by
forcing a throwaway context first), and CSS compositing hazards
(`transform`/`filter`/`contain`/`isolation`) anywhere in the canvas's
ancestor chain — none of these reproduced or fixed it. A hand-injected
circle layer, added directly via the browser console with no VIKALP
code involved, also never rendered on this specific map instance,
while raster tiles on the same canvas always did. This rules out a
logic bug in `StateMap.tsx` itself (the same layer-adding code renders
correctly whenever it *does* paint) and points to something instance-
or session-specific in this automated test browser rather than the
implementation — but it was not possible to pin down a root cause
within reasonable effort, so it is disclosed rather than declared
fixed. **A manual check in an actual browser is required** to confirm
the boundary/settlement/landslide layers actually render before this
piece is considered done; if it turns out to be reproducible in a real
browser too, that would mean the diagnostic effort here missed the
real cause and it needs a fresh look, not a repeat of the same tests.

**Tests**: `npx tsc --noEmit` clean. `npm run build` clean (same
pre-existing chunk-size advisory). Backend untouched — not re-run
beyond the pre-existing 176/176 pass confirmed earlier in this task
(no backend file was edited). No raw data changed.

## Task 45.6 — fix "Map data not yet available" at high zoom

**Correction of a premise in the brief:** the brief refers to "the 3D
terrain implementation from Task 45.5" (`raster-dem` → `map.setTerrain()`
→ pitch-able 3D relief). No such feature exists anywhere in this
codebase — confirmed by grep (`raster-dem`, `setTerrain` — zero
matches) and by `data/processed/static/terrain/` containing only the
original two GeoTIFFs (`cartodem_v3r1_h44g_pauri_garhwal_clip.tif`,
`slope_degrees_pauri_garhwal_clip.tif`), no generated tile pyramid.
What exists is Task 45's Esri **World Terrain Base** — a flat 2D raster
*image* basemap that happens to depict elevation-shaded relief; it is
not pitch-able terrain and has no `setTerrain()` call. This doc uses
"terrain basemap imagery," never "3D terrain," to keep that honest.
The "Map data not yet available" symptom itself is real, and is
exactly what Task 45's own diagnostics surfaced but left unfixed (see
that section's `t45-diag8`/`diag9` scripts) — this task fixes it.

**Root cause, verified not guessed.** Task 45 set the Esri source's
`maxzoom: 13` without checking whether real tiles exist at that zoom
for this region — exactly the mistake §6/§10 of this task's own brief
warns against. Direct `curl` requests to
`server.arcgisonline.com/ArcGIS/rest/services/World_Terrain_Base/MapServer/tile/{z}/{y}/{x}`
at Bhitai Malli's own tile coordinates (and every immediate neighbor,
at each zoom 6-13) show: z6-z9 each return a distinct, real ~18-31 KB
terrain image; z10 through z13, at every tile tested, return the
*exact same* 2521-byte file — the literal "Map data not yet available"
placeholder, served with HTTP 200 (so MapLibre has no way to detect it
as an error; there is no 404 to catch). z9 is the real, verified
ceiling for this region.

**Fix: `maxzoom: 9`, not a workaround.** Capping the source's declared
`maxzoom` to the verified real value (`frontend/src/components/overview/StateMap.tsx`)
means MapLibre never requests z10+ tiles at all — it automatically
"overzooms" instead, stretching the last real z9 tile to fill the
view. This is standard, built-in raster-source behavior, not custom
code. The map interaction itself is completely unrestricted — the
officer can still zoom via `+`/scroll/pinch as far as they like; only
the *source's* stated data ceiling changed to match reality. This is
different in kind from "lowering maxZoom to hide the bug" (which the
brief explicitly forbids): it is a true fact about tile availability,
required for correct overzoom behavior, verified by direct HTTP
requests rather than assumed.

**A small, honest, non-blocking notice for extreme overzoom.**
Stretching a single 256×256 tile across many zoom levels eventually
produces a visually flat, low-detail patch — not broken, not fake data,
but potentially confusing without explanation. `StateMap.tsx` now
tracks the map's own zoom via a `"zoom"` event and shows "Basemap
imagery shown at reduced detail beyond zoom 9" (bottom-center, next to
the existing "Demo basemap" disclaimer) once the view zoom exceeds
`BASEMAP_REAL_MAXZOOM + 2` — i.e. it appears starting around the
existing Bhitai Malli settlement-focus zoom (12) onward. It never
blocks the map or any other layer.

**Verified via live zoom testing (Playwright, dev-only), not just
"the page loads":** initial Uttarakhand overview; zooming 1-2 levels;
selecting the Garhwal district (fits to the real district bbox);
selecting Bhitai Malli (flies to zoom 12); zooming 5 more levels
beyond that; and Reset — at every step, zero console/page errors, zero
non-200 responses from `arcgisonline.com`, and critically: **no
"Map data not yet available" text ever appeared again**, at any zoom
level tested. The basemap, boundaries legend, weather card, filter
bar, and right-hand cards all remained visible and functional
throughout every test.

**What this task did NOT fix (pre-existing, disclosed in Task 45,
unchanged here):** the gold district-boundary line, the settlement
marker/halo/label, and the landslide points still could not be
visually confirmed rendering on this map in this automated test
session — the same vector-layer rendering issue Task 45 diagnosed
exhaustively (16 scripts) without finding a code-level root cause.
Task 45.6 did not touch any of the vector-layer code (`Effect 2/3/4`
in `StateMap.tsx`) and did not re-attempt that diagnosis — it is a
separate, already-disclosed limitation, not something this task
claims to have resolved. A manual browser check remains recommended
for both this and the Task 45 limitation.

**Terrain/basemap facts for future reference (per this task's own
§22):** real terrain-relief basemap imagery covers zoom 0-9 globally
via Esri's public World Terrain Base service (verified for the
Uttarakhand/Himalayan region specifically); VIKALP's own CartoDEM-
derived elevation data (`data/processed/static/terrain/cartodem_v3r1_h44g_pauri_garhwal_clip.tif`)
covers only the Pauri Garhwal pilot clip and is not currently served
as map tiles at all (no tile-generation pipeline exists) — it is used
only for the Evidence panel's elevation/slope figures (Map
Intelligence, Task 14). No page in VIKALP currently has real,
pitch-able 3D terrain; if that is wanted, it is new work (DEM → tile
pyramid generation → `raster-dem` source → `map.setTerrain()`), not a
fix to something already built.

**Tests**: `npx tsc --noEmit` clean. `npm run build` clean (same
pre-existing chunk-size advisory). Backend untouched (no backend file
touched by this task) — 176/176 still passing. No raw data changed.

## Task 45.6 — global UI foundation: officer-workflow navigation + shared selection

Scoped exactly as directed: navigation/labeling and a shared selection
state only — no individual page redesign, no business-logic change,
no visual-system change (the existing near-black/gold/Inter system
from Tasks 42/45 already matched the brief; nothing to do there).

**Navigation relabeled to the officer workflow, page-ids unchanged.**
`data/navigation.ts`'s `primaryNavItems` now reads Overview / Settlement
/ Evidence / Risk / Decision / Destination & Relocation / Reports —
matching the officer's actual workflow term-for-term instead of Task
32's function-literal labels ("Map Intelligence", "Decision Workspace",
etc.). The underlying `PageId`s (`map-intelligence`, `data-governance`,
`risk-analysis`, `decision-workspace`, `destination-explorer`) are
deliberately **unchanged** — renaming them would ripple through every
`onNavigate(...)` call site across the app for zero user-facing
benefit; only the label the officer sees changed. "Overview" is now
also a `primaryNavItems` tab (Task 32 had deliberately left it logo-
only) — both the tab and the logo click work, not a contradiction.
"AI Copilot" was removed from primary nav — it was already reachable
contextually (Overview's Ask Copilot card, Evidence Locker's toolbar)
and Task 45.6 explicitly calls for it to stay that way, matching Task
41/44's own original reasoning more consistently than the nav bar
previously did.

**Destination Explorer + Relocation Planner merged into one primary
tab** ("Destination & Relocation", routing to `destination-explorer`).
`relocation-planner` keeps its own page/route (nothing deleted) but
loses its own top-level tab; `NavTabs.tsx` aliases its active-state to
the Destination & Relocation tab so it still reads as "current" while
on that page. `RelocationPlannerPage` already linked back to
`destination-explorer` (Task 43) but `DestinationExplorerPage` had no
matching forward link — added a "View Relocation Plan →" button next
to the existing "View Map Intelligence →" one, same established
pattern, so the merged workflow step doesn't strand the officer.

**Shared selection state** (`state/selectionContext.tsx`, new):
`selectedDistrict`/`selectedSettlementId` moved out of `AppShell.tsx`'s
local `useState` into a `SelectionProvider` wrapping `PageRouter` in
`App.tsx`, so a settlement picked on Overview persists when navigating
to any other page. The six pages that previously hardcoded
`const BHITAI_MALLI_ID = 1` (Risk Analysis, Decision Workspace,
Destination Explorer, Relocation Planner, Map Intelligence, Evidence
Locker) now read `useSelection().selectedSettlementId`, falling back
to that same constant only when nothing has been explicitly selected
yet — a one-line-per-file mechanical substitution, not a page
redesign; each page's layout, fetch logic, and business rules are
otherwise untouched. With exactly one real settlement in the pilot
dataset this has no observable effect *yet* (the fallback always
resolves to Bhitai Malli today) — it exists so the behavior is already
correct once more settlements are added, rather than needing a second
pass through all six pages later.

**Genuine orphan removed.** `pages/SettlementsPage.tsx` (a bare
`PlaceholderPage`, `PageId` `"settlements"`) had zero references
anywhere outside routing plumbing (`PageRouter.tsx`, `useHashRoute.ts`,
`types/navigation.ts`) — confirmed by grep before deleting, per this
task's own "search all references, only delete genuine duplicates/
orphans" rule. Removed along with its three routing-plumbing
references; no functionality was lost since none existed.

**Test updated, not skipped.** `backend/tests/test_navigation_labels.py`
(Task 33) asserted the *old* labels and that "Overview" must NOT be a
`primaryNavItems` tab — both deliberately reversed by this task. Updated
in the same commit to assert the new intentional state (new required
labels; old labels now in the "must not reappear" list; a new
assertion that Overview *is* a tab, alongside the still-true assertion
that the logo click also works) rather than left red or deleted.

**Deliberately not done, per this task's own explicit scope limits:**
individual page layout ("map principle" — one dominant visual purpose
per page, less card-collection-style layout) was NOT applied to any
page; `RelocationPlannerPage`'s `StepTracker` still hard-codes
"✓ Bhitai Malli" as its Step 1 label (a cosmetic rough edge, surfaced
by adding shared selection, but fixing it means touching that page's
content — out of scope here, noted for whichever task next redesigns
Relocation Planner).

**Tests**: backend 177/177 passing (176 existing + 1 net-new method in
the updated navigation-labels test). `npx tsc --noEmit` clean.
`npm run build` clean. Live-verified: new nav labels render and
highlight correctly; Destination & Relocation stays active on both
underlying pages; the new cross-link works; Copilot has no primary tab
but remains reachable from Overview's card; a settlement picked via
Overview's dropdown correctly carries through to Risk Analysis (via
the shared context) without a page-content change. No raw data
changed; no risk/hazard/destination/weather/auth/audit/report backend
file touched.

## Task 45.7 — the real root cause of the missing map layers, and the Overview redesign

**The root cause, finally found: `vite.config.ts`, not `StateMap.tsx`.**
Every prior session (Task 45, Task 45.6) exhaustively bisected
`StateMap.tsx`'s own code against Map Intelligence's working map —
style objects, effect timing, layer ordering, paint properties,
library version, CSS ancestor chain, WebGL context health — and found
nothing, because there was nothing to find there. The actual cause:
Vite's dev-server dependency pre-bundler rewrites `maplibre-gl` into
`node_modules/.vite/deps/`, and that rewrite breaks the package's own
internal `new URL("./maplibre-gl-worker.mjs", import.meta.url)`
reference — confirmed by direct network capture: requesting
`/node_modules/.vite/deps/maplibre-gl-worker.mjs` returns a 404, on
every page, every time, throughout this entire project's history.
Without a working worker, MapLibre never tessellates GeoJSON sources
into vertex buffers, so every circle/line/fill/symbol layer silently
renders zero features — while raster tiles (simple decoded images,
tessellation not required) always rendered fine, which is exactly the
pattern disclosed (and misdiagnosed as environmental) in both prior
tasks. Fixed with the standard remedy for this class of Vite bug:
`optimizeDeps: { exclude: ['maplibre-gl'] }`, so Vite serves the
package's real ESM build as-is instead of relocating it — confirmed
via network capture that the worker now loads with a real 200 from
its true `node_modules/maplibre-gl/dist/` path. `node_modules/.vite`
was also cleared once to drop the stale broken cache entry.

**Why Map Intelligence's map seemed to "work" throughout this — it
didn't, reliably.** Both maps were built against the exact same broken
dependency; Map Intelligence's rendering was inconsistent/fragile
rather than genuinely sound (worth noting for anyone who reads the
Task 45 disclosure and wonders why the "working" comparison map now
also renders its settlement *label* — a symbol layer — more crisply
than before). This was not diagnosed further since the fix resolves it
for every map in the app, not just Overview's.

**How this was actually found**, for anyone facing something similar:
a from-scratch minimal component (bare map + one circle layer, no
other VIKALP code at all) still failed when mounted inside the app,
which ruled out `StateMap.tsx` entirely; a *completely unbundled*
standalone HTML page loading the identical `maplibre-gl` build directly
(no Vite/React involved) rendered the same circle perfectly on the
first try — the one clean signal that pointed at the bundler rather
than the application code. `page.on("requestfailed")` network capture
during that comparison surfaced the 404 immediately once looked for
directly (it had been visible in earlier console logs all along, just
never treated as the actual lead).

**Overview redesigned as the state-level entry point (§2-11 of this
task's brief), on top of the now-working map:**

- **Basemap swapped again**: Esri's grayscale "World Terrain Base"
  (Task 45) replaced with Esri's "World Physical Map" — a real, free,
  keyless *natural-color* relief basemap (green/olive lowlands, brown
  mid-elevation terrain, white snow peaks, visible blue water),
  matching this task's explicit "the geographic map itself should not
  be black/gold, it should look natural" instruction. Verified real
  tile coverage for this region tops out at zoom 8 (one level lower
  than World Terrain Base's verified zoom 9) — the same direct-request
  verification technique as Task 45.6, not a guess. `raster-opacity`
  raised from 0.55 to 0.92 and the heavy contrast/saturation reduction
  removed, since a natural-color source no longer needs muting toward
  the dark app chrome the way the old grayscale one did.
- **Map/sidebar ratio raised from ~68/32 to ~75/25** (`flex-[75]`/
  `flex-[25]`), landing in this task's explicit 70-80% target — "the
  map is the product."
- **`fitBounds` padding raised from 32-40px to 56px** (initial fit,
  Reset button, `resetView()`) for a touch more breathing room around
  the state edge.
- **Weather relabeled "Pilot Location Weather"** everywhere it
  appears (the sidebar card's title and the floating map card's
  title) — was "Weather Forecast"/"Current Weather," which didn't
  itself disclose the single-point scope the way this task's own
  example phrasing ("Pilot location weather") asks for; the location
  line underneath (already present since Task 44) is now reinforced
  by the title itself.
- **Confirmed already compliant, no change needed**: the initial view
  already fits the real Uttarakhand district bbox, not Bhitai Malli
  (Task 45); the settlement dropdown is already fully data-driven from
  `GET /api/settlements`, never hardcoded to just Bhitai Malli (Task
  44); the right-hand stack is already the compact Key Information /
  Weather / Assessment Status / Key Evidence / Copilot set with
  Copilot already the smallest, least prominent entry (Task 44/45.6);
  data-honesty states (Not available / Pending / Assessment pending)
  were already used throughout; the camera-focus effect already only
  moves on an actual district/settlement selection, never on routine
  data arrival (Task 44's own fix, confirmed still in place); event
  listeners are added exactly once per layer (inside the same
  `if (!map.getLayer(...))` guard that prevents duplicate `addLayer`
  calls), so there is no accumulation to clean up beyond what Effect
  1's unmount cleanup already handles.
- **Minor cleanup, not a functional change**: removed a redundant
  extra wrapper `<div>` around `StateMap`'s single child (harmless,
  found while bisecting, left removed since `IntelligenceMap.tsx`
  never had it either) and a `structuredClone()` call that turned out
  to be unrelated to the real bug (kept removed — matches
  `IntelligenceMap.tsx`'s equivalent line, one less unexplained
  difference between the two files for the next person to wonder
  about).

**Tests**: backend 177/177 passing (no backend file touched by this
task). `npx tsc --noEmit` clean. `npm run build` clean (same
pre-existing chunk-size advisory). Live-verified on the real dev
server (not just Playwright's earlier, less conclusive runs): district
boundaries, district labels, the settlement marker + label, and
scattered landslide evidence markers all render correctly at both the
state overview zoom and the Bhitai Malli settlement-focus zoom;
district/settlement selection, search, Current Selection, and Reset
all still work; zero console errors throughout.

## Task — Historical Replay mode (Risk workspace) — audited, shipped disabled

**Brief**: add a Historical Replay mode to the existing Risk workspace
so officers could review VERIFIED historical event evidence
retrospectively — explicitly *not* a live/current assessment, a
forecast, or a claim that VIKALP predicted a past event. The brief was
equally explicit about the other branch: if no verified event-specific
historical data actually exists in the repo, ship a disabled/
unavailable state instead of a synthetic demo — inventing an event
name, date, rainfall, casualty count, or outcome was called out as the
one thing not to do under any circumstance.

**Audit before writing any UI** (backend risk service/schemas, the
GSI/NLFC landslide GeoJSON's actual field values, and the Task
24/24A/24B history in this file):

- `backend/app/services/risk.py`'s "Historical Disaster Evidence"
  dimension (15% weight) has been a permanent `status: "no_data"`
  stub since Task 24 — `available_inputs={}`,
  `missing_inputs=["past_incident_count", "past_incident_severity",
  "most_recent_incident_recency"]`. Confirmed still true; covered by
  `backend/tests/test_api_risk_regression.py::
  test_historical_and_vulnerability_have_no_data_at_all`.
- The only hazard dataset integrated anywhere in VIKALP —
  `gsi_nlfc_field_validated_landslides_pauri_garhwal.geojson`, 813
  records — is a landslide *location* inventory, not an event archive.
  Directly inspected the field values: casualty/damage fields
  (`peopledead`, `peopleinju`, `housesbuil`, `infrastruc`,
  `othersaffe`, livestock fields) are **0% populated across all 813
  records**. The closest thing to a date, `initiati_1` ("initiation
  year"), is populated for only 156/813 (19.2%) and was already
  classified "probable, not confirmed" back in Task 24B (unresolved
  whether it means slide date or survey/mapping date).
- No named/dated real event (e.g. a specific landslide or flood with
  an actual date and impact record) exists anywhere in the repository
  — not in backend data, the database, any API response, or any
  frontend data file. Two candidate external sources (USDMA Hotspot/
  DDMA reports; Bhuvan's event inventory) were identified in Task 24
  but explicitly never acquired, and this task's brief prohibited
  sourcing new external data to fill that gap.

**Conclusion**: verified event-specific historical data does not
exist. Per the brief's own §13, the correct implementation is a
polished disabled/unavailable Historical Replay state, not a fake
demo — so that is what was built. None of the brief's "if data
exists" requirements (archival banner, map watermark, event metadata,
timeline, evidence cards with source/date/limitation fields, neutral
Protect/Adapt/Relocate pathways) apply, since their shared
precondition — verified event data — is false; building any of them
now would mean fabricating the very thing the brief forbids.

**Implementation**:
- `frontend/src/components/risk/HistoricalReplayPanel.tsx` (new) — the
  disabled state: a "Historical Replay" badge + "Archived evidence
  view" label, "Historical Replay unavailable" heading, the exact
  required sentence ("Historical replay unavailable — verified
  event-specific data has not been integrated."), the two required
  §13 sentences, and one short factual "why" note (the GSI inventory
  is a location dataset with 0% casualty/damage coverage and an
  unconfirmed date field) — no invented event, date, or number
  anywhere in the component.
- `frontend/src/pages/RiskAnalysisPage.tsx` — added a `mode` state
  (`"current" | "historical"`, default `"current"`) and a compact
  `RiskModeSwitch` two-button toggle rendered above the existing
  content. Existing Current Assessment fetch/render logic is
  completely untouched — selecting Historical Replay just conditions
  the existing branches on `mode === "current"` and renders
  `<HistoricalReplayPanel />` instead; switching back re-shows
  whatever Current Assessment state was already loaded, no re-fetch,
  no data loss.
- No map changes: the Risk workspace has never had a map (it's a card
  list, not a MapLibre page — `StateMap`/`IntelligenceMap` live on
  Overview/Map Intelligence only), and since there is no verified
  event to show, there is nothing for a map/banner/watermark to
  display. Adding empty map chrome for a disabled state was judged
  unnecessary UI weight, not a scope gap.
- No backend changes: the "Historical Disaster Evidence" dimension,
  its data model, and its governance status are all unchanged from
  Task 24B.

**Tests**: backend 177/177 passing (no backend file touched).
`npx tsc -b` clean. `npm run build` clean (same pre-existing
chunk-size advisory as every prior task). Live-verified on the real
dev server: mode switch visible under the nav bar, "Current
Assessment" selected by default with all 5 dimension cards rendering
exactly as before; clicking "Historical Replay" swaps in the panel
with the exact required text (verified verbatim) and no current-
assessment content left mixed in; clicking back restores the same
Current Assessment state with no re-fetch error or blank state; zero
console errors throughout the whole flow.

**Limitations**: if a genuinely verified, event-specific historical
dataset (real event name/date/location/impact records, properly
sourced) is integrated in the future, this disabled state should be
replaced with the full active-state UI the original brief describes
(banner, watermark, event metadata, timeline, evidence cards,
neutral officer pathways) — none of that was built now because there
is nothing real yet to populate it with.

## Task — integrate the supplied React-Leaflet AdvancedMap into Overview

**Brief**: the user explicitly approved a supplied `AdvancedMap` demo
component (React-Leaflet: MapContainer/TileLayer/Marker/Popup/Circle/
Polygon/Polyline/MarkerClusterGroup, London/Westminster/Hyde Park demo
data, Nominatim search, a "Locate Me"/"Satellite"/"Traffic" control
panel, default marker icons loaded from an external CDN) as the new
Overview map, as an intentional, scoped exception to the MapLibre-only
architecture every other page keeps (Map Intelligence, Relocation —
untouched, still MapLibre, including the Task 45.7 worker-bundling
fix). The brief was explicit that none of the demo configuration
should reach VIKALP, and that the smallest safe integration path
should be found only after inspecting what already exists.

**Inspection before writing any code**: read the existing
`StateMap.tsx` (MapLibre, Task 45.7's natural-color Esri
World_Physical_Map basemap verified real to zoom 8, district/
settlement/landslide GeoJSON sources, `StateMapHandle` ref API),
`AppShell.tsx` (the only caller — passes boundaries/settlements/
landslides/weather/selection props, forwards a ref that turned out to
be currently unused by any button outside StateMap itself),
`OverviewFilterBar.tsx` (State/District/Settlement/Search already
data-driven off the real datasets, a real "Search settlement" input
already exists — nothing to replace with Nominatim),
`selectionContext.tsx` (plain district/settlement id state, consumed
by AppShell only — StateMap never called `useSelection` itself, props
only), `types/gis.ts` and `types/settlement.ts` (real field shapes:
boundaries carry `shapeName`/`shapeID` + Polygon/MultiPolygon geometry,
landslides carry only `slide_no`/`activity`/`triggering`/`toposheet` —
backend/app/services/gis.py deliberately exposes only those four of
the raw ~100-column GSI inventory), and `package.json` (no leaflet/
react-leaflet/shadcn present; this is a plain Vite+React+TS+Tailwind
project, not a shadcn one — the generic "copy to /components/ui,
install shadcn CLI" instructions that came bundled with the supplied
component's brief don't apply here and were not followed for that
reason).

**Dependencies**: `leaflet`, `react-leaflet` (5.0.0, verified to
require React ^19.0.0 before installing — matches this project's React
19.2), `react-leaflet-cluster` (verified peer deps also require React
19 + react-leaflet ^5.0.0) added to `dependencies`; `@types/leaflet`
and `@types/leaflet.markercluster` added to `devDependencies` (the
latter only augments the `leaflet` module's ambient types — see the
tsconfig note below). `npm audit`: 0 vulnerabilities. No other mapping
library touched or added.

**What was deliberately NOT carried over from the supplied component**
(see `overview/leaflet/AdvancedMap.tsx`'s own module comment for the
full version):
- No external marker-icon CDN (`L.Icon.Default.mergeOptions(...)`
  pointing at cdn.21st.dev in the supplied file, which would also be
  an unapproved external frontend dependency at runtime). Every marker
  is a small inline `L.divIcon` built from plain CSS — gold for
  settlements, restrained rust-orange for GSI evidence, no images.
- No Nominatim `SearchControl` — VIKALP already has real settlement
  search (`OverviewFilterBar`'s "Search settlement" field), so this
  component has no `enableSearch` prop at all; there's nothing for it
  to enable, and no external geocoding call exists anywhere in the
  new code.
- No "Locate Me"/"Satellite"/"Traffic" `CustomControls` — none of the
  three has a genuine VIKALP data source. Zoom/reset/fullscreen/layer-
  visibility controls exist instead, rendered by `StateMap.tsx` (not
  `AdvancedMap.tsx`) using the ref handle described below, styled with
  VIKALP's own dark/gold button chrome instead of Leaflet's default
  white control box.
- No `circles`/`polylines` props — VIKALP has no verified circular
  buffer zone or route/road dataset; keeping empty-but-present props
  for API parity was judged worse than just not having them (avoids
  ever looking like a real prop something forgot to populate).
- The supplied `markers` prop is split into `markers` (unclustered —
  settlement points, which must stay individually selectable even
  amid 800+ evidence points) and `clusteredMarkers` (GSI evidence,
  clustered when `enableClustering` is true) — a single shared array
  would either bury the one selectable settlement marker inside a
  cluster bubble or leave 800+ evidence points permanently
  unclustered; both are worse than the split.

**What was added, not in the supplied component**: a `forwardRef`
imperative handle (`resetView`/`zoomIn`/`zoomOut`/`fitToBounds`/
`flyToPoint`) — the demo had no ref API at all, but VIKALP's officer-
driven navigation (district/settlement selection flying the camera,
external zoom/reset buttons) needs one, exactly as the MapLibre
version's own `StateMapHandle` did.

**TileLayer**: same Esri World_Physical_Map source already verified
real to zoom 8 for MapLibre's Overview basemap (Task 45.7) — not
OpenStreetMap road tiles (reads as a street map, not "natural
geographic" per this brief's own palette section) and not a
fabricated satellite layer. `maxNativeZoom={8}`/`maxZoom={16}`
reproduces the same "real imagery to z8, then Leaflet's own tile
upscaling instead of a blank/placeholder request" behavior the
MapLibre version achieved via `maxzoom` capping.

**Files created**: `frontend/src/components/overview/leaflet/
AdvancedMap.tsx` (the adapted component), `.../leaflet/
advancedMap.css` (scoped popup/tooltip/marker/cluster/attribution
style overrides — Leaflet renders these into its own DOM panes outside
React's tree using hardcoded class names, so global-looking selectors
here are unavoidable, but every one is scoped to `leaflet-`/`vikalp-`
prefixed classes only).

**Files modified**: `frontend/src/components/overview/StateMap.tsx`
(same exported name/prop interface/`StateMapHandle` as the MapLibre
version — internals rewritten to convert real boundaries/settlements/
landslides into `AdvancedMap` props and own the weather card/legend/
control stack/reduced-detail notice, exactly as before) — **zero
changes needed to `AppShell.tsx`**, the only caller, since the
external contract didn't change. `frontend/src/types/gis.ts` (see
below — the one shared-file change, type-only). `frontend/
tsconfig.app.json` (see below — build-config-only).
`package.json`/`package-lock.json` (the four new dependencies).
Nothing in Evidence/Risk/Decision/Destination & Relocation/Reports/
Copilot/auth/RBAC/backend/raw data/global navigation/SelectionContext
was touched. Map Intelligence and Relocation's own MapLibre
implementations were not modified.

**Unexpected build-breaking side effect, root-caused and fixed
minimally**: after installing the new dependencies, `tsc -b` started
failing on `IntelligenceMap.tsx` — a file this task must not touch —
with `ApiBoundaryFeatureCollection`/`ApiLandslideFeatureCollection`
suddenly not assignable to MapLibre's `GeoJSONSourceSpecification`
data type. Root cause: `types/gis.ts`'s `geometry` field was typed as
a loose `{ type: string; coordinates: unknown }`, which had always
been technically wrong (a real GeoJSON `Geometry` is a discriminated
union on a literal `type`, not `string`) but was silently accepted
before because the global ambient `GeoJSON` namespace (from
`@types/geojson`, itself a transitive dependency of `maplibre-gl`)
was never actually activated in this program — nothing had triggered
its inclusion. Installing `@types/leaflet` pulled in a real `import`
of the `geojson` module somewhere in its own type chain, which
activated that ambient namespace project-wide for the first time,
turning `GeoJSON.GeoJSON` from an unresolved (effectively `any`)
reference into its real, strict type everywhere — including inside
`maplibre-gl`'s own `.d.ts`, which is what `IntelligenceMap.tsx`
depends on. Confirmed by direct inspection of the real source files
(`geoBoundaries-IND-ADM2_simplified.geojson` uses only Polygon/
MultiPolygon; the GSI landslide inventory uses only Point) — fixed by
tightening `types/gis.ts`'s two geometry fields to
`GeoJSON.Polygon | GeoJSON.MultiPolygon` and `GeoJSON.Point`
respectively: a type-only correction (zero runtime behavior change
anywhere), and it fixed `IntelligenceMap.tsx`'s compile error without
touching that file at all, exactly as this task requires. Separately,
`react-leaflet-cluster`'s own types reference `L.MarkerCluster` from
`@types/leaflet.markercluster`, which — being an augmentation-only
package nothing explicitly imports — needed adding to
`tsconfig.app.json`'s `"types"` array to actually activate (the
standard, documented mechanism for this exact situation); this is a
build-config-only change, not a Map Intelligence code change, and
Task 18's "don't touch MapLibre implementation on other pages" was
respected — no other file's logic changed.

**Data connected — all real**: district boundaries (13 real
Uttarakhand districts, Polygon/MultiPolygon geometry, muted by
default, gold when selected via the existing District filter, exact
`shapeName` match since `selectedDistrict` is always drawn from this
same dataset's own shapeName list); district name labels (permanent
Leaflet tooltips, auto-centered on each polygon's real bounds); real
settlements (data-driven off `GET /api/settlements`, gold marker +
permanent name label when selected, muted otherwise — not hardcoded
to Bhitai Malli, works for however many real settlements exist);
real GSI/NLFC landslide inventory evidence (clustered, popup titled
"GSI Inventory Evidence" showing only the four real backend fields —
slide no/activity/triggering/toposheet, each falling back to "Not
available" individually rather than omitting the whole record —
explicitly disclaimed "Contextual evidence, not an assessed risk
zone," never called a risk/danger/predicted-landslide indicator); real
Bhitai Malli weather (unchanged backend/API, card still titled "Pilot
Location Weather," never implied statewide).

**Controls kept vs. dropped, and why**: zoom in/out, reset view (fits
the real Uttarakhand bbox once boundaries load, exactly like the
MapLibre version), fullscreen, and a new GSI evidence layer-visibility
toggle — all rendered by `StateMap.tsx` itself (not inside
`AdvancedMap.tsx`), calling the ref handle, styled with VIKALP's dark/
gold chrome instead of Leaflet's default white box. "Locate Me,"
"Satellite," and "Traffic" were not added — no genuine VIKALP
requirement or verified data source for any of the three (brief's own
§10). Leaflet's own default zoom control is disabled
(`zoomControl={false}`) to avoid a duplicate, unstyled control sitting
next to VIKALP's own.

**z-index defect found and fixed during browser verification**: the
first live-verification pass (Playwright, real mouse-simulated clicks
with hit-testing enabled, not a JS-evaluate bypass) found that after
certain pan/zoom sequences (e.g. flying to a selected settlement, then
zooming further), a district boundary's Leaflet SVG path could end up
receiving pointer events over the floating control buttons — none of
`StateMap.tsx`'s absolute-positioned overlay divs (control stack,
legend, weather card, bottom disclaimers, rain glyph) had an explicit
`z-index`, while Leaflet's own control container uses `z-index: 1000`
and its interactive panes go up to 700. Fixed by adding `z-1200` to
every one of those overlay divs. Re-verified with the exact same
reproduction sequence (select Bhitai Malli → deep zoom → real
Playwright `.click()` on Zoom in/Reset view/GSI toggle): zero pointer-
interception errors, all three controls worked correctly.

**Tests**: backend 177/177 passing (no backend file touched).
`npx tsc -b` clean (full clean rebuild, not just incremental).
`npm run build` clean (same pre-existing >500kB chunk-size advisory;
bundle grew from ~1.38MB to ~1.57MB gzip 372KB→428KB from the new
map library — expected, no unrelated regression). `npm run lint`: the
only warnings are pre-existing ones in files this task didn't touch
(`selectionContext.tsx`, `MapIntelligencePage.tsx`,
`AICopilotPage.tsx`, `AppShell.tsx`, `ReportsPage.tsx`,
`RelocationPlannerPage.tsx`) — zero new warnings from any file this
task added or modified.

**Browser verification** (Playwright, two passes — a full 22-item
checklist pass, then a targeted real-click re-verification after the
z-index fix): Uttarakhand map loads with real tiles; 13 district
boundary polygons + 13 district labels render; Bhitai Malli's gold
marker renders with the exact popup text specified (name/district+
state/population/households); GSI evidence renders as 4 cluster
bubbles at the default zoom, breaking into individual dots on zoom-in,
with the exact popup fields specified; District/Settlement filters and
Search all work and correctly re-style the map / update the "Current
Selection" pill; the map camera flies to a selected settlement; zoom/
reset/GSI-toggle controls all work via real mouse clicks in every
tested map state; the legend and weather card render with the exact
required text; the right intelligence panel is unaffected; zero blank-
map moments; zero console/page errors across either pass; exactly one
`.leaflet-container` in the DOM at all times; no "London"/
"Westminster"/"Hyde Park"/lorem-ipsum or other placeholder text found
anywhere on the page in either state tested.

**Limitations**: the pilot dataset currently has exactly one real
settlement (Bhitai Malli), so the Search field's "narrow a long list"
behavior could only be proven correct via a guaranteed-zero-match
query rather than observed narrowing a multi-result list — the filter
logic itself is unchanged from before this task and was not
re-implemented. The production JS bundle grew by ~190KB gzipped
(leaflet + react-leaflet + react-leaflet-cluster + leaflet.markercluster);
this task's brief did not ask for code-splitting and none was added,
consistent with "no new unrelated features."

## Task — Historical Replay across Evidence, Risk, and Destination & Relocation

**Brief**: redesign the Evidence, Risk, and Destination & Relocation
workspaces around a "Historical Replay" mode demonstrating how VIKALP
could organize available evidence for officer review "if it had been
available during a past event" — explicitly forbidding any claim that
VIKALP predicted, warned of, or would have prevented an event, or that
it would definitely have relocated a settlement. The brief required
auditing all verified historical data first, and building the UI
around only what genuinely exists — with an explicit instruction that
if no historical data exists for a category, the UI must show it as
unavailable rather than invent it.

**Audit before writing any code** (extending the audit already done
for the prior single-page Historical Replay task on Risk, this time
also covering rainfall, terrain provenance, infrastructure/access,
population/settlement vintage, destination governance, and carrying
capacity):
- **Rainfall**: no historical or date-specific rainfall dataset exists
  anywhere. `backend/app/services/weather.py` only calls Open-Meteo for
  current conditions + a 3-day forecast; `docs/DATA_INVENTORY.md`
  §7.4 lists IMD gridded historical rainfall as a candidate source,
  never acquired.
- **Terrain**: CartoDEM v3 R1 (NRSC/ISRO), Cartosat-1 imagery from
  2005–2014 — real, but never asserted anywhere as historically dated
  to any event; used here as time-invariant physical/spatial
  reference, explicitly labeled as such, not as "historical-period
  state."
- **Infrastructure/access/roads**: confirmed zero data of any kind,
  current or historical — `docs/DATA_INVENTORY.md`'s Evidence
  Readiness Matrix and `RelocationMap.tsx`'s own code comment both
  independently confirm this ("Roads | None"; "no route or distance
  data source exists in the current architecture").
- **Population/settlement**: Bhitai Malli's population (383) and
  households (86) are an uncited current demo planning input
  (`backend/app/database.py`, `docs/DATA_INVENTORY.md` §1.1 — "No
  cited external survey, census, or government dataset backs this
  row") — not tied to any census year or historical date.
- **Destination candidates / carrying capacity**: confirmed still
  "NOT IMPLEMENTATION-READY" exactly as `docs/DECISIONS.md` Task 30
  concluded — `destination.py`'s own docstring states no approved
  candidate-destination dataset exists anywhere in VIKALP and the
  endpoint always returns an empty candidate list by design; the
  response schema has no capacity field at all (enforced by an
  existing regression test).
- Confirmed the GSI/NLFC landslide inventory (813 records, previously
  audited) remains the only hazard-relevant dataset with any
  historical character — real locations, but 0% populated casualty/
  damage fields and an occurrence-year field populated for only 19.2%
  of records, already classified "probable, not confirmed" (Task 24B).

**Conclusion driving the whole design**: there is no verified named/
dated historical disaster event in this repository. Rather than
gating the entire feature on that (as the prior, narrower Risk-only
task did), this task's own brief asks for a category-by-category
honest evidence review — so Historical Replay here means "what
verified evidence exists," with Event/Date fields honestly showing
"Not available" throughout, not a fabricated single-event narrative.

**Shared infrastructure** (new, additive — SelectionContext itself
was not touched):
- `frontend/src/state/historicalReplayContext.tsx` — a new React
  context (`HistoricalReplayProvider`/`useHistoricalReplay`), wired
  into `App.tsx` alongside the existing `SelectionProvider` (the one
  "tiny shared component change" this task's §14 allows) so the
  Current Assessment / Historical Replay choice persists across
  Evidence → Risk → Destination & Relocation navigation, per the
  brief's §2.
- `frontend/src/data/historicalReplay.ts` — single source of truth for
  the audit above: the event context (name/date `null`, honest data-
  coverage description), a 6-category evidence catalog (matching the
  brief's own Terrain/Hazard/Historical Disaster/Rainfall/Population-
  Settlement/Infrastructure-Access list) each tagged with a temporal
  class (Historical Record / Current Data / Scenario Output /
  Unavailable) and an evidence strength (available/limited/
  unavailable), and the three required Destination & Relocation
  unavailable strings verbatim. Read by all three workspaces so they
  can never drift into disagreeing about what's available (brief §3:
  "NEVER silently mix historical and current datasets").
- `frontend/src/components/historical-replay/` — four small shared UI
  pieces: `HistoricalReplayBanner.tsx` (the persistent amber banner +
  Event/Date/Coverage header), `HistoricalReplayToggle.tsx` (the
  Current Assessment/Historical Replay switch, now reading/writing the
  shared context instead of page-local state), `TemporalClassBadge.tsx`
  (the four-way classification chip), `MapWatermark.tsx` ("ARCHIVED
  EVIDENCE VIEW", pointer-events-none, `z-1200` to sit above whichever
  map library the host page uses).

**Evidence workspace** (`frontend/src/pages/DataGovernancePage.tsx` —
Current mode's existing fetch/render logic is completely untouched;
only a toggle + a conditional render branch were added):
- New `frontend/src/components/evidence-locker/HistoricalEvidenceView.tsx`
  — its own isolated data fetch (boundaries/landslides/settlement/
  hazard detail), so it costs nothing when the officer never opens
  Historical Replay. Renders: the banner; an evidence-strength summary
  (2 available / 1 limited / 3 unavailable, computed from the shared
  catalog, never hand-typed); a new evidence map; a timeline (Before
  Event/Event Period honestly "Not available — no verified event
  date"; Available Evidence and Officer Review are the two stages this
  repo can actually support); all six evidence category cards with
  source/coverage/date/status/limitation and temporal-class badges;
  and — reused verbatim, not reinvented — the existing
  `DerivedOutputTraceability` component (Task 39) for provenance,
  since it already documents the repo's only two real derivation
  chains (GSI inventory → Hazard Exposure evidence; CartoDEM → derived
  slope).
- New `frontend/src/components/evidence-locker/HistoricalEvidenceMap.tsx`
  — the Evidence workspace never had a map before this task. Built as
  its own small component (not a reuse-by-import of
  `IntelligenceMap.tsx`/`RelocationMap.tsx`, both explicitly off-
  limits to modify) but deliberately mirrors their exact established
  MapLibre architecture: same OSM demo basemap, same DOM-node-only
  (never innerHTML) popup construction, same muted non-alarming
  landslide-point color. Shows real boundaries, the real settlement
  point (popup explicitly says "current data... not verified
  historical-period state"), and the real GSI inventory (popup says
  "historical record... occurrence date not confirmed for most
  records") — no heatmap, no risk coloring, watermarked.

**Risk workspace** (`frontend/src/pages/RiskAnalysisPage.tsx`): the
prior task's local `RiskWorkspaceMode` state and `RiskModeSwitch`
component were replaced with the shared `useHistoricalReplay()`/
`HistoricalReplayToggle` so the mode now persists across pages: this
is the one existing Historical Replay implementation this task
substantially expanded rather than left alone, since this master
brief specifically asks Risk to show real per-dimension evidence
review (not just a single blanket "unavailable" panel). The old
`components/risk/HistoricalReplayPanel.tsx` was deleted, fully
superseded by new `components/risk/HistoricalRiskView.tsx`, which
shows: the banner; all five governed risk dimensions (Terrain, Hazard
Exposure, Historical Disaster Evidence, Population/Household
Exposure, Vulnerability) each with a temporal-class badge, real
source/coverage where evidence exists, its limitation, and — critically
— **no numeric score on any dimension**, because none of the three
conditions the brief's §5.3 requires (approved historical scoring
logic AND genuinely existing historical data AND governance approval)
are jointly met for any dimension today: Hazard Exposure has a real,
working *current* scoring rule (`hazard_exposure.py`), but no
governance decision has ever approved relabeling that output as a
historical score, so it shows evidence only, same as the other four;
an "Observed historical evidence" section with only evidence-supported
observations (never "VIKALP predicted..." language); and three neutral
Protect/Adapt/Relocate pathway cards, none preselected/recommended,
each listing required evidence and what remains unknown, per the
brief's own example structure.

**Destination & Relocation workspace**
(`frontend/src/pages/DestinationExplorerPage.tsx`): new
`frontend/src/components/destination/HistoricalDestinationView.tsx`.
Since the audit confirmed destination candidates, carrying capacity,
and infrastructure/access data are unavailable both historically *and*
currently (this workspace's Current mode already shows an honest empty
state — nothing here is newly hidden by Historical Replay), this
view's job is framing and temporal labeling, not new data: the banner;
current settlement context (Bhitai Malli's real population/households/
elevation) explicitly labeled "Current dataset used as a spatial
reference; not verified historical state"; a destination map reusing
the existing, **unmodified** `RelocationMap.tsx` component exactly as
Current mode already calls it (`destinationCandidate={null}`, since
none exists), with a `MapWatermark` composed on top from the outside —
`RelocationMap.tsx` itself required no prop changes at all; the
brief's three required unavailable strings verbatim ("No government-
curated destination integrated.", "Carrying capacity not assessed —
required destination evidence is not integrated.", "Verified
historical access/route data not integrated."); and a six-stage
relocation-planning-workflow visual (Current Settlement → Destination
→ Capacity → Access → Relocation Plan → Officer Review), each stage
carrying an Available/Limited/Unavailable/Requires-review status chip,
no paragraphs.

**Governance safeguards**: no backend file was touched — risk scoring,
decision governance, destination governance, evidence provenance,
authentication, RBAC, and audit logging are all byte-for-byte
unchanged; every existing regression test asserting "no fabricated
score"/"empty candidates"/"no capacity field" still applies unmodified
and still passes. No LLM is involved anywhere in Historical Replay —
every piece of text is static, sourced from the audited catalog above,
not generated. No pathway is ever preselected or marked "recommended."
Switching between Current Assessment and Historical Replay never
mutates the other mode's already-fetched state (verified live —
switching back on both Risk and Destination & Relocation restored
their original content unchanged).

**Files created**: `frontend/src/state/historicalReplayContext.tsx`,
`frontend/src/data/historicalReplay.ts`,
`frontend/src/components/historical-replay/{HistoricalReplayBanner,HistoricalReplayToggle,TemporalClassBadge,MapWatermark}.tsx`,
`frontend/src/components/evidence-locker/{HistoricalEvidenceView,HistoricalEvidenceMap}.tsx`,
`frontend/src/components/risk/HistoricalRiskView.tsx`,
`frontend/src/components/destination/HistoricalDestinationView.tsx`.

**Files modified**: `frontend/src/App.tsx` (wrap with
`HistoricalReplayProvider`), `frontend/src/pages/DataGovernancePage.tsx`,
`frontend/src/pages/RiskAnalysisPage.tsx`,
`frontend/src/pages/DestinationExplorerPage.tsx` (each: added the
shared toggle + a conditional render branch; existing Current-mode
logic in all three is otherwise byte-for-byte unchanged).

**Files deleted**: `frontend/src/components/risk/HistoricalReplayPanel.tsx`
(fully superseded by `HistoricalRiskView.tsx`).

Nothing in Overview, Reports, authentication, or global navigation was
touched. Map Intelligence (`IntelligenceMap.tsx`) and `RelocationMap.tsx`
were read for architecture reference only — zero lines changed in
either.

**Tests**: backend 177/177 passing (no backend file touched).
`npx tsc -b` clean. `npm run build` clean (same pre-existing >500kB
chunk-size advisory; bundle grew further from the new views — expected,
no unrelated regression). `npm run lint`: two new warnings, both
matching pre-existing, already-accepted patterns elsewhere in this
codebase (a context file exporting a hook alongside its provider,
exactly like `selectionContext.tsx` already does; a `setState` inside
a data-fetch `useEffect`, the same pattern already present in
`AppShell.tsx`/`ReportsPage.tsx`/`RelocationPlannerPage.tsx`/
`AICopilotPage.tsx`/`MapIntelligencePage.tsx`) — no new warning
*category* introduced.

**Browser verification** (Playwright, full 25-item checklist): all 25
items PASS — banner/event-context on all three workspaces; Historical
Replay state persists across Evidence → Risk → Destination &
Relocation navigation via the shared context; Evidence shows a
watermarked map with all three temporal classes present and correctly
labeled; Risk shows all five dimensions with zero numeric scores
anywhere and three neutral, non-preselected pathway cards; switching
back to Current Assessment on both Risk and Destination & Relocation
restores their original, structurally distinct UIs unchanged; the
required unavailable strings appear verbatim on Destination &
Relocation, with no fabricated destination/capacity/route found
anywhere; zero console errors across the entire session.

**Limitations**: the Evidence historical map is a new, from-scratch
component rather than a shared one — this task's own constraints (Map
Intelligence and Relocation's map components must not be modified,
plus Overview's map having just moved to a different library entirely
in the immediately preceding task) left no existing Evidence-workspace
map to extend. Historical Disaster Evidence and Vulnerability remain
fully unavailable — no code change here or elsewhere makes that data
exist; a genuinely dated historical-event dataset would need to be
sourced and integrated before Historical Replay could show anything
beyond "Not available" for those two dimensions.

## Task — Evidence workspace visual redesign (GIS intelligence page)

**Brief**: the Evidence workspace (`DataGovernancePage.tsx`) was
explicitly called out as visually unacceptable — a narrow, text-heavy
list of cards with a permanent giant side panel and tiny typography,
reading like a database record viewer rather than a government GIS
intelligence system. This was a UI/UX-only redesign: no backend
evidence governance, historical replay governance, scoring logic,
APIs, data provenance, or data values could change — only how the same
real data is presented.

**What was redesigned**: the entire page, for both Current Assessment
and Historical Replay (one unified visual system, not two divergent
implementations — VIKALP's terrain/hazard/settlement facts don't
differ between the two views, only the temporal framing does).
Visual hierarchy now matches the brief's own order: a wide header,
a dominant map (~58% of the primary content row width, verified live),
a big-number evidence snapshot strip with a segmented availability
bar, category cards, and a visual provenance chain — replacing the old
top-to-bottom text list entirely.

**Typography changes**: page title 28px/bold (was ~18px), section
headings 18px/semibold, card headings 16px/semibold, body text
14-16px, metadata 12-13px (the brief's own floor, not below it) —
verified live via `getComputedStyle` at several representative
elements (subtitle 16px, card headings 16px, legend 13px, snapshot
numbers 36px). No project font was added — Inter was already wired up
project-wide since Task 45; this page just stopped overriding it down
to `text-[10px]`/`text-[11px]` everywhere.

**Layout changes**: content width changed from a hardcoded
`mx-auto max-w-4xl` (a narrow, centered ~672px column) to
`mx-auto max-w-[1760px]` with `px-6 lg:px-8` — measured live at 100%
of a 1440px viewport (the brief's own 85%+ target). No horizontal
overflow at 1440×900 or 1920×1080 (verified:
`scrollWidth === clientWidth` at both sizes). The permanent inline
detail panel (`lg:w-96`, always visible, competing with the card list
for space) was replaced with a right-side slide-in `Drawer` component
(`components/common/Drawer.tsx`, new, generic/reusable) — opens on
card click, closes on backdrop click or Escape, leaves the rest of the
page visible and unaffected behind a dimmed backdrop.

**Visualizations added**: (1) a big-number evidence snapshot strip
(`EvidenceSnapshotStrip.tsx`) with a real segmented horizontal bar
below the counts, segment widths equal to each category's actual share
of the 13-record catalog — not decorative, not fabricated proportions;
(2) a restyled provenance chain (`TraceabilityChain.tsx`, same two
real derivation chains as before — GSI inventory → Hazard Exposure,
CartoDEM → derived slope — now with numbered node badges and larger
type, per the brief's "make it visually impressive"); (3) a visual
historical timeline (`EvidenceTimeline.tsx`, Historical Replay only)
with the brief's own required fallback text ("Date-specific historical
event timeline unavailable") rather than an invented chronology.

**Evidence map changes**: the Evidence workspace's map (added in the
prior Historical Replay task, historical-mode-only) was generalized
into `EvidenceMap.tsx` with a `mode: "current" | "historical"` prop,
so the same real boundaries/settlement/GSI-landslide layers now render
in Current Assessment too — only popup wording and the archival
watermark differ by mode. Legend moved to 13px (was 10px) per the
brief's "large enough to read." Landslide evidence color changed from
the prior muted brown (#8a6d3b) to a slightly more visible restrained
orange (#c1622f), still deliberately non-alarming, matching this
brief's own "restrained red/orange" palette guidance.

**Historical Replay handling**: kept fully intact and working — the
shared `HistoricalReplayContext`/`HistoricalReplayToggle` from the
prior task are unchanged and still drive Risk and Destination &
Relocation identically. Evidence gained its own larger, page-specific
banner (`EvidenceHistoricalBanner.tsx`) and badge wording
(`EvidenceTemporalBadge.tsx`, "HISTORICAL"/"CURRENT REFERENCE"/
"VIKALP-DERIVED"/"UNAVAILABLE" per this brief's §18) — deliberately
NOT implemented by editing the shared `HistoricalReplayBanner.tsx`/
`TemporalClassBadge.tsx` components, since those are already live and
verified on Risk and Destination & Relocation, which this task must
not touch. The shared `TemporalClass` type gained one new value
(`"vikalp-derived"`, for evidence that is VIKALP's own computation
over a source dataset rather than the raw current dataset) — additive
only, existing "historical-record"/"current-data"/"unavailable" labels
on Risk/Destination were not changed.

**Governance safeguards**: no backend file touched. `EVIDENCE_RECORDS`
(the static source/limitation catalog) is imported unchanged — its
values were not edited, only re-presented. All live values shown
(GSI feature count, hazard exposure detail, boundary count, settlement
population/households/elevation) come from the exact same unmodified
endpoints as before. Copilot remains a small chip linking to the
existing Copilot page — no new Copilot behavior was added or changed.

**Files created**:
`frontend/src/components/common/{icons,Drawer}.tsx`,
`frontend/src/data/evidenceCategories.ts`,
`frontend/src/components/evidence-locker/{EvidenceCategoryCard,MissingEvidenceCard,EvidenceTemporalBadge,EvidenceSnapshotStrip,EvidenceCopilotChip,EvidenceTimeline,EvidenceMap,EvidenceDrawer,EvidenceHistoricalBanner}.tsx`.

**Files modified**: `frontend/src/pages/DataGovernancePage.tsx`
(full rewrite of its JSX/layout; its data-fetching endpoints are
unchanged), `frontend/src/components/evidence-locker/TraceabilityChain.tsx`
(typography/node-badge restyle only, same steps/data),
`frontend/src/components/historical-replay/TemporalClassBadge.tsx`
(exported its tone map for reuse; added the new `"vikalp-derived"`
tone), `frontend/src/data/historicalReplay.ts` (added the
`"vikalp-derived"` `TemporalClass` value and its shared label — Risk/
Destination's existing labels for the other four values are
byte-for-byte unchanged).

**Files deleted** (superseded, confirmed zero remaining imports before
removal): `components/evidence-locker/{EvidenceListCard,EvidenceDetailPanel,EvidenceSummaryBar,HistoricalEvidenceMap,HistoricalEvidenceView}.tsx`.

**Tests**: backend 177/177 passing (no backend file touched).
`npx tsc -b` clean. `npm run build` clean (same pre-existing >500kB
chunk-size advisory). `npm run lint`: one new warning
(`TemporalClassBadge.tsx` exporting a constant alongside its
component), matching the exact same pre-existing, already-accepted
pattern in `selectionContext.tsx`/`historicalReplayContext.tsx` — no
new warning category.

**Browser verification** (Playwright, full 22-item checklist,
measured via `getComputedStyle`/`getBoundingClientRect`, not just
element-existence checks): all 22 items PASS — wide layout (100% of a
1440px viewport, no horizontal overflow at 1440×900 or 1920×1080),
large real map at 58% of the content row with real tiles/boundaries/
markers, legible legend (13px), large snapshot numbers (36px) with a
real segmented bar, a compact (123×515px) Copilot chip, 6 visually
distinct category cards (16px headings, dashed/muted styling for
unavailable ones vs. solid for real evidence), a working slide-in
drawer (opens/closes via button and Escape, shows live hazard numbers),
a visual provenance chain, and full Historical Replay support (banner
with honest "Not available" Event/Date, visual timeline, map
watermark) that cleanly reverts to Current Assessment with zero
leftover state. Zero console errors beyond benign headless-GPU driver
noise.

**Limitations**: the drawer's limitation-text floor sits at exactly
13px (the brief's own stated floor for "historical/source metadata,"
not body text) — everything else meets or exceeds the requested
ranges. No new icon library was added (a small hand-rolled SVG set
was built instead, per the project's existing no-new-dependency
convention) — icon fidelity is plainer than a full icon library's, but
consistent and subtle as required.

## Task 45.8 — Evidence workspace: GSI vector tiles, radius/spatial
## visuals, expanded evidence category matrix

**Brief**: continue the Evidence workspace redesign with a specific,
substantial technical piece the prior task explicitly deferred: serve
the GSI/NLFC landslide inventory (813 real records) as viewport-based
vector tiles from a minimum local FastAPI tile-serving mechanism,
instead of the full GeoJSON download every other layer still uses.
Also add a 1 km/5 km spatial evidence radius control, a compact map
layer control, a visual spatial-relationship diagram for Bhitai
Malli's real GSI proximity numbers, and expand the evidence category
matrix to the 7 categories/5 states this brief specifies (Available/
Review Required/Blocked/Unavailable/Future). Explicitly out of scope:
PostGIS, Docker, Cesium, a production tile server, vector-tiling any
other dataset, or touching Risk/Decision/Destination & Relocation/
Reports/Overview/global navigation.

**Inspection before writing any code**: re-confirmed the prior task's
Evidence map architecture (`EvidenceMap.tsx`, MapLibre, OSM basemap,
plain-GeoJSON boundaries/settlement/landslides), the real Hazard
Exposure proximity numbers already flowing through
`DataGovernancePage.tsx` (0 qualifying within 1 km, 21 contextual
within 5 km, nearest 2.04 km — unchanged, `backend/app/services/
hazard_exposure.py`), and the backend's existing auth/router
conventions (`api/gis.py`'s `Depends(get_current_officer)` pattern,
`services/gis.py`'s cached `load_landslides_geojson()`). Confirmed
`shapely`/`geopandas`/`pyproj` were already installed (Task 12); no
MVT encoder existed yet.

**Exact vector-tile implementation**: `backend/app/services/
gis_tiles.py` (new). `load_landslides_geojson()` (unmodified, from
`services/gis.py`) is read once, reprojected from EPSG:4326 to
EPSG:3857 (Web Mercator) via `pyproj.Transformer`, and cached
(`@lru_cache`, same reasoning as the source loader itself — the file
is immutable within a process lifetime). Per tile request: compute
the tile's real lon/lat bounds (standard slippy-map math) to filter
the ~813 in-memory points down to the ones actually inside that tile
(a plain linear scan — no spatial index, cheap at this dataset size),
then compute the tile's real Web Mercator meter bounds and encode the
matching points as a Mapbox Vector Tile via `mapbox_vector_tile.encode()`
with `quantize_bounds` set to those meter bounds — this is what makes
tile-local coordinates linearly and correctly scaled to the tile's
true Web Mercator extent (a naive lon/lat-bounds quantization would
visibly distort point positions at this latitude, ~15% vertical error
at 30°N — deliberately avoided). Only `Point` geometries are handled
(every real GSI record is a Point, verified directly against the
source file in the prior task's audit). A tile with zero matching
records encodes a genuinely empty layer, never a fabricated feature.

**Tile endpoint**: `GET /api/evidence/gsi-landslides/tiles/{z}/{x}/{y}.pbf`
(`backend/app/api/evidence_tiles.py`, new router, `application/x-protobuf`).
Protected by the same `Depends(get_current_officer)` every other GIS
endpoint uses. Deliberately does NOT call `record_audit_event` per
tile (a single pan/zoom triggers dozens of tile requests for what is,
to the officer, one "viewed the GSI layer" action — the existing
`ACTION_VIEW_GIS_LANDSLIDES` audit event, unchanged, still fires
whenever the same evidence is fetched as plain GeoJSON elsewhere).
Also added `GET /api/evidence/gsi-landslides/count` — returns only
`{"count": 813}`, never geometry, so the UI can show the real total
inventory size without ever downloading the full dataset (this
replaces the prior task's `fetchLandslides()` call, which does
download everything and was removed from this page for that reason).

**GSI source used**: the exact same, unmodified `data/raw/static/
hazards/gsi_nlfc_field_validated_landslides_pauri_garhwal.geojson`
file every other VIKALP feature reads (via `load_landslides_geojson()`,
never re-read independently) — no new data, no synthetic features,
`data/raw/` untouched.

**Map layers implemented**: basemap switched from OSM road tiles to
Esri World_Physical_Map (the same real, free, keyless natural-terrain-
relief source already verified to zoom 8 in Task 45.7, reused here —
`maxzoom: 8` + MapLibre's own overzoom, same "reduced detail beyond
zoom 8" notice pattern). District boundaries and the settlement point
stay plain GeoJSON (unchanged approach — this task's own instruction
was to vector-tile GSI only, not every dataset). GSI landslide
evidence is now a real MapLibre `vector` source
(`services/evidenceTiles.ts`'s tile URL template), circle radius
scaled by zoom (`interpolate`/`linear`, 1.8px at z6 → 4.5px at z14,
satisfying "stronger visibility when zoomed in" — no server-side
point clustering/aggregation was built, see Limitations). A 1 km/5 km
radius ring (plain GeoJSON, computed client-side via a small-circle
polygon approximation, `frontend/src/utils/geoCircle.ts`, new) draws
around the selected settlement when toggled. No hillshade/DEM raster
layer was added — VIKALP's CartoDEM terrain is a static file never
served as tiles by any part of this project, and building that would
have meant a second tile-serving mechanism, contradicting this task's
own "the GSI layer is the only vector-tile implementation" instruction
(§20) — terrain context comes from the basemap's own relief coloring
instead.

**Evidence visuals implemented**: `EvidenceRadiusControl.tsx` (new,
compact 1 km/5 km toggle), `EvidenceLayerControl.tsx` (new, checkbox
toggles for District boundaries/Settlement/GSI evidence — terrain
isn't listed as a toggle since it's the basemap itself, not a separate
served layer, and offering a fake independent toggle for it would be
misleading), `GsiSpatialRelationshipDiagram.tsx` (new, the brief's own
vertical "0 within 1 km / [Settlement] / 21 within 5 km / nearest
~2.04 km" visual, using only the existing, unchanged Hazard Exposure
numbers), `EvidenceSpatialSummaryStrip.tsx` (new, the 4-card "GSI
Records/Within 1 km/Nearest/Terrain" strip under the map). The
evidence category matrix (`data/evidenceCategories.ts`, rewritten)
expanded from the prior task's 6 categories/4 temporal-class badges to
this brief's 7 categories (added Population, Vulnerability, Destination
Evidence as their own cards; Rainfall/Weather folded out since this
brief's own category list doesn't include it) and 5-state taxonomy
(Available/Review Required/Blocked/Unavailable — no category maps to
Future; none of the 7 real categories genuinely fits a "not yet
started" state, so it's left unused rather than force-fit). States
assigned directly from each category's already-documented real VIKALP
status, matching the brief's own two worked examples exactly: Terrain
= Review Required (real DEM/slope data, stored-vs-derived discrepancy
unresolved), Hazard = Available (real GSI inventory integrated).
Historical Disaster/Vulnerability/Infrastructure & Access = Unavailable
(zero data, confirmed by the repo-wide audits in the two prior
Historical Replay tasks). Destination Evidence = Blocked, not flat
Unavailable — `destination.py` is a deliberate structural-framework-
only design (Task 30, "NOT IMPLEMENTATION-READY"), a policy/
architecture decision pending real candidate data, not simply an
absence of data. Population = Review Required (real current figures
exist, but are an uncited demo input with no approved scoring rule).
Unavailable/Blocked cards render via the existing `MissingEvidenceCard`
(dashed border, muted) instead of the solid-card treatment, matching
the prior task's "missing data should look intentional" pattern,
generalized to the new 5-state model.

**Provenance visualization**: reused `TraceabilityChain.tsx`'s
existing two real chains (GSI inventory → Hazard Exposure evidence;
CartoDEM → derived slope) — each chain box is now also a clickable
button (brief §10: "clicking a node may reveal source/date/processing
information") that opens the Evidence drawer for the record it
documents. While touching this file, fixed a genuine, pre-existing
(Task 39) data-honesty gap this task's own brief explicitly warns
about (§8/§18: "never replace unavailable data with zero"): the
Hazard chain's "Output" step silently showed "0 qualifying records
within 1 km" whenever the live value was `null` (e.g. a fetch
failure), rather than "Not available" — a real 0 and a missing value
were indistinguishable. Fixed to show "Not available" when the value
is genuinely `null`; the real `0` Bhitai Malli value (verified,
confirmed live) still displays as `0`, unchanged.

**Radius visualization**: `[ 1 km ] [ 5 km ]` buttons over the map
(brief §12) toggle a dashed gold ring (client-side circle-polygon
approximation around the settlement's real coordinates) plus highlight
which real, already-tiled GSI features fall inside it — a display/
query visualization only; the underlying GSI dataset and the Hazard
Exposure endpoint's own real proximity numbers are never touched or
recomputed by this control.

**Historical Replay status**: unchanged governance, fully preserved.
The shared `HistoricalReplayContext`/`HistoricalReplayToggle` from the
earlier master task still drive Risk and Destination & Relocation
identically (neither was touched this task). On Evidence specifically,
`EvidenceHistoricalBanner.tsx` now also carries this brief's exact
required sentence verbatim — "Historical replay unavailable — verified
event-specific data has not been integrated." — alongside the existing
honest "Event: Not available"/"Date: Not available" fields, making
explicit that this is an evidence review, not a reconstructed
historical event. The map watermark, category matrix, and all new
controls (radius/layer toggles, spatial diagram) remain fully
functional in Historical Replay mode — live-verified.

**Files created**: `backend/app/services/gis_tiles.py`,
`backend/app/api/evidence_tiles.py`,
`backend/tests/test_api_evidence_tiles.py`,
`frontend/src/services/evidenceTiles.ts`,
`frontend/src/utils/geoCircle.ts`,
`frontend/src/components/evidence-locker/{EvidenceRadiusControl,EvidenceLayerControl,GsiSpatialRelationshipDiagram,EvidenceSpatialSummaryStrip}.tsx`.

**Files modified**: `backend/app/main.py` (registered the new
router), `backend/requirements.txt` (added `mapbox-vector-tile`),
`frontend/src/data/evidenceCategories.ts` (7-category/5-state
rewrite), `frontend/src/components/evidence-locker/
{EvidenceCategoryCard,MissingEvidenceCard,EvidenceMap,EvidenceDrawer,TraceabilityChain,EvidenceHistoricalBanner}.tsx`,
`frontend/src/pages/DataGovernancePage.tsx` (layout rewired for the
new controls/diagram/strip; `fetchLandslides()` call removed).
`frontend/src/components/common/icons.tsx` gained 5 new icons (Users,
HeartPulse, Flag, Layers, Target). Nothing in Risk/Decision/
Destination & Relocation/Reports/Overview/global navigation/
SelectionContext/authentication/RBAC/audit logging/risk or destination
governance/`data/raw/` was touched.

**Files deleted** (superseded, confirmed zero remaining imports first):
`frontend/src/components/evidence-locker/EvidenceTemporalBadge.tsx`
(the prior task's 4-badge temporal component on category cards — this
task replaces that with the 5-state badge; `TemporalClassBadge`, the
separately-shared historical-replay component, is still used — now
inside the drawer, for the brief's §14 Historical Record/Current
Spatial Reference/Unavailable labeling).

**Unexpected issue found and fixed — not an application bug**: after
implementing everything, a live smoke test against the running backend
dev server returned 404 for both new endpoints even with a valid
token. Root-caused to the `--reload` file watcher never having picked
up the new files (`gis_tiles.py`, `evidence_tiles.py`) — no reload/
crash message appeared in its own log despite multiple edits across
this task; the running process was serving a stale build of the app
that never had the new router registered. Confirmed via the backend's
own direct-call test suite (183/183 passing, including all new tests)
that the CODE itself was correct throughout — this was purely a dev-
server process staleness issue. Fixed by stopping the stale process
and starting a fresh one; a repeat smoke test then confirmed both
endpoints work correctly end-to-end (count → `{"count":813}`, a
whole-district z4 tile → 200 with all 813 features, a far-away tile →
200 with 0 features, no-auth → 401).

**Tests**: backend 183/183 passing (177 pre-existing + 6 new:
`test_z4_tile_containing_pauri_garhwal_has_every_real_feature`,
`test_z12_tile_containing_bhitai_malli_has_real_features`,
`test_tile_far_from_any_real_record_is_empty_not_fabricated`,
`test_out_of_range_tile_coordinates_return_404_not_empty_200`,
`test_response_is_a_real_tile_not_the_full_dataset_inlined`,
`test_count_matches_real_dataset_and_carries_no_geometry`). `npx tsc -b`
clean. `npm run build` clean (same pre-existing >500kB chunk-size
advisory). `npm run lint`: one new warning
(`EvidenceCategoryCard.tsx` exporting a constant — `CATEGORY_ICON_MAP`
— alongside its component, reused by `MissingEvidenceCard.tsx`),
matching the same pre-existing, already-accepted pattern elsewhere in
this codebase — no new warning category.

**Manual browser verification** (Playwright, 20 testable items from
this task's own §23 checklist, plus the two extra §4/§16-driven checks
folded into the same pass): all 20 PASS. Network inspection confirmed:
real tile requests to the new endpoint (not `/api/gis/landslides`,
which was confirmed to fire zero times after navigating to Evidence),
`application/x-protobuf` content-type (never JSON), a real `Bearer`
token attached to every tile request (`transformRequest` verified
working), and the count endpoint returning exactly `{"count":813}`.
The geometric-correctness check this task was most uncertain about —
whether the hand-implemented Web Mercator tile math had a Y-axis
sign error — was verified two independent ways: decoded tile-feature
coordinates cross-checked against the raw source file's real lat/lon
(4/4 sampled records matched within ~10-90m, consistent with normal
MVT quantization, not a kilometers-scale flip), and a zoomed
screenshot showing GSI points scattered plausibly around the
settlement marker in multiple directions, not clustered or mirrored.
Layer toggles, the radius ring, the spatial-relationship diagram (0/
21/2.04 km, matching the real live values), the spatial summary strip,
all 7 category cards with the exact expected states (Terrain=Review
Required, Hazard=Available confirmed specifically), the clickable
provenance chains, map-click-to-drawer for a real GSI point, the
Copilot chip, Historical Replay's banner/watermark/required sentence,
and clean reversion to Current Assessment were all individually
confirmed. Zero console errors beyond benign headless-GPU/SwiftShader
driver noise. No horizontal overflow at 1440×900 or 1920×1080.

**Limitations**: no server-side point clustering/aggregation was
implemented for the GSI vector tile layer — "stronger visibility when
zoomed in" is achieved via zoom-scaled marker radius only, not
aggregated cluster bubbles; true tile-level clustering (as e.g.
tippecanoe would produce) was judged out of scope for a "minimum local
tile-serving mechanism." No hillshade/DEM raster tile layer exists —
terrain context comes from the basemap's relief coloring only, since
CartoDEM has no served tile source anywhere in this project and
building one was out of this task's scope (GSI is the only vector-
tiled dataset, per §20). The radius ring is a small-circle
approximation (not a geodesically exact circle) — adequate for a
1-5 km map visualization aid, not survey-grade. The "Explain this
evidence" affordance navigates to the existing, unchanged, fully
deterministic Copilot page rather than performing new in-drawer
LLM-free evidence explanation — no new Copilot backend logic was
built, since the drawer itself already presents the same deterministic
source/status/limitation fields Copilot would explain.
