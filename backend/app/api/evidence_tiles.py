from fastapi import APIRouter, Depends, HTTPException, Response

from ..services.gis import LandslidesUnavailable, load_landslides_geojson
from ..services.gis_tiles import InvalidTileCoordinates, build_landslide_tile
from .auth import AuthenticatedOfficer, get_current_officer

# Protected the same way every other GIS/evidence endpoint is (Task 35
# §E) — same auth dependency as api/gis.py.
#
# No per-tile audit_event call here, deliberately: a single map pan/
# zoom can trigger dozens of independent tile requests for what is, to
# the officer, one "viewed the GSI evidence layer" action — logging
# each one would flood the audit trail with near-duplicate entries.
# The equivalent, already-existing ACTION_VIEW_GIS_LANDSLIDES audit
# event (api/gis.py) still fires whenever the same evidence is fetched
# as a plain GeoJSON layer elsewhere in the app.
router = APIRouter(
    prefix="/api/evidence", tags=["evidence-tiles"], dependencies=[Depends(get_current_officer)]
)


@router.get("/gsi-landslides/tiles/{z}/{x}/{y}.pbf")
def get_gsi_landslide_tile(
    z: int,
    x: int,
    y: int,
    officer: AuthenticatedOfficer = Depends(get_current_officer),
) -> Response:
    """Real GSI/NLFC landslide inventory records for one {z}/{x}/{y}
    tile, as a Mapbox Vector Tile — viewport-scoped, not the full
    813-feature dataset (see services/gis_tiles.py). `officer` is
    unused beyond the auth dependency above (FastAPI's own convention,
    matching api/gis.py's get_boundaries/get_landslides)."""
    del officer
    try:
        data = build_landslide_tile(z, x, y)
    except InvalidTileCoordinates as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except LandslidesUnavailable as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return Response(content=data, media_type="application/x-protobuf")


@router.get("/gsi-landslides/count")
def get_gsi_landslide_count(
    officer: AuthenticatedOfficer = Depends(get_current_officer),
) -> dict:
    """Just the real total feature count — never the geometry — so the
    Evidence workspace can show "813 inventory records" without ever
    downloading the full GeoJSON (that would defeat the point of
    serving this dataset as vector tiles)."""
    del officer
    try:
        collection = load_landslides_geojson()
    except LandslidesUnavailable as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return {"count": len(collection["features"])}
