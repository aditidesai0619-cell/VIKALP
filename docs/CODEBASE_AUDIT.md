# VIKALP — Codebase Audit (Read-Only)

**Date:** 2026-09-11
**Scope:** `C:\Users\VICTUS\Desktop\workplace\VIKALP`
**Method:** Recursive directory listing (`Get-ChildItem -Force -Recurse`), git status check.

## 0. Key Finding

The `VIKALP` directory is **empty**. Before this audit, a recursive scan returned **0 files/folders** and there is no `.git` directory — this is not a git repository. The only thing present now is the empty `docs/` folder created to hold this file.

There is no existing frontend, backend, GIS data, or workflow code to inspect. Sections 1–5 below report "not present" rather than fabricated findings, per the user's confirmation that this is a fresh start, not an established codebase. Sections 6–7 give the forward plan.

## 1. Frontend — Current State

- No `package.json`, no `src/`, no `vite.config.ts`.
- No React/TypeScript setup.
- No routes, pages, or components.
- No MapLibre GL JS integration.
- No styling system (no Tailwind/CSS modules/etc. configured).
- **Nothing to preserve.**

## 2. Backend — Current State

- No FastAPI app, no `requirements.txt` / `pyproject.toml`.
- No API routes, no models, no services.
- No SQLite or PostgreSQL/PostGIS database file or connection config.
- **Nothing to preserve.**

## 3. GIS Data — Current State

- No GeoJSON files.
- No DEM/terrain rasters.
- No hazard layers, settlement boundaries, road/hospital/school layers.
- No Bhitai Malli demo data files on disk yet (only known as parameters in the task brief: population 383, households 86, elevation 991 m, slope 18.91°).

## 4. VIKALP Workflow Support — Current State

None of the following exist yet: login, dashboard, map, settlement evidence, risk analysis, decision workspace (Protect/Adapt/Relocate), destination analysis, capacity view, officer approval, reports/PDF export.

## 5. Code Health

- Working components: none.
- Incomplete/duplicate/risky files: none — there is no code.
- Files that MUST NOT be changed: none exist yet. Once real GIS/demo data for Bhitai Malli is added, this audit should be re-run and updated to mark those files protected.

## 6. Proposed Frontend Layout (forward plan)

**Top Header (tabs):** Intelligence Map · Scenario Lab · Relocation Planner · Capacity Intelligence · Reports · Evidence Locker

**Left Sidebar:** Location Explorer · Layers · Visualization Controls

**Center:** Large GIS map (MapLibre GL JS), dominant panel

**Right Panel:** Settlement Evidence

**Bottom Panel (tabs/drawer):** Risk · Scenario · Relocation · Insights

**Visual direction**
- Background `#F6F8FA`, cards white, border `#D9E1E8`
- Headings `#173F6B`, body text `#1F2937`
- Status colors: safe `#2D7A6D`, warning `#B9770E`, high risk `#B94040`
- Modern GIS/terrain-intelligence, map-first dashboard feel
- Avoid: dark mode, neon, cyberpunk, war-room styling

This layout maps cleanly onto the required MVP flow: Login → Dashboard (Intelligence Map) → Map → Bhitai Malli (Evidence Locker/right panel) → Risk Explanation (bottom panel) → Protect/Adapt/Relocate (Scenario Lab) → Candidate Destination (Relocation Planner) → Capacity (Capacity Intelligence) → Officer Approval → PDF Report (Reports).

## 7. Frontend Plan / Backend Plan / Safest Implementation Order

**Frontend plan**
1. Scaffold Vite + React + TypeScript app under `frontend/`.
2. Install MapLibre GL JS; install a router (React Router).
3. Build the shell layout above with static placeholders (no logic yet): header tabs, left sidebar, center map canvas, right panel, bottom panel.
4. Wire routes to the shell: `/login`, `/dashboard`, `/map`, `/settlement/:id`, `/risk`, `/decision`, `/destination`, `/capacity`, `/approval`, `/report`.
5. Seed the map and right panel with the Bhitai Malli demo record once backend read endpoints exist.

**Backend plan**
1. Scaffold FastAPI app under `backend/` with SQLAlchemy, SQLite fallback (target PostGIS later).
2. Define models: Settlement, RiskAssessment, DecisionOption (Protect/Adapt/Relocate), CandidateDestination, CapacityAssessment, OfficerApproval, Report.
3. Seed Bhitai Malli demo settlement (population 383, households 86, elevation 991 m, slope 18.91°).
4. Build read-only API routes for settlements/risk/capacity first; add write routes (officer decisions/approval) after the UI can call them.
5. Add deterministic weighted-scoring risk logic (transparent, rule-based — no ML model).
6. Add PDF report generation last, once the approval flow output shape is stable.

**Safest implementation order**
1. Repo scaffolding (frontend + backend skeletons, no business logic).
2. Backend: DB models + Bhitai Malli seed data + basic read APIs.
3. Frontend: routing + shell layout (header/sidebar/map/right/bottom) with placeholder content, login gate stubbed.
4. Wire MapLibre to a settlement GeoJSON endpoint (Bhitai Malli only).
5. Risk Explanation view backed by deterministic scoring.
6. Protect/Adapt/Relocate decision workspace (Scenario Lab).
7. Candidate Destination + Capacity views (Relocation Planner / Capacity Intelligence).
8. Officer Approval workflow (officer-controlled, no autonomous decision).
9. PDF Report generation (Reports).
10. Real auth/login wrapping the whole flow.

---

## Frontend start command
Not available yet — nothing is scaffolded. Once step 1 of the frontend plan is done, the standard commands will be:
```
cd frontend
npm install
npm run dev
```

## Backend start command
Not available yet — nothing is scaffolded. Once step 1 of the backend plan is done, the standard commands will be:
```
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## Key files
None exist yet.

## Missing P0 features
Everything: repo scaffold (frontend + backend), database + models, Bhitai Malli seed data, GIS layers (GeoJSON/DEM), MapLibre map, all workflow screens (login, dashboard, map, evidence, risk, decision, destination, capacity, approval, reports), PDF export, auth.

## Recommended Task 02
**Scaffold VIKALP (frontend + backend) and implement the layout shell.**
- Initialize `frontend/` (Vite + React + TS + MapLibre + router) and `backend/` (FastAPI + SQLAlchemy + SQLite fallback).
- Build the static shell layout (header tabs, left sidebar, center map, right panel, bottom panel) with placeholder content and the visual direction specified in section 6.
- Seed the Bhitai Malli demo settlement in the backend and render it as a single map marker/right-panel card — no risk logic, decision logic, or PDF export yet.
- This doubles as the project's effective "Task 01," since no scaffolding exists to build on top of.
