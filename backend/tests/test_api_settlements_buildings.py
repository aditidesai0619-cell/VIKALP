"""GET /api/settlements/{id}/buildings — Google Open Buildings v3
integration (Bhitai Malli vicinity extract, see docs/DATA_PROVENANCE.md
and data/processed/static/buildings/SOURCE.txt for provenance).

Same direct-route-call testing convention as
test_api_settlements_and_gis.py (no httpx/TestClient installed).

Run with: python -m unittest discover -s tests   (from backend/)
"""

import unittest

from fastapi import HTTPException

from app.api.settlements import get_settlement_buildings, list_settlements
from tests.fixtures import TEST_OFFICER, IsolatedDatabase


class TestSettlementBuildings(unittest.TestCase):
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
        result = get_settlement_buildings(self.bhitai_id, officer=TEST_OFFICER)
        self.assertEqual(result["type"], "FeatureCollection")
        self.assertIsInstance(result["features"], list)
        self.assertGreater(len(result["features"]), 0)

    def test_every_feature_has_polygon_geometry(self):
        result = get_settlement_buildings(self.bhitai_id, officer=TEST_OFFICER)
        for feature in result["features"][:20]:
            self.assertEqual(feature["type"], "Feature")
            self.assertEqual(feature["geometry"]["type"], "Polygon")
            self.assertIsInstance(feature["geometry"]["coordinates"], list)

    def test_only_expected_properties_are_exposed(self):
        # Real Open Buildings attributes only — never a height, floor
        # count, owner, building type, or any VIKALP-invented field.
        result = get_settlement_buildings(self.bhitai_id, officer=TEST_OFFICER)
        for feature in result["features"][:20]:
            self.assertEqual(
                set(feature["properties"].keys()),
                {"confidence", "area_in_meters", "full_plus_code", "source"},
            )

    def test_confidence_and_area_are_real_numeric_ranges(self):
        result = get_settlement_buildings(self.bhitai_id, officer=TEST_OFFICER)
        confidences = [f["properties"]["confidence"] for f in result["features"]]
        areas = [f["properties"]["area_in_meters"] for f in result["features"]]
        self.assertTrue(all(0.0 <= c <= 1.0 for c in confidences))
        self.assertTrue(all(a > 0 for a in areas))

    def test_source_disclosure_present_on_every_feature(self):
        result = get_settlement_buildings(self.bhitai_id, officer=TEST_OFFICER)
        for feature in result["features"][:20]:
            self.assertEqual(feature["properties"]["source"], "Google Open Buildings v3")

    def test_no_fabricated_height_or_floor_field_present(self):
        result = get_settlement_buildings(self.bhitai_id, officer=TEST_OFFICER)
        dump = str(result)
        self.assertNotIn("height", dump)
        self.assertNotIn("floor", dump)
        self.assertNotIn("owner", dump)

    def test_unknown_settlement_id_raises_404(self):
        with self.assertRaises(HTTPException) as ctx:
            get_settlement_buildings(999999, officer=TEST_OFFICER)
        self.assertEqual(ctx.exception.status_code, 404)

    def test_authentication_required(self):
        from app.api.settlements import router as settlements_router
        from app.api.auth import get_current_officer

        calls = [
            d.call
            for route in settlements_router.routes
            for d in route.dependant.dependencies
        ]
        self.assertIn(get_current_officer, calls)


if __name__ == "__main__":
    unittest.main()
