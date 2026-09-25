from typing import Any, Literal

from pydantic import BaseModel


class BuildingGeometry(BaseModel):
    type: str
    coordinates: list[Any]


class BuildingProperties(BaseModel):
    """Google Open Buildings v3 attributes only — see docs/DATA_PROVENANCE.md.

    Nothing here is invented: no height, no floor count, no owner, no
    building type. `confidence` and `area_in_meters` are the dataset's
    own detection outputs; `source` is a fixed disclosure string, never
    per-feature guesswork.
    """

    confidence: float
    area_in_meters: float
    full_plus_code: str | None = None
    source: str = "Google Open Buildings v3"


class BuildingFeature(BaseModel):
    type: Literal["Feature"] = "Feature"
    geometry: BuildingGeometry
    properties: BuildingProperties


class BuildingFeatureCollection(BaseModel):
    type: Literal["FeatureCollection"] = "FeatureCollection"
    features: list[BuildingFeature]
