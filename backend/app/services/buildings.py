"""Serves the processed Google Open Buildings v3 extract (Bhitai Malli
vicinity only) from disk.

Not a database table, same reasoning as services/gis.py's boundaries
loader — one small static file (~500 features), read directly. See
docs/DATA_PROVENANCE.md for where this file comes from: a single
DuckDB spatial query against the public source.coop GeoParquet
re-hosting of Google Open Buildings v3, filtered to a ~1.1km box
around Bhitai Malli's recorded coordinate. The raw 1.92 GB/7.19 GB
upstream files were never downloaded in full and are not stored
anywhere in this repository.
"""

import json
from functools import lru_cache
from pathlib import Path

from ..config import settings

# How far (in degrees) a settlement's own coordinate may be from this
# extract's bounding box and still be considered "covered" — a small
# buffer only, not a license to serve this Bhitai-Malli-specific
# extract for an unrelated settlement. ~0.02 deg is ~2km at this
# latitude, comfortably covering the extract's own ~1.1km half-width
# query box plus a small margin, without being so generous that a
# distant settlement would incorrectly be told buildings are available.
_COVERAGE_BUFFER_DEGREES = 0.02


class BuildingsUnavailable(Exception):
    """Raised when the processed buildings file is missing or invalid.

    Callers must surface this as an honest API error — never fall back
    to an empty FeatureCollection.
    """


@lru_cache(maxsize=1)
def _load_raw() -> dict:
    path = Path(settings.buildings_geojson_path)

    if not path.is_file():
        raise BuildingsUnavailable(f"Buildings dataset not found at {path}.")

    try:
        with path.open("r", encoding="utf-8") as f:
            data = json.load(f)
    except json.JSONDecodeError as exc:
        raise BuildingsUnavailable(
            f"Buildings dataset at {path} is not valid JSON: {exc}"
        ) from exc

    if data.get("type") != "FeatureCollection" or "features" not in data:
        raise BuildingsUnavailable(
            f"Buildings dataset at {path} is not a valid GeoJSON FeatureCollection."
        )

    if not data["features"]:
        raise BuildingsUnavailable(f"Buildings dataset at {path} contains no features.")

    return data


_BUILDING_PROPERTY_KEYS = ("confidence", "area_in_meters", "full_plus_code", "source")


def load_buildings_geojson() -> dict:
    """Read-only GeoJSON view of the processed Open Buildings extract.

    Re-maps properties through an explicit allowlist (same defensive
    style as services/gis.py's landslide loader) rather than a blind
    passthrough, even though the processed file already only contains
    these fields.
    """
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
                    key: raw_properties.get(key) for key in _BUILDING_PROPERTY_KEYS
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
    around) this extract's actual bounding box — the gate the API uses
    to decide whether to serve this Bhitai-Malli-specific extract for
    a given settlement, instead of hardcoding a settlement id.
    """
    try:
        data = _load_raw()
    except BuildingsUnavailable:
        return False

    min_lon, min_lat, max_lon, max_lat = _extract_bbox(data)
    return (
        min_lon - _COVERAGE_BUFFER_DEGREES <= longitude <= max_lon + _COVERAGE_BUFFER_DEGREES
        and min_lat - _COVERAGE_BUFFER_DEGREES <= latitude <= max_lat + _COVERAGE_BUFFER_DEGREES
    )
