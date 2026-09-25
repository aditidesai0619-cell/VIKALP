"""Minimal, append-only audit logging (Task 36).

Records who accessed/generated what, when, and with what outcome —
accountability and traceability for officer actions, not a compliance/
SIEM system. Uses the existing SQLite database (see `database.py`'s
`audit_logs` table) and the existing `get_connection()` helper — no
new database technology, no migration framework, no background worker.

Never records a secret: no password, no JWT/access_token, no
Authorization header, no full request body. `metadata` (when used) is
kept small and non-sensitive by design — none of the call sites added
in this task populate it with anything beyond `None`.

`record_audit_event()` never raises: a failure to write an audit
record must never turn a successful business operation into a failure
(Task 36 §C). Failures are surfaced via the standard `logging` module
only, at a level that won't create noisy logs under normal operation.
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone

from ..database import get_connection

logger = logging.getLogger("vikalp.audit")

# Action vocabulary (Task 36 §D) — deliberately exhaustive, not
# open-ended; a new action type is a deliberate addition here, not a
# free-text string invented at each call site.
ACTION_LOGIN_SUCCESS = "LOGIN_SUCCESS"
ACTION_LOGIN_FAILURE = "LOGIN_FAILURE"
ACTION_LOGOUT = "LOGOUT"
ACTION_VIEW_SETTLEMENT = "VIEW_SETTLEMENT"
ACTION_VIEW_SETTLEMENT_RISK = "VIEW_SETTLEMENT_RISK"
ACTION_VIEW_DECISION_WORKSPACE = "VIEW_DECISION_WORKSPACE"
ACTION_VIEW_DESTINATIONS = "VIEW_DESTINATIONS"
ACTION_VIEW_GIS_BOUNDARIES = "VIEW_GIS_BOUNDARIES"
ACTION_VIEW_GIS_LANDSLIDES = "VIEW_GIS_LANDSLIDES"
ACTION_VIEW_BUILDINGS = "VIEW_BUILDINGS"
ACTION_VIEW_ROADS = "VIEW_ROADS"
ACTION_VIEW_WATER = "VIEW_WATER"
ACTION_VIEW_AMENITIES = "VIEW_AMENITIES"
ACTION_GENERATE_REPORT = "GENERATE_REPORT"
ACTION_VIEW_COPILOT_CONTEXT = "VIEW_COPILOT_CONTEXT"
ACTION_VIEW_EVIDENCE_EXPLANATION = "VIEW_EVIDENCE_EXPLANATION"
ACTION_VIEW_WEATHER = "VIEW_WEATHER"

OUTCOME_SUCCESS = "success"
OUTCOME_FAILURE = "failure"

_MAX_METADATA_CHARS = 500
_DEFAULT_LIMIT = 50
_MAX_LIMIT = 200


def record_audit_event(
    actor: str,
    role: str,
    action: str,
    outcome: str,
    resource_type: str | None = None,
    resource_id: str | None = None,
    metadata: dict | None = None,
) -> None:
    """Insert one append-only audit event. Best-effort: any failure
    (a locked/unavailable database, a serialization error, etc.) is
    caught here and logged, never propagated — recording an audit
    event is never allowed to change the outcome of the action being
    audited."""
    try:
        timestamp = datetime.now(timezone.utc).isoformat()
        metadata_json = json.dumps(metadata)[:_MAX_METADATA_CHARS] if metadata else None
        with get_connection() as conn:
            conn.execute(
                """
                INSERT INTO audit_logs
                    (timestamp, actor, role, action, resource_type,
                     resource_id, outcome, metadata)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    timestamp,
                    actor,
                    role,
                    action,
                    resource_type,
                    resource_id,
                    outcome,
                    metadata_json,
                ),
            )
    except Exception:  # noqa: BLE001 - intentionally broad, see docstring
        logger.warning("Failed to record audit event (action=%s)", action, exc_info=True)


def list_recent_audit_events(limit: int = _DEFAULT_LIMIT) -> list[dict]:
    """Newest events first, bounded result size — no arbitrary
    filter/SQL input accepted (Task 36 §H)."""
    bounded_limit = max(1, min(limit, _MAX_LIMIT))
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT id, timestamp, actor, role, action, resource_type,
                   resource_id, outcome, metadata
            FROM audit_logs
            ORDER BY id DESC
            LIMIT ?
            """,
            (bounded_limit,),
        ).fetchall()
    return [dict(row) for row in rows]
