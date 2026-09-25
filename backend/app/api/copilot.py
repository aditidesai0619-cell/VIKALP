from fastapi import APIRouter, Depends, HTTPException

from ..database import get_connection
from ..models.settlement import Settlement
from ..schemas.copilot import CopilotContext, EvidenceExplanation
from ..services.audit import (
    ACTION_VIEW_COPILOT_CONTEXT,
    ACTION_VIEW_EVIDENCE_EXPLANATION,
    OUTCOME_SUCCESS,
    record_audit_event,
)
from ..services.copilot import build_copilot_context, explain_settlement
from .auth import AuthenticatedOfficer, get_current_officer

# Protected (Task 35 §E) — see api/settlements.py. Read-only: neither
# route mutates settlement/risk/decision/destination/audit data.
router = APIRouter(
    prefix="/api/settlements",
    tags=["copilot"],
    dependencies=[Depends(get_current_officer)],
)


@router.get("/{settlement_id}/copilot-context", response_model=CopilotContext)
def get_settlement_copilot_context(
    settlement_id: int,
    officer: AuthenticatedOfficer = Depends(get_current_officer),
) -> CopilotContext:
    with get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM settlements WHERE id = ?", (settlement_id,)
        ).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Settlement not found")

    settlement = Settlement.from_row(row)
    result = CopilotContext(**build_copilot_context(settlement))
    # Deliberately does not log any part of `result` — only that the
    # context for this settlement was viewed, by whom, and when.
    record_audit_event(
        actor=officer.username,
        role=officer.role,
        action=ACTION_VIEW_COPILOT_CONTEXT,
        outcome=OUTCOME_SUCCESS,
        resource_type="settlement",
        resource_id=str(settlement_id),
    )
    return result


@router.get("/{settlement_id}/explanation", response_model=EvidenceExplanation)
def get_settlement_evidence_explanation(
    settlement_id: int,
    officer: AuthenticatedOfficer = Depends(get_current_officer),
) -> EvidenceExplanation:
    with get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM settlements WHERE id = ?", (settlement_id,)
        ).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Settlement not found")

    settlement = Settlement.from_row(row)
    context = build_copilot_context(settlement)
    result = EvidenceExplanation(**explain_settlement(context))
    record_audit_event(
        actor=officer.username,
        role=officer.role,
        action=ACTION_VIEW_EVIDENCE_EXPLANATION,
        outcome=OUTCOME_SUCCESS,
        resource_type="settlement",
        resource_id=str(settlement_id),
    )
    return result
