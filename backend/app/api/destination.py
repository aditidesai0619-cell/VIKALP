from fastapi import APIRouter, Depends, HTTPException

from ..database import get_connection
from ..models.settlement import Settlement
from ..schemas.destination import SettlementDestinationAnalysis
from ..services.audit import ACTION_VIEW_DESTINATIONS, OUTCOME_SUCCESS, record_audit_event
from ..services.destination import get_settlement_destinations
from .auth import AuthenticatedOfficer, get_current_officer

# Protected (Task 35 §E) — see api/settlements.py.
router = APIRouter(
    prefix="/api/settlements",
    tags=["destinations"],
    dependencies=[Depends(get_current_officer)],
)


@router.get(
    "/{settlement_id}/destinations", response_model=SettlementDestinationAnalysis
)
def get_settlement_destination_analysis(
    settlement_id: int,
    officer: AuthenticatedOfficer = Depends(get_current_officer),
) -> SettlementDestinationAnalysis:
    with get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM settlements WHERE id = ?", (settlement_id,)
        ).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Settlement not found")

    settlement = Settlement.from_row(row)
    result = SettlementDestinationAnalysis(**get_settlement_destinations(settlement))
    record_audit_event(
        actor=officer.username,
        role=officer.role,
        action=ACTION_VIEW_DESTINATIONS,
        outcome=OUTCOME_SUCCESS,
        resource_type="settlement",
        resource_id=str(settlement_id),
    )
    return result
