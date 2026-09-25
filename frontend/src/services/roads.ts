import type { ApiRoadFeatureCollection } from "../types/roads";
import { apiFetch } from "./apiClient";

// Task: road/path layer. Real per-settlement OSM road/path geometry
// (Bhitai Malli vicinity only — see backend/app/services/roads.py). A
// 404 here is an honest "not available for this settlement" response,
// same convention as fetchSettlementBuildings.
export async function fetchSettlementRoads(id: number): Promise<ApiRoadFeatureCollection> {
  return apiFetch<ApiRoadFeatureCollection>(`/api/settlements/${id}/roads`);
}
