// Shape of GET /api/settlements/{id}/destinations — matches
// backend/app/schemas/destination.py. Do not add fields the backend
// doesn't return, and never invent a candidate/score on the frontend.

export interface ApiDestinationCandidate {
  destination_id: string;
  destination_name: string;
  latitude: number | null;
  longitude: number | null;
  district: string | null;
  state: string | null;
  land_area_hectares: number | null;
  existing_population: number | null;
  existing_households: number | null;
  available_area_hectares: number | null;
  infrastructure_access_notes: string | null;
  hazard_evidence: string[];
  suitability_evidence: string[];
  source: string | null;
  data_note: string | null;
}

export interface ApiSuitabilityDimension {
  dimension: string;
  definition: string;
  status: string; // "not_evaluated" — the only status possible today
}

export interface ApiRankedCandidate {
  destination_id: string;
  destination_name: string;
  rank: number;
  score: number | null;
}

export interface ApiSettlementDestinationAnalysis {
  settlement_id: number;
  settlement_name: string;
  settlement_district: string;
  settlement_state: string;
  analysis_status: string; // "pending" — the only status possible today
  candidates: ApiDestinationCandidate[];
  ranking_status: string; // "pending" — the only status possible today
  ranked_candidates: ApiRankedCandidate[];
  suitability_dimensions: ApiSuitabilityDimension[];
  missing_evidence: string[];
  explanation: string;
  officer_review_required: boolean;
  officer_review_note: string;
}

export type DestinationRequestState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; analysis: ApiSettlementDestinationAnalysis };
