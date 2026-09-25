from fastapi import APIRouter, Depends, HTTPException, Response

from ..database import get_connection
from ..models.settlement import Settlement
from ..schemas.decision import SettlementDecision
from ..schemas.destination import SettlementDestinationAnalysis
from ..schemas.risk import RiskAssessment
from ..services.audit import ACTION_GENERATE_REPORT, OUTCOME_SUCCESS, record_audit_event
from ..services.decision import assess_settlement_decision
from ..services.destination import get_settlement_destinations
from ..services.report import ReportGenerationError, generate_settlement_report
from ..services.risk import assess_settlement_risk
from .auth import AuthenticatedOfficer, get_current_officer

# Protected (Task 35 §E) — see api/settlements.py.
router = APIRouter(
    prefix="/api/settlements",
    tags=["reports"],
    dependencies=[Depends(get_current_officer)],
)


@router.get("/{settlement_id}/report")
def get_settlement_report(
    settlement_id: int,
    officer: AuthenticatedOfficer = Depends(get_current_officer),
) -> Response:
    with get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM settlements WHERE id = ?", (settlement_id,)
        ).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Settlement not found")

    settlement = Settlement.from_row(row)

    # Reuses the exact same service calls (and Pydantic response schemas)
    # api/risk.py, api/decision.py, and api/destination.py already use —
    # no risk/decision/destination logic is duplicated here.
    risk = RiskAssessment(**assess_settlement_risk(settlement))
    decision = SettlementDecision(**assess_settlement_decision(settlement))
    destination = SettlementDestinationAnalysis(
        **get_settlement_destinations(settlement)
    )

    try:
        pdf_bytes = generate_settlement_report(settlement, risk, decision, destination)
    except ReportGenerationError as exc:
        # Safe, generic message only — never the underlying exception
        # text or a stack trace.
        raise HTTPException(
            status_code=500, detail="Report generation failed."
        ) from exc

    record_audit_event(
        actor=officer.username,
        role=officer.role,
        action=ACTION_GENERATE_REPORT,
        outcome=OUTCOME_SUCCESS,
        resource_type="settlement",
        resource_id=str(settlement_id),
    )

    safe_name = settlement.name.replace(" ", "_")
    filename = f"VIKALP_{safe_name}_Evidence_Assessment.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
