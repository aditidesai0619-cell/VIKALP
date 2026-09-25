// Shape of GET /api/settlements/{id}/decision — matches
// backend/app/schemas/decision.py. Do not add fields the backend
// doesn't return, and never invent a pathway score/recommendation on
// the frontend.

export interface ApiDecisionPathway {
  pathway: string;
  definition: string;
  action_categories: string[];
  evidence_required: string[];
  status: string; // "not_evaluated" — the only status possible today
  recommended: boolean;
}

export interface ApiSettlementDecision {
  settlement_id: number;
  settlement_name: string;
  settlement_district: string;
  settlement_state: string;
  decision_status: string; // "pending" — the only status possible today
  risk_assessment_status: string;
  pathways: ApiDecisionPathway[];
  missing_evidence: string[];
  explanation: string;
  officer_review_required: boolean;
  officer_review_note: string;
}

export type DecisionRequestState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; decision: ApiSettlementDecision };
