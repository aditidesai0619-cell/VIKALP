from typing import Any, Literal

from pydantic import BaseModel


class BoundaryGeometry(BaseModel):
    type: str
    # Nested coordinate arrays vary by geometry type (Polygon vs
    # MultiPolygon etc.) — left as generic nested lists rather than
    # over-fitting a schema to this dataset's current Polygon-only shape.
    coordinates: list[Any]


class BoundaryProperties(BaseModel):
    """Original source attributes only — see docs/DATA_PROVENANCE.md.

    Field names match the raw geoBoundaries file verbatim (shapeName,
    not "name"; shapeID, not "id"). Nothing here is invented.
    """

    shapeName: str | None = None
    shapeISO: str | None = None
    shapeID: str | None = None
    shapeGroup: str | None = None
    shapeType: str | None = None


class BoundaryFeature(BaseModel):
    type: Literal["Feature"] = "Feature"
    geometry: BoundaryGeometry
    properties: BoundaryProperties


class BoundaryFeatureCollection(BaseModel):
    type: Literal["FeatureCollection"] = "FeatureCollection"
    features: list[BoundaryFeature]


class LandslideProperties(BaseModel):
    """Minimal subset of the raw GSI/NLFC inventory's ~100 source
    columns — the same four identifying fields hazard_exposure.py's
    own LandslideRecord already consumes for scoring. This is a
    visualization/evidence layer, not a full data export; nothing here
    is renamed, derived, or invented. See docs/DATA_PROVENANCE.md.
    """

    slide_no: str | None = None
    activity: str | None = None
    triggering: str | None = None
    toposheet: str | None = None


class LandslideFeature(BaseModel):
    type: Literal["Feature"] = "Feature"
    # Same geometry shape as a boundary feature (GeoJSON Point here,
    # rather than Polygon) — reused rather than duplicating an
    # identical model.
    geometry: BoundaryGeometry
    properties: LandslideProperties


class LandslideFeatureCollection(BaseModel):
    type: Literal["FeatureCollection"] = "FeatureCollection"
    features: list[LandslideFeature]
