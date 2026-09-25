from pydantic import BaseModel


class RiskEvidenceItem(BaseModel):
    input: str
    value: float
    source: str


class LandslideContextRecord(BaseModel):
    """A GSI landslide record 1-5 km from the settlement — context only,
    never a scoring input (docs/DECISIONS.md Task 21 §5)."""

    slide_no: str | None
    distance_km: float
    activity: str | None
    triggering: str | None
    toposheet: str | None


class HazardExposureLandslideDetail(BaseModel):
    """Structured explainability for the GSI landslide-inventory
    sub-evidence within Hazard Exposure (Task 21/22/23). Present only
    on the "Hazard Exposure" dimension; every other dimension leaves
    this null."""

    status: str  # "scored" | "no_evidence_found" | "source_data_unavailable" | "settlement_geometry_unavailable"
    reason: str | None
    reason_detail: str | None
    score: float | None
    scoring_radius_km: float
    context_radius_km: float
    qualifying_record_count: int
    nearest_qualifying_distance_km: float | None
    nearest_qualifying_slide_no: str | None
    proximity_band: str | None  # "0-200m" | "200-600m" | "600m-1km" | None
    proximity_base_score: float | None
    activity_value_used: str | None
    activity_modifier_applied: float | None
    density_bonus_applied: bool
    density_bonus_value: float
    contextual_record_count: int
    nearest_contextual_distance_km: float | None
    contextual_records: list[LandslideContextRecord]
    source_dataset: str
    source_feature_count: int | None
    inventory_bias_disclaimer: str
    policy_disclaimer: str
    limitations: list[str]


class RiskDimensionResult(BaseModel):
    dimension: str
    weight: float
    # "no_data" | "no_scoring_rule" (dimensions with no approved rule yet)
    # | "scored" | "no_evidence_found" | "source_data_unavailable"
    # | "settlement_geometry_unavailable" (Hazard Exposure, Task 23)
    status: str
    score: float | None
    inputs_used: list[str]
    missing_inputs: list[str]
    evidence: list[RiskEvidenceItem]
    rule_reference: str
    hazard_exposure_detail: HazardExposureLandslideDetail | None = None


class RiskAssessment(BaseModel):
    settlement_id: int
    settlement_name: str
    assessment_status: str  # "pending" | "complete"
    overall_score: float | None
    risk_level: str | None
    score_range: list[int]
    data_completeness: str  # "none" | "partial" | "complete"
    dimensions: list[RiskDimensionResult]
    methodology_note: str
    policy_disclaimer: str
    officer_review_required: bool = True
    officer_review_note: str = "Officer review required."
