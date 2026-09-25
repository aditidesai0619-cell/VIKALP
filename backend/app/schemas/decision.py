from pydantic import BaseModel


class PathwayAssessment(BaseModel):
    pathway: str
    definition: str
    action_categories: list[str]
    evidence_required: list[str]
    status: str  # "not_evaluated" — the only status possible today
    recommended: bool


class SettlementDecision(BaseModel):
    settlement_id: int
    settlement_name: str
    settlement_district: str
    settlement_state: str
    decision_status: str  # "pending" (the only status possible today)
    risk_assessment_status: str  # mirrors RiskAssessment.assessment_status
    pathways: list[PathwayAssessment]
    missing_evidence: list[str]
    explanation: str
    officer_review_required: bool = True
    officer_review_note: str = "Officer review required."
