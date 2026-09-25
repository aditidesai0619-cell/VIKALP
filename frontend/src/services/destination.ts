import type { ApiSettlementDestinationAnalysis } from "../types/destination";
import { apiFetch } from "./apiClient";

export async function fetchSettlementDestinations(
  id: number,
): Promise<ApiSettlementDestinationAnalysis> {
  return apiFetch<ApiSettlementDestinationAnalysis>(
    `/api/settlements/${id}/destinations`,
  );
}
