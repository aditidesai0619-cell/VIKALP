"""Serves the processed OpenStreetMap road/path extract (Bhitai Malli
vicinity only) from disk.

Same shape and reasoning as services/buildings.py: one small static
file, read directly, never a live Overpass call from the running
application. See docs/DATA_PROVENANCE.md and
data/processed/static/infrastructure/SOURCE.txt for exactly how this
file was produced (one Overpass query, clipped to a padded vicinity
box using only the way's own original points).
"""

import json
from functools import lru_cache
from pathlib import Path

from ..config import settings

# Same reasoning as services/buildings.py's own buffer: a small margin
# around this extract's actual bounding box, not a license to serve
# Bhitai-Malli-specific roads for an unrelated settlement.
_COVERAGE_BUFFER_DEGREES = 0.02


class RoadsUnavailable(Exception):
    """Raised when the processed roads file is missing or invalid.

    Callers must surface this as an honest API error — never fall back
    to an empty FeatureCollection.
    """


@lru_cache(maxsize=1)
def _load_raw() -> dict:
    path = Path(settings.roads_geojson_path)

    if not path.is_file():
        raise RoadsUnavailable(f"Roads dataset not found at {path}.")

    try:
        with path.open("r", encoding="utf-8") as f:
            data = json.load(f)
    except json.JSONDecodeError as exc:
        raise RoadsUnavailable(f"Roads dataset at {path} is not valid JSON: {exc}") from exc

    if data.get("type") != "FeatureCollection" or "features" not in data:
        raise RoadsUnavailable(
            f"Roads dataset at {path} is not a valid GeoJSON FeatureCollection."
        )

    if not data["features"]:
        raise RoadsUnavailable(f"Roads dataset at {path} contains no features.")

    return data


_ROAD_PROPERTY_KEYS = ("highway", "name", "surface", "osm_way_id", "source")


def load_roads_geojson() -> dict:
    """Read-only GeoJSON view of the processed OSM road/path extract."""
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
                    key: raw_properties.get(key) for key in _ROAD_PROPERTY_KEYS
                },
            }
        )

    return {"type": "FeatureCollection", "features": features}


def _extract_bbox(data: dict) -> tuple[float, float, float, float]:
    """Returns (min_lon, min_lat, max_lon, max_lat) across every feature."""
    min_lon = min_lat = float("inf")
    max_lon = max_lat = float("-inf")

    def visit(coords: object) -> None:
        nonlocal min_lon, min_lat, max_lon, max_lat
        if (
            isinstance(coords, list)
            and len(coords) >= 2
            and isinstance(coords[0], (int, float))
            and isinstance(coords[1], (int, float))
        ):
            lon, lat = coords[0], coords[1]
            min_lon, max_lon = min(min_lon, lon), max(max_lon, lon)
            min_lat, max_lat = min(min_lat, lat), max(max_lat, lat)
            return
        if isinstance(coords, list):
            for item in coords:
                visit(item)

    for feature in data["features"]:
        visit(feature.get("geometry", {}).get("coordinates"))

    return min_lon, min_lat, max_lon, max_lat


def is_within_coverage(latitude: float, longitude: float) -> bool:
    """Whether a settlement's coordinate falls within (a small buffer
    around) this extract's actual bounding box — mirrors
    services/buildings.py's own gate, applied independently here since
    the two datasets have different real extents.
    """
    try:
        data = _load_raw()
    except RoadsUnavailable:
        return False

    min_lon, min_lat, max_lon, max_lat = _extract_bbox(data)
    return (
        min_lon - _COVERAGE_BUFFER_DEGREES <= longitude <= max_lon + _COVERAGE_BUFFER_DEGREES
        and min_lat - _COVERAGE_BUFFER_DEGREES <= latitude <= max_lat + _COVERAGE_BUFFER_DEGREES
    )
