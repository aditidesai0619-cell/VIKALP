from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from ..schemas.auth import AuthenticatedUser, LoginRequest, LoginResponse
from ..services.audit import (
    ACTION_LOGIN_FAILURE,
    ACTION_LOGIN_SUCCESS,
    OUTCOME_FAILURE,
    OUTCOME_SUCCESS,
    record_audit_event,
)
from ..services.auth import (
    ROLE_OFFICER,
    AuthConfigurationError,
    AuthenticatedOfficer,
    AuthError,
    create_access_token,
    decode_access_token,
    verify_officer_credentials,
)

# Deliberately its own router (not merged into settlements/gis/etc.) —
# /api/auth/login must stay public while every other /api/* router
# below is protected (see get_current_officer / Task 35 §E).
router = APIRouter(prefix="/api/auth", tags=["auth"])

# auto_error=False so a missing/malformed Authorization header reaches
# get_current_officer as `None` (mapped to a clean 401) rather than
# FastAPI's own generic 403.
_bearer_scheme = HTTPBearer(auto_error=False)


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest) -> LoginResponse:
    try:
        credentials_valid = verify_officer_credentials(payload.username, payload.password)
    except AuthConfigurationError as exc:
        # A server misconfiguration is not an ordinary login failure —
        # never recorded as LOGIN_FAILURE (Task 36 §E).
        raise HTTPException(
            status_code=500, detail="Authentication is not configured."
        ) from exc

    if not credentials_valid:
        # actor is the *attempted* username (never the password); role
        # is "unknown" since the attempt was never authenticated.
        record_audit_event(
            actor=payload.username,
            role="unknown",
            action=ACTION_LOGIN_FAILURE,
            outcome=OUTCOME_FAILURE,
        )
        raise HTTPException(status_code=401, detail="Invalid username or password.")

    try:
        token, expires_in = create_access_token(subject=payload.username, role=ROLE_OFFICER)
    except AuthConfigurationError as exc:
        raise HTTPException(
            status_code=500, detail="Authentication is not configured."
        ) from exc

    record_audit_event(
        actor=payload.username,
        role=ROLE_OFFICER,
        action=ACTION_LOGIN_SUCCESS,
        outcome=OUTCOME_SUCCESS,
    )
    return LoginResponse(
        access_token=token,
        token_type="bearer",
        expires_in=expires_in,
        user=AuthenticatedUser(username=payload.username, role=ROLE_OFFICER),
    )


def get_current_officer(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
) -> AuthenticatedOfficer:
    """FastAPI dependency protecting every other /api/* router (added
    via `APIRouter(..., dependencies=[Depends(get_current_officer)])`
    in settlements/gis/risk/decision/destination/report — see each
    file). A request with no/malformed/expired/invalid-signature token
    always reaches HTTP 401 here; a missing server JWT_SECRET reaches
    HTTP 500 (a server misconfiguration, not the client's fault)."""
    if credentials is None or credentials.scheme.lower() != "bearer" or not credentials.credentials:
        raise HTTPException(status_code=401, detail="Not authenticated.")

    try:
        return decode_access_token(credentials.credentials)
    except AuthConfigurationError as exc:
        raise HTTPException(
            status_code=500, detail="Authentication is not configured."
        ) from exc
    except AuthError as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired token.") from exc
