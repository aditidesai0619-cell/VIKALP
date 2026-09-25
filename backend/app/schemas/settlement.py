from typing import Literal

from pydantic import BaseModel, Field

# Exact disclosure text — must not be changed without a documented decision.
_DEMO_PLANNING_INPUT_NOTE = "Demo planning input — source validation pending"
_CRS_NOTE = (
    "Coordinates are WGS84 longitude/latitude (EPSG:4326 convention). "
    "CRS is not database-enforced in the local SQLite prototype."
)


class SettlementRead(BaseModel):
    id: int
    name: str
    district: str
    state: str
    population: int
    households: int
    elevation_m: float
    slope_degrees: float
    latitude: float
    longitude: float
    data_note: str = Field(
        default="Demo planning inputs",
        description="These values are demo planning inputs, not live survey data.",
    )


class SettlementGeoJSONGeometry(BaseModel):
    type: Literal["Point"] = "Point"
    # (longitude, latitude) — GeoJSON coordinate order, not (lat, lon).
    coordinates: tuple[float, float]


class SettlementGeoJSONProperties(BaseModel):
    id: int
    name: str
    district: str
    state: str
    population: int
    households: int
    elevation_m: float
    slope_degrees: float
    data_status: str = Field(default=_DEMO_PLANNING_INPUT_NOTE)
    data_quality: str = Field(default=_DEMO_PLANNING_INPUT_NOTE)
    crs_note: str = Field(default=_CRS_NOTE)


class SettlementGeoJSONFeature(BaseModel):
    """GeoJSON Feature for a single settlement — see RFC 7946.

    Only the existing SQLite settlement row is ever served here. No new
    data, no other layer types (boundaries/roads/hazards/etc.).
    """

    type: Literal["Feature"] = "Feature"
    id: str
    geometry: SettlementGeoJSONGeometry
    properties: SettlementGeoJSONProperties
