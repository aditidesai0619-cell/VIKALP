from pydantic import BaseModel


class DestinationCandidate(BaseModel):
    """A single candidate relocation destination.

    Every field beyond identity is nullable — this model exists to
    describe the shape future real destination data would take, not to
    hold invented values. No candidate is ever fabricated to fill it in.
    """

    destination_id: str
    destination_name: str
    latitude: float | None = None
    longitude: float | None = None
    district: str | None = None
    state: str | None = None
    land_area_hectares: float | None = None
    existing_population: int | None = None
    existing_households: int | None = None
    available_area_hectares: float | None = None
    infrastructure_access_notes: str | None = None
    hazard_evidence: list[str] = []
    suitability_evidence: list[str] = []
    source: str | None = None
    data_note: str | None = None


class SuitabilityDimension(BaseModel):
    dimension: str
    definition: str
    status: str  # "not_evaluated" — the only status possible today


class RankedCandidate(BaseModel):
    destination_id: str
    destination_name: str
    rank: int
    score: float | None = None


class SettlementDestinationAnalysis(BaseModel):
    settlement_id: int
    settlement_name: str
    settlement_district: str
    settlement_state: str
    analysis_status: str  # "pending" — the only status possible today
    candidates: list[DestinationCandidate]
    ranking_status: str  # "pending" — the only status possible today
    ranked_candidates: list[RankedCandidate]
    suitability_dimensions: list[SuitabilityDimension]
    missing_evidence: list[str]
    explanation: str
    officer_review_required: bool = True
    officer_review_note: str = "Officer review required."
