from typing import Any, Literal

from pydantic import BaseModel


class WaterGeometry(BaseModel):
    type: str
    coordinates: list[Any]


class WaterProperties(BaseModel):
    """OpenStreetMap water-feature tags only — see docs/DATA_PROVENANCE.md.

    `waterway` and `natural` are both nullable since only one is ever
    set per real feature; nothing here is invented (no flow rate,
    depth, width, or flood status).
    """

    waterway: str | None = None
    natural: str | None = None
    name: str | None = None
    osm_way_id: int | None = None
    source: str = "OpenStreetMap contributors"


class WaterFeature(BaseModel):
    type: Literal["Feature"] = "Feature"
    geometry: WaterGeometry
    properties: WaterProperties


class WaterFeatureCollection(BaseModel):
    type: Literal["FeatureCollection"] = "FeatureCollection"
    features: list[WaterFeature]
