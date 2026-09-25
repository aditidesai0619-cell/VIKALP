"""Regression tests for the GSI/NLFC landslide Mapbox Vector Tile
endpoint (Task 45.8) — GET /api/evidence/gsi-landslides/tiles/{z}/{x}/{y}.pbf.

Verifies the tile encoder against the real, unmodified GSI inventory
(the same 813-feature source api/gis.py's own GeoJSON endpoint reads)
using the direct-route-call pattern established in Tasks 33-35 (see
fixtures.py's own docstring): a tile covering the whole real dataset's
extent must decode back to every real feature (no fabrication, no
loss); a tile covering an unrelated, far-away location must decode to
zero features (no false positives); and a request for a nonsensical
tile coordinate must fail loudly rather than return an empty 200.
"""

import unittest

import mapbox_vector_tile

from app.api.evidence_tiles import get_gsi_landslide_count, get_gsi_landslide_tile
from app.services.gis import load_landslides_geojson

from fixtures import TEST_OFFICER


class TestGsiLandslideCount(unittest.TestCase):
    def test_count_matches_real_dataset_and_carries_no_geometry(self):
        result = get_gsi_landslide_count(officer=TEST_OFFICER)
        expected_count = len(load_landslides_geojson()["features"])
        self.assertEqual(result, {"count": expected_count})


class TestGsiLandslideTiles(unittest.TestCase):
    def test_z4_tile_containing_pauri_garhwal_has_every_real_feature(self):
        # Verified directly against the raw source file (not asserted
        # blindly): every one of the 813 real GSI records falls inside
        # this single z=4 tile.
        response = get_gsi_landslide_tile(z=4, x=11, y=6, officer=TEST_OFFICER)
        self.assertEqual(response.media_type, "application/x-protobuf")

        decoded = mapbox_vector_tile.decode(response.body)
        expected_count = len(load_landslides_geojson()["features"])
        self.assertEqual(len(decoded["gsi_landslides"]["features"]), expected_count)

    def test_z12_tile_containing_bhitai_malli_has_real_features(self):
        # Computed directly from Bhitai Malli's own verified coordinates
        # (30.167112, 78.781266) via standard slippy-map tile math.
        response = get_gsi_landslide_tile(z=12, x=2944, y=1687, officer=TEST_OFFICER)
        decoded = mapbox_vector_tile.decode(response.body)
        features = decoded["gsi_landslides"]["features"]
        self.assertGreater(len(features), 0)
        for feature in features:
            properties = feature["properties"]
            self.assertIn("slide_no", properties)
            self.assertIn("activity", properties)
            self.assertIn("triggering", properties)
            self.assertIn("toposheet", properties)

    def test_tile_far_from_any_real_record_is_empty_not_fabricated(self):
        # A z=12 tile over central Delhi (~28.6°N, 77.2°E) — nowhere
        # near the Pauri Garhwal inventory. Must be genuinely empty,
        # never a fabricated placeholder feature.
        response = get_gsi_landslide_tile(z=12, x=2896, y=1782, officer=TEST_OFFICER)
        decoded = mapbox_vector_tile.decode(response.body)
        features = decoded.get("gsi_landslides", {}).get("features", [])
        self.assertEqual(features, [])

    def test_out_of_range_tile_coordinates_return_404_not_empty_200(self):
        from fastapi import HTTPException

        with self.assertRaises(HTTPException) as ctx:
            get_gsi_landslide_tile(z=5, x=999, y=999, officer=TEST_OFFICER)
        self.assertEqual(ctx.exception.status_code, 404)

    def test_response_is_a_real_tile_not_the_full_dataset_inlined(self):
        # A single deep-zoom tile's payload must be far smaller than
        # the full 813-feature source (confirms this is genuinely
        # viewport-scoped, not the whole dataset re-served per tile).
        full_dataset_feature_count = len(load_landslides_geojson()["features"])
        response = get_gsi_landslide_tile(z=14, x=11777, y=6750, officer=TEST_OFFICER)
        decoded = mapbox_vector_tile.decode(response.body)
        tile_feature_count = len(decoded.get("gsi_landslides", {}).get("features", []))
        self.assertLess(tile_feature_count, full_dataset_feature_count)


if __name__ == "__main__":
    unittest.main()
