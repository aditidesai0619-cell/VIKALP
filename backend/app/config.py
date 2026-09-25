import os
from dataclasses import dataclass
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
REPO_ROOT = BACKEND_DIR.parent


@dataclass(frozen=True)
class Settings:
    # Local SQLite dev database only. PostgreSQL + PostGIS is the future
    # production target, not implemented here.
    database_path: str = os.environ.get(
        "VIKALP_DATABASE_PATH", str(BACKEND_DIR / "vikalp.db")
    )
    # Sourced, pre-processed static GIS layer (Task 12). See
    # docs/DATA_PROVENANCE.md for where this file comes from.
    boundaries_geojson_path: str = os.environ.get(
        "VIKALP_BOUNDARIES_GEOJSON_PATH",
        str(REPO_ROOT / "data" / "processed" / "static" / "boundaries_uk_demo.geojson"),
    )
    # Sourced, immutable raw GSI/NLFC landslide inventory (Task 20),
    # read-only. See docs/DATA_PROVENANCE.md. Used by the Hazard
    # Exposure landslide scoring rule (Task 21/22/23).
    gsi_landslides_geojson_path: str = os.environ.get(
        "VIKALP_GSI_LANDSLIDES_GEOJSON_PATH",
        str(
            REPO_ROOT
            / "data"
            / "raw"
            / "static"
            / "hazards"
            / "gsi_nlfc_field_validated_landslides_pauri_garhwal.geojson"
        ),
    )
    # Sourced, pre-processed Google Open Buildings v3 extract (Bhitai
    # Malli vicinity only — never the full 1.92 GB India file). See
    # docs/DATA_PROVENANCE.md and data/processed/static/buildings/SOURCE.txt
    # for exactly how this file was produced.
    buildings_geojson_path: str = os.environ.get(
        "VIKALP_BUILDINGS_GEOJSON_PATH",
        str(
            REPO_ROOT
            / "data"
            / "processed"
            / "static"
            / "buildings"
            / "bhitai_malli_open_buildings_vicinity.geojson"
        ),
    )
    # Sourced, pre-processed OpenStreetMap road/path extract (Bhitai
    # Malli vicinity only). See docs/DATA_PROVENANCE.md and
    # data/processed/static/infrastructure/SOURCE.txt.
    roads_geojson_path: str = os.environ.get(
        "VIKALP_ROADS_GEOJSON_PATH",
        str(
            REPO_ROOT
            / "data"
            / "processed"
            / "static"
            / "infrastructure"
            / "bhitai_malli_osm_roads_vicinity.geojson"
        ),
    )
    # Sourced, pre-processed OpenStreetMap water extract (Bhitai Malli
    # vicinity only). See docs/DATA_PROVENANCE.md.
    water_geojson_path: str = os.environ.get(
        "VIKALP_WATER_GEOJSON_PATH",
        str(
            REPO_ROOT
            / "data"
            / "processed"
            / "static"
            / "infrastructure"
            / "bhitai_malli_osm_water_vicinity.geojson"
        ),
    )
    # Sourced, pre-processed OpenStreetMap services/POI extract (Bhitai
    # Malli vicinity, distance-filtered — see docs/DATA_PROVENANCE.md).
    services_geojson_path: str = os.environ.get(
        "VIKALP_SERVICES_GEOJSON_PATH",
        str(
            REPO_ROOT
            / "data"
            / "processed"
            / "static"
            / "infrastructure"
            / "bhitai_malli_osm_services_vicinity.geojson"
        ),
    )

    # --- Authentication (Task 35) ---------------------------------------
    # Deliberately no default/fallback value for any of the four settings
    # below — unlike the file-path settings above (safe to default to a
    # repo-relative path), these are security-sensitive. `None`/missing
    # is a valid, representable state here; `services/auth.py` is what
    # actually enforces "required" and fails loudly (never silently
    # falls back to an insecure secret) the first time authentication is
    # exercised — not here at import time, so that unrelated modules
    # (risk/GIS/decision/destination/report) that don't need auth can
    # still be imported without requiring these to be set. See
    # docs/DECISIONS.md Task 35.
    jwt_secret: str | None = os.environ.get("VIKALP_JWT_SECRET")
    jwt_expires_minutes: int = int(os.environ.get("VIKALP_JWT_EXPIRES_MINUTES", "60"))
    officer_username: str | None = os.environ.get("VIKALP_OFFICER_USERNAME")
    officer_password: str | None = os.environ.get("VIKALP_OFFICER_PASSWORD")

    # Weather (Task 44) — Open-Meteo (open-meteo.com), a free, keyless
    # public weather API. No SDK/client library added; services/weather.py
    # calls this over stdlib urllib.request. Not an official India
    # Meteorological Department (IMD) source — disclosed as such in the
    # API response, never presented as an official forecast.
    weather_api_base_url: str = os.environ.get(
        "VIKALP_WEATHER_API_BASE_URL", "https://api.open-meteo.com/v1/forecast"
    )


settings = Settings()
