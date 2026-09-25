"""Risk API regression tests (Task 33, Part F + Part 4).

Protects the evidence-gated risk behavior end-to-end through the real
`GET /api/settlements/{id}/risk` route function (DB fetch -> service
dispatch -> Pydantic response), which
`backend/tests/test_hazard_exposure.py`'s `TestBhitaiMalli` class does
NOT cover (that file calls `services.risk.assess_settlement_risk()`
directly, bypassing the API/database layer entirely). This file adds
that missing layer of coverage rather than duplicating the 22 existing
deterministic hazard-scoring-math tests, which are left untouched.

Uses the real, immutable 813-record GSI/NLFC landslide inventory
throughout — no synthetic/fabricated landslide records are created
here (Task 33 §8/§4).

Run with: python -m unittest discover -s tests   (from backend/)
"""

import unittest

from app.api.risk import get_settlement_risk
from app.services import hazard_exposure as hz
from app.services.risk import DIMENSION_WEIGHTS
from tests.fixtures import TEST_OFFICER, IsolatedDatabase

BHITAI_MALLI_LAT = 30.167112
BHITAI_MALLI_LON = 78.781266

_NO_RULE_STATUSES = {"no_data", "no_scoring_rule"}


class TestRiskEndpointEvidenceGating(unittest.TestCase):
    """Part F — the critical regression: no fabricated score, no
    fabricated 'low risk', no overall score while dimensions remain
    unscored."""

    @classmethod
    def setUpClass(cls):
        cls._db = IsolatedDatabase()
        cls._db.__enter__()
        from app.api.settlements import list_settlements

        cls.bhitai_id = next(
            s.id for s in list_settlements() if s.name == "Bhitai Malli"
        )
        cls.result = get_settlement_risk(cls.bhitai_id, officer=TEST_OFFICER)

    @classmethod
    def tearDownClass(cls):
        cls._db.__exit__(None, None, None)

    def test_overall_assessment_is_pending_not_scored(self):
        self.assertEqual(self.result.assessment_status, "pending")
        self.assertIsNone(self.result.overall_score)
        self.assertIsNone(self.result.risk_level)
        self.assertEqual(self.result.data_completeness, "partial")
        self.assertEqual(self.result.score_range, [0, 100])

    def test_five_dimensions_present_with_approved_weights(self):
        self.assertEqual(len(self.result.dimensions), 5)
        names = {d.dimension for d in self.result.dimensions}
        self.assertEqual(names, set(DIMENSION_WEIGHTS.keys()))
        for dim in self.result.dimensions:
            self.assertEqual(dim.weight, DIMENSION_WEIGHTS[dim.dimension])

    def test_no_dimension_score_is_fabricated(self):
        # Absence of evidence/a scoring rule must never become a
        # substituted 0 or any other numeric score.
        for dim in self.result.dimensions:
            if dim.status != "scored":
                self.assertIsNone(
                    dim.score,
                    f"{dim.dimension} has status {dim.status!r} but a "
                    "non-null score.",
                )

    def test_hazard_exposure_is_evidence_evaluated_with_no_qualifying_record(self):
        hazard = next(
            d for d in self.result.dimensions if d.dimension == "Hazard Exposure"
        )
        self.assertEqual(hazard.status, "no_evidence_found")
        self.assertIsNone(hazard.score)

        detail = hazard.hazard_exposure_detail
        self.assertIsNotNone(detail)
        self.assertEqual(detail.status, "no_evidence_found")
        self.assertEqual(detail.qualifying_record_count, 0)
        self.assertIsNone(detail.nearest_qualifying_distance_km)
        self.assertEqual(detail.scoring_radius_km, 1.0)
        # Contextual (1-5 km) records exist for Bhitai Malli (nearest
        # real record is documented at ~2.04 km) but must never be
        # treated as qualifying evidence.
        self.assertGreater(detail.contextual_record_count, 0)
        self.assertGreater(len(detail.contextual_records), 0)

    def test_terrain_has_raw_inputs_but_no_approved_scoring_rule(self):
        terrain = next(
            d
            for d in self.result.dimensions
            if d.dimension == "Terrain / Physical Susceptibility"
        )
        self.assertEqual(terrain.status, "no_scoring_rule")
        self.assertIsNone(terrain.score)
        self.assertIn("slope_degrees", terrain.inputs_used)
        self.assertIn("elevation_m", terrain.inputs_used)

    def test_population_has_raw_inputs_but_no_approved_scoring_rule(self):
        population = next(
            d
            for d in self.result.dimensions
            if d.dimension == "Population / Household Exposure"
        )
        self.assertEqual(population.status, "no_scoring_rule")
        self.assertIsNone(population.score)
        self.assertIn("population", population.inputs_used)
        self.assertIn("households", population.inputs_used)

    def test_historical_and_vulnerability_have_no_data_at_all(self):
        for name in ("Historical Disaster Evidence", "Vulnerability"):
            dim = next(d for d in self.result.dimensions if d.dimension == name)
            self.assertEqual(dim.status, "no_data")
            self.assertIsNone(dim.score)
            self.assertEqual(dim.inputs_used, [])

    def test_all_pending_dimensions_use_the_two_state_no_rule_vocabulary(self):
        for dim in self.result.dimensions:
            if dim.dimension != "Hazard Exposure":
                self.assertIn(dim.status, _NO_RULE_STATUSES)


class TestHazardExposureRealInventoryIntegration(unittest.TestCase):
    """Part 4 — verifies the real 813-record GSI inventory is loaded and
    that Bhitai Malli genuinely has zero qualifying records within the
    approved 1 km radius, using only real data (no synthetic records)."""

    def test_real_inventory_loads_813_records(self):
        records = hz._load_records()
        self.assertEqual(len(records), 813)

    def test_no_real_record_is_within_1km_of_bhitai_malli(self):
        records = hz._load_records()
        distances = [
            hz._haversine_km(
                BHITAI_MALLI_LAT, BHITAI_MALLI_LON, record.latitude, record.longitude
            )
            for record in records
        ]
        self.assertTrue(
            all(d > hz.SCORING_RADIUS_KM for d in distances),
            "A real GSI record was found within the 1 km scoring radius; "
            "Hazard Exposure's no_evidence_found result for Bhitai Malli "
            "would then be incorrect and requires investigation, not a "
            "test-assertion change.",
        )
        # At least one record exists in the 1-5 km contextual band —
        # confirms real contextual evidence exists but correctly stays
        # non-qualifying, rather than the dataset simply not covering
        # this area at all.
        self.assertTrue(any(d <= hz.CONTEXT_RADIUS_KM for d in distances))

    def test_scoring_function_returns_no_numeric_score_for_bhitai_malli(self):
        result = hz.score_hazard_exposure_landslide(
            BHITAI_MALLI_LAT, BHITAI_MALLI_LON
        )
        self.assertEqual(result["status"], "no_evidence_found")
        self.assertIsNone(result["score"])
        self.assertEqual(result["qualifying_record_count"], 0)

    def test_overall_risk_score_remains_null_through_the_full_api_path(self):
        with IsolatedDatabase():
            from app.api.settlements import list_settlements

            bhitai_id = next(
                s.id for s in list_settlements() if s.name == "Bhitai Malli"
            )
            result = get_settlement_risk(bhitai_id, officer=TEST_OFFICER)
        self.assertIsNone(result.overall_score)


if __name__ == "__main__":
    unittest.main()
