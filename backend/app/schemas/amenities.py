from typing import Literal

from pydantic import BaseModel


class AmenityGeometry(BaseModel):
    type: Literal["Point"] = "Point"
    # [lon, lat] — every real feature in this extract is a Point (or a
    # way's centroid, computed during processing, never an OSM-tagged
    # Point pretending to be something else). See docs/DATA_PROVENANCE.md.
    coordinates: tuple[float, float]


class AmenityProperties(BaseModel):
    """OpenStreetMap `amenity=*` attributes only — see
    docs/DATA_PROVENANCE.md. Never capacity, staffing, opening hours,
    service quality, or ownership — none of that exists in the source.
    `distance_m` is computed from the settlement's own coordinate
    during processing (documented), not an OSM field.
    """

    amenity: str
    name: str | None = None
    osm_id: int | None = None
    osm_type: str | None = None
    distance_m: float | None = None
    source: str = "OpenStreetMap contributors"


class AmenityFeature(BaseModel):
    type: Literal["Feature"] = "Feature"
    geometry: AmenityGeometry
    properties: AmenityProperties


class AmenityFeatureCollection(BaseModel):
    type: Literal["FeatureCollection"] = "FeatureCollection"
    features: list[AmenityFeature]
