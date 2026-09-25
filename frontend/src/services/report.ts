import { apiFetchBlob, type ApiBlobResponse } from "./apiClient";

// GET /api/settlements/{id}/report — presentation-only PDF endpoint
// implemented in Task 34 (backend/app/services/report.py,
// backend/app/api/report.py). This service call and the endpoint it
// hits are both unmodified by Task 40 — only the frontend now invokes
// it, via the same authenticated apiFetchBlob every other VIKALP
// request already uses.
export async function generateSettlementReport(id: number): Promise<ApiBlobResponse> {
  return apiFetchBlob(`/api/settlements/${id}/report`);
}
