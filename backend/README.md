# VIKALP Backend

FastAPI backend foundation. SQLite for local development; PostgreSQL +
PostGIS remains the future production target (not implemented here).

## Setup

```
cd backend
python -m venv .venv
.venv\Scripts\activate      # Windows
# source .venv/bin/activate # macOS/Linux
pip install -r requirements.txt
```

## Run

```
uvicorn app.main:app --reload
```

Starts at `http://127.0.0.1:8000`. On startup it creates `vikalp.db`
(SQLite, in this directory) if it doesn't exist and seeds the Bhitai
Malli demo settlement — idempotent, so restarting never duplicates it.

## Endpoints

- `GET /health` — basic health check
- `GET /api/settlements` — list settlements (currently just Bhitai Malli)
- `GET /api/settlements/{id}` — one settlement, 404 if it doesn't exist

All settlement fields are demo planning inputs (`data_note` on every
response says so), not live survey/GIS data.

## Structure

```
app/
  main.py          FastAPI app, health route, DB init/seed on startup
  config.py        env-driven settings (DB path only)
  database.py      sqlite3 connection + schema + seed (no ORM)
  models/          plain dataclasses mapped from DB rows
  schemas/         Pydantic request/response models
  api/             route modules
```

## Current limitations

- No authentication, RBAC, or audit logging yet.
- No risk, decision, destination, capacity, or relocation logic —
  settlement reads only.
- Not connected to the frontend yet.
- No migration framework — `database.py`'s `init_db()`/`seed_demo_data()`
  is a plain, idempotent SQL bootstrap, sufficient for this stage.
