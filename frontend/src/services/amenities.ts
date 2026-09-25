import type { ApiAmenityFeatureCollection } from "../types/amenities";
import { apiFetch } from "./apiClient";

// Task: water/services layer. Real, distance-filtered per-settlement
// OSM services/POI points (Bhitai Malli vicinity — see
// backend/app/services/amenities.py). A 404 here is an honest "not
// available for this settlement" response.
export async function fetchSettlementAmenities(
  id: number,
): Promise<ApiAmenityFeatureCollection> {
  return apiFetch<ApiAmenityFeatureCollection>(`/api/settlements/${id}/services`);
}
