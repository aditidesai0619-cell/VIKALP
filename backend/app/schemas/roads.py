from typing import Any, Literal

from pydantic import BaseModel


class RoadGeometry(BaseModel):
    type: str
    coordinates: list[Any]


class RoadProperties(BaseModel):
    """OpenStreetMap `highway=*` tags only — see docs/DATA_PROVENANCE.md.

    Nothing invented: `name` and `surface` are null when OSM has no
    such tag, never filled in with a guess. `source` is a fixed
    disclosure string, not a per-feature judgement call.
    """

    highway: str | None = None
    name: str | None = None
    surface: str | None = None
    osm_way_id: int | None = None
    source: str = "OpenStreetMap contributors"


class RoadFeature(BaseModel):
    type: Literal["Feature"] = "Feature"
    geometry: RoadGeometry
    properties: RoadProperties


class RoadFeatureCollection(BaseModel):
    type: Literal["FeatureCollection"] = "FeatureCollection"
    features: list[RoadFeature]
