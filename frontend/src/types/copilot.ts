// Shape of GET /api/settlements/{id}/copilot-context and
// GET /api/settlements/{id}/explanation — matches
// backend/app/schemas/copilot.py. Do not add fields the backend
// doesn't return, and never invent evidence/scores/recommendations on
// the frontend. See docs/DECISIONS.md "Task 37" (foundation) and
// "Task 41" (controlled Copilot UI) — no LLM/RAG is integrated.

import type {
  ApiHazardExposureLandslideDetail,
  ApiRiskAssessment,
  ApiRiskDimension,
} from "./risk";
import type { ApiSettlementDecision } from "./decision";
import type { ApiSettlementDestinationAnalysis } from "./destination";

export interface ApiCopilotSettlementSummary {
  settlement_id: number;
  name: string;
  district: string;
  state: string;
  population: number;
  households: number;
  latitude: number;
  longitude: number;
  data_note: string;
}

export interface ApiCopilotProvenance {
  official_sources: string[];
  derived_calculations: string[];
  demo_planning_inputs: string[];
  unavailable_or_missing: string[];
}

export interface ApiCopilotContext {
  settlement: ApiCopilotSettlementSummary;
  risk_assessment: ApiRiskAssessment;
  risk_dimensions: ApiRiskDimension[];
  // Present whenever the Hazard Exposure dimension has evaluated
  // (Task 21/22/23) — same shape as ApiRiskDimension.hazard_exposure_detail.
  hazard_exposure: ApiHazardExposureLandslideDetail | null;
  decision_workspace: ApiSettlementDecision;
  destinations: ApiSettlementDestinationAnalysis;
  provenance: ApiCopilotProvenance;
  limitations: string[];
  missing_evidence: string[];
  policy_disclaimer: string;
}

export interface ApiCopilotEvidenceItem {
  item: string;
  value: number | string | null;
  source: string;
}

// A "VIKALP Evidence Explanation" — a deterministic, rule-based summary,
// NOT an AI-generated answer (no model is called to produce it).
export interface ApiEvidenceExplanation {
  summary: string;
  evidence: ApiCopilotEvidenceItem[];
  missing_evidence: string[];
  decision_status: string;
  limitations: string[];
  officer_action: string;
}

export type CopilotContextRequestState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; context: ApiCopilotContext };

export type EvidenceExplanationRequestState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; explanation: ApiEvidenceExplanation };
