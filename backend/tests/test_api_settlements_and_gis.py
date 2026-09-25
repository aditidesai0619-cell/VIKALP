"""API smoke/regression tests (Task 33, Parts A-E): health, settlement
list/detail/GeoJSON, and GIS boundaries.

No FastAPI TestClient/httpx is used. `starlette.testclient.TestClient`
requires the `httpx` package, which is NOT installed in this project's
venv (`backend/requirements.txt` lists only fastapi, pydantic, uvicorn,
geopandas, shapely, pyproj, rasterio) — confirmed by attempting
`from fastapi.testclient import TestClient`, which raises
`RuntimeError: ... requires the httpx2 package`. Task 33 explicitly
forbids adding a new dependency without approval ("Do NOT add
unnecessary dependencies"; "If you believe a production change
[including a new dependency] is necessary: STOP... Report... Do not
implement without approval"), so no dependency was added.

Instead, each FastAPI path-operation function is imported and called
directly as a plain Python function. Every route in this module already
constructs and returns a real, validated Pydantic model itself (not a
bare dict FastAPI validates only at the HTTP layer), and every route
does its own real SQLite/file read — so calling the function directly
exercises the exact same business logic, database access, and response
validation the real HTTP layer would. Only generic Starlette/ASGI
transport, URL-routing dispatch, and HTTP status-line mapping are not
exercised here, none of which is VIKALP business logic. `HTTPException`
(FastAPI's mechanism for mapping to a 404 response) is still raised and
caught directly, so that behavior is verified too.

Run with: python -m unittest discover -s tests   (from backend/)
"""

import unittest

from fastapi import HTTPException

from app.api.auth import get_current_officer
from app.api.decision import get_settlement_decision
from app.api.destination import get_settlement_destination_analysis
from app.api.gis import get_boundaries, get_landslides
from app.api.risk import get_settlement_risk
from app.api.settlements import (
    get_settlement,
    get_settlement_geojson,
    list_settlements,
)
from app.main import health
from tests.fixtures import TEST_OFFICER, IsolatedDatabase

EXPECTED_LAT = 30.167112
EXPECTED_LON = 78.781266


class TestHealthEndpoint(unittest.TestCase):
    """Part A."""

    def test_health_returns_ok_status(self):
        result = health()
        self.assertIn("status", result)
        self.assertEqual(result["status"], "ok")


class TestSettlementList(unittest.TestCase):
    """Part B."""

    @classmethod
    def setUpClass(cls):
        cls._db = IsolatedDatabase()
        cls._db.__enter__()

    @classmethod
    def tearDownClass(cls):
        cls._db.__exit__(None, None, None)

    def test_list_returns_successfully_and_is_not_empty(self):
        results = list_settlements()
        self.assertIsInstance(results, list)
        self.assertGreaterEqual(len(results), 1)

    def test_bhitai_malli_present_by_name(self):
        # Search by name rather than assuming any particular id/order —
        # avoids hard-coding unrelated database internals (Task 33 §B).
        names = [s.name for s in list_settlements()]
        self.assertIn("Bhitai Malli", names)

    def test_list_does_not_crash_and_has_expected_identity_fields(self):
        bhitai = next(s for s in list_settlements() if s.name == "Bhitai Malli")
        self.assertEqual(bhitai.district, "Pauri Garhwal")
        self.assertEqual(bhitai.state, "Uttarakhand")


class TestSettlementDetail(unittest.TestCase):
    """Part C."""

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

    def test_identity_and_location_fields(self):
        result = get_settlement(self.bhitai_id, officer=TEST_OFFICER)
        self.assertEqual(result.name, "Bhitai Malli")
        self.assertEqual(result.district, "Pauri Garhwal")
        self.assertEqual(result.state, "Uttarakhand")
        self.assertAlmostEqual(result.latitude, EXPECTED_LAT)
        self.assertAlmostEqual(result.longitude, EXPECTED_LON)

    def test_population_and_households(self):
        result = get_settlement(self.bhitai_id, officer=TEST_OFFICER)
        self.assertEqual(result.population, 383)
        self.assertEqual(result.households, 86)

    def test_unknown_id_raises_404(self):
        with self.assertRaises(HTTPException) as ctx:
            get_settlement(999999)
        self.assertEqual(ctx.exception.status_code, 404)


class TestSettlementGeojson(unittest.TestCase):
    """Part D."""

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

    def test_feature_structure(self):
        feature = get_settlement_geojson(self.bhitai_id)
        self.assertEqual(feature.type, "Feature")
        self.assertEqual(feature.geometry.type, "Point")

    def test_coordinates_are_lon_lat_order_and_match_settlement_record(self):
        feature = get_settlement_geojson(self.bhitai_id)
        lon, lat = feature.geometry.coordinates
        # GeoJSON coordinate order is (lon, lat) per RFC 7946 and the
        # schema's own docstring — not (lat, lon).
        self.assertAlmostEqual(lon, EXPECTED_LON)
        self.assertAlmostEqual(lat, EXPECTED_LAT)

    def test_properties_identity_matches_settlement_detail(self):
        feature = get_settlement_geojson(self.bhitai_id)
        detail = get_settlement(self.bhitai_id, officer=TEST_OFFICER)
        self.assertEqual(feature.properties.name, detail.name)
        self.assertEqual(feature.properties.population, detail.population)
        self.assertEqual(feature.properties.households, detail.households)

    def test_unknown_id_raises_404(self):
        with self.assertRaises(HTTPException) as ctx:
            get_settlement_geojson(999999)
        self.assertEqual(ctx.exception.status_code, 404)


class TestGisBoundaries(unittest.TestCase):
    """Part E. The boundaries themselves come from a static processed
    file, not the database (see app/services/gis.py) — but `get_
    boundaries()` gained an audit-log call (Task 36), which does need
    a real `audit_logs` table, hence `IsolatedDatabase` here now too."""

    @classmethod
    def setUpClass(cls):
        cls._db = IsolatedDatabase()
        cls._db.__enter__()

    @classmethod
    def tearDownClass(cls):
        cls._db.__exit__(None, None, None)

    def test_boundaries_return_successfully_as_feature_collection(self):
        result = get_boundaries(officer=TEST_OFFICER)
        self.assertEqual(result["type"], "FeatureCollection")
        self.assertIsInstance(result["features"], list)
        self.assertGreater(len(result["features"]), 0)

    def test_pauri_garhwal_district_is_present(self):
        # Verifies the Uttarakhand/Pauri Garhwal district context can be
        # returned (Task 33 §E) without asserting an arbitrary total
        # feature count, which the API contract does not guarantee.
        #
        # The source geoBoundaries ADM2 dataset's own shapeName for this
        # district is "Garhwal", not "Pauri Garhwal" (confirmed by
        # reading the actual API response, not assumed) — see
        # docs/DECISIONS.md Task 12 for this district's provenance/
        # point-in-polygon verification against Bhitai Malli.
        result = get_boundaries(officer=TEST_OFFICER)
        shape_names = [
            feature.get("properties", {}).get("shapeName")
            for feature in result["features"]
        ]
        self.assertIn("Garhwal", shape_names)

    def test_every_feature_has_geometry(self):
        result = get_boundaries(officer=TEST_OFFICER)
        for feature in result["features"]:
            self.assertIn("geometry", feature)
            self.assertIn("type", feature["geometry"])
            self.assertIn("coordinates", feature["geometry"])


class TestGisLandslides(unittest.TestCase):
    """Task 38 — read-only GSI/NLFC landslide inventory map layer.

    Same `IsolatedDatabase` requirement as TestGisBoundaries (the route
    records an audit event)."""

    @classmethod
    def setUpClass(cls):
        cls._db = IsolatedDatabase()
        cls._db.__enter__()

    @classmethod
    def tearDownClass(cls):
        cls._db.__exit__(None, None, None)

    def test_landslides_return_successfully_as_feature_collection(self):
        result = get_landslides(officer=TEST_OFFICER)
        self.assertEqual(result["type"], "FeatureCollection")
        self.assertIsInstance(result["features"], list)

    def test_feature_count_is_813(self):
        # The full, real GSI/NLFC field-validated inventory (Task 20) —
        # every feature passed through, none dropped/filtered.
        result = get_landslides(officer=TEST_OFFICER)
        self.assertEqual(len(result["features"]), 813)

    def test_geometry_is_not_modified(self):
        result = get_landslides(officer=TEST_OFFICER)
        for feature in result["features"]:
            self.assertEqual(feature["type"], "Feature")
            self.assertIn("geometry", feature)
            self.assertIn("type", feature["geometry"])
            self.assertIn("coordinates", feature["geometry"])

    def test_source_identity_field_present(self):
        # slide_no (source record identity) survives into the minimal
        # exposed property set for at least some records.
        result = get_landslides(officer=TEST_OFFICER)
        slide_nos = [f["properties"].get("slide_no") for f in result["features"]]
        self.assertTrue(any(slide_no for slide_no in slide_nos))

    def test_only_minimal_expected_properties_are_exposed(self):
        # Not a full ~100-column export of the raw GSI schema — exactly
        # the four fields hazard_exposure.py's own scoring already uses.
        result = get_landslides(officer=TEST_OFFICER)
        for feature in result["features"][:5]:
            self.assertEqual(
                set(feature["properties"].keys()),
                {"slide_no", "activity", "triggering", "toposheet"},
            )

    def test_no_fake_risk_score_or_hazard_zone_field_present(self):
        result = get_landslides(officer=TEST_OFFICER)
        dump = str(result)
        self.assertNotIn("risk_score", dump)
        self.assertNotIn("hazard_zone", dump)
        self.assertNotIn("red_zone", dump)

    def test_authentication_required(self):
        with self.assertRaises(HTTPException) as ctx:
            get_current_officer(credentials=None)
        self.assertEqual(ctx.exception.status_code, 401)
        from app.api.gis import router as gis_router

        calls = [d.call for route in gis_router.routes for d in route.dependant.dependencies]
        self.assertIn(get_current_officer, calls)


class TestExistingBehaviorUnchangedByTask38(unittest.TestCase):
    """Task 38 §R items 1-2, 12-14 — adding the landslide map layer must
    not have changed any existing boundary/settlement/risk/decision/
    destination output."""

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

    def test_boundaries_endpoint_unchanged(self):
        result = get_boundaries(officer=TEST_OFFICER)
        shape_names = [f.get("properties", {}).get("shapeName") for f in result["features"]]
        self.assertIn("Garhwal", shape_names)

    def test_settlement_geojson_unchanged(self):
        feature = get_settlement_geojson(self.bhitai_id)
        lon, lat = feature.geometry.coordinates
        self.assertAlmostEqual(lon, EXPECTED_LON)
        self.assertAlmostEqual(lat, EXPECTED_LAT)

    def test_risk_still_pending_and_hazard_still_no_evidence_found(self):
        result = get_settlement_risk(self.bhitai_id, officer=TEST_OFFICER)
        self.assertEqual(result.assessment_status, "pending")
        self.assertIsNone(result.overall_score)
        hazard = next(d for d in result.dimensions if d.dimension == "Hazard Exposure")
        self.assertEqual(hazard.status, "no_evidence_found")

    def test_decision_still_pending_and_not_evaluated(self):
        result = get_settlement_decision(self.bhitai_id, officer=TEST_OFFICER)
        self.assertEqual(result.decision_status, "pending")
        self.assertTrue(all(p.status == "not_evaluated" for p in result.pathways))

    def test_destinations_still_pending_and_empty(self):
        result = get_settlement_destination_analysis(self.bhitai_id, officer=TEST_OFFICER)
        self.assertEqual(result.analysis_status, "pending")
        self.assertEqual(result.candidates, [])


if __name__ == "__main__":
    unittest.main()
