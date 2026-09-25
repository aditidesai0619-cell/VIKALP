"""GSI/NLFC landslide inventory served as Mapbox Vector Tiles (Task 45.8).

Why: the Evidence workspace's map previously loaded the entire 813-
feature GSI GeoJSON into the browser up front (GET /api/gis/landslides,
unchanged, still used by every other workspace). This module serves
the exact same, unmodified source data — read through
services/gis.py's own load_landslides_geojson(), never re-reading the
raw file independently, and never recomputing/duplicating any scoring
logic — as viewport-scoped vector tiles instead: only the features
that fall within a requested {z}/{x}/{y} tile are encoded and
returned, and only when the browser's map actually requests that tile.

This is a MINIMUM local tile-serving mechanism, not production tile
infrastructure: an in-process, in-memory linear scan over 813 points
per request (cheap — no spatial index/database, no pre-generated tile
cache, no PostGIS, no Docker, no external tile server). Scoped to this
one dataset only — boundaries and the settlement point stay plain
GeoJSON fetches, per this task's own "do not vector-tile every
dataset" instruction.
"""

from __future__ import annotations

import math
from functools import lru_cache

import mapbox_vector_tile
from pyproj import Transformer

from .gis import load_landslides_geojson

_LAYER_NAME = "gsi_landslides"
# Standard XYZ/Web Mercator full extent in meters (EPSG:3857).
_WEB_MERCATOR_EXTENT = 20037508.342789244
_MAX_ZOOM = 22

_to_web_mercator = Transformer.from_crs("EPSG:4326", "EPSG:3857", always_xy=True)


class InvalidTileCoordinates(Exception):
    """Raised for a z/x/y outside the valid XYZ tile scheme range."""


@lru_cache(maxsize=1)
def _load_projected_features() -> list[dict]:
    """Every real GSI point, reprojected to Web Mercator once.

    Cached like load_landslides_geojson() itself — the source file is
    immutable within a process lifetime, so reprojecting all 813 points
    on every tile request would be wasted, repeated work.
    """
    collection = load_landslides_geojson()
    projected: list[dict] = []
    for feature in collection["features"]:
        geometry = feature.get("geometry") or {}
        if geometry.get("type") != "Point":
            continue
        coordinates = geometry.get("coordinates")
        if not coordinates or len(coordinates) < 2:
            continue
        lon, lat = coordinates[0], coordinates[1]
        x, y = _to_web_mercator.transform(lon, lat)
        projected.append(
            {"lon": lon, "lat": lat, "x": x, "y": y, "properties": feature["properties"]}
        )
    return projected


def _tile_bounds_lonlat(z: int, x: int, y: int) -> tuple[float, float, float, float]:
    """Standard slippy-map tile bounds, in degrees (EPSG:4326)."""
    n = 2**z
    lon_min = x / n * 360.0 - 180.0
    lon_max = (x + 1) / n * 360.0 - 180.0
    lat_max = math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * y / n))))
    lat_min = math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * (y + 1) / n))))
    return lon_min, lat_min, lon_max, lat_max


def _tile_bounds_web_mercator(z: int, x: int, y: int) -> tuple[float, float, float, float]:
    """Standard slippy-map tile bounds, in meters (EPSG:3857) — the
    coordinate space real vector tiles are encoded in, so points line
    up correctly with every other Web-Mercator-tiled basemap."""
    n = 2**z
    tile_size = 2 * _WEB_MERCATOR_EXTENT / n
    minx = -_WEB_MERCATOR_EXTENT + x * tile_size
    maxx = -_WEB_MERCATOR_EXTENT + (x + 1) * tile_size
    maxy = _WEB_MERCATOR_EXTENT - y * tile_size
    miny = _WEB_MERCATOR_EXTENT - (y + 1) * tile_size
    return minx, miny, maxx, maxy


def build_landslide_tile(z: int, x: int, y: int) -> bytes:
    """Encode the real GSI/NLFC landslide points falling inside tile
    z/x/y as a Mapbox Vector Tile (protobuf bytes). Never fabricates a
    feature — a tile with no matching real records simply encodes an
    empty layer."""
    if not (0 <= z <= _MAX_ZOOM):
        raise InvalidTileCoordinates(f"zoom {z} out of range (0-{_MAX_ZOOM})")
    n = 2**z
    if not (0 <= x < n and 0 <= y < n):
        raise InvalidTileCoordinates(f"tile {z}/{x}/{y} out of range for zoom {z}")

    lon_min, lat_min, lon_max, lat_max = _tile_bounds_lonlat(z, x, y)
    merc_bounds = _tile_bounds_web_mercator(z, x, y)

    matching = [
        f
        for f in _load_projected_features()
        if lon_min <= f["lon"] <= lon_max and lat_min <= f["lat"] <= lat_max
    ]

    mvt_features = [
        {"geometry": f"POINT({f['x']} {f['y']})", "properties": f["properties"]}
        for f in matching
    ]

    return mapbox_vector_tile.encode(
        [{"name": _LAYER_NAME, "features": mvt_features}],
        default_options={"quantize_bounds": merc_bounds},
    )
