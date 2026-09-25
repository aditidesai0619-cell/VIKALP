"""Serves the processed OpenStreetMap essential-services/POI extract
(Bhitai Malli vicinity, distance-filtered) from disk. Same shape as
services/roads.py and services/water.py. See docs/DATA_PROVENANCE.md
and data/processed/static/infrastructure/SOURCE.txt for exactly how
this file was produced (a tight-box query returning zero, a wider
padded-box query returning real hits, then a 3 km distance cutoff to
exclude a separate settlement's cluster — never a fabricated feature).
"""

import json
from functools import lru_cache
from pathlib import Path

from ..config import settings

_COVERAGE_BUFFER_DEGREES = 0.02


class AmenitiesUnavailable(Exception):
    """Raised when the processed services file is missing or invalid.

    Callers must surface this as an honest API error — never fall back
    to an empty FeatureCollection.
    """


@lru_cache(maxsize=1)
def _load_raw() -> dict:
    path = Path(settings.services_geojson_path)

    if not path.is_file():
        raise AmenitiesUnavailable(f"Services dataset not found at {path}.")

    try:
        with path.open("r", encoding="utf-8") as f:
            data = json.load(f)
    except json.JSONDecodeError as exc:
        raise AmenitiesUnavailable(
            f"Services dataset at {path} is not valid JSON: {exc}"
        ) from exc

    if data.get("type") != "FeatureCollection" or "features" not in data:
        raise AmenitiesUnavailable(
            f"Services dataset at {path} is not a valid GeoJSON FeatureCollection."
        )

    if not data["features"]:
        raise AmenitiesUnavailable(f"Services dataset at {path} contains no features.")

    return data


_AMENITY_PROPERTY_KEYS = ("amenity", "name", "osm_id", "osm_type", "distance_m", "source")


def load_amenities_geojson() -> dict:
    """Read-only GeoJSON view of the processed OSM services extract."""
    data = _load_raw()

    features = []
    for raw_feature in data["features"]:
        geometry = raw_feature.get("geometry") or {}
        raw_properties = raw_feature.get("properties") or {}
        features.append(
            {
                "type": "Feature",
                "geometry": {
                    "type": geometry.get("type"),
                    "coordinates": geometry.get("coordinates"),
                },
                "properties": {
                    key: raw_properties.get(key) for key in _AMENITY_PROPERTY_KEYS
                },
            }
        )

    return {"type": "FeatureCollection", "features": features}


def _extract_bbox(data: dict) -> tuple[float, float, float, float]:
    min_lon = min_lat = float("inf")
    max_lon = max_lat = float("-inf")
    for feature in data["features"]:
        coords = feature.get("geometry", {}).get("coordinates")
        if not (isinstance(coords, list) and len(coords) == 2):
            continue
        lon, lat = coords
        min_lon, max_lon = min(min_lon, lon), max(max_lon, lon)
        min_lat, max_lat = min(min_lat, lat), max(max_lat, lat)
    return min_lon, min_lat, max_lon, max_lat


def is_within_coverage(latitude: float, longitude: float) -> bool:
    """Whether a settlement's coordinate falls within (a small buffer
    around) this extract's actual bounding box. Note this dataset was
    itself already distance-filtered relative to Bhitai Malli's own
    coordinate (see docs/DATA_PROVENANCE.md) — this bbox gate is the
    same generic per-settlement safeguard the other layers use, not a
    second distance filter.
    """
    try:
        data = _load_raw()
    except AmenitiesUnavailable:
        return False

    min_lon, min_lat, max_lon, max_lat = _extract_bbox(data)
    return (
        min_lon - _COVERAGE_BUFFER_DEGREES <= longitude <= max_lon + _COVERAGE_BUFFER_DEGREES
        and min_lat - _COVERAGE_BUFFER_DEGREES <= latitude <= max_lat + _COVERAGE_BUFFER_DEGREES
    )
