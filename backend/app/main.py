from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.audit import router as audit_router
from .api.auth import router as auth_router
from .api.copilot import router as copilot_router
from .api.decision import router as decision_router
from .api.destination import router as destination_router
from .api.evidence_tiles import router as evidence_tiles_router
from .api.gis import router as gis_router
from .api.report import router as report_router
from .api.risk import router as risk_router
from .api.settlements import router as settlements_router
from .api.weather import router as weather_router
from .database import init_db, seed_demo_data

# Local Vite dev server origin only — no wildcard, no production config yet.
DEV_FRONTEND_ORIGINS = ["http://localhost:5173"]


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    init_db()
    seed_demo_data()
    yield


app = FastAPI(title="VIKALP Backend", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=DEV_FRONTEND_ORIGINS,
    # POST added (Task 35) for /api/auth/login only — every other
    # endpoint remains GET-only, unchanged.
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# /api/auth/login is deliberately the only public /api/* route (Task 35
# §E) — every other router below requires a valid officer bearer token
# via each router's own `dependencies=[Depends(get_current_officer)]`.
app.include_router(auth_router)
app.include_router(settlements_router)
app.include_router(risk_router)
app.include_router(decision_router)
app.include_router(destination_router)
app.include_router(gis_router)
app.include_router(evidence_tiles_router)
app.include_router(report_router)
app.include_router(audit_router)
app.include_router(copilot_router)
app.include_router(weather_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
