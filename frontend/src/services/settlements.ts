import type { ApiSettlement, ApiSettlementGeoJSONFeature } from "../types/settlement";
import { apiFetch } from "./apiClient";

// GET /api/settlements — already existed on the backend (used by
// backend tests since Task 33) but had no frontend caller until now
// (Task 40's settlement selector reuses it instead of hardcoding a
// settlement list).
export async function fetchSettlements(): Promise<ApiSettlement[]> {
  return apiFetch<ApiSettlement[]>("/api/settlements");
}

export async function fetchSettlementById(id: number): Promise<ApiSettlement> {
  return apiFetch<ApiSettlement>(`/api/settlements/${id}`);
}

export async function fetchSettlementGeojson(
  id: number,
): Promise<ApiSettlementGeoJSONFeature> {
  return apiFetch<ApiSettlementGeoJSONFeature>(`/api/settlements/${id}/geojson`);
}
