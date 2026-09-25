"""Decision and Destination API regression tests (Task 33, Parts G+H).

Protects the current honest "pending" framework behavior for both
`GET /api/settlements/{id}/decision` and
`GET /api/settlements/{id}/destinations` — these must stay
`not_evaluated`/`pending`/empty exactly as designed (Tasks 08/09,
governance-reaffirmed Tasks 29/30) until an approved pathway-evaluation
rule or a real candidate-destination dataset exists. This file tests
the *current* pending framework only — it does not assume or test any
future recommendation/ranking/capacity logic.

Run with: python -m unittest discover -s tests   (from backend/)
"""

import unittest

from app.api.decision import get_settlement_decision
from app.api.destination import get_settlement_destination_analysis
from tests.fixtures import TEST_OFFICER, IsolatedDatabase


class _BhitaiMalliFixtureMixin:
    @classmethod
    def setUpClass(cls):
        cls._db = IsolatedDatabase()
        cls._db.__enter__()
        from app.api.settlements import list_settlements

        cls.bhitai_id = next(
            s.id for s in list_settlements() if s.name == "Bhitai Malli"
        )

    @classmethod
    def tearDownClass(cls):
        cls._db.__exit__(None, None, None)


class TestDecisionEndpoint(_BhitaiMalliFixtureMixin, unittest.TestCase):
    """Part G."""

    def test_top_level_decision_status_is_pending(self):
        result = get_settlement_decision(self.bhitai_id, officer=TEST_OFFICER)
        self.assertEqual(result.decision_status, "pending")

    def test_all_three_pathways_are_not_evaluated_and_not_recommended(self):
        result = get_settlement_decision(self.bhitai_id, officer=TEST_OFFICER)
        self.assertEqual(
            {p.pathway for p in result.pathways}, {"Protect", "Adapt", "Relocate"}
        )
        for pathway in result.pathways:
            self.assertEqual(pathway.status, "not_evaluated")
            self.assertFalse(pathway.recommended)

    def test_no_pathway_is_recommended(self):
        result = get_settlement_decision(self.bhitai_id, officer=TEST_OFFICER)
        self.assertFalse(any(p.recommended for p in result.pathways))

    def test_officer_review_is_required(self):
        result = get_settlement_decision(self.bhitai_id, officer=TEST_OFFICER)
        self.assertTrue(result.officer_review_required)
        self.assertTrue(len(result.officer_review_note) > 0)

    def test_missing_evidence_is_reported_not_hidden(self):
        result = get_settlement_decision(self.bhitai_id, officer=TEST_OFFICER)
        self.assertGreater(len(result.missing_evidence), 0)

    def test_unknown_settlement_raises_404(self):
        from fastapi import HTTPException

        with self.assertRaises(HTTPException) as ctx:
            get_settlement_decision(999999)
        self.assertEqual(ctx.exception.status_code, 404)


class TestDestinationEndpoint(_BhitaiMalliFixtureMixin, unittest.TestCase):
    """Part H."""

    def test_analysis_and_ranking_remain_pending(self):
        result = get_settlement_destination_analysis(self.bhitai_id, officer=TEST_OFFICER)
        self.assertEqual(result.analysis_status, "pending")
        self.assertEqual(result.ranking_status, "pending")

    def test_candidate_and_ranked_lists_are_empty(self):
        result = get_settlement_destination_analysis(self.bhitai_id, officer=TEST_OFFICER)
        self.assertEqual(result.candidates, [])
        self.assertEqual(result.ranked_candidates, [])

    def test_empty_candidate_list_is_never_framed_as_unsafe(self):
        # An empty candidate list must mean "no approved candidates
        # exist yet", never "no safe destination exists" — verify the
        # explanation text does not make that claim.
        result = get_settlement_destination_analysis(self.bhitai_id, officer=TEST_OFFICER)
        lowered = result.explanation.lower()
        self.assertNotIn("unsafe", lowered)
        self.assertNotIn("no safe", lowered)

    def test_six_suitability_dimensions_all_not_evaluated(self):
        result = get_settlement_destination_analysis(self.bhitai_id, officer=TEST_OFFICER)
        self.assertEqual(len(result.suitability_dimensions), 6)
        for dimension in result.suitability_dimensions:
            self.assertEqual(dimension.status, "not_evaluated")

    def test_no_capacity_field_is_present_on_the_response(self):
        # Carrying capacity is not implemented (Task 30) — the schema
        # must not expose any capacity-like field that could later be
        # mistaken for a real, calculated value.
        result = get_settlement_destination_analysis(self.bhitai_id, officer=TEST_OFFICER)
        field_names = set(type(result).model_fields.keys())
        capacity_like = {f for f in field_names if "capacity" in f.lower()}
        self.assertEqual(capacity_like, set())

    def test_officer_review_is_required(self):
        result = get_settlement_destination_analysis(self.bhitai_id, officer=TEST_OFFICER)
        self.assertTrue(result.officer_review_required)

    def test_unknown_settlement_raises_404(self):
        from fastapi import HTTPException

        with self.assertRaises(HTTPException) as ctx:
            get_settlement_destination_analysis(999999)
        self.assertEqual(ctx.exception.status_code, 404)


if __name__ == "__main__":
    unittest.main()
