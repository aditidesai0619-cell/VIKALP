// Shape of GET /api/settlements/{id}/risk — matches
// backend/app/schemas/risk.py. Do not add fields the backend doesn't
// return, and never invent a numeric score/level on the frontend.

export interface ApiRiskEvidenceItem {
  input: string;
  value: number;
  source: string;
}

// Matches backend/app/schemas/risk.py's LandslideContextRecord.
export interface ApiLandslideContextRecord {
  slide_no: string | null;
  distance_km: number;
  activity: string | null;
  triggering: string | null;
  toposheet: string | null;
}

// Matches backend/app/schemas/risk.py's HazardExposureLandslideDetail —
// present only on the "Hazard Exposure" dimension (Task 23). Rendered by
// the Map Intelligence evidence panel (Task 38); do not add fields the
// backend doesn't return, and never derive a color/zone from these values.
export interface ApiHazardExposureLandslideDetail {
  status: string; // "scored" | "no_evidence_found" | "source_data_unavailable" | "settlement_geometry_unavailable"
  reason: string | null;
  reason_detail: string | null;
  score: number | null;
  scoring_radius_km: number;
  context_radius_km: number;
  qualifying_record_count: number;
  nearest_qualifying_distance_km: number | null;
  nearest_qualifying_slide_no: string | null;
  proximity_band: string | null;
  proximity_base_score: number | null;
  activity_value_used: string | null;
  activity_modifier_applied: number | null;
  density_bonus_applied: boolean;
  density_bonus_value: number;
  contextual_record_count: number;
  nearest_contextual_distance_km: number | null;
  contextual_records: ApiLandslideContextRecord[];
  source_dataset: string;
  source_feature_count: number | null;
  inventory_bias_disclaimer: string;
  policy_disclaimer: string;
  limitations: string[];
}

export interface ApiRiskDimension {
  dimension: string;
  weight: number;
  // "no_data" | "no_scoring_rule" (dimensions with no approved rule yet)
  // | "scored" | "no_evidence_found" | "source_data_unavailable"
  // | "settlement_geometry_unavailable" (Hazard Exposure, Task 23)
  status: string;
  score: number | null;
  inputs_used: string[];
  missing_inputs: string[];
  evidence: ApiRiskEvidenceItem[];
  rule_reference: string;
  // Present only on the "Hazard Exposure" dimension (Task 23).
  hazard_exposure_detail?: ApiHazardExposureLandslideDetail | null;
}

export interface ApiRiskAssessment {
  settlement_id: number;
  settlement_name: string;
  assessment_status: string; // "pending" | "complete"
  overall_score: number | null;
  risk_level: string | null;
  score_range: [number, number];
  data_completeness: string; // "none" | "partial" | "complete"
  dimensions: ApiRiskDimension[];
  methodology_note: string;
  policy_disclaimer: string;
  officer_review_required: boolean;
  officer_review_note: string;
}

export type RiskRequestState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; assessment: ApiRiskAssessment };
