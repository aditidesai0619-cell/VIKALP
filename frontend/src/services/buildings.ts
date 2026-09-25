import type { ApiBuildingFeatureCollection } from "../types/buildings";
import { apiFetch } from "./apiClient";

// Task: Open Buildings integration. Real per-settlement building
// footprints (Google Open Buildings v3, Bhitai Malli vicinity only —
// see backend/app/services/buildings.py). A 404 here is an honest
// "not available for this settlement" response, not a bug; callers
// treat any failure as an unavailable-layer state, same convention as
// fetchSettlementDestinations.
export async function fetchSettlementBuildings(
  id: number,
): Promise<ApiBuildingFeatureCollection> {
  return apiFetch<ApiBuildingFeatureCollection>(`/api/settlements/${id}/buildings`);
}
