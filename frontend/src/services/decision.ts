import type { ApiSettlementDecision } from "../types/decision";
import { apiFetch } from "./apiClient";

export async function fetchSettlementDecision(
  id: number,
): Promise<ApiSettlementDecision> {
  return apiFetch<ApiSettlementDecision>(`/api/settlements/${id}/decision`);
}
