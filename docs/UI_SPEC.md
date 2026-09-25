# VIKALP — UI Spec

## Visual system — black + gold (Task 42 correction; supersedes the
## earlier light-mode/navy palette below every page used through Task 41)
| Token | Value | Usage |
|---|---|---|
| Background | `#0B0A08` | Page background — near-black |
| Cards | `#17150F` | Card/panel surfaces — muted dark neutral |
| Border | `#2A2823` | Card/input borders |
| Primary gold (`vikalp-navy`, name unchanged from the old palette) | `#A8822F` | Headings, active nav tab, primary CTAs, brand wordmark, selected-item accents — strategic, not on every element |
| Safe / approved | `#4CAF87` | Status semantics only — never gold |
| Warning / pending | `#A8822F` | Same gold — "Assessment Pending" etc. is the single most common status shown, and is exactly where a strategic highlight belongs |
| Critical | `#D9695F` | Status semantics only — never gold |
| Primary text | `#ECE9E2` | Off-white |
| Secondary text | `#9A9587` | Muted warm gray |
| Card radius | 12px |
| Borders | 1px |
| Shadows | subtle or none |

Defined as Tailwind v4 `@theme` tokens in `frontend/src/styles/index.css`
(`vikalp-bg`, `vikalp-card`, `vikalp-border`, `vikalp-navy`, `vikalp-safe`,
`vikalp-warning`, `vikalp-critical`, `vikalp-text`, `vikalp-text-secondary`,
radius `vikalp-card`) — same token **names** as the original light palette,
only the values changed, so every existing component picked up the new
theme without a per-file rewrite. This was `LoginPage.tsx`'s own palette
since Task 35 (applied there only, via literal hex, with an explicit
comment that "the rest of the app keeps its existing navy palette
untouched"); Task 42 made it the whole application's palette and
rewrote `LoginPage.tsx` to reference the shared tokens instead of its
own duplicated hex values.

MapLibre paint colors (the settlement marker/label and administrative-
boundary fill/line in `MapLibreMap.tsx`/`IntelligenceMap.tsx`) are
plain JS hex strings, not CSS classes, and needed their own update:
settlement marker/label → the same gold (`#A8822F`, strategic — the
single most important point on the map); boundary fill/line → warm
neutral grays (`#6B6355`/`#4A4438`) rather than a second gold element.
The demo OSM basemap and the label text-halo (kept white, for
legibility against that still-light basemap) were deliberately left
unchanged — both are a basemap-legibility concern, unrelated to
app-chrome theming.

Avoid: neon, cyberpunk, glassmorphism, heavy gradients, excessive
shadows/animation/glow, military/war-room styling, gold on every
element, decorative charts with no decision value.

Design target: 1366×768, map-first (but not map-only — header,
sidebar/left controls, and a right/bottom evidence context panel are
present on every real page), no unnecessary scrolling.

## Dashboard shell — state-level Overview (Task 44)
**Redesigned Task 44**, superseding Task 43's settlement-drill-down
"Officer Workspace" concept for this page only, to match a supplied
reference image's layout/density — see
[DECISIONS.md](DECISIONS.md#task-44--state-level-officer-workspace-overview--real-weather).
Task 43's own content (real layer controls, a Settlement Intelligence
panel, a 5-card live status row) is not lost — it is unchanged and
still lives on Map Intelligence and the dedicated Risk/Decision/
Destination/Relocation pages, all still reachable from here.

- **Header:** unchanged from Task 43/32 — VIKALP wordmark + tagline,
  nav tabs (Map Intelligence, Risk Analysis, Decision Workspace,
  Destination Explorer, Relocation Planner, Reports, Evidence Locker,
  AI Copilot), "Team Vikalp / SIH 26191." Deliberately not restructured
  to match the reference's different (6-item, no Copilot tab) nav —
  Task 44 was explicitly scoped to "ONLY the Overview page," and the
  Header is shared by every other page.
- **Filter bar** (`OverviewFilterBar.tsx`, new), directly below the
  header: State (a real, single-option, disabled select — Uttarakhand
  is the only state VIKALP has any data for, so this is not a fake
  multi-state dropdown), District (real options from the 13-district
  `GET /api/gis/boundaries` dataset), Settlement (real options from
  `GET /api/settlements`, cascaded by District + Search), Search
  settlement (live text filter), and a "Current Selection" pill on the
  right reflecting the real current State/District/Settlement choice.
- **Center — `StateMap.tsx`** (new): the dominant, full-Uttarakhand
  map. Real layers only: all 13 district boundaries (gold fill+line —
  a uniform tone across every district edge, since a true single
  state-outline needs polygon-union math this project doesn't have;
  district labels at each polygon's real vertex-average location), the
  one real settlement (Bhitai Malli), and the real GSI/NLFC landslide
  inventory (muted, non-alarming color — same established convention
  as Map Intelligence, Task 38 — never red/orange implying danger).
  Compact custom map controls (zoom/reset/fullscreen) top-left; a
  legend bottom-left listing only layers actually present; a real
  current-weather chip top-right (Open-Meteo, Bhitai Malli only). No
  3D/hillshaded terrain — the only processed DEM covers the Pauri
  Garhwal pilot clip, not the whole state, so a state-wide relief
  render would mean fabricating terrain outside that coverage.
- **Right stack**, five cards: **Key Information** (real settlement/
  population/household counts summed over `GET /api/settlements`; Area
  reads "Not available" — no source exists), **Weather Forecast** (real
  Open-Meteo current conditions + 3-day outlook for Bhitai Malli, or
  "Weather data unavailable" — see "Weather" below), **Assessment
  Status** (Risk/Decision/Destination/Relocation, reusing the
  copilot-context fetch — Destination/Relocation read "Not available,"
  not "Pending," since no candidate dataset exists at all yet),
  **Key Evidence Summary** (real Landslide/Terrain/Population evidence
  counts + a real "N items need review" count — the genuine number of
  unscored risk dimensions, currently 5, never a smaller curated
  number), **Ask Copilot** (a compact link into the existing AI
  Copilot page — advisory only, no calculation of its own).
- **Selecting a district or settlement** (dropdown or map click)
  updates the Current Selection pill and re-fetches the right stack's
  settlement-scoped cards for that settlement; it does not auto-
  navigate anywhere (Task 44 §20).
- **Pilot/demo indicator:** "PILOT / DEMO DATA" badge, unchanged.

**Updated Task 45** (presentation-only correction after reviewing a
live screenshot — see
[DECISIONS.md](DECISIONS.md#task-45--overview-visual-correction-map-framing-terrain-basemap-layout-ratio)):
the map now `fitBounds`-fits the real Uttarakhand district bbox on
load (was a fixed center/zoom guess that left too much surrounding
geography in frame); the basemap is Esri's free/keyless World Terrain
Base (real global elevation relief, dark-blended — not tile.openstreet
map.org's road-heavy tiles, and not VIKALP's own DEM, which still only
covers the Pauri Garhwal pilot clip); the boundary line has an added
glow, the settlement marker an added halo + real-name label, both
styling only, same underlying data; the map/sidebar split is a
proportional 68:32 flex ratio (was a fixed 320px sidebar); Inter
typography is now actually loaded (`index.html` + `styles/index.css`)
project-wide, not just specified. **Not resolved**: the gold boundary/
settlement/landslide layers could not be visually confirmed by
screenshot in this session despite extensive targeted diagnosis — see
DECISIONS.md Task 45 for the full disclosure; needs a manual browser
check.

**Updated Task 45.6** — fixed the Esri basemap source showing "Map
data not yet available" once zoomed in (see
[DECISIONS.md](DECISIONS.md#task-456--fix-map-data-not-yet-available-at-high-zoom)
for the full verification). This is a **2D terrain-relief basemap
image**, not pitch-able 3D terrain — no `raster-dem`/`setTerrain()`
pipeline exists anywhere in VIKALP. Esri's World Terrain Base has real
tile coverage only through zoom 9 for the Uttarakhand/Himalayan
region (verified by direct HTTP requests, not assumed); the source's
`maxzoom` is now set to that real value (was an unverified `13`), so
MapLibre overzooms (stretches the last real tile) instead of
requesting the placeholder. Map interaction is unrestricted — the
officer can zoom as far as they like. A small "Basemap imagery shown
at reduced detail beyond zoom 9" notice appears once the view zoom
exceeds that ceiling by more than 2 levels (i.e. from the Bhitai Malli
settlement-focus zoom onward), never blocking the map.

## Weather (Task 44)
`GET /api/weather/pilot` (`backend/app/services/weather.py`) calls
Open-Meteo (open-meteo.com — free, keyless, no new pip dependency:
stdlib `urllib.request` only) for **Bhitai Malli's own verified
coordinates**, cached 15 minutes. Never presented as a state-wide
Uttarakhand figure — a single point cannot honestly represent weather
across an entire state with widely varying elevation. Every response
discloses `"source": "Open-Meteo... not an official IMD forecast."` If
Open-Meteo is unreachable or returns an unexpected shape, the frontend
shows "Weather data unavailable" — never a guessed/hard-coded
condition (the reference mock's "Heavy rain expected" is not
reproduced unless the real API actually says so).

## Map Intelligence (Task 38)
`frontend/src/pages/MapIntelligencePage.tsx` is a real evidence
workspace (was a `PlaceholderPage` since Task 02) — a dedicated map
component (`frontend/src/components/map-intelligence/IntelligenceMap.tsx`)
plus a left layer-control panel, a right evidence panel, and a
restrained legend, all in a `SimplePageLayout` full-height (not
scroll-container) layout. **Task 43** had the Overview dashboard render
this exact same `IntelligenceMap` + `LayerControlPanel` pair directly;
**Task 44** gave the Overview its own, purpose-built `StateMap.tsx`
instead (a whole-Uttarakhand situational view has a different job than
this page's single-settlement evidence drill-down), so `IntelligenceMap`
is once again used only here. Both components share the same demo
basemap constant and styling conventions, deliberately kept in sync
rather than duplicated ad hoc.

- **Layers, each independently toggleable and gated on real data:**
  Administrative Boundary (`GET /api/gis/boundaries`, unchanged),
  Settlement (`GET /api/settlements/{id}/geojson`, unchanged — same
  `settlement-source`/`settlement-point`/`settlement-point-label`
  MapLibre ids as the Overview map), and Landslide Evidence (new
  `GET /api/gis/landslides`, Task 38 — the full 813-record GSI/NLFC
  inventory, muted small circles, never red/green, never a filled
  zone). Terrain/Slope are shown as evidence-panel status text
  ("Available — CartoDEM v3 R1"), not a rendered raster layer — no new
  raster-tile server was introduced. Flood, Cloudburst, and Coastal
  erosion are shown as explicit unavailable/not-applicable rows, never
  faked.
- **No risk-color legend.** The legend distinguishes what each marker
  *is* (settlement / boundary / landslide record), never what it means
  about safety — Bhitai Malli's overall risk remains `pending`.
- **Evidence panel** shows settlement identity/population/households,
  both terrain slope values (18.91° demo/DB vs. 22.58° CartoDEM-derived,
  discrepancy disclosed and unresolved, same static fact `report.py`/
  `services/copilot.py` already disclose), the real Hazard Exposure
  numbers for Bhitai Malli (0 qualifying records within 1 km, nearest
  contextual record 2.04 km, 21 contextual records within 5 km — read
  from the existing `GET /api/settlements/{id}/risk` response, not
  recalculated), the required "does not establish absence of hazard"
  disclosure verbatim, and a source/provenance list.
- **Interactions:** zoom/pan/layer-toggle/settlement+boundary+landslide
  popups (same XSS-safe DOM-node popup convention as `MapLibreMap.tsx`),
  "Reset to settlement" and "Fit district boundary" view controls. No
  drawing tools, editing, route optimization, or spatial-analysis UI.

## Evidence Locker (Task 39)
`frontend/src/pages/DataGovernancePage.tsx` is now a real, read-only
evidence/provenance workspace (was a `PlaceholderPage` since Task 02) —
there is no upload, edit, or delete anywhere in this module.

- **Four categories, never blurred**: Source-backed, VIKALP-derived,
  Demo planning input, Missing/unavailable — each evidence record
  (`frontend/src/data/evidenceRecords.ts`, 13 records) is tagged with
  exactly one. A summary bar shows each category's count, computed
  from the actual records array, never a fabricated number.
- **Records**: GSI/NLFC landslide inventory, CartoDEM terrain
  elevation, VIKALP-derived slope (the terrain discrepancy), geo-
  Boundaries India ADM2, and Bhitai Malli's settlement values — plus 8
  explicit missing-evidence entries (Terrain/Historical/Population
  scoring rules pending governance, Vulnerability/Flood/Cloudburst
  entirely unavailable, Destination candidates/land-suitability/
  carrying-capacity all unavailable). Selecting a record opens a detail
  panel: source organization, dataset, geographic scope, description,
  usage in VIKALP, attribution/license, limitations, and affected
  module(s).
- **Live values, not hardcoded duplicates**: the page fetches the
  existing, unmodified `GET /api/gis/landslides`,
  `GET /api/gis/boundaries`, `GET /api/settlements/{id}`, and
  `GET /api/settlements/{id}/risk` endpoints for the numbers that are
  already served live (813 landslide records, 13 boundary features,
  Bhitai Malli's population/households/slope, and the Hazard Exposure
  derived output) — the GSI record's detail panel explicitly separates
  "source dataset" facts from a distinctly-styled "Derived VIKALP
  output for Bhitai Malli — not a source dataset fact" box.
- **Derived output traceability**: two fixed SOURCE → DERIVATION →
  OUTPUT → INTERPRETATION/CONFLICT → LIMITATION/STATUS chains (GSI
  inventory → Hazard Exposure evidence; CartoDEM → derived slope) — a
  simple structured UI, not a graph database.
- **No new backend endpoint.** Every value this page shows either
  comes from an existing, unmodified API or is static reference content
  (source names, licenses, descriptions) that has no other API home —
  adding a new route to serve fixed documentation-style text would only
  duplicate `docs/DATA_PROVENANCE.md` without adding dynamic behavior.
- **No risk-color status treatment.** Only two Badge tones are used
  (neutral for source-backed/derived, the existing amber "warning" tone
  — gold, used strategically — for demo-input/missing); no green/red.

## Reports (Task 40)
`frontend/src/pages/ReportsPage.tsx` now invokes Task 34's existing
`GET /api/settlements/{id}/report` endpoint (was a `PlaceholderPage`
since Task 02) — the backend report itself was not touched.

- **Settlement selection**: fetched from the existing `GET /api/
  settlements` list route (had no frontend caller until now —
  `fetchSettlements()` added to `services/settlements.ts`), not
  hardcoded; today it returns Bhitai Malli only.
- **Generation flow**: "Generate Evidence Assessment" calls a new
  `generateSettlementReport()` (`services/report.ts`), which uses a new
  `apiFetchBlob()` — a sibling to the existing `apiFetch` in
  `services/apiClient.ts`, same conventions — same Bearer-token-from-
  `sessionStorage`,
  same 401-clears-session behavior, never a token in the URL. The
  response `Blob` becomes an object URL for "Open PDF" (new tab) /
  "Download PDF" (a programmatic `<a download>` click); the object URL
  is revoked on unmount or before a newer one replaces it — no
  permanent frontend or backend storage of the generated PDF.
- **States**: button reads "Generating…" and is disabled while a
  request is in flight (no duplicate submissions); a failed request
  shows "Unable to generate the report. Please try again." (never the
  raw error/stack trace); success shows "Evidence assessment
  generated." plus the Open/Download actions.
- **Trust copy** paraphrases the report's own existing disclaimer
  section (`report.py`'s `_build_disclaimer_section`) rather than
  inventing new claims — "not an emergency order, not an automatic
  relocation order, and not a government-certified risk declaration,"
  "absence of evidence is not evidence of safety," "officer review is
  required."
- **Evidence-included list** names only the sections the real PDF
  actually contains (settlement context, GIS evidence, risk status,
  Hazard Exposure detail, Decision Workspace, destination/capacity
  status, provenance, limitations, officer review) — the PDF content
  itself is never reproduced in the frontend.

## AI Copilot (Task 41)
`frontend/src/pages/AICopilotPage.tsx` (new; no placeholder existed
before this task — Task 37 deliberately built only the backend
foundation and explicitly deferred UI wiring). Calls Task 37's existing
`GET /api/settlements/{id}/copilot-context` and
`GET /api/settlements/{id}/explanation` — neither endpoint, nor any
other backend Copilot file, was modified.

- **No LLM, no free-form chat box.** A fixed set of six controlled
  prompts ("Explain the current assessment.", "What evidence is
  available?", "Why is the assessment pending?", "What evidence is
  missing?", "Explain the landslide evidence.", "What should an
  officer review before making a decision?") each select which
  already-fetched CopilotContext/EvidenceExplanation fields to display
  (`components/copilot/copilotPrompts.ts`) — no new network request per
  prompt click, nothing sent to any model (there is no model in this
  codebase).
- **Governance panel** (`CopilotGovernancePanel.tsx`, always visible):
  the 5-step "How VIKALP Copilot works" pipeline and an explicit
  "Copilot does not" list (calculate risk, override VIKALP rules,
  select destinations, approve relocation, issue government orders,
  invent missing evidence).
- **Evidence context panel** (`CopilotEvidenceContextPanel.tsx`, behind
  a "View evidence context" toggle): all ten CopilotContext categories
  — settlement, risk assessment, risk dimensions, hazard exposure,
  decision workspace, destinations, provenance, missing evidence,
  limitations, policy disclaimer — read directly from the fetched
  object, nothing recomputed.
- **Settlement selector** reuses `fetchSettlements()` (Task 40) —
  today shows Bhitai Malli only, not hardcoded.
- **Status badges** never say "safe"/"unsafe"/a risk level unless the
  backend actually returned one — Bhitai Malli always reads "Assessment
  Pending."
- **Trust banner** at the top: "Copilot answers are generated only from
  verified VIKALP assessment context... a controlled explanation
  layer — powered by verified VIKALP assessment context, not an
  external AI model."

## Pages / routes
**This section is stale where noted below — updated Task 32 to match
the actual current implementation, not this task's original scope.**

Login, Overview, Settlements, Map Intelligence, Risk Analysis, Decision
Workspace, Destination Explorer, Relocation Planner, Reports, Data
Governance, AI Copilot.

- **Real, live, API-backed pages (built in later tasks, not this one):**
  Overview (dashboard), Map Intelligence (Task 38 — administrative
  boundary/settlement/landslide-evidence map layers, evidence panel, no
  risk-color legend), Risk Analysis (Task 07B — evidence-gated 5-dimension
  framework, Hazard Exposure scoring live), Decision Workspace (Task 08 —
  Protect/Adapt/Relocate framework, `not_evaluated`/`pending` correctly,
  no scenario simulator), Destination Explorer (Task 09 — 6-dimension
  suitability framework, empty candidates correctly, no capacity engine),
  Data Governance / Evidence Locker (Task 39 — read-only source/derived/
  demo-input/missing-evidence traceability; no upload/edit/delete),
  Reports (Task 40 — Task 34's ReportLab PDF endpoint, now reachable
  from the UI; settlement selection, generate/open/download, no
  permanent storage), AI Copilot (Task 41 — Task 37's deterministic
  context/explanation endpoints, controlled prompts only, no free-form
  chat box, no LLM), Relocation Planner (**Task 43** — real map-based
  workspace: 4-step tracker, current-settlement marker always, a
  destination marker only when a real candidate exists, no
  route/line ever drawn; a "No government-curated destination" honest
  empty state today, since Bhitai Malli has 0 candidates).
- **Still `PlaceholderPage`** ("VIKALP — Module coming in a later
  implementation task"): Settlements only.

See [DECISIONS.md](DECISIONS.md) Tasks 07B/08/09 for what "real" means
for each page, and Task 31/32 for the current full status audit.

## Cross-page navigation (Task 42)
Before this task, every page's `onNavigate` prop was wired only to the
shared `Header`'s nav tabs — no page had an in-content button that
navigated anywhere. Seven navigation-only CTAs now connect the officer
journey end to end (plain `onClick={() => onNavigate("...")}`, no new
route, no new business logic):

Risk Analysis → "Review Decision Workspace →" → Decision Workspace →
"Explore Destinations →" → Destination Explorer → "View Map
Intelligence →" → Map Intelligence (evidence panel) → "Open Evidence
Locker →" → Evidence Locker → "Ask Copilot →" → AI Copilot →
"Generate Report →" → Reports → "← Return to Assessment" → Risk
Analysis.

The Overview dashboard's Risk Analysis / Decision Workspace /
Relocation Planner quick-action cards are also clickable as of this
task (`IntelligenceCard` gained an optional `onClick`), navigating to
the corresponding real page.

**Task 43** extended this: the bottom row grew to five clickable cards
(added Destination, Copilot), and the right-hand Settlement
Intelligence panel gained four of its own working actions (View Risk /
View Evidence / Ask Copilot / Generate Report) — every Overview control
that looks clickable now genuinely navigates somewhere real.

**Task 44** replaced that specific Overview composition with the
state-level design in "Dashboard shell — state-level Overview" above —
the *principle* (every visible control genuinely does something) is
unchanged and carried forward into the new right stack's cards and
Ask Copilot link.

## Data rule
Only the known Bhitai Malli values (population 383, households 86,
elevation 991 m, slope 18.91°, lat 30.167112, lon 78.781266,
"Verified demo terrain and settlement context") may appear as data on
the Overview dashboard. No hazard %, risk score, rainfall, distances,
capacity, or ML output — those fields don't exist yet and use
"Pending" / "Not evaluated" / "Not available" where a status label is
needed instead.

**Updated Task 32**: this rule described the Overview dashboard as of
Task 02/03. Since Task 23, the Risk Analysis page legitimately displays
real Hazard Exposure evidence (nearest-record distance, proximity band,
qualifying-record count) from the real GSI landslide inventory — this
is real evidence, not an invented figure, and does not violate this
rule. The rule's intent (never fabricate a value) is unchanged; only
Hazard Exposure has real evidence to show. Overall risk score, the
other four dimension scores, hazard %, rainfall, capacity, and ML
output still do not exist anywhere and must never be displayed as
numbers.

**Updated Task 44**: the Overview also legitimately shows real
aggregate counts (settlement/population/household totals, summed over
`GET /api/settlements`) and real current weather + 3-day forecast
(Open-Meteo, Bhitai Malli's coordinates only) — both real values from
real sources, not fabricated. State-wide area, state-wide weather, and
any other district's settlement/hazard data still do not exist
anywhere in VIKALP and must never be displayed as numbers or map
markers.
