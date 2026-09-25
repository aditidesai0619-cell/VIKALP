"""Audit logging tests (Task 36).

Same conventions as Tasks 33-35's test files: no httpx/TestClient
(still not installed), route functions and dependencies called
directly, and a fresh `IsolatedDatabase` per test class so the
developer's real `backend/vikalp.db` is never touched. Authentication
configuration is patched onto the shared `settings` singleton for this
module only (same technique `test_auth.py` uses), since login/`/api/
audit` both need it configured.

Run with: python -m unittest discover -s tests   (from backend/)
"""

import json
import unittest

from fastapi import HTTPException

from app.api.audit import get_audit_events
from app.api.auth import get_current_officer, login
from app.api.decision import get_settlement_decision
from app.api.destination import get_settlement_destination_analysis
from app.api.gis import get_boundaries
from app.api.report import get_settlement_report
from app.api.risk import get_settlement_risk
from app.api.settlements import get_settlement, list_settlements
from app.config import settings
from app.database import get_connection
from app.main import health
from app.schemas.auth import LoginRequest
from app.schemas.decision import SettlementDecision
from app.schemas.destination import SettlementDestinationAnalysis
from app.schemas.risk import RiskAssessment
from app.services.audit import (
    ACTION_GENERATE_REPORT,
    ACTION_LOGIN_FAILURE,
    ACTION_LOGIN_SUCCESS,
    ACTION_VIEW_DECISION_WORKSPACE,
    ACTION_VIEW_DESTINATIONS,
    ACTION_VIEW_GIS_BOUNDARIES,
    ACTION_VIEW_SETTLEMENT,
    ACTION_VIEW_SETTLEMENT_RISK,
    list_recent_audit_events,
    record_audit_event,
)
from tests.fixtures import TEST_OFFICER, IsolatedDatabase

_TEST_JWT_SECRET = "audit-test-only-jwt-secret-not-used-elsewhere-32chars-minimum"
_TEST_USERNAME = "demo.officer"
_TEST_PASSWORD = "Correct-Horse-Battery-Staple-2026"


def _count_audit_rows() -> int:
    with get_connection() as conn:
        return conn.execute("SELECT COUNT(*) FROM audit_logs").fetchone()[0]


def _all_audit_rows_as_text() -> str:
    with get_connection() as conn:
        rows = conn.execute("SELECT * FROM audit_logs").fetchall()
    return json.dumps([dict(row) for row in rows])


class _AuthenticatedAuditTestCase(unittest.TestCase):
    """Shared per-class fixture: fresh isolated DB + auth configuration."""

    @classmethod
    def setUpClass(cls):
        cls._db = IsolatedDatabase()
        cls._db.__enter__()
        cls._original_settings = (
            settings.jwt_secret,
            settings.jwt_expires_minutes,
            settings.officer_username,
            settings.officer_password,
        )
        object.__setattr__(settings, "jwt_secret", _TEST_JWT_SECRET)
        object.__setattr__(settings, "jwt_expires_minutes", 60)
        object.__setattr__(settings, "officer_username", _TEST_USERNAME)
        object.__setattr__(settings, "officer_password", _TEST_PASSWORD)
        cls.bhitai_id = next(
            s.id for s in list_settlements() if s.name == "Bhitai Malli"
        )

    @classmethod
    def tearDownClass(cls):
        jwt_secret, jwt_expires_minutes, officer_username, officer_password = (
            cls._original_settings
        )
        object.__setattr__(settings, "jwt_secret", jwt_secret)
        object.__setattr__(settings, "jwt_expires_minutes", jwt_expires_minutes)
        object.__setattr__(settings, "officer_username", officer_username)
        object.__setattr__(settings, "officer_password", officer_password)
        cls._db.__exit__(None, None, None)


class TestAuditTableAndInsert(_AuthenticatedAuditTestCase):
    """Items 1-4."""

    def test_1_audit_table_exists(self):
        with get_connection() as conn:
            row = conn.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='audit_logs'"
            ).fetchone()
        self.assertIsNotNone(row)

    def test_2_successful_insert_is_visible(self):
        before = _count_audit_rows()
        record_audit_event(
            actor="test.officer", role="officer", action="VIEW_SETTLEMENT", outcome="success"
        )
        self.assertEqual(_count_audit_rows(), before + 1)

    def test_3_multiple_events_are_all_preserved(self):
        before = _count_audit_rows()
        for i in range(5):
            record_audit_event(
                actor="test.officer",
                role="officer",
                action="VIEW_SETTLEMENT",
                outcome="success",
                resource_id=str(i),
            )
        self.assertEqual(_count_audit_rows(), before + 5)

    def test_4_timestamp_is_utc_iso8601(self):
        record_audit_event(
            actor="test.officer", role="officer", action="VIEW_SETTLEMENT", outcome="success"
        )
        newest = list_recent_audit_events(limit=1)[0]
        # datetime.now(timezone.utc).isoformat() always carries a UTC
        # offset suffix ("+00:00") — never a bare/naive timestamp.
        self.assertTrue(newest["timestamp"].endswith("+00:00"))


class TestLoginAuditing(_AuthenticatedAuditTestCase):
    """Items 5-6."""

    def test_5_successful_login_creates_login_success_event(self):
        before = _count_audit_rows()
        login(LoginRequest(username=_TEST_USERNAME, password=_TEST_PASSWORD))
        events = list_recent_audit_events(limit=1)
        self.assertEqual(_count_audit_rows(), before + 1)
        self.assertEqual(events[0]["action"], ACTION_LOGIN_SUCCESS)
        self.assertEqual(events[0]["actor"], _TEST_USERNAME)
        self.assertEqual(events[0]["role"], "officer")
        self.assertEqual(events[0]["outcome"], "success")

    def test_6_failed_login_creates_login_failure_event(self):
        before = _count_audit_rows()
        with self.assertRaises(HTTPException):
            login(LoginRequest(username=_TEST_USERNAME, password="wrong-password"))
        events = list_recent_audit_events(limit=1)
        self.assertEqual(_count_audit_rows(), before + 1)
        self.assertEqual(events[0]["action"], ACTION_LOGIN_FAILURE)
        self.assertEqual(events[0]["actor"], _TEST_USERNAME)
        self.assertEqual(events[0]["role"], "unknown")
        self.assertEqual(events[0]["outcome"], "failure")


class TestApiViewAuditing(_AuthenticatedAuditTestCase):
    """Items 7-12 — each protected view/generate action creates its
    named audit event."""

    def test_7_view_settlement_creates_event(self):
        get_settlement(self.bhitai_id, officer=TEST_OFFICER)
        newest = list_recent_audit_events(limit=1)[0]
        self.assertEqual(newest["action"], ACTION_VIEW_SETTLEMENT)
        self.assertEqual(newest["resource_type"], "settlement")
        self.assertEqual(newest["resource_id"], str(self.bhitai_id))
        self.assertEqual(newest["outcome"], "success")

    def test_8_view_settlement_risk_creates_event(self):
        get_settlement_risk(self.bhitai_id, officer=TEST_OFFICER)
        newest = list_recent_audit_events(limit=1)[0]
        self.assertEqual(newest["action"], ACTION_VIEW_SETTLEMENT_RISK)
        self.assertEqual(newest["resource_id"], str(self.bhitai_id))

    def test_9_view_decision_workspace_creates_event(self):
        get_settlement_decision(self.bhitai_id, officer=TEST_OFFICER)
        newest = list_recent_audit_events(limit=1)[0]
        self.assertEqual(newest["action"], ACTION_VIEW_DECISION_WORKSPACE)

    def test_10_view_destinations_creates_event(self):
        get_settlement_destination_analysis(self.bhitai_id, officer=TEST_OFFICER)
        newest = list_recent_audit_events(limit=1)[0]
        self.assertEqual(newest["action"], ACTION_VIEW_DESTINATIONS)

    def test_11_view_gis_boundaries_creates_event(self):
        get_boundaries(officer=TEST_OFFICER)
        newest = list_recent_audit_events(limit=1)[0]
        self.assertEqual(newest["action"], ACTION_VIEW_GIS_BOUNDARIES)
        self.assertEqual(newest["resource_type"], "gis_layer")

    def test_12_generate_report_creates_event(self):
        get_settlement_report(self.bhitai_id, officer=TEST_OFFICER)
        newest = list_recent_audit_events(limit=1)[0]
        self.assertEqual(newest["action"], ACTION_GENERATE_REPORT)
        self.assertEqual(newest["resource_id"], str(self.bhitai_id))


class TestAuditApiEndpoint(_AuthenticatedAuditTestCase):
    """Items 13-15."""

    def test_13_audit_endpoint_requires_authentication(self):
        with self.assertRaises(HTTPException) as ctx:
            get_current_officer(credentials=None)
        self.assertEqual(ctx.exception.status_code, 401)
        # Confirms the real dependency the /api/audit router is wired
        # to (see api/audit.py's `dependencies=[Depends(get_current_officer)]`).
        from app.api.audit import router as audit_router

        calls = [d.call for route in audit_router.routes for d in route.dependant.dependencies]
        self.assertIn(get_current_officer, calls)

    def test_14_authenticated_request_returns_events(self):
        record_audit_event(actor="x", role="officer", action="VIEW_SETTLEMENT", outcome="success")
        events = get_audit_events(limit=50)
        self.assertGreater(len(events), 0)
        self.assertTrue(all(hasattr(e, "action") for e in events))

    def test_15_newest_events_appear_first(self):
        record_audit_event(actor="x", role="officer", action="VIEW_SETTLEMENT", outcome="success", resource_id="first")
        record_audit_event(actor="x", role="officer", action="VIEW_SETTLEMENT", outcome="success", resource_id="second")
        events = get_audit_events(limit=2)
        self.assertEqual(events[0].resource_id, "second")
        self.assertEqual(events[1].resource_id, "first")

    def test_bounded_result_size_even_if_a_larger_limit_is_requested(self):
        for i in range(10):
            record_audit_event(actor="x", role="officer", action="VIEW_SETTLEMENT", outcome="success", resource_id=str(i))
        events = get_audit_events(limit=3)
        self.assertEqual(len(events), 3)
        # No arbitrary/unbounded size accepted even if a huge limit is asked for.
        events_capped = get_audit_events(limit=10_000)
        self.assertLessEqual(len(events_capped), 200)


class TestNoSecretsInAuditLog(_AuthenticatedAuditTestCase):
    """Items 16-18 — the core security guarantee of this task."""

    def test_16_17_18_no_password_token_or_auth_header_ever_stored(self):
        # Exercise every audited action once, including a real login
        # (which handles a real password) and a real protected call
        # (which requires a real bearer token/Authorization header).
        login(LoginRequest(username=_TEST_USERNAME, password=_TEST_PASSWORD))
        with self.assertRaises(HTTPException):
            login(LoginRequest(username=_TEST_USERNAME, password="not-the-real-password"))
        get_settlement(self.bhitai_id, officer=TEST_OFFICER)
        get_settlement_risk(self.bhitai_id, officer=TEST_OFFICER)
        get_settlement_decision(self.bhitai_id, officer=TEST_OFFICER)
        get_settlement_destination_analysis(self.bhitai_id, officer=TEST_OFFICER)
        get_boundaries(officer=TEST_OFFICER)
        get_settlement_report(self.bhitai_id, officer=TEST_OFFICER)

        from app.services.auth import create_access_token

        real_token, _ = create_access_token(subject=_TEST_USERNAME, role="officer")

        dump = _all_audit_rows_as_text()
        self.assertNotIn(_TEST_PASSWORD, dump)
        self.assertNotIn("not-the-real-password", dump)
        self.assertNotIn(real_token, dump)
        self.assertNotIn("Bearer ", dump)
        self.assertNotIn("Authorization", dump)
        self.assertNotIn("access_token", dump)


class TestAuditFailureIsNonFatal(_AuthenticatedAuditTestCase):
    """Item 19 — the single most important safety property: a broken
    audit sink must never turn a successful business action into a
    failure."""

    def test_19_broken_audit_table_does_not_break_settlement_view(self):
        with get_connection() as conn:
            conn.execute("DROP TABLE IF EXISTS audit_logs")

        # The business operation must still succeed and still return
        # the correct real data.
        result = get_settlement(self.bhitai_id, officer=TEST_OFFICER)
        self.assertEqual(result.name, "Bhitai Malli")

    def test_19b_record_audit_event_itself_never_raises(self):
        with get_connection() as conn:
            conn.execute("DROP TABLE IF EXISTS audit_logs")
        try:
            record_audit_event(actor="x", role="officer", action="VIEW_SETTLEMENT", outcome="success")
        except Exception as exc:  # noqa: BLE001
            self.fail(f"record_audit_event raised {exc!r}; it must never raise.")


class TestHealthEndpointIsNotAudited(_AuthenticatedAuditTestCase):
    """Item 20 — no noisy audit records for a plain health check."""

    def test_20_health_check_creates_no_audit_event(self):
        before = _count_audit_rows()
        result = health()
        self.assertEqual(result["status"], "ok")
        self.assertEqual(_count_audit_rows(), before)


class TestRiskDecisionDestinationBehaviorUnchangedByAuditing(_AuthenticatedAuditTestCase):
    """Task 36 §K regression spot-check: adding auditing must not have
    changed any actual VIKALP output — same evidence-gated values Tasks
    33-35 already established."""

    def test_bhitai_malli_risk_still_pending_and_hazard_still_no_evidence(self):
        result: RiskAssessment = get_settlement_risk(self.bhitai_id, officer=TEST_OFFICER)
        self.assertEqual(result.assessment_status, "pending")
        self.assertIsNone(result.overall_score)
        hazard = next(d for d in result.dimensions if d.dimension == "Hazard Exposure")
        self.assertEqual(hazard.status, "no_evidence_found")

    def test_bhitai_malli_decision_still_pending_and_not_evaluated(self):
        result: SettlementDecision = get_settlement_decision(self.bhitai_id, officer=TEST_OFFICER)
        self.assertEqual(result.decision_status, "pending")
        self.assertTrue(all(p.status == "not_evaluated" for p in result.pathways))

    def test_bhitai_malli_destinations_still_pending_and_empty(self):
        result: SettlementDestinationAnalysis = get_settlement_destination_analysis(
            self.bhitai_id, officer=TEST_OFFICER
        )
        self.assertEqual(result.analysis_status, "pending")
        self.assertEqual(result.candidates, [])

    def test_report_still_generates_a_real_pdf(self):
        response = get_settlement_report(self.bhitai_id, officer=TEST_OFFICER)
        self.assertTrue(response.body.startswith(b"%PDF-"))


if __name__ == "__main__":
    unittest.main()
