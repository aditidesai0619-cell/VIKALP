import type { ApiWaterFeatureCollection } from "../types/water";
import { apiFetch } from "./apiClient";

// Task: water/services layer. Real per-settlement OSM water geometry
// (Bhitai Malli vicinity only — see backend/app/services/water.py). A
// 404 here is an honest "not available for this settlement" response,
// same convention as fetchSettlementBuildings/fetchSettlementRoads.
export async function fetchSettlementWater(id: number): Promise<ApiWaterFeatureCollection> {
  return apiFetch<ApiWaterFeatureCollection>(`/api/settlements/${id}/water`);
}
