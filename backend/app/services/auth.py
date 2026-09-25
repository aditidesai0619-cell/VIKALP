"""Minimal JWT authentication for VIKALP's single demo officer account
(Task 35).

No JWT library was previously installed anywhere in this project (see
backend/requirements.txt) — per Task 35's own instruction to avoid a
"large authentication framework," HS256 signing/verification is
implemented here directly from standard-library primitives
(`hmac`, `hashlib`, `base64`, `json`, `time`) rather than adding
PyJWT/python-jose. No user database is created — there is exactly one
configured officer, sourced entirely from environment variables
(`VIKALP_OFFICER_USERNAME` / `VIKALP_OFFICER_PASSWORD`).

Fail-safe by design: there is no fallback JWT secret and no fallback
officer credential. `AuthConfigurationError` is raised the first time
authentication is actually attempted (login, or verifying a bearer
token) if the required environment variables are missing/invalid —
never silently replaced with an insecure default. This check is
deliberately NOT done at import time (see config.py's comment) so that
unrelated modules can still be imported in an environment that hasn't
configured authentication yet (e.g. the existing Task 21-34 test
suites, none of which touch authentication).
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import time
from dataclasses import dataclass
from functools import lru_cache

from ..config import settings

ALGORITHM = "HS256"
TOKEN_TYPE = "bearer"

ROLE_OFFICER = "officer"
# The complete set of roles VIKALP currently recognizes. Adding a
# second role later means adding it here and to whichever route(s)
# should accept it via `require_role()` — not rewriting token
# creation/verification.
VALID_ROLES: frozenset[str] = frozenset({ROLE_OFFICER})

_REQUIRED_CLAIMS = ("sub", "role", "iat", "exp")
_PBKDF2_ITERATIONS = 260_000
_SALT_BYTES = 16


class AuthError(Exception):
    """Any token/credential problem — the API layer maps every instance
    of this to HTTP 401, uniformly, and never echoes the message it
    carries back to the client (it may be useful in server logs only,
    and even there never carries a secret/credential value)."""


class AuthConfigurationError(RuntimeError):
    """Raised when required authentication environment variables are
    missing or invalid. Distinct from AuthError (a client's bad
    credentials/token) — this means the *server* is not configured for
    authentication at all, which the API layer maps to HTTP 500, not
    401 (it is not the client's fault)."""


@dataclass(frozen=True)
class AuthenticatedOfficer:
    username: str
    role: str


# ---------------------------------------------------------------------------
# Configuration guards — called lazily, on first real use, never at
# import time.
# ---------------------------------------------------------------------------


def _require_jwt_secret() -> str:
    secret = settings.jwt_secret
    if not secret or len(secret) < 32:
        raise AuthConfigurationError(
            "VIKALP_JWT_SECRET is not configured (it must be set and at "
            "least 32 characters). See backend/.env.example. VIKALP does "
            "not provide an insecure fallback secret."
        )
    return secret


def _require_officer_credentials() -> tuple[str, str]:
    username, password = settings.officer_username, settings.officer_password
    if not username or not password:
        raise AuthConfigurationError(
            "VIKALP_OFFICER_USERNAME/VIKALP_OFFICER_PASSWORD are not "
            "configured. See backend/.env.example."
        )
    return username, password


# ---------------------------------------------------------------------------
# Password handling — PBKDF2-HMAC-SHA256 with a random salt, constant-time
# comparison. The salt/hash are computed lazily (functools.lru_cache) on
# first use and held only as a derived hash thereafter — the raw
# plaintext password is read from the environment once, hashed, and not
# separately retained by this module beyond that.
# ---------------------------------------------------------------------------


@lru_cache(maxsize=1)
def _officer_salt() -> bytes:
    return os.urandom(_SALT_BYTES)


def _hash_password(password: str, salt: bytes) -> bytes:
    return hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt, _PBKDF2_ITERATIONS
    )


@lru_cache(maxsize=1)
def _officer_password_hash() -> bytes:
    _, password = _require_officer_credentials()
    return _hash_password(password, _officer_salt())


def verify_officer_credentials(username: str, password: str) -> bool:
    """Constant-time credential check against the single configured
    officer account. Never logs the submitted or configured password."""
    expected_username, _ = _require_officer_credentials()
    expected_hash = _officer_password_hash()
    candidate_hash = _hash_password(password, _officer_salt())

    username_ok = hmac.compare_digest(username, expected_username)
    password_ok = hmac.compare_digest(candidate_hash, expected_hash)
    return username_ok and password_ok


# ---------------------------------------------------------------------------
# Minimal HS256 JWT — header.payload.signature, base64url, no padding.
# ---------------------------------------------------------------------------


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    try:
        return base64.urlsafe_b64decode(data + padding)
    except (ValueError, TypeError) as exc:
        raise AuthError("Malformed token encoding.") from exc


def _sign(signing_input: bytes, secret: str) -> bytes:
    return hmac.new(secret.encode("utf-8"), signing_input, hashlib.sha256).digest()


def create_access_token(
    subject: str, role: str, expires_minutes: int | None = None
) -> tuple[str, int]:
    """Returns (token, expires_in_seconds)."""
    secret = _require_jwt_secret()
    if role not in VALID_ROLES:
        raise AuthError(f"Cannot issue a token for unrecognized role {role!r}.")

    minutes = expires_minutes if expires_minutes is not None else settings.jwt_expires_minutes
    expires_in = max(1, int(minutes)) * 60
    now = int(time.time())

    header = {"alg": ALGORITHM, "typ": "JWT"}
    payload = {"sub": subject, "role": role, "iat": now, "exp": now + expires_in}

    header_b64 = _b64url_encode(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    payload_b64 = _b64url_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signing_input = f"{header_b64}.{payload_b64}".encode("ascii")
    signature_b64 = _b64url_encode(_sign(signing_input, secret))

    return f"{header_b64}.{payload_b64}.{signature_b64}", expires_in


def decode_access_token(token: str) -> AuthenticatedOfficer:
    """Verifies signature, algorithm, required claims, and expiry.
    Raises AuthError for any failure — never partially trusts a token
    that fails any single check."""
    secret = _require_jwt_secret()

    if not token or token.count(".") != 2:
        raise AuthError("Malformed token structure.")
    header_b64, payload_b64, signature_b64 = token.split(".")
    if not header_b64 or not payload_b64 or not signature_b64:
        raise AuthError("Malformed token structure.")

    try:
        header = json.loads(_b64url_decode(header_b64))
        payload = json.loads(_b64url_decode(payload_b64))
    except (ValueError, TypeError, json.JSONDecodeError) as exc:
        raise AuthError("Malformed token contents.") from exc
    signature = _b64url_decode(signature_b64)

    if not isinstance(header, dict) or header.get("typ") != "JWT":
        raise AuthError("Malformed token header.")
    # Explicitly reject anything other than HS256 — including "none".
    if header.get("alg") != ALGORITHM:
        raise AuthError(f"Unsupported token algorithm: {header.get('alg')!r}.")

    signing_input = f"{header_b64}.{payload_b64}".encode("ascii")
    expected_signature = _sign(signing_input, secret)
    if not hmac.compare_digest(signature, expected_signature):
        raise AuthError("Invalid token signature.")

    if not isinstance(payload, dict):
        raise AuthError("Malformed token payload.")
    for claim in _REQUIRED_CLAIMS:
        if claim not in payload:
            raise AuthError(f"Token missing required claim: {claim!r}.")

    exp = payload["exp"]
    if not isinstance(exp, (int, float)):
        raise AuthError("Token 'exp' claim is not a number.")
    if time.time() >= exp:
        raise AuthError("Token has expired.")

    role = payload["role"]
    if role not in VALID_ROLES:
        raise AuthError(f"Unrecognized role in token: {role!r}.")

    subject = payload["sub"]
    if not isinstance(subject, str) or not subject:
        raise AuthError("Token 'sub' claim is invalid.")

    return AuthenticatedOfficer(username=subject, role=role)


def require_role(officer: AuthenticatedOfficer, allowed_roles: frozenset[str]) -> None:
    """Minimal RBAC hook (Task 35 §F). Not called by any route today —
    the MVP's one role (`officer`) is already allowed on every
    protected route — but lets a future role be restricted to specific
    routes without redesigning authentication: a route/dependency can
    call `require_role(officer, frozenset({"officer", "supervisor"}))`
    once a second role exists."""
    if officer.role not in allowed_roles:
        raise AuthError(
            f"Role {officer.role!r} is not permitted for this operation."
        )
