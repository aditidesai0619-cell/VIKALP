from fastapi import APIRouter, Depends, HTTPException

from ..schemas.gis import BoundaryFeatureCollection, LandslideFeatureCollection
from ..services.audit import (
    ACTION_VIEW_GIS_BOUNDARIES,
    ACTION_VIEW_GIS_LANDSLIDES,
    OUTCOME_SUCCESS,
    record_audit_event,
)
from ..services.gis import (
    BoundariesUnavailable,
    LandslidesUnavailable,
    load_boundaries_geojson,
    load_landslides_geojson,
)
from .auth import AuthenticatedOfficer, get_current_officer

# Protected (Task 35 §E) — see api/settlements.py.
router = APIRouter(
    prefix="/api/gis", tags=["gis"], dependencies=[Depends(get_current_officer)]
)


@router.get("/boundaries", response_model=BoundaryFeatureCollection)
def get_boundaries(
    officer: AuthenticatedOfficer = Depends(get_current_officer),
) -> dict:
    try:
        result = load_boundaries_geojson()
    except BoundariesUnavailable as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    record_audit_event(
        actor=officer.username,
        role=officer.role,
        action=ACTION_VIEW_GIS_BOUNDARIES,
        outcome=OUTCOME_SUCCESS,
        resource_type="gis_layer",
        resource_id="boundaries",
    )
    return result


@router.get("/landslides", response_model=LandslideFeatureCollection)
def get_landslides(
    officer: AuthenticatedOfficer = Depends(get_current_officer),
) -> dict:
    """Read-only GeoJSON view of the GSI/NLFC field-validated landslide
    inventory (Task 20/38) — evidence for map display only. Never
    computes/duplicates a hazard score; see services/hazard_exposure.py
    for the risk engine's own, separate scoring pass over the same
    source file.
    """
    try:
        result = load_landslides_geojson()
    except LandslidesUnavailable as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    record_audit_event(
        actor=officer.username,
        role=officer.role,
        action=ACTION_VIEW_GIS_LANDSLIDES,
        outcome=OUTCOME_SUCCESS,
        resource_type="gis_layer",
        resource_id="landslides",
    )
    return result
