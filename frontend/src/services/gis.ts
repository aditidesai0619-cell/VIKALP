import type {
  ApiBoundaryFeatureCollection,
  ApiLandslideFeatureCollection,
} from "../types/gis";
import { apiFetch } from "./apiClient";

export async function fetchBoundaries(): Promise<ApiBoundaryFeatureCollection> {
  return apiFetch<ApiBoundaryFeatureCollection>("/api/gis/boundaries");
}

export async function fetchLandslides(): Promise<ApiLandslideFeatureCollection> {
  return apiFetch<ApiLandslideFeatureCollection>("/api/gis/landslides");
}
