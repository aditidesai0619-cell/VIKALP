import type { ApiRiskAssessment } from "../types/risk";
import { apiFetch } from "./apiClient";

export async function fetchSettlementRisk(id: number): Promise<ApiRiskAssessment> {
  return apiFetch<ApiRiskAssessment>(`/api/settlements/${id}/risk`);
}
