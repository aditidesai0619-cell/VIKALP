from fastapi import APIRouter, Depends, Response

from ..schemas.audit import AuditEvent
from ..services.audit import ACTION_LOGOUT, OUTCOME_SUCCESS, list_recent_audit_events, record_audit_event
from .auth import AuthenticatedOfficer, get_current_officer

# Protected like every other application router (Task 35 pattern) —
# an officer must be authenticated to read the audit trail or to
# record their own logout.
router = APIRouter(
    prefix="/api/audit", tags=["audit"], dependencies=[Depends(get_current_officer)]
)

_DEFAULT_LIMIT = 50


@router.get("", response_model=list[AuditEvent])
def get_audit_events(limit: int = _DEFAULT_LIMIT) -> list[AuditEvent]:
    """Newest events first, bounded size (services/audit.py enforces
    the upper bound regardless of what `limit` is passed) — no
    arbitrary filter expression accepted."""
    events = list_recent_audit_events(limit=limit)
    return [AuditEvent(**event) for event in events]


@router.post("/logout", status_code=204)
def post_logout_event(
    officer: AuthenticatedOfficer = Depends(get_current_officer),
) -> Response:
    """Records that the officer signed out. This does NOT revoke the
    JWT itself — VIKALP's tokens remain stateless/self-expiring by
    design (Task 35); this is an audit record of the officer's own
    action, not a server-side session/token mechanism. Called by the
    frontend, best-effort, immediately before it clears its own local
    session — see frontend/src/components/layout/Header.tsx."""
    record_audit_event(
        actor=officer.username,
        role=officer.role,
        action=ACTION_LOGOUT,
        outcome=OUTCOME_SUCCESS,
    )
    return Response(status_code=204)
