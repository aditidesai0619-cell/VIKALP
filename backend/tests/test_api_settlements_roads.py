"""GET /api/settlements/{id}/roads — OpenStreetMap road/path
integration (Bhitai Malli vicinity extract, see docs/DATA_PROVENANCE.md
and data/processed/static/infrastructure/SOURCE.txt for provenance).

Same direct-route-call testing convention as
test_api_settlements_and_gis.py / test_api_settlements_buildings.py.

Run with: python -m unittest discover -s tests   (from backend/)
"""

import unittest

from fastapi import HTTPException

from app.api.settlements import get_settlement_roads, list_settlements
from tests.fixtures import TEST_OFFICER, IsolatedDatabase


class TestSettlementRoads(unittest.TestCase):
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
        result = get_settlement_roads(self.bhitai_id, officer=TEST_OFFICER)
        self.assertEqual(result["type"], "FeatureCollection")
        self.assertIsInstance(result["features"], list)
        self.assertGreater(len(result["features"]), 0)

    def test_every_feature_has_linestring_geometry(self):
        result = get_settlement_roads(self.bhitai_id, officer=TEST_OFFICER)
        for feature in result["features"]:
            self.assertEqual(feature["type"], "Feature")
            self.assertEqual(feature["geometry"]["type"], "LineString")
            self.assertIsInstance(feature["geometry"]["coordinates"], list)
            self.assertGreaterEqual(len(feature["geometry"]["coordinates"]), 2)

    def test_only_expected_properties_are_exposed(self):
        result = get_settlement_roads(self.bhitai_id, officer=TEST_OFFICER)
        for feature in result["features"]:
            self.assertEqual(
                set(feature["properties"].keys()),
                {"highway", "name", "surface", "osm_way_id", "source"},
            )

    def test_real_highway_categories_present_and_no_invented_ones(self):
        # Confirmed via direct Overpass query (see SOURCE.txt) — these
        # five categories exist, several others (path/footway/cycleway/
        # service/living_street/primary/secondary) were confirmed absent
        # and must never silently appear here.
        result = get_settlement_roads(self.bhitai_id, officer=TEST_OFFICER)
        categories = {f["properties"]["highway"] for f in result["features"]}
        self.assertTrue(categories.issubset({"trunk", "tertiary", "unclassified", "residential", "track"}))
        self.assertGreater(len(categories), 0)

    def test_source_disclosure_present_on_every_feature(self):
        result = get_settlement_roads(self.bhitai_id, officer=TEST_OFFICER)
        for feature in result["features"]:
            self.assertEqual(feature["properties"]["source"], "OpenStreetMap contributors")

    def test_names_not_invented(self):
        # Only 1 of 16 real segments carries a name (the trunk road) —
        # every other feature's name must be null, never backfilled.
        result = get_settlement_roads(self.bhitai_id, officer=TEST_OFFICER)
        named = [f for f in result["features"] if f["properties"]["name"]]
        unnamed = [f for f in result["features"] if not f["properties"]["name"]]
        self.assertGreater(len(unnamed), 0)
        self.assertLessEqual(len(named), 3)

    def test_unknown_settlement_id_raises_404(self):
        with self.assertRaises(HTTPException) as ctx:
            get_settlement_roads(999999, officer=TEST_OFFICER)
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
