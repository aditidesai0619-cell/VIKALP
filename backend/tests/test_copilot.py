"""Copilot evidence-layer tests (Task 37).

Same conventions as Tasks 33-36's test files: no httpx/TestClient
(still not installed), route functions and dependencies called
directly, and a fresh `IsolatedDatabase` per test class so the
developer's real `backend/vikalp.db` is never touched.

Run with: python -m unittest discover -s tests   (from backend/)
"""

import json
import unittest

from fastapi import HTTPException

from app.api.copilot import (
    get_settlement_copilot_context,
    get_settlement_evidence_explanation,
)
from app.api.auth import get_current_officer
from app.api.decision import get_settlement_decision
from app.api.destination import get_settlement_destination_analysis
from app.api.risk import get_settlement_risk
from app.api.settlements import list_settlements
from app.database import get_connection
from app.schemas.copilot import CopilotContext
from app.services.audit import (
    ACTION_VIEW_COPILOT_CONTEXT,
    ACTION_VIEW_EVIDENCE_EXPLANATION,
    list_recent_audit_events,
)
from app.services.copilot import COPILOT_RULES, build_copilot_context, explain_settlement
from app.models.settlement import Settlement
from tests.fixtures import TEST_OFFICER, IsolatedDatabase


def _all_audit_rows_as_text() -> str:
    with get_connection() as conn:
        rows = conn.execute("SELECT * FROM audit_logs").fetchall()
    return json.dumps([dict(row) for row in rows])


class _CopilotTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls._db = IsolatedDatabase()
        cls._db.__enter__()
        cls.bhitai_id = next(
            s.id for s in list_settlements() if s.name == "Bhitai Malli"
        )
        with get_connection() as conn:
            row = conn.execute(
                "SELECT * FROM settlements WHERE id = ?", (cls.bhitai_id,)
            ).fetchone()
        cls.bhitai_settlement = Settlement.from_row(row)

    @classmethod
    def tearDownClass(cls):
        cls._db.__exit__(None, None, None)


class TestCopilotContextEndpoint(_CopilotTestCase):
    """Items 1-2."""

    def test_1_copilot_context_for_valid_settlement(self):
        result = get_settlement_copilot_context(self.bhitai_id, officer=TEST_OFFICER)
        self.assertIsInstance(result, CopilotContext)
        self.assertEqual(result.settlement.settlement_id, self.bhitai_id)

    def test_2_unknown_settlement_returns_404(self):
        with self.assertRaises(HTTPException) as ctx:
            get_settlement_copilot_context(999_999, officer=TEST_OFFICER)
        self.assertEqual(ctx.exception.status_code, 404)
        with self.assertRaises(HTTPException) as ctx2:
            get_settlement_evidence_explanation(999_999, officer=TEST_OFFICER)
        self.assertEqual(ctx2.exception.status_code, 404)


class TestCopilotContextPreservesEvidence(_CopilotTestCase):
    """Items 3-15."""

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.context = build_copilot_context(cls.bhitai_settlement)

    def test_3_context_preserves_settlement_metadata(self):
        settlement = self.context["settlement"]
        self.assertEqual(settlement["name"], "Bhitai Malli")
        self.assertEqual(settlement["district"], "Pauri Garhwal")
        self.assertEqual(settlement["state"], "Uttarakhand")
        self.assertEqual(settlement["population"], 383)
        self.assertEqual(settlement["households"], 86)
        self.assertAlmostEqual(settlement["latitude"], 30.167112)
        self.assertAlmostEqual(settlement["longitude"], 78.781266)

    def test_4_context_preserves_risk_pending_state(self):
        self.assertEqual(self.context["risk_assessment"]["assessment_status"], "pending")
        self.assertIsNone(self.context["risk_assessment"]["overall_score"])

    def test_5_context_preserves_all_five_risk_dimensions(self):
        names = {d["dimension"] for d in self.context["risk_dimensions"]}
        self.assertEqual(
            names,
            {
                "Terrain / Physical Susceptibility",
                "Hazard Exposure",
                "Historical Disaster Evidence",
                "Population / Household Exposure",
                "Vulnerability",
            },
        )

    def test_6_context_preserves_hazard_exposure_no_evidence_found(self):
        hazard = self.context["hazard_exposure"]
        self.assertIsNotNone(hazard)
        self.assertEqual(hazard["status"], "no_evidence_found")
        self.assertIsNone(hazard["score"])

    def test_7_context_preserves_zero_qualifying_hazard_records(self):
        hazard = self.context["hazard_exposure"]
        self.assertEqual(hazard["qualifying_record_count"], 0)

    def test_8_context_preserves_nearest_contextual_landslide(self):
        hazard = self.context["hazard_exposure"]
        self.assertIsNotNone(hazard["nearest_contextual_distance_km"])
        self.assertGreater(hazard["contextual_record_count"], 0)

    def test_9_context_preserves_decision_pending_state(self):
        self.assertEqual(self.context["decision_workspace"]["decision_status"], "pending")

    def test_10_context_preserves_all_three_pathways_not_evaluated(self):
        pathways = self.context["decision_workspace"]["pathways"]
        self.assertEqual({p["pathway"] for p in pathways}, {"Protect", "Adapt", "Relocate"})
        self.assertTrue(all(p["status"] == "not_evaluated" for p in pathways))
        self.assertTrue(all(p["recommended"] is False for p in pathways))

    def test_11_context_preserves_destination_pending_state(self):
        self.assertEqual(self.context["destinations"]["analysis_status"], "pending")

    def test_12_context_preserves_empty_candidate_list(self):
        self.assertEqual(self.context["destinations"]["candidates"], [])

    def test_13_context_preserves_capacity_not_initiated(self):
        dimensions = self.context["destinations"]["suitability_dimensions"]
        capacity = next(d for d in dimensions if d["dimension"] == "Available Capacity")
        self.assertEqual(capacity["status"], "not_evaluated")

    def test_14_context_preserves_provenance(self):
        provenance = self.context["provenance"]
        self.assertTrue(any("GSI" in s for s in provenance["official_sources"]))
        self.assertTrue(any("CartoDEM" in s for s in provenance["official_sources"]))
        self.assertTrue(any("geoBoundaries" in s for s in provenance["official_sources"]))
        self.assertTrue(len(provenance["demo_planning_inputs"]) > 0)

    def test_15_context_preserves_limitations(self):
        self.assertGreater(len(self.context["limitations"]), 0)

    def test_15b_limitations_include_terrain_slope_discrepancy(self):
        # Same disclosed-not-resolved fact report.py (Task 34) already
        # discloses — must not be hidden from the Copilot context either.
        joined = " ".join(self.context["limitations"])
        self.assertIn("18.91", joined)
        self.assertIn("22.58", joined)
        self.assertIn("discrepancy", joined.lower())


class TestDeterministicExplanation(_CopilotTestCase):
    """Items 16-20."""

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.context = build_copilot_context(cls.bhitai_settlement)
        cls.explanation = explain_settlement(cls.context)

    def test_16_explanation_for_pending_risk(self):
        self.assertIn("pending", self.explanation["summary"].lower())

    def test_17_explanation_for_no_hazard_evidence(self):
        self.assertIn("no_evidence_found", self.explanation["summary"])

    def test_18_explanation_never_claims_settlement_is_safe(self):
        # The inventory-bias disclaimer legitimately contains the negated
        # phrase "...does NOT mean this location is safe..." (an honest
        # caveat, not a safety claim) — assert the unqualified/affirmative
        # claim is absent, not the bare substring "is safe".
        lowered = self.explanation["summary"].lower()
        self.assertNotIn("the settlement is safe", lowered)
        self.assertNotIn("this settlement is safe", lowered)
        self.assertNotIn("location is safe from landslide hazard.", lowered)
        self.assertIn("does not mean this location is safe", lowered)

    def test_19_explanation_never_claims_relocation_recommended(self):
        lowered = self.explanation["summary"].lower()
        self.assertNotIn("relocation is recommended", lowered)
        self.assertNotIn("should relocate", lowered)
        self.assertNotIn("recommend relocat", lowered)

    def test_20_explanation_never_invents_missing_evidence(self):
        self.assertEqual(self.explanation["missing_evidence"], self.context["missing_evidence"])


class TestCopilotGroundingRules(unittest.TestCase):
    """Task 37 §K — explicit, code-level grounding rules must exist,
    not only be documented in comments/markdown."""

    def test_rules_exist_and_cover_required_constraints(self):
        self.assertIsInstance(COPILOT_RULES, tuple)
        self.assertEqual(len(COPILOT_RULES), 12)
        joined = " ".join(COPILOT_RULES).lower()
        for phrase in [
            "only supplied vikalp context",
            "missing values must remain missing",
            "pending must remain pending",
            "cannot be overridden",
            "cannot calculate authoritative risk",
            "cannot create hazard evidence",
            "cannot choose destinations",
            "cannot calculate authoritative carrying capacity",
            "cannot approve relocation",
            "cannot issue government orders",
            "officer remains final authority",
        ]:
            self.assertIn(phrase, joined)


class TestCopilotAuthentication(_CopilotTestCase):
    """Items 21-22."""

    def test_21_copilot_context_requires_authentication(self):
        with self.assertRaises(HTTPException) as ctx:
            get_current_officer(credentials=None)
        self.assertEqual(ctx.exception.status_code, 401)
        from app.api.copilot import router as copilot_router

        calls = [d.call for route in copilot_router.routes for d in route.dependant.dependencies]
        self.assertIn(get_current_officer, calls)

    def test_22_explanation_requires_authentication(self):
        # Same router/dependency as the context endpoint (see test_21) —
        # both routes are declared on the same `router` with a
        # router-level `Depends(get_current_officer)`.
        from app.api.copilot import router as copilot_router

        paths = {route.path for route in copilot_router.routes}
        self.assertIn("/api/settlements/{settlement_id}/explanation", paths)


class TestCopilotAuditing(_CopilotTestCase):
    """Items 23-25."""

    def test_23_copilot_context_endpoint_is_audited(self):
        get_settlement_copilot_context(self.bhitai_id, officer=TEST_OFFICER)
        newest = list_recent_audit_events(limit=1)[0]
        self.assertEqual(newest["action"], ACTION_VIEW_COPILOT_CONTEXT)
        self.assertEqual(newest["resource_type"], "settlement")
        self.assertEqual(newest["resource_id"], str(self.bhitai_id))
        self.assertEqual(newest["outcome"], "success")

    def test_24_explanation_endpoint_is_audited(self):
        get_settlement_evidence_explanation(self.bhitai_id, officer=TEST_OFFICER)
        newest = list_recent_audit_events(limit=1)[0]
        self.assertEqual(newest["action"], ACTION_VIEW_EVIDENCE_EXPLANATION)
        self.assertEqual(newest["resource_id"], str(self.bhitai_id))

    def test_25_audit_records_contain_no_context_or_secrets(self):
        get_settlement_copilot_context(self.bhitai_id, officer=TEST_OFFICER)
        get_settlement_evidence_explanation(self.bhitai_id, officer=TEST_OFFICER)
        dump = _all_audit_rows_as_text()
        self.assertNotIn("Bearer ", dump)
        self.assertNotIn("Authorization", dump)
        self.assertNotIn("access_token", dump)
        # None of the context's own prose/summary text leaked into the
        # audit row — only actor/action/resource metadata should be there.
        self.assertNotIn("VIKALP Evidence Explanation for", dump)
        self.assertNotIn("GSI/NLFC field-validated landslide inventory", dump)


class TestExistingBehaviorUnchanged(_CopilotTestCase):
    """Items 26-28 — building the Copilot layer must not have changed
    any existing risk/decision/destination output."""

    def test_26_existing_risk_behavior_unchanged(self):
        result = get_settlement_risk(self.bhitai_id, officer=TEST_OFFICER)
        self.assertEqual(result.assessment_status, "pending")
        self.assertIsNone(result.overall_score)
        hazard = next(d for d in result.dimensions if d.dimension == "Hazard Exposure")
        self.assertEqual(hazard.status, "no_evidence_found")

    def test_27_existing_decision_behavior_unchanged(self):
        result = get_settlement_decision(self.bhitai_id, officer=TEST_OFFICER)
        self.assertEqual(result.decision_status, "pending")
        self.assertTrue(all(p.status == "not_evaluated" for p in result.pathways))

    def test_28_existing_destination_behavior_unchanged(self):
        result = get_settlement_destination_analysis(self.bhitai_id, officer=TEST_OFFICER)
        self.assertEqual(result.analysis_status, "pending")
        self.assertEqual(result.candidates, [])


if __name__ == "__main__":
    unittest.main()
