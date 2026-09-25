"""GET /api/settlements/{id}/water and /services — OpenStreetMap
water/POI integration (Bhitai Malli vicinity extracts, see
docs/DATA_PROVENANCE.md and
data/processed/static/infrastructure/SOURCE.txt for provenance).

Same direct-route-call testing convention as the buildings/roads test
modules (no httpx/TestClient installed).

Run with: python -m unittest discover -s tests   (from backend/)
"""

import unittest

from fastapi import HTTPException

from app.api.settlements import (
    get_settlement_services,
    get_settlement_water,
    list_settlements,
)
from tests.fixtures import TEST_OFFICER, IsolatedDatabase


class TestSettlementWater(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls._db = IsolatedDatabase()
        cls._db.__enter__()
        cls.bhitai_id = next(
            s.id for s in list_settlements() if s.name == "Bhitai Malli"
        )

    @classmethod
    def tearDownClass(cls):
        cls._db.__exit__(None, None, None)

    def test_returns_feature_collection_for_bhitai_malli(self):
        result = get_settlement_water(self.bhitai_id, officer=TEST_OFFICER)
        self.assertEqual(result["type"], "FeatureCollection")
        self.assertGreater(len(result["features"]), 0)

    def test_only_expected_properties_are_exposed(self):
        result = get_settlement_water(self.bhitai_id, officer=TEST_OFFICER)
        for feature in result["features"]:
            self.assertEqual(
                set(feature["properties"].keys()),
                {"waterway", "natural", "name", "osm_way_id", "source"},
            )

    def test_no_fabricated_hydrology_field_present(self):
        result = get_settlement_water(self.bhitai_id, officer=TEST_OFFICER)
        dump = str(result)
        self.assertNotIn("flow_rate", dump)
        self.assertNotIn("depth", dump)
        self.assertNotIn("flood", dump)

    def test_unknown_settlement_id_raises_404(self):
        with self.assertRaises(HTTPException) as ctx:
            get_settlement_water(999999, officer=TEST_OFFICER)
        self.assertEqual(ctx.exception.status_code, 404)


class TestSettlementServices(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls._db = IsolatedDatabase()
        cls._db.__enter__()
        cls.bhitai_id = next(
            s.id for s in list_settlements() if s.name == "Bhitai Malli"
        )

    @classmethod
    def tearDownClass(cls):
        cls._db.__exit__(None, None, None)

    def test_returns_feature_collection_for_bhitai_malli(self):
        result = get_settlement_services(self.bhitai_id, officer=TEST_OFFICER)
        self.assertEqual(result["type"], "FeatureCollection")
        self.assertGreater(len(result["features"]), 0)

    def test_exactly_four_real_distance_filtered_features(self):
        # Real, verified result from this task's own investigation —
        # 16 raw hits in a padded box, 12 excluded as a separate
        # settlement's cluster ~6km away, 4 kept within 3km.
        result = get_settlement_services(self.bhitai_id, officer=TEST_OFFICER)
        self.assertEqual(len(result["features"]), 4)

    def test_only_expected_properties_are_exposed(self):
        result = get_settlement_services(self.bhitai_id, officer=TEST_OFFICER)
        for feature in result["features"]:
            self.assertEqual(
                set(feature["properties"].keys()),
                {"amenity", "name", "osm_id", "osm_type", "distance_m", "source"},
            )

    def test_real_categories_only_and_no_invented_ones(self):
        result = get_settlement_services(self.bhitai_id, officer=TEST_OFFICER)
        categories = {f["properties"]["amenity"] for f in result["features"]}
        self.assertTrue(categories.issubset({"hospital", "clinic", "place_of_worship"}))

    def test_no_fabricated_capacity_or_quality_field_present(self):
        result = get_settlement_services(self.bhitai_id, officer=TEST_OFFICER)
        dump = str(result)
        for forbidden in ("capacity", "beds", "doctors", "opening_hours", "quality"):
            self.assertNotIn(forbidden, dump)

    def test_all_within_three_km_of_settlement(self):
        result = get_settlement_services(self.bhitai_id, officer=TEST_OFFICER)
        for feature in result["features"]:
            self.assertLessEqual(feature["properties"]["distance_m"], 3000)

    def test_unknown_settlement_id_raises_404(self):
        with self.assertRaises(HTTPException) as ctx:
            get_settlement_services(999999, officer=TEST_OFFICER)
        self.assertEqual(ctx.exception.status_code, 404)


if __name__ == "__main__":
    unittest.main()
