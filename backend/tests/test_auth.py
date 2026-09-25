"""JWT authentication tests (Task 35).

No FastAPI TestClient/httpx is used, for the same reason established in
Tasks 33/34 (httpx is not an installed dependency, and Task 35 §J
explicitly repeats not to add one). Two consequences for how
"protected endpoint" behavior is tested here:

1. Existing Task 33/34 tests call route functions directly (bypassing
   FastAPI's routing/dependency-injection layer entirely), so adding
   `dependencies=[Depends(get_current_officer)]` to each router is
   invisible to them — confirmed by re-running the full existing suite
   unchanged. That is what makes 80/80 pre-Task-35 tests still pass
   with zero modification.
2. To actually test that protection, this file instead (a) calls the
   `get_current_officer` FastAPI dependency function directly with a
   real/fake/missing `HTTPAuthorizationCredentials` object (this is the
   exact function FastAPI would invoke per-request for every protected
   route), and (b) inspects each router's own route objects to confirm
   `get_current_officer` is actually wired into their `dependant.
   dependencies` — i.e. it verifies the real wiring FastAPI would use,
   not a re-implementation of it. A live end-to-end HTTP check
   (uvicorn + curl) was additionally run manually during verification
   and is recorded in docs/DECISIONS.md Task 35, not repeated here as
   an automated test.

Authentication configuration (`VIKALP_JWT_SECRET`/
`VIKALP_OFFICER_USERNAME`/`VIKALP_OFFICER_PASSWORD`) is patched directly
onto the shared `app.config.settings` singleton for this test module
only (`object.__setattr__`, bypassing the frozen dataclass — same
technique `tests/fixtures.py` already uses for `database_path`), so
these tests are self-contained and do not depend on the real process
environment being configured. Configuration is set once in
setUpModule and restored in tearDownModule — `services.auth`'s
`_officer_salt`/`_officer_password_hash` are `functools.lru_cache`d
(computed once per process), so it must not change mid-module.

Run with: python -m unittest discover -s tests   (from backend/)
"""

import time
import unittest

from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

from app.api.auth import get_current_officer
from app.api.auth import router as auth_router
from app.api.decision import router as decision_router
from app.api.destination import router as destination_router
from app.api.gis import router as gis_router
from app.api.report import router as report_router
from app.api.risk import router as risk_router
from app.api.settlements import router as settlements_router
from app.config import settings
from app.main import app
from app.services import auth as auth_service
from tests.fixtures import IsolatedDatabase

_TEST_JWT_SECRET = "unit-test-only-jwt-secret-not-used-anywhere-else-32chars-min"
_TEST_USERNAME = "demo.officer"
_TEST_PASSWORD = "Correct-Horse-Battery-Staple-2026"

# Task 36 — login() now also calls record_audit_event(), which needs a
# real `audit_logs` table to exist. Reuses the same IsolatedDatabase
# fixture every other API-layer test file uses (Task 33), scoped to
# this whole module (nothing here needs a *fresh* database per test,
# just a real, isolated one) — the developer's actual `vikalp.db` is
# still never touched.
_db = IsolatedDatabase()


def setUpModule():
    global _ORIGINAL_SETTINGS
    _db.__enter__()
    _ORIGINAL_SETTINGS = (
        settings.jwt_secret,
        settings.jwt_expires_minutes,
        settings.officer_username,
        settings.officer_password,
    )
    object.__setattr__(settings, "jwt_secret", _TEST_JWT_SECRET)
    object.__setattr__(settings, "jwt_expires_minutes", 60)
    object.__setattr__(settings, "officer_username", _TEST_USERNAME)
    object.__setattr__(settings, "officer_password", _TEST_PASSWORD)


def tearDownModule():
    jwt_secret, jwt_expires_minutes, officer_username, officer_password = _ORIGINAL_SETTINGS
    object.__setattr__(settings, "jwt_secret", jwt_secret)
    object.__setattr__(settings, "jwt_expires_minutes", jwt_expires_minutes)
    object.__setattr__(settings, "officer_username", officer_username)
    object.__setattr__(settings, "officer_password", officer_password)
    _db.__exit__(None, None, None)


def _bearer(token: str) -> HTTPAuthorizationCredentials:
    return HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)


class TestPasswordVerification(unittest.TestCase):
    """Items 1-2."""

    def test_1_correct_credentials_verify(self):
        self.assertTrue(
            auth_service.verify_officer_credentials(_TEST_USERNAME, _TEST_PASSWORD)
        )

    def test_2_wrong_password_fails(self):
        self.assertFalse(
            auth_service.verify_officer_credentials(_TEST_USERNAME, "wrong-password")
        )

    def test_2b_wrong_username_fails(self):
        self.assertFalse(
            auth_service.verify_officer_credentials("someone.else", _TEST_PASSWORD)
        )

    def test_2c_password_is_never_stored_or_returned_in_plaintext(self):
        # The module never keeps a plaintext-password attribute of its
        # own — only settings.officer_password (the raw env value,
        # unavoidable) and the derived PBKDF2 hash.
        self.assertFalse(hasattr(auth_service, "_officer_password"))
        self.assertIsInstance(auth_service._officer_password_hash(), bytes)
        self.assertNotEqual(
            auth_service._officer_password_hash(), _TEST_PASSWORD.encode()
        )


class TestJwtCreationAndVerification(unittest.TestCase):
    """Items 3-4."""

    def test_3_create_access_token_returns_well_formed_jwt(self):
        token, expires_in = auth_service.create_access_token(
            subject=_TEST_USERNAME, role=auth_service.ROLE_OFFICER
        )
        self.assertEqual(token.count("."), 2)
        self.assertEqual(expires_in, 60 * 60)

    def test_4_decode_access_token_returns_the_same_officer(self):
        token, _ = auth_service.create_access_token(
            subject=_TEST_USERNAME, role=auth_service.ROLE_OFFICER
        )
        officer = auth_service.decode_access_token(token)
        self.assertEqual(officer.username, _TEST_USERNAME)
        self.assertEqual(officer.role, auth_service.ROLE_OFFICER)

    def test_4b_required_claims_are_present_in_the_payload(self):
        import base64
        import json

        token, _ = auth_service.create_access_token(
            subject=_TEST_USERNAME, role=auth_service.ROLE_OFFICER
        )
        _, payload_b64, _ = token.split(".")
        padding = "=" * (-len(payload_b64) % 4)
        payload = json.loads(base64.urlsafe_b64decode(payload_b64 + padding))
        for claim in ("sub", "role", "iat", "exp"):
            self.assertIn(claim, payload)


class TestJwtRejection(unittest.TestCase):
    """Items 5-9 — every malformed/invalid token must raise AuthError."""

    def _valid_token_parts(self):
        token, _ = auth_service.create_access_token(
            subject=_TEST_USERNAME, role=auth_service.ROLE_OFFICER
        )
        return token.split(".")

    def test_5_expired_token_is_rejected(self):
        # create_access_token always issues a future expiry, so an
        # already-expired token is hand-built here using the module's
        # own low-level helpers (the same white-box-testing precedent
        # test_hazard_exposure.py already uses for private helpers).
        past = int(time.time()) - 3600
        header = auth_service._b64url_encode(
            b'{"alg":"HS256","typ":"JWT"}'
        )
        payload = auth_service._b64url_encode(
            f'{{"sub":"{_TEST_USERNAME}","role":"officer","iat":{past-60},"exp":{past}}}'.encode()
        )
        signing_input = f"{header}.{payload}".encode("ascii")
        signature = auth_service._b64url_encode(
            auth_service._sign(signing_input, _TEST_JWT_SECRET)
        )
        expired_token = f"{header}.{payload}.{signature}"
        with self.assertRaises(auth_service.AuthError):
            auth_service.decode_access_token(expired_token)

    def test_6_invalid_signature_is_rejected(self):
        header, payload, _signature = self._valid_token_parts()
        tampered = f"{header}.{payload}.{auth_service._b64url_encode(b'not-the-real-signature!')}"
        with self.assertRaises(auth_service.AuthError):
            auth_service.decode_access_token(tampered)

    def test_7_malformed_token_is_rejected(self):
        for garbage in ("not-a-jwt-at-all", "only.two", "a.b.c.d", "", "...", "%%%.%%%.%%%"):
            with self.assertRaises(auth_service.AuthError):
                auth_service.decode_access_token(garbage)

    def test_8_unsupported_algorithm_is_rejected(self):
        # alg=none, plus HS512 as a second unsupported-algorithm case.
        for alg in ("none", "HS512"):
            header = auth_service._b64url_encode(
                f'{{"alg":"{alg}","typ":"JWT"}}'.encode()
            )
            payload = auth_service._b64url_encode(
                f'{{"sub":"{_TEST_USERNAME}","role":"officer","iat":0,"exp":9999999999}}'.encode()
            )
            token = f"{header}.{payload}.{auth_service._b64url_encode(b'x')}"
            with self.assertRaises(auth_service.AuthError):
                auth_service.decode_access_token(token)

    def test_9_missing_required_claim_is_rejected(self):
        # Valid header/signature, but the payload omits "role".
        header = auth_service._b64url_encode(b'{"alg":"HS256","typ":"JWT"}')
        payload = auth_service._b64url_encode(
            f'{{"sub":"{_TEST_USERNAME}","iat":0,"exp":9999999999}}'.encode()
        )
        signing_input = f"{header}.{payload}".encode("ascii")
        signature = auth_service._b64url_encode(
            auth_service._sign(signing_input, _TEST_JWT_SECRET)
        )
        token = f"{header}.{payload}.{signature}"
        with self.assertRaises(auth_service.AuthError):
            auth_service.decode_access_token(token)


class TestLoginEndpoint(unittest.TestCase):
    """Items 10-11."""

    def test_10_successful_login_returns_token_and_safe_user_info(self):
        from app.api.auth import login
        from app.schemas.auth import LoginRequest

        response = login(LoginRequest(username=_TEST_USERNAME, password=_TEST_PASSWORD))
        self.assertTrue(response.access_token)
        self.assertEqual(response.token_type, "bearer")
        self.assertEqual(response.expires_in, 60 * 60)
        self.assertEqual(response.user.username, _TEST_USERNAME)
        self.assertEqual(response.user.role, "officer")
        # The password must never appear on the response object at all.
        self.assertFalse(hasattr(response.user, "password"))
        self.assertNotIn(_TEST_PASSWORD, response.model_dump_json())

    def test_11_wrong_credentials_raise_401(self):
        from app.api.auth import login
        from app.schemas.auth import LoginRequest

        with self.assertRaises(HTTPException) as ctx:
            login(LoginRequest(username=_TEST_USERNAME, password="wrong"))
        self.assertEqual(ctx.exception.status_code, 401)
        # No hint about which part (username vs password) was wrong,
        # and no credential value echoed back.
        self.assertNotIn("wrong", ctx.exception.detail)


class TestProtectedEndpointDependency(unittest.TestCase):
    """Items 12-14 — exercises the real `get_current_officer` FastAPI
    dependency every protected router uses."""

    def test_12_missing_token_returns_401(self):
        with self.assertRaises(HTTPException) as ctx:
            get_current_officer(credentials=None)
        self.assertEqual(ctx.exception.status_code, 401)

    def test_13_invalid_token_returns_401(self):
        with self.assertRaises(HTTPException) as ctx:
            get_current_officer(credentials=_bearer("garbage.not.a.jwt"))
        self.assertEqual(ctx.exception.status_code, 401)

    def test_13b_expired_token_returns_401(self):
        past = int(time.time()) - 3600
        header = auth_service._b64url_encode(b'{"alg":"HS256","typ":"JWT"}')
        payload = auth_service._b64url_encode(
            f'{{"sub":"{_TEST_USERNAME}","role":"officer","iat":{past-60},"exp":{past}}}'.encode()
        )
        signing_input = f"{header}.{payload}".encode("ascii")
        signature = auth_service._b64url_encode(
            auth_service._sign(signing_input, _TEST_JWT_SECRET)
        )
        with self.assertRaises(HTTPException) as ctx:
            get_current_officer(credentials=_bearer(f"{header}.{payload}.{signature}"))
        self.assertEqual(ctx.exception.status_code, 401)

    def test_14_valid_token_returns_the_authenticated_officer(self):
        token, _ = auth_service.create_access_token(
            subject=_TEST_USERNAME, role=auth_service.ROLE_OFFICER
        )
        officer = get_current_officer(credentials=_bearer(token))
        self.assertEqual(officer.username, _TEST_USERNAME)
        self.assertEqual(officer.role, "officer")


def _route_dependency_calls(route) -> list:
    return [d.call for d in route.dependant.dependencies]


class TestPublicVsProtectedRouteWiring(unittest.TestCase):
    """Items 15-16, plus confirming every other /api/* route IS
    protected — checked against each router's own real route objects
    (the same objects FastAPI serves requests through), not a
    re-implementation of the wiring."""

    def test_15_health_route_has_no_auth_dependency(self):
        health_route = next(
            r for r in app.routes if getattr(r, "path", None) == "/health"
        )
        self.assertNotIn(get_current_officer, _route_dependency_calls(health_route))

    def test_16_login_route_has_no_auth_dependency(self):
        login_route = next(r for r in auth_router.routes if r.path == "/api/auth/login")
        self.assertNotIn(get_current_officer, _route_dependency_calls(login_route))

    def test_every_data_router_requires_officer_auth(self):
        protected_routers = (
            settlements_router,
            risk_router,
            decision_router,
            destination_router,
            gis_router,
            report_router,
        )
        for router in protected_routers:
            for route in router.routes:
                self.assertIn(
                    get_current_officer,
                    _route_dependency_calls(route),
                    f"{route.path} is missing the officer-auth dependency",
                )


if __name__ == "__main__":
    unittest.main()
