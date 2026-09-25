// Shape of GET /api/settlements/{id}/buildings — matches
// backend/app/schemas/buildings.py. Google Open Buildings v3
// attributes only; do not add fields the backend doesn't return, and
// never invent a height, floor count, owner, or building type.

export interface ApiBuildingProperties {
  confidence: number;
  area_in_meters: number;
  full_plus_code: string | null;
  source: string;
}

export interface ApiBuildingFeature {
  type: "Feature";
  geometry: GeoJSON.Polygon;
  properties: ApiBuildingProperties;
}

export interface ApiBuildingFeatureCollection {
  type: "FeatureCollection";
  features: ApiBuildingFeature[];
}

export type BuildingsRequestState =
  | { status: "loading" }
  | { status: "unavailable"; message: string }
  | { status: "error"; message: string }
  | { status: "success"; collection: ApiBuildingFeatureCollection };
