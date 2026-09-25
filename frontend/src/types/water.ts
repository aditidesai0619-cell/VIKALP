// Shape of GET /api/settlements/{id}/water — matches
// backend/app/schemas/water.py. Real OpenStreetMap water-feature tags
// only; never invent flow rate, depth, width, or flood status.

export interface ApiWaterProperties {
  waterway: string | null;
  natural: string | null;
  name: string | null;
  osm_way_id: number | null;
  source: string;
}

export interface ApiWaterFeature {
  type: "Feature";
  geometry: GeoJSON.LineString | GeoJSON.Polygon;
  properties: ApiWaterProperties;
}

export interface ApiWaterFeatureCollection {
  type: "FeatureCollection";
  features: ApiWaterFeature[];
}

export type WaterRequestState =
  | { status: "loading" }
  | { status: "unavailable"; message: string }
  | { status: "error"; message: string }
  | { status: "success"; collection: ApiWaterFeatureCollection };
