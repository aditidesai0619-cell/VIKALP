from fastapi import APIRouter, Depends, HTTPException

from ..database import get_connection
from ..models.settlement import Settlement
from ..schemas.amenities import AmenityFeatureCollection
from ..schemas.buildings import BuildingFeatureCollection
from ..schemas.roads import RoadFeatureCollection
from ..schemas.water import WaterFeatureCollection
from ..schemas.settlement import (
    SettlementGeoJSONFeature,
    SettlementGeoJSONGeometry,
    SettlementGeoJSONProperties,
    SettlementRead,
)
from ..services.audit import (
    ACTION_VIEW_AMENITIES,
    ACTION_VIEW_BUILDINGS,
    ACTION_VIEW_ROADS,
    ACTION_VIEW_SETTLEMENT,
    ACTION_VIEW_WATER,
    OUTCOME_SUCCESS,
    record_audit_event,
)
from ..services.amenities import (
    AmenitiesUnavailable,
    is_within_coverage as amenities_within_coverage,
    load_amenities_geojson,
)
from ..services.buildings import (
    BuildingsUnavailable,
    is_within_coverage,
    load_buildings_geojson,
)
from ..services.roads import RoadsUnavailable, is_within_coverage as roads_within_coverage, load_roads_geojson
from ..services.water import WaterUnavailable, is_within_coverage as water_within_coverage, load_water_geojson
from .auth import AuthenticatedOfficer, get_current_officer

# Protected (Task 35 §E) — every route below requires a valid officer
# bearer token. Route bodies/business logic are unchanged.
router = APIRouter(
    prefix="/api/settlements",
    tags=["settlements"],
    dependencies=[Depends(get_current_officer)],
)


def _to_schema(settlement: Settlement) -> SettlementRead:
    return SettlementRead(
        id=settlement.id,
        name=settlement.name,
        district=settlement.district,
        state=settlement.state,
        population=settlement.population,
        households=settlement.households,
        elevation_m=settlement.elevation_m,
        slope_degrees=settlement.slope_degrees,
        latitude=settlement.latitude,
        longitude=settlement.longitude,
    )


def _to_geojson(settlement: Settlement) -> SettlementGeoJSONFeature:
    return SettlementGeoJSONFeature(
        id=str(settlement.id),
        geometry=SettlementGeoJSONGeometry(
            coordinates=(settlement.longitude, settlement.latitude),
        ),
        properties=SettlementGeoJSONProperties(
            id=settlement.id,
            name=settlement.name,
            district=settlement.district,
            state=settlement.state,
            population=settlement.population,
            households=settlement.households,
            elevation_m=settlement.elevation_m,
            slope_degrees=settlement.slope_degrees,
        ),
    )


@router.get("", response_model=list[SettlementRead])
def list_settlements() -> list[SettlementRead]:
    with get_connection() as conn:
        rows = conn.execute("SELECT * FROM settlements ORDER BY id").fetchall()
    return [_to_schema(Settlement.from_row(row)) for row in rows]


@router.get("/{settlement_id}", response_model=SettlementRead)
def get_settlement(
    settlement_id: int,
    officer: AuthenticatedOfficer = Depends(get_current_officer),
) -> SettlementRead:
    with get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM settlements WHERE id = ?", (settlement_id,)
        ).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Settlement not found")
    result = _to_schema(Settlement.from_row(row))
    record_audit_event(
        actor=officer.username,
        role=officer.role,
        action=ACTION_VIEW_SETTLEMENT,
        outcome=OUTCOME_SUCCESS,
        resource_type="settlement",
        resource_id=str(settlement_id),
    )
    return result


@router.get("/{settlement_id}/geojson", response_model=SettlementGeoJSONFeature)
def get_settlement_geojson(settlement_id: int) -> SettlementGeoJSONFeature:
    with get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM settlements WHERE id = ?", (settlement_id,)
        ).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Settlement not found")
    return _to_geojson(Settlement.from_row(row))


@router.get("/{settlement_id}/buildings", response_model=BuildingFeatureCollection)
def get_settlement_buildings(
    settlement_id: int,
    officer: AuthenticatedOfficer = Depends(get_current_officer),
) -> dict:
    """Google Open Buildings v3 footprints for this settlement's
    immediate vicinity (Task: 3D terrain follow-up). Only ever serves
    the one small, pre-processed local extract — never the full
    India/world dataset — and only when the settlement's own recorded
    coordinate actually falls within that extract's coverage area, so
    a future settlement outside Bhitai Malli's vicinity gets an honest
    404 rather than someone else's buildings.
    """
    with get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM settlements WHERE id = ?", (settlement_id,)
        ).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Settlement not found")

    settlement = Settlement.from_row(row)
    if not is_within_coverage(settlement.latitude, settlement.longitude):
        raise HTTPException(
            status_code=404,
            detail=(
                "Building footprint data is not available for this settlement "
                "(outside the processed Open Buildings coverage area)."
            ),
        )

    try:
        result = load_buildings_geojson()
    except BuildingsUnavailable as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    record_audit_event(
        actor=officer.username,
        role=officer.role,
        action=ACTION_VIEW_BUILDINGS,
        outcome=OUTCOME_SUCCESS,
        resource_type="building_footprints",
        resource_id=str(settlement_id),
    )
    return result


@router.get("/{settlement_id}/roads", response_model=RoadFeatureCollection)
def get_settlement_roads(
    settlement_id: int,
    officer: AuthenticatedOfficer = Depends(get_current_officer),
) -> dict:
    """OpenStreetMap road/path geometry for this settlement's immediate
    vicinity (Task: road/path layer follow-up to the buildings
    integration). Same coverage-gate pattern as /buildings: only ever
    serves the one small, pre-processed local extract, and only when
    the settlement's own recorded coordinate falls within its
    coverage area.
    """
    with get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM settlements WHERE id = ?", (settlement_id,)
        ).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Settlement not found")

    settlement = Settlement.from_row(row)
    if not roads_within_coverage(settlement.latitude, settlement.longitude):
        raise HTTPException(
            status_code=404,
            detail=(
                "Road/path data is not available for this settlement "
                "(outside the processed OpenStreetMap coverage area)."
            ),
        )

    try:
        result = load_roads_geojson()
    except RoadsUnavailable as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    record_audit_event(
        actor=officer.username,
        role=officer.role,
        action=ACTION_VIEW_ROADS,
        outcome=OUTCOME_SUCCESS,
        resource_type="road_network",
        resource_id=str(settlement_id),
    )
    return result


@router.get("/{settlement_id}/water", response_model=WaterFeatureCollection)
def get_settlement_water(
    settlement_id: int,
    officer: AuthenticatedOfficer = Depends(get_current_officer),
) -> dict:
    """OpenStreetMap water-feature geometry for this settlement's
    immediate vicinity (Task: water/services layer). Same
    coverage-gate pattern as /buildings and /roads.
    """
    with get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM settlements WHERE id = ?", (settlement_id,)
        ).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Settlement not found")

    settlement = Settlement.from_row(row)
    if not water_within_coverage(settlement.latitude, settlement.longitude):
        raise HTTPException(
            status_code=404,
            detail=(
                "Water feature data is not available for this settlement "
                "(outside the processed OpenStreetMap coverage area)."
            ),
        )

    try:
        result = load_water_geojson()
    except WaterUnavailable as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    record_audit_event(
        actor=officer.username,
        role=officer.role,
        action=ACTION_VIEW_WATER,
        outcome=OUTCOME_SUCCESS,
        resource_type="water_features",
        resource_id=str(settlement_id),
    )
    return result


@router.get("/{settlement_id}/services", response_model=AmenityFeatureCollection)
def get_settlement_services(
    settlement_id: int,
    officer: AuthenticatedOfficer = Depends(get_current_officer),
) -> dict:
    """OpenStreetMap essential-services/POI points near this
    settlement (Task: water/services layer). Same coverage-gate
    pattern as /buildings, /roads, and /water. The processed extract
    itself is already distance-filtered relative to Bhitai Malli (see
    docs/DATA_PROVENANCE.md) to exclude a separate settlement's
    cluster of services ~6 km away.
    """
    with get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM settlements WHERE id = ?", (settlement_id,)
        ).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Settlement not found")

    settlement = Settlement.from_row(row)
    if not amenities_within_coverage(settlement.latitude, settlement.longitude):
        raise HTTPException(
            status_code=404,
            detail=(
                "Services/POI data is not available for this settlement "
                "(outside the processed OpenStreetMap coverage area)."
            ),
        )

    try:
        result = load_amenities_geojson()
    except AmenitiesUnavailable as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    record_audit_event(
        actor=officer.username,
        role=officer.role,
        action=ACTION_VIEW_AMENITIES,
        outcome=OUTCOME_SUCCESS,
        resource_type="services_poi",
        resource_id=str(settlement_id),
    )
    return result
