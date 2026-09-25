from fastapi import APIRouter, Depends, HTTPException

from ..database import get_connection
from ..models.settlement import Settlement
from ..schemas.risk import RiskAssessment
from ..services.audit import ACTION_VIEW_SETTLEMENT_RISK, OUTCOME_SUCCESS, record_audit_event
from ..services.risk import assess_settlement_risk
from .auth import AuthenticatedOfficer, get_current_officer

# Protected (Task 35 §E) — see api/settlements.py.
router = APIRouter(
    prefix="/api/settlements",
    tags=["risk"],
    dependencies=[Depends(get_current_officer)],
)


@router.get("/{settlement_id}/risk", response_model=RiskAssessment)
def get_settlement_risk(
    settlement_id: int,
    officer: AuthenticatedOfficer = Depends(get_current_officer),
) -> RiskAssessment:
    with get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM settlements WHERE id = ?", (settlement_id,)
        ).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Settlement not found")

    settlement = Settlement.from_row(row)
    result = RiskAssessment(**assess_settlement_risk(settlement))
    record_audit_event(
        actor=officer.username,
        role=officer.role,
        action=ACTION_VIEW_SETTLEMENT_RISK,
        outcome=OUTCOME_SUCCESS,
        resource_type="settlement",
        resource_id=str(settlement_id),
    )
    return result
