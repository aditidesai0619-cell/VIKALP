import { apiFetch } from "./apiClient";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

// Task 45.8 — GSI/NLFC landslide inventory served as viewport-scoped
// Mapbox Vector Tiles instead of one full-GeoJSON download (see
// backend/app/services/gis_tiles.py). The tile URL template is handed
// straight to MapLibre's own vector source (it requests tiles itself
// as the map pans/zooms) — this file does not fetch tiles directly.
export const GSI_LANDSLIDE_TILE_URL_TEMPLATE = `${API_BASE_URL}/api/evidence/gsi-landslides/tiles/{z}/{x}/{y}.pbf`;

export interface GsiLandslideCount {
  count: number;
}

// Just the real total feature count (813) — never the geometry, so
// showing this number never requires downloading the full dataset.
export async function fetchGsiLandslideCount(): Promise<GsiLandslideCount> {
  return apiFetch<GsiLandslideCount>("/api/evidence/gsi-landslides/count");
}
