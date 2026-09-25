"""Serves sourced, pre-processed static GIS layers from disk.

No database table is used for this — the processed dataset is a small,
static file (13 features, ~220 KB), read directly per the project's own
instruction not to introduce a table just to hold GeoJSON that doesn't
need one. See docs/DATA_PROVENANCE.md for where this file comes from
and how it was produced.
"""

import json
from functools import lru_cache
from pathlib import Path

from ..config import settings


class BoundariesUnavailable(Exception):
    """Raised when the processed boundaries file is missing or invalid.

    Callers must surface this as an honest API error — never fall back
    to an empty FeatureCollection.
    """


def load_boundaries_geojson() -> dict:
    path = Path(settings.boundaries_geojson_path)

    if not path.is_file():
        raise BoundariesUnavailable(f"Boundaries dataset not found at {path}.")

    try:
        with path.open("r", encoding="utf-8") as f:
            data = json.load(f)
    except json.JSONDecodeError as exc:
        raise BoundariesUnavailable(
            f"Boundaries dataset at {path} is not valid JSON: {exc}"
        ) from exc

    if data.get("type") != "FeatureCollection" or "features" not in data:
        raise BoundariesUnavailable(
            f"Boundaries dataset at {path} is not a valid GeoJSON FeatureCollection."
        )

    if not data["features"]:
        raise BoundariesUnavailable(f"Boundaries dataset at {path} contains no features.")

    return data


class LandslidesUnavailable(Exception):
    """Raised when the raw GSI/NLFC landslide inventory file is missing
    or invalid.

    Callers must surface this as an honest API error — never fall back
    to an empty FeatureCollection.
    """


# The raw GSI file (Task 20) carries roughly a hundred source columns.
# This map/evidence endpoint is a read-only visualization layer, not a
# full data export — it exposes only the same four identifying fields
# hazard_exposure.py's own LandslideRecord already consumes for scoring
# (see hazard_exposure.py's _load_records). This module never imports
# from hazard_exposure.py and never recomputes/duplicates its scoring
# logic; it only re-reads the same immutable source file independently
# for map display.
_LANDSLIDE_PROPERTY_KEYS = ("slide_no", "activity", "triggering", "toposheet")


@lru_cache(maxsize=1)
def load_landslides_geojson() -> dict:
    """Read-only GeoJSON view of the full GSI/NLFC landslide inventory.

    Every feature in the source file is passed through — geometry is
    copied verbatim (never reprojected, simplified, or filtered), and
    the source file itself is only ever opened for reading. Only a
    minimal property subset is exposed (see _LANDSLIDE_PROPERTY_KEYS);
    this is intentionally not a full export of the ~100-column raw
    schema.

    Cached (like hazard_exposure.py's own _load_records over the same
    file) — the ~2.3 MB / 813-feature source is immutable within a
    process lifetime, so re-parsing it on every request would be
    wasted work for a page that may poll this endpoint repeatedly.
    """
    path = Path(settings.gsi_landslides_geojson_path)

    if not path.is_file():
        raise LandslidesUnavailable(f"Landslide inventory dataset not found at {path}.")

    try:
        with path.open("r", encoding="utf-8") as f:
            data = json.load(f)
    except json.JSONDecodeError as exc:
        raise LandslidesUnavailable(
            f"Landslide inventory dataset at {path} is not valid JSON: {exc}"
        ) from exc

    if data.get("type") != "FeatureCollection" or "features" not in data:
        raise LandslidesUnavailable(
            f"Landslide inventory dataset at {path} is not a valid GeoJSON FeatureCollection."
        )

    if not data["features"]:
        raise LandslidesUnavailable(
            f"Landslide inventory dataset at {path} contains no features."
        )

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
                    key: raw_properties.get(key) for key in _LANDSLIDE_PROPERTY_KEYS
                },
            }
        )

    return {"type": "FeatureCollection", "features": features}
